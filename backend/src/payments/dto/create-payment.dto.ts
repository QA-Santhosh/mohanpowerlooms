import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  workerId: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than zero.' })
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
