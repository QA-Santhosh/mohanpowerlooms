'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { isMockAuth, auth as firebaseAuth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isMockAuth) {
        // Mock success message
        setSuccess('A password reset code has been sent to your email (Demo Mode).');
      } else {
        if (!firebaseAuth) throw new Error('Firebase Auth is not initialized.');
        await sendPasswordResetEmail(firebaseAuth, email);
        setSuccess('A password reset link has been successfully emailed to you.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 p-4 font-sans text-slate-200">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950/80 shadow-2xl text-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded bg-amber-500" />
            <span className="text-xl font-bold tracking-wider text-amber-500">MOHAN POWER LOOMS</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-100">Reset Password</CardTitle>
          <CardDescription className="text-slate-400">
            Enter your email address to receive a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error && (
            <div className="rounded-md bg-rose-500/15 p-3 text-sm text-rose-400 border border-rose-500/20">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-400 border border-emerald-500/20">
              {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="weaver@mohanlooms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all font-bold transition duration-300"
            >
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-800 pt-4 text-sm text-slate-400">
          <Link href="/login" className="text-amber-500 hover:text-amber-400 font-semibold underline">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
