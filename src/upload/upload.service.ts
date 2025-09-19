import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UploadService {
    private readonly lambdaUploadUrl = process.env.LAMBDA_API_URL! + process.env.LAMBDA_UPLOAD_URL!;

    async uploadToS3(file: Express.Multer.File) {
        // param url for lambda 
        let url = this.lambdaUploadUrl;
        if (url.indexOf('?') > 0) url += '&'; else url += '?';
        url += 'bucket=' + encodeURIComponent(process.env.S3_BUCKET_NAME!);
        url += '&fileName=' + encodeURIComponent(file.originalname);
        url += '&contentType=' + encodeURIComponent(file.mimetype);
        url += '&subFolder=' + encodeURIComponent(process.env.S3_SUBFOLDER || '');

        // get presigned URL from lambda
        const response = await axios.post(url, null);

        if (response.status !== 200 || !response.data.signedUrl) {
            throw new BadRequestException('Failed to get signed URL from Lambda for S3 image');
        }

        // response
        // message: 'OK',
        // signedUrl: 'https://...'

        const signedUrl = response.data.signedUrl;
        // upload file to S3 using the presigned URL
        const uploadResponse = await axios.put(signedUrl, file.buffer, {
          headers: {
            'Content-Type': file.mimetype,
          },
        });

        if (uploadResponse.status !== 200) {
          throw new Error('Failed to upload file to S3');
        }

        return { status: 'success', url: signedUrl.split('?')[0], imgName: file.originalname };
      }
}
