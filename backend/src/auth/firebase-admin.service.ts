import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private firebaseApp: admin.app.App | null = null;
  private isMockMode = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (
      !projectId || 
      !privateKey || 
      !clientEmail || 
      projectId === 'mock-project-id' || 
      privateKey === 'mock-private-key'
    ) {
      this.logger.warn(
        'Firebase credentials are not fully configured or set to mock. Running in MOCK AUTH MODE for development.'
      );
      this.isMockMode = true;
      return;
    }

    try {
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      this.logger.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK. Falling back to MOCK mode.', error);
      this.isMockMode = true;
    }
  }

  async verifyIdToken(token: string): Promise<{ email: string; uid: string; name?: string }> {
    if (this.isMockMode || token.startsWith('mock-token-')) {
      // Mock token verification for development
      // Mock token format: mock-token-<role>-<email>
      // Example: mock-token-super_admin-owner@mohanlooms.com
      const parts = token.split('-');
      if (parts.length >= 4) {
        const role = parts[2].toUpperCase();
        const email = parts.slice(3).join('-');
        const name = email.split('@')[0];
        
        // Match seed.ts uids exactly
        let uid = `mock-uid-${role.toLowerCase()}-${name}`;
        if (email === 'owner@mohanlooms.com') {
          uid = 'mock-firebase-uid-owner';
        } else if (email === 'supervisor@mohanlooms.com') {
          uid = 'mock-firebase-uid-supervisor';
        } else if (email === 'ravi@mohanlooms.com') {
          uid = 'mock-firebase-uid-ravi';
        }
        
        return { email, uid, name: name.charAt(0).toUpperCase() + name.slice(1) };
      }
      
      // Default mock fallback
      return {
        email: 'owner@mohanlooms.com',
        uid: 'mock-firebase-uid-owner',
        name: 'Mohan Kumar',
      };
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return {
        email: decodedToken.email || '',
        uid: decodedToken.uid,
        name: decodedToken.name,
      };
    } catch (error) {
      this.logger.error('Firebase token verification failed', error);
      throw error;
    }
  }
}
