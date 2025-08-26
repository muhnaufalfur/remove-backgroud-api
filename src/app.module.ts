import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BgModule } from './bg/bg.module';

@Module({
  imports: [BgModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
