import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkerType, SalaryType } from '@prisma/client';

export class BankAccountDto {
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @IsString()
  @IsOptional()
  upiId?: string;
}

export class SalaryConfigDto {
  @IsNumber()
  @IsOptional()
  ratePerSaree?: number;

  @IsNumber()
  @IsOptional()
  fixedMonthlySalary?: number;
}

export class CreateWorkerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  aadhaarNumber?: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfJoining: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsEnum(WorkerType)
  @IsNotEmpty()
  workerType: WorkerType;

  @IsEnum(SalaryType)
  @IsNotEmpty()
  salaryType: SalaryType;

  @IsString()
  @IsOptional()
  email?: string; // If associating with a user login

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SalaryConfigDto)
  salaryConfig?: SalaryConfigDto;

  @IsString()
  @IsOptional()
  sareeTypeId?: string;
}
