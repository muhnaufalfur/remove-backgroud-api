import { Test, TestingModule } from '@nestjs/testing';
import { BgService } from './bg.service';

describe('BgService', () => {
  let service: BgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BgService],
    }).compile();

    service = module.get<BgService>(BgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
