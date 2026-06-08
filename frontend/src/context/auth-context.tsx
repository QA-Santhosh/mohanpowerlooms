'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isMockAuth, mockAuthService, auth as firebaseAuth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { api } from '../lib/api';

export interface DBUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER';
  firebaseUid: string;
  workerProfile?: {
    id: string;
    workerId: string;
    status: string;
  };
}

interface AuthContextType {
  user: DBUser | null;
  loading: boolean;
  login: (email: string, password?: string, role?: 'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER') => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string, mobileNumber: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const syncProfile = async () => {
    try {
      const profile = await api.get<DBUser>('/auth/profile');
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Failed to sync user profile with backend', error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    if (isMockAuth) {
      // Mock auth initialization
      const mockUser = mockAuthService.getCurrentUser();
      if (mockUser) {
        syncProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } else {
      // Real Firebase listener
      if (!firebaseAuth) {
        setLoading(false);
        return;
      }
      const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser: any) => {
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('mpl_token', token);
          const profile = await syncProfile();
          if (profile) {
            localStorage.setItem('mpl_user', JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || `${profile.firstName} ${profile.lastName}`,
              role: profile.role,
            }));
          }
        } else {
          localStorage.removeItem('mpl_token');
          localStorage.removeItem('mpl_user');
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  // Handle route protection
  useEffect(() => {
    if (!loading) {
      const isPublicPath = ['/login', '/register', '/forgot-password'].includes(pathname);
      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && isPublicPath) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password?: string, role?: 'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER') => {
    setLoading(true);
    try {
      if (isMockAuth) {
        await mockAuthService.login(email, role);
      } else {
        if (!password) throw new Error('Password is required.');
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
      const profile = await syncProfile();
      if (!profile) {
        throw new Error('Authentication succeeded but profile sync with the database failed. Please verify that your backend server is running and database is fully seeded.');
      }
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (isMockAuth) {
        // Mock Google login defaults to owner
        await mockAuthService.login('owner@mohanlooms.com', 'SUPER_ADMIN');
      } else {
        await signInWithPopup(firebaseAuth, googleProvider);
      }
      await syncProfile();
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string, mobileNumber: string) => {
    setLoading(true);
    try {
      if (isMockAuth) {
        // Register mock user
        await mockAuthService.login(email, 'WORKER');
      } else {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        // We will pass auth token to auto-provision profile on next request
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('mpl_token', token);
      }
      
      // Auto-creates DB profile upon calling the sync profile
      await syncProfile();
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isMockAuth) {
        await mockAuthService.logout();
      } else {
        await signOut(firebaseAuth);
      }
      setUser(null);
      localStorage.removeItem('mpl_token');
      localStorage.removeItem('mpl_user');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
