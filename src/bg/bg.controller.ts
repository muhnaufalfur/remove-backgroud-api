import {
    BadRequestException,
    Controller,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
    Res,
    Body,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { memoryStorage } from 'multer';
  import type { Response } from 'express';
  import { BgService } from './bg.service';
  import { RemoveOptionsDto } from './dto/remove-options.dto';
  import { Base64InputDto } from './dto/base64-input.dto';
  
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  
  @Controller('bg')
  export class BgController {
    constructor(private readonly bg: BgService) {}
  
    @Post('remove/file')
    @UseInterceptors(FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|bmp|tiff?)$/i.test(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Only image files are allowed'), false);
      },
    }))
    async removeFile(
      @UploadedFile() file: Express.Multer.File,
      @Query() options: RemoveOptionsDto,
      @Res() res: Response,
    ) {
      if (!file) throw new BadRequestException('No file uploaded (field name: image)');
      const { buf, mime, ext } = await this.bg.removeFromBuffer(file.buffer, options);
      res.setHeader('Content-Type', mime);
      if (options.asBase64) {
        const b64 = buf.toString('base64');
        res.json({
          mime,
          ext,
          size: buf.length,
          data: b64, // add "data:<mime>;base64,<...>" yourself if you prefer
        });
      } else {
        const base = (file.originalname || 'image').replace(/\.[^.]+$/, '');
        res.setHeader('Content-Disposition', `inline; filename="${base}-cutout.${ext}"`);
        res.send(buf);
      }
    }
  
    @Post('remove/base64')
    async removeBase64(@Body() body: Base64InputDto, @Res() res: Response) {
      const { data, options } = body;
      const { buf, mime, ext } = await this.bg.removeFromBase64(data, options);
      res.setHeader('Content-Type', mime);
      if (options.asBase64) {
        res.json({ mime, ext, size: buf.length, data: buf.toString('base64') });
      } else {
        res.setHeader('Content-Disposition', `inline; filename="cutout.${ext}"`);
        res.send(buf);
      }
    }

    // @Post('remove/url')
    // async removeBgFromUrl(@Body('imageUrl') imageUrl: string) {
    //   if (!imageUrl) throw new BadRequestException('imageUrl is required');
    //   const processedUrl = await this.bg.removeAndUpload(imageUrl);
    //   return { processedUrl };
    // }

    @Post('remove/s3/imgName')
    async removeBgFromS3ImgName(@Body('imgName') imgName: string) {
      if (!imgName) throw new BadRequestException('imgName is required');
      const processedUrl = await this.bg.removeAndUploadFromS3ImgName(imgName);
      return processedUrl;
    }
  }
  