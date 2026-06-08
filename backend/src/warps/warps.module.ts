import { Module } from '@nestjs/common';
import { WarpsService } from './warps.service';
import { WarpsController } from './warps.controller';

@Module({
  controllers: [WarpsController],
  providers: [WarpsService],
  exports: [WarpsService],
})
export class WarpsModule {}
