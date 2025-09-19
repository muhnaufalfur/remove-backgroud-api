import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BgModule } from './bg/bg.module';
import { UploadModule } from './upload/upload.module';
import { ConfigModule } from '@nestjs/config';
import { DownloadModule } from './download/download.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes .env accessible everywhere
    }),
    BgModule, 
    UploadModule, 
    DownloadModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
