import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DownloadService {
    private readonly lambdaDownloadUrl = process.env.LAMBDA_API_URL! + process.env.LAMBDA_DOWNLOAD_URL!;

    async downloadFromS3(imgName: string): Promise<{ buf: Buffer; mime: string; ext: string; }> {
        if(!imgName) throw new BadRequestException('imgName is required');
        if(!process.env.S3_BUCKET_NAME) throw new BadRequestException('S3_BUCKET_NAME is not configured');

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

        const processedUrl = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
        if (processedUrl.status !== 200) {
            throw new BadRequestException('Failed to download image from S3 signed URL');
        }
        const buf = Buffer.from(processedUrl.data);
        const contentType = processedUrl.headers['content-type'] || 'application/octet-stream';
        const extMatch = contentType.match(/image\/(png|jpe?g|webp|bmp|tiff?)/i);
        const ext = extMatch ? extMatch[1].replace('jpeg', 'jpg') : 'bin';
        return { buf, mime: contentType, ext };
    }

    async downloadFromS3GetUrl(imgName: string): Promise<any> {
        if(!imgName) throw new BadRequestException('imgName is required');
        if(!process.env.S3_BUCKET_NAME) throw new BadRequestException('S3_BUCKET_NAME is not configured');

        let url = this.lambdaDownloadUrl;
        if (url.indexOf('?') > 0) url += '&'; else url += '?';
        url += 'bucket=' + encodeURIComponent(process.env.S3_BUCKET_NAME);
        url += '&fileName=' + encodeURIComponent(imgName);
        url += '&subFolder=' + encodeURIComponent(process.env.S3_SUBFOLDER || '');

        const response = await axios.get(url);

        return response.data;
        
        // if (response.status !== 200 || !response.data.signedUrl) {
        //     throw new BadRequestException('Failed to get signed URL from Lambda for S3 image');
        // }

        // const imageUrl = response.data.signedUrl;
        // return imageUrl;
    }
}
