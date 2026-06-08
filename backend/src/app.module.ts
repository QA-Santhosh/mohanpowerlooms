import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkersModule } from './workers/workers.module';
import { WarpsModule } from './warps/warps.module';
import { ProductionModule } from './production/production.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SareeTypesModule } from './saree-types/saree-types.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WorkersModule,
    WarpsModule,
    ProductionModule,
    PaymentsModule,
    DashboardModule,
    AuditModule,
    NotificationsModule,
    SareeTypesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
