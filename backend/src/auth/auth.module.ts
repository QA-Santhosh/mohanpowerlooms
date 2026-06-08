import { Module, Global } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseAuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [FirebaseAdminService, FirebaseAuthGuard, RolesGuard],
  exports: [FirebaseAdminService, FirebaseAuthGuard, RolesGuard],
})
export class AuthModule {}
