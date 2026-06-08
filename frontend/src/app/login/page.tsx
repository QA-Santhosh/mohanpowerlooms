'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Demo Login Role Select
  const [demoRole, setDemoRole] = useState<'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER'>('SUPER_ADMIN');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, demoRole);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'SUPER_ADMIN' | 'SUPERVISOR' | 'WORKER') => {
    setError('');
    setLoading(true);
    let demoEmail = 'owner@mohanlooms.com';
    if (role === 'SUPERVISOR') demoEmail = 'supervisor@mohanlooms.com';
    if (role === 'WORKER') demoEmail = 'ravi@mohanlooms.com';

    try {
      await login(demoEmail, undefined, role);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-900 text-slate-100 font-sans">
      {/* Left side: Login form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-5/12 bg-slate-950/40 backdrop-blur-md">
        <Card className="w-full max-w-md border-slate-800 bg-slate-950/80 shadow-2xl text-slate-200">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded bg-amber-500 animate-pulse" />
              <span className="text-xl font-bold tracking-wider text-amber-500">MOHAN POWER LOOMS</span>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-100">Welcome back</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your credentials to manage your loom dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <div className="rounded-md bg-rose-500/15 p-3 text-sm text-rose-400 border border-rose-500/20">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@mohanlooms.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-amber-500 hover:text-amber-400 transition"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-amber-500"
                />
              </div>

              {/* Demo Mode Role Selector */}
              <div className="grid gap-2 border-t border-slate-800 pt-3">
                <Label htmlFor="demo-role" className="text-xs text-amber-500 font-semibold uppercase tracking-wider">
                  Development Login Role
                </Label>
                <Select
                  value={demoRole}
                  onValueChange={(value: any) => setDemoRole(value)}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                    <SelectItem value="SUPER_ADMIN">Super Admin (Owner)</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="WORKER">Worker (Weaver)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all font-bold transition duration-300"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold"
            >
              Sign In with Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-slate-800 pt-4 text-center text-sm text-slate-400">
            <div>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-amber-500 hover:text-amber-400 font-semibold underline">
                Register
              </Link>
            </div>
            
            {/* Quick Login Section for Reviewers */}
            <div className="w-full bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                Quick Demo Accounts (1-Click)
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-blue-900/40 text-blue-200 border border-blue-800/40 hover:bg-blue-900/60 text-xs py-1 px-2 h-auto"
                  onClick={() => handleQuickLogin('SUPER_ADMIN')}
                >
                  Admin
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-amber-900/40 text-amber-200 border border-amber-800/40 hover:bg-amber-900/60 text-xs py-1 px-2 h-auto"
                  onClick={() => handleQuickLogin('SUPERVISOR')}
                >
                  Supervisor
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-emerald-900/40 text-emerald-200 border border-emerald-800/40 hover:bg-emerald-900/60 text-xs py-1 px-2 h-auto"
                  onClick={() => handleQuickLogin('WORKER')}
                >
                  Weaver
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Right side: Modern Industrial loom image with gradient overlay */}
      <div 
        className="hidden lg:flex lg:w-7/12 relative bg-cover bg-center items-end justify-start p-16"
        style={{ backgroundImage: 'url("/login_background.png")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 bg-slate-950/20" />
        
        <div className="relative z-10 max-w-xl text-left">
          <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-4">
            Industrial ERP System
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Weaving Quality, <br />
            <span className="text-amber-500">Crafting Legacy.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-light">
            Empowering saree manufacturers with end-to-end warp tracking, worker payrolls, and real-time production analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
