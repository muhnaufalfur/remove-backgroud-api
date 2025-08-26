import { Injectable, BadRequestException } from '@nestjs/common';
import { Rembg } from '@xixiyahaha/rembg-node';
import sharp, { Sharp } from 'sharp';
import { BgKind, OutFormat, RemoveOptionsDto } from './dto/remove-options.dto';
import path from 'path';

@Injectable()
export class BgService {
    private rembg = new (Rembg as any)({
        logging: false,
        modelPath: path.resolve(__dirname, '../../models/u2net.onnx'),
    });

  private dataUriToBuffer(input: string): Buffer {
    const m = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    const b64 = m ? m[2] : input;
    try {
      return Buffer.from(b64, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 input');
    }
  }

  private async toOutputBuffer(out: Sharp, opts: RemoveOptionsDto): Promise<{ buf: Buffer; mime: string; ext: string; }> {
    if (opts.trim) out = out.trim();
    if (opts.background === BgKind.White || opts.format === OutFormat.JPG) {
      // JPEG has no alpha; or user explicitly wants white background
      if (opts.format === OutFormat.PNG) {
        // still allow PNG + white background (opaque PNG)
        const buf = await out.flatten({ background: '#ffffff' }).png().toBuffer();
        return { buf, mime: 'image/png', ext: 'png' };
      }
      const q = opts.quality ?? 90;
      const buf = await out.flatten({ background: '#ffffff' }).jpeg({ quality: q }).toBuffer();
      return { buf, mime: 'image/jpeg', ext: 'jpg' };
    } else {
      // transparent PNG
      const fmt = opts.format as OutFormat;
      if (fmt === OutFormat.JPG) {
        // JPEG + transparent makes no sense; guard here as a 400 instead of auto-changing silently
        throw new BadRequestException('JPEG does not support transparency. Use format=png or set background=white.');
      }
      const buf = await out.png().toBuffer();
      return { buf, mime: 'image/png', ext: 'png' };
    }
  }

  async removeFromBuffer(input: Buffer, opts: RemoveOptionsDto) {
    const inputSharp = sharp(input);
    const cutoutSharp = await this.rembg.remove(inputSharp); // returns a Sharp instance
    // dump cutoutSharp metadata for debugging
    const metadata = await cutoutSharp.metadata();
    const { buf, mime, ext } = await this.toOutputBuffer(cutoutSharp, opts);
    return { buf, mime, ext };
  }

  async removeFromBase64(base64: string, opts: RemoveOptionsDto) {
    const buf = this.dataUriToBuffer(base64);
    return this.removeFromBuffer(buf, opts);
  }
}
