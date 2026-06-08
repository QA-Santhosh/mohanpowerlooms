import { Module } from '@nestjs/common';
import { SareeTypesService } from './saree-types.service';
import { SareeTypesController } from './saree-types.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SareeTypesController],
  providers: [SareeTypesService],
  exports: [SareeTypesService],
})
export class SareeTypesModule {}
