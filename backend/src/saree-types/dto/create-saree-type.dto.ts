import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateSareeTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  rate: number;
}
