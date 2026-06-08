'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Plus, DollarSign, ArrowUpRight, Ban, Calendar, CreditCard, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const paymentSchema = z.object({
  workerId: z.string().min(1, 'Worker selection is required'),
  amount: z.number().min(1, 'Payment amount must be at least ₹1'),
  paymentDate: z.string().min(1, 'Date is required'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormType = z.infer<typeof paymentSchema>;

export default function SalaryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isWorker = user?.role === 'WORKER';

  // State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paymentFilterWorker, setPaymentFilterWorker] = useState('ALL');

  const isSupervisor = user?.role === 'SUPERVISOR';

  // Queries
  const { data: ledger, isLoading: ledgerLoading } = useQuery<any>({
    queryKey: ['ledger'],
    queryFn: () => {
      if (isWorker) {
        return api.get<any>('/payments/ledger/me'); // Return single object
      }
      return api.get<any[]>('/payments/ledger'); // Return array
    },
    enabled: !isSupervisor,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: ['payments', paymentFilterWorker],
    queryFn: () => {
      let query = '/payments?';
      if (paymentFilterWorker !== 'ALL') query += `workerId=${paymentFilterWorker}&`;
      return api.get<any[]>(query);
    },
    enabled: !isSupervisor,
  });

  const { data: workers } = useQuery<any[]>({
    queryKey: ['workers'],
    queryFn: () => api.get<any[]>('/workers'),
    enabled: isAdmin && !isSupervisor,
  });

  // Mutators
  const recordPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormType) => api.post('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsPayOpen(false);
      reset();
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  // Forms
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PaymentFormType>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI',
      amount: 0,
      notes: '',
    },
  });

  // Block Supervisors
  if (isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-3">
        <Ban className="h-10 w-10 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-200">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-sm">Supervisors are restricted from viewing salary rates, ledgers, or banking transaction folders.</p>
      </div>
    );
  }

  const onSubmitPayment = (data: PaymentFormType) => {
    recordPaymentMutation.mutate(data);
  };

  const handleOpenPayForWorker = (workerId: string) => {
    setValue('workerId', workerId);
    setIsPayOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const isLoading = ledgerLoading || paymentsLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Salary & Banking</h1>
          <p className="text-sm text-slate-400">Track worker earnings, issue salary payments, and view outstanding balances.</p>
        </div>
        {isAdmin && (
          <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all h-10 px-4 py-2 cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-md bg-slate-900 border-slate-800 text-slate-200 rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Disburse Salary Payment</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
                  Log a payment to deduct from the weaver&apos;s outstanding balance.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-6">
                
                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Weaver / Worker</Label>
                    <select {...register('workerId')} className="flex h-10 w-full rounded-xl border border-slate-850 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                      <option value="">-- Choose Worker --</option>
                      {(workers || []).map((w) => (
                        <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.workerId})</option>
                      ))}
                    </select>
                    {errors.workerId && <span className="text-xs text-rose-400">{errors.workerId.message}</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Amount (₹)</Label>
                      <Input type="number" step="any" {...register('amount', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.amount && <span className="text-xs text-rose-400">{errors.amount.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Payment Date</Label>
                      <Input type="date" {...register('paymentDate')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                      {errors.paymentDate && <span className="text-xs text-rose-400">{errors.paymentDate.message}</span>}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Payment Method</Label>
                    <select {...register('paymentMethod')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                      <option value="UPI">UPI Transfer</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                      <option value="CASH">Cash in Hand</option>
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Reference / Transaction Number</Label>
                    <Input {...register('referenceNumber')} placeholder="UPI Ref / NEFT ID / Voucher No." className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Internal Notes</Label>
                    <Input {...register('notes')} placeholder="e.g. Paid weekly advance" className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/60 mt-6">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsPayOpen(false)}
                    className="text-slate-455 hover:text-slate-250 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={recordPaymentMutation.isPending} 
                    className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
                  >
                    {recordPaymentMutation.isPending ? 'Processing...' : 'Disburse'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : (
        <>
          {/* 1. Worker View: Single Card Ledger */}
          {isWorker && ledger && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-slate-900 border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Total Wages Earned</span>
                  <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{formatCurrency(ledger.totalEarned)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-4">Accumulated based on net sarees woven</p>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Total Wages Paid</span>
                  <span className="text-3xl font-extrabold text-emerald-400 mt-2 block">{formatCurrency(ledger.totalPaid)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-4">Transferred via bank or UPI payments</p>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Pending Balance Owed</span>
                  <span className="text-3xl font-extrabold text-amber-500 mt-2 block">{formatCurrency(ledger.totalPending)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-4">Wages awaiting processing</p>
              </Card>
            </div>
          )}

          {/* 2. Admin View: Complete Ledger Table */}
          {isAdmin && (
            <Card className="bg-slate-900 border-slate-800 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Worker Salary Ledger Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-950 border-slate-800">
                    <TableRow className="border-slate-800 hover:bg-slate-950">
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Worker</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">ID</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Total Earned</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Total Paid</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Pending Balance</TableHead>
                      <TableHead className="text-right text-slate-400 font-bold text-xs uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ledger || []).map((account: any) => (
                      <TableRow key={account.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-semibold text-slate-200">
                          {account.worker?.firstName} {account.worker?.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{account.worker?.workerId}</TableCell>
                        <TableCell className="text-slate-300">{formatCurrency(account.totalEarned)}</TableCell>
                        <TableCell className="text-emerald-450">{formatCurrency(account.totalPaid)}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${account.totalPending > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                            {formatCurrency(account.totalPending)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleOpenPayForWorker(account.worker?.id)}
                            className="bg-slate-800 hover:bg-slate-800 text-amber-500 border border-slate-800 text-xs py-1 px-3.5 h-auto font-semibold"
                          >
                            Pay Wages
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* 3. Payments Ledger Transactions history */}
          <Card className="bg-slate-900 border-slate-800 shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <CardTitle className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Payout Transaction History
              </CardTitle>

              {isAdmin && (
                <div className="w-full sm:w-48">
                  <select 
                    value={paymentFilterWorker} 
                    onChange={(e) => setPaymentFilterWorker(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-200"
                  >
                    <option value="ALL">All Workers</option>
                    {(workers || []).map((w) => (
                      <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {(payments || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No payout transactions recorded.</p>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-950 border-slate-800">
                    <TableRow className="border-slate-800 hover:bg-slate-950">
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">TXN ID</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Date</TableHead>
                      {!isWorker && <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Worker</TableHead>}
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Amount</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Method</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Ref Number</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Notes</TableHead>
                      {isAdmin && <TableHead className="text-right text-slate-400 font-bold text-xs uppercase tracking-wide">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payments || []).map((payment) => (
                      <TableRow key={payment.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-mono text-xs text-amber-500">{payment.transactionId}</TableCell>
                        <TableCell className="text-slate-300">{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        {!isWorker && <TableCell className="font-semibold text-slate-200">{payment.worker?.firstName} {payment.worker?.lastName}</TableCell>}
                        <TableCell className="text-emerald-450 font-bold">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase bg-slate-950 border-slate-800 text-slate-300">
                            {payment.paymentMethod.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{payment.referenceNumber || '-'}</TableCell>
                        <TableCell className="text-slate-400 text-xs italic">{payment.notes || '-'}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (confirm(`Reverse payment transaction ${payment.transactionId}?`)) {
                                  deletePaymentMutation.mutate(payment.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 h-8 w-8"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
