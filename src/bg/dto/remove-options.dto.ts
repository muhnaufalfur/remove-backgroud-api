import { IsBoolean, IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum BgKind { Transparent = 'transparent', White = 'white' }
export enum OutFormat { PNG = 'png', JPG = 'jpg' }

export class RemoveOptionsDto {
  @IsEnum(BgKind)
  background: BgKind = BgKind.Transparent;

  @IsEnum(OutFormat)
  format: OutFormat = OutFormat.PNG; 

  /** Return image as base64 string (JSON) instead of binary stream */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  asBase64?: boolean = false;

  /** Optional: trim transparent edges */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  trim?: boolean = false;

  /** JPEG quality if format=jpg */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  quality?: number = 90;
}
