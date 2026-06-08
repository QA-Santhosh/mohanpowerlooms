'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function RegisterPage() {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      await signup(email, password, firstName, lastName, mobileNumber);
      setSuccess('Account created successfully! Redirecting...');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 p-4 font-sans text-slate-200">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-950/80 shadow-2xl text-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded bg-amber-500" />
            <span className="text-xl font-bold tracking-wider text-amber-500">MOHAN POWER LOOMS</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-100">Create an Account</CardTitle>
          <CardDescription className="text-slate-400">
            Enter details to register your profile.
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobileNumber" className="text-slate-300">Mobile Number</Label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="e.g., 9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all font-bold transition duration-300"
            >
              {loading ? 'Creating Account...' : 'Register Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-800 pt-4 text-sm text-slate-400">
          <div>
            Already have an account?{' '}
            <Link href="/login" className="text-amber-500 hover:text-amber-400 font-semibold underline">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
