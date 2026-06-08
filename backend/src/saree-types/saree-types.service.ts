import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSareeTypeDto } from './dto/create-saree-type.dto';

@Injectable()
export class SareeTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createSareeTypeDto: CreateSareeTypeDto) {
    return this.prisma.sareeType.create({
      data: createSareeTypeDto,
    });
  }

  async findAll() {
    return this.prisma.sareeType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const st = await this.prisma.sareeType.findUnique({
      where: { id },
    });
    if (!st) throw new NotFoundException(`Saree Type with ID ${id} not found.`);
    return st;
  }

  async update(id: string, updateSareeTypeDto: CreateSareeTypeDto) {
    const existing = await this.findOne(id);
    
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sareeType.update({
        where: { id },
        data: updateSareeTypeDto,
      });

      // Cascade rate updates to all associated workers' configurations
      if (existing.rate !== updateSareeTypeDto.rate) {
        await tx.salaryConfiguration.updateMany({
          where: {
            worker: {
              sareeTypeId: id,
            },
          },
          data: {
            ratePerSaree: updateSareeTypeDto.rate,
          },
        });
      }

      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sareeType.delete({
      where: { id },
    });
  }
}
