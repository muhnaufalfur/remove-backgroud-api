import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RemoveOptionsDto } from './remove-options.dto';

export class Base64InputDto {
  @IsString()
  data!: string; // accepts "data:image/...;base64,..." or raw base64

  @ValidateNested()
  @Type(() => RemoveOptionsDto)
  options!: RemoveOptionsDto;
}
