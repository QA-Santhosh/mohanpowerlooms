import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Put, 
  Param, 
  Delete, 
  UseGuards, 
  UseInterceptors 
} from '@nestjs/common';
import { SareeTypesService } from './saree-types.service';
import { CreateSareeTypeDto } from './dto/create-saree-type.dto';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('saree-types')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class SareeTypesController {
  constructor(private readonly sareeTypesService: SareeTypesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() createSareeTypeDto: CreateSareeTypeDto) {
    return this.sareeTypesService.create(createSareeTypeDto);
  }

  @Get()
  findAll() {
    return this.sareeTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sareeTypesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateSareeTypeDto: CreateSareeTypeDto) {
    return this.sareeTypesService.update(id, updateSareeTypeDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.sareeTypesService.remove(id);
  }
}
