import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsArray } from 'class-validator';
import { WarpStatus } from '@prisma/client';

export class CreateWarpDto {
  @IsString()
  @IsOptional()
  warpId?: string;

  @IsString()
  @IsNotEmpty()
  warpName: string;

  @IsString()
  @IsNotEmpty()
  designName: string;

  @IsString()
  @IsNotEmpty()
  sareeType: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsNotEmpty()
  yarnQuality: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(WarpStatus)
  @IsOptional()
  status?: WarpStatus;

  @IsNumber()
  @IsNotEmpty()
  expectedSarees: number;

  @IsNumber()
  @IsNotEmpty()
  expectedWarpLength: number;

  @IsNumber()
  @IsNotEmpty()
  productionTarget: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedWorkerIds?: string[];
}
