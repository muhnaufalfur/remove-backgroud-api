import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return {
      message: 'Connected to Remove Background API',
      timezone: process.env.TZ,
      serverTime: new Date().toLocaleString(),
    }
  }
}
