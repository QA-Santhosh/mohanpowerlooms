import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private firebaseAdminService: FirebaseAdminService,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided in Authorization header.');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 1. Verify token with Firebase
      const decodedToken = await this.firebaseAdminService.verifyIdToken(token);
      
      // 2. Look up user in database by firebaseUid
      let user = await this.prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: { workerProfile: true },
      });

      // 3. Auto-creation logic (if not found in db)
      if (!user) {
        // If there are zero users in the database, make the first one a SUPER_ADMIN (Owner)
        const userCount = await this.prisma.user.count();
        const role = userCount === 0 ? Role.SUPER_ADMIN : Role.WORKER;
        
        const nameParts = (decodedToken.name || 'User').split(' ');
        const firstName = nameParts[0] || 'First';
        const lastName = nameParts.slice(1).join(' ') || 'Last';

        user = await this.prisma.user.create({
          data: {
            email: decodedToken.email,
            firstName,
            lastName,
            role,
            firebaseUid: decodedToken.uid,
          },
          include: { workerProfile: true },
        });
      }

      // Attach user object to request
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
