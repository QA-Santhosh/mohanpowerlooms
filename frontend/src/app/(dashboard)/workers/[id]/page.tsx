'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Mail, 
  Shield, 
  DollarSign, 
  CreditCard,
  Building
} from 'lucide-react';

export default function WorkerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;

  const { data: worker, isLoading, error } = useQuery<any>({
    queryKey: ['worker-profile', id],
    queryFn: () => api.get<any>(`/workers/${id}`),
    enabled: !!id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <Shield className="h-12 w-12 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-slate-200">Access Denied / Profile Not Found</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          You do not have permission to view this profile, or the worker record does not exist.
        </p>
        <Button 
          onClick={() => router.push('/dashboard')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const userInitials = `${worker.firstName?.charAt(0) || ''}${worker.lastName?.charAt(0) || ''}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back navigation & Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="text-slate-400 hover:text-slate-200 pl-0 hover:bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Badge className={worker.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}>
          {worker.status}
        </Badge>
      </div>

      {/* Main Profile Info Row */}
      <Card className="bg-slate-900 border-slate-800/80 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
          {/* Avatar circle */}
          <div className="h-24 w-24 rounded-full bg-slate-950 border-2 border-amber-500/40 flex items-center justify-center text-3xl font-bold text-amber-500 shadow-lg shrink-0">
            {userInitials}
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                {worker.firstName} {worker.lastName}
              </h1>
              <p className="text-xs font-mono text-amber-500 mt-1 uppercase tracking-wider">
                Worker ID: {worker.workerId}
              </p>
            </div>

            {/* Quick stats tags */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
              <Badge variant="outline" className="text-xs bg-slate-950 border-slate-800 text-slate-300 capitalize">
                Role: {worker.workerType.toLowerCase()}
              </Badge>
              <Badge variant="outline" className="text-xs bg-slate-950 border-slate-800 text-slate-300">
                Wages: {worker.salaryType === 'PER_SAREE' ? 'Rate Per Saree' : 'Fixed Monthly'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of detail sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Contact & Personal Info */}
        <Card className="bg-slate-900 border-slate-800/80 shadow-md">
          <CardHeader className="pb-2 border-b border-slate-800/50">
            <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-amber-500" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block">Phone Number</span>
                <span className="font-semibold text-slate-200">{worker.mobileNumber}</span>
              </div>
            </div>
            {worker.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Email Address</span>
                  <span className="font-semibold text-slate-200">{worker.email}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block">Date of Joining</span>
                <span className="font-semibold text-slate-200">
                  {new Date(worker.dateOfJoining).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
            {worker.aadhaarNumber && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-slate-500 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Aadhaar Card</span>
                  <span className="font-mono text-slate-200">{worker.aadhaarNumber}</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
              <div>
                <span className="text-xs text-slate-500 block">Address</span>
                <span className="text-slate-200 leading-relaxed">{worker.address}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Salary Config */}
        <Card className="bg-slate-900 border-slate-800/80 shadow-md">
          <CardHeader className="pb-2 border-b border-slate-800/50">
            <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" /> Salary Config
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-sm text-slate-300">
            <div>
              <span className="text-xs text-slate-500 block">Compensation Type</span>
              <span className="font-semibold text-slate-200 uppercase">
                {worker.salaryType.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">
                {worker.salaryType === 'PER_SAREE' ? 'Wages Rate Per Saree' : 'Fixed Monthly Salary'}
              </span>
              <span className="text-2xl font-bold text-amber-500 block mt-1">
                {worker.salaryType === 'PER_SAREE' 
                  ? formatCurrency(worker.salaryConfig?.ratePerSaree) 
                  : formatCurrency(worker.salaryConfig?.fixedMonthlySalary)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Secure Bank Account Details */}
      <Card className="bg-slate-900 border-slate-800/80 shadow-md">
        <CardHeader className="pb-2 border-b border-slate-800/50">
          <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" /> Bank Details (Confidential)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {worker.bankAccount ? (
            <div className="grid gap-6 sm:grid-cols-2 text-sm text-slate-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-xs text-slate-500 block">Account Holder Name</span>
                    <span className="font-semibold text-slate-200">{worker.bankAccount.accountHolderName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-xs text-slate-500 block">Bank Name</span>
                    <span className="font-semibold text-slate-200">{worker.bankAccount.bankName}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 block">Account Number</span>
                  <span className="font-mono text-slate-200 font-semibold">{worker.bankAccount.accountNumber}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 block">IFSC Code</span>
                    <span className="font-mono text-slate-200">{worker.bankAccount.ifscCode}</span>
                  </div>
                  {worker.bankAccount.upiId && (
                    <div>
                      <span className="text-xs text-slate-500 block">UPI Address</span>
                      <span className="font-mono text-amber-500">{worker.bankAccount.upiId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">No banking records configured for this profile.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
