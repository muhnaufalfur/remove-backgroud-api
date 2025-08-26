import { Module } from '@nestjs/common';
import { BgService } from './bg.service';
import { BgController } from './bg.controller';

@Module({
  controllers: [BgController],
  providers: [BgService],
})
export class BgModule {}
