import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { DownloadService } from './download.service';

@Controller('download')
export class DownloadController {
    constructor(private readonly downloadService: DownloadService) {}

    @Get()
    async downloadFile(@Query('imgName') imgName: string) {
        const { buf, mime, ext } = await  this.downloadService.downloadFromS3(imgName);
        return { mime, ext, size: buf.length, data: buf.toString('base64') };
    }

    @Get('imgUrl')
    async imgUrlFile(@Query('imgName') imgName: string) {
        const result = await this.downloadService.downloadFromS3GetUrl(imgName);
        return result;
    }
}
