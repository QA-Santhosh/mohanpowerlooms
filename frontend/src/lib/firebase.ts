import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
};

// Check if we are running in real Firebase mode or mock mode
export const isMockAuth = 
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'mock-api-key';

let app;
let auth: any;
let googleProvider: any;

if (!isMockAuth) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Failed to initialize real Firebase client. Switching to mock mode.", error);
    auth = null;
  }
}

export { auth, googleProvider };

// Mock auth helper store
export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER';
}

const mockUsers: Record<string, MockUser> = {
  'owner@mohanlooms.com': {
    uid: 'mock-firebase-uid-owner',
    email: 'owner@mohanlooms.com',
    displayName: 'Mohan Kumar',
    role: 'SUPER_ADMIN',
  },
  'supervisor@mohanlooms.com': {
    uid: 'mock-firebase-uid-supervisor',
    email: 'supervisor@mohanlooms.com',
    displayName: 'Rajesh Kumar',
    role: 'SUPERVISOR',
  },
  'ravi@mohanlooms.com': {
    uid: 'mock-firebase-uid-ravi',
    email: 'ravi@mohanlooms.com',
    displayName: 'Ravi Weaver',
    role: 'WORKER',
  },
};

export const mockAuthService = {
  login: async (email: string, role?: 'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER') => {
    // Return mock user
    let user = mockUsers[email];
    if (!user) {
      // Create a dynamic weaver user if not predefined
      const cleanRole = role || 'WORKER';
      const name = email.split('@')[0];
      user = {
        uid: `mock-uid-${cleanRole.toLowerCase()}-${name}`,
        email,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        role: cleanRole,
      };
    }
    
    const token = `mock-token-${user.role.toLowerCase()}-${user.email}`;
    localStorage.setItem('mpl_token', token);
    localStorage.setItem('mpl_user', JSON.stringify(user));
    return user;
  },

  getCurrentUser: (): MockUser | null => {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem('mpl_user');
    return userJson ? JSON.parse(userJson) : null;
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('mpl_token');
  },

  logout: async () => {
    localStorage.removeItem('mpl_token');
    localStorage.removeItem('mpl_user');
  }
};
