import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateProductionDto {
  @IsDateString()
  @IsNotEmpty()
  productionDate: string;

  @IsString()
  @IsNotEmpty()
  workerId: string;

  @IsString()
  @IsNotEmpty()
  warpYarnId: string;

  @IsNumber()
  @Min(0)
  sareeCount: number;

  @IsNumber()
  @Min(0)
  defectiveSareeCount: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}
