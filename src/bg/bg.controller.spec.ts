import { Test, TestingModule } from '@nestjs/testing';
import { BgController } from './bg.controller';

describe('BgController', () => {
  let controller: BgController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BgController],
    }).compile();

    controller = module.get<BgController>(BgController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
