import { Injectable, BadRequestException } from '@nestjs/common';
import { Rembg } from '@xixiyahaha/rembg-node';
import sharp, { Sharp } from 'sharp';
import { BgKind, OutFormat, RemoveOptionsDto } from './dto/remove-options.dto';
import path from 'path';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import FormData from 'form-data';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class BgService {
  private readonly uploadService: UploadService = new UploadService();
  private lambdaUploadUrl = process.env.LAMBDA_UPLOAD_URL!;
  private readonly lambdaDownloadUrl = process.env.LAMBDA_API_URL! + process.env.LAMBDA_DOWNLOAD_URL!;
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
      // flatten png
      // const buf = await out.flatten({ background: '#ffffff' }).png({force: true}).toBuffer();
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

  // async removeAndUpload(imageUrl: string): Promise<string> {
  //   if (!imageUrl) throw new BadRequestException('imageUrl required');

  //   // 1. Download file from Lambda (instead of S3 directly)
  //   const resp = await axios.post(this.lambdaDownloadUrl, { url: imageUrl }, { responseType: 'arraybuffer' });
  //   const inputBuffer = Buffer.from(resp.data);

  //   // 2. Process (remove bg)
  //   const cutout = await this.rembg.remove(sharp(inputBuffer));
  //   const buf = await cutout.png().toBuffer();

  //   // 3. Upload new file via Lambda
  //   const form = new FormData();
  //   form.append('file', buf, `${uuid()}.png`);

  //   const uploadResp = await axios.post(this.lambdaUploadUrl, form, {
  //     headers: form.getHeaders(),
  //   });

  //   return uploadResp.data.url; // final processed file URL
  // }

  async removeAndUploadFromS3ImgName(imgName: string): Promise<{ url: string, imgName: string }> {
    if (!imgName) throw new BadRequestException('imgName required');
    if (!process.env.S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME not configured');

    // construct S3 URL from imgName
    let url = this.lambdaDownloadUrl;
    if (url.indexOf('?') > 0) url += '&'; else url += '?';
    url += 'bucket=' + encodeURIComponent(process.env.S3_BUCKET_NAME);
    url += '&fileName=' + encodeURIComponent(imgName);
    url += '&subFolder=' + encodeURIComponent(process.env.S3_SUBFOLDER || '');

    const response = await axios.get(url);

    if (response.status !== 200 || !response.data.signedUrl) {
      throw new BadRequestException('Failed to get signed URL from Lambda for S3 image');
    }

    const imageUrl = response.data.signedUrl;
    // this is a presigned URL with limited validity (e.g., 15 minutes)

    // get image from S3 URL and process
    const processedUrl = await axios.get(imageUrl, { responseType: 'arraybuffer' })
      .then(res => Buffer.from(res.data))
      .then(buf => this.removeFromBuffer(buf, { format: OutFormat.PNG, background: BgKind.Transparent })) // opts can be adjusted as needed
      ;

    // upload processed image back to S3 via Lambda into upload using multer file format
    // remove extension from imgName if any
    let processedImgName = imgName.replace(/\.[^.]+$/, '');
    processedImgName = `cutout-${processedImgName}.${processedUrl.ext}`;
    const uploadResp = await this.uploadService.uploadToS3({
      fieldname: 'file',
      originalname: processedImgName,
      encoding: '7bit',
      mimetype: processedUrl.mime,
      size: processedUrl.buf.length,
      buffer: processedUrl.buf,
      destination: '',
      filename: '',
    } as Express.Multer.File);

    return { url: uploadResp.url, imgName: processedImgName };  // final processed file URL and image name
  }
}
