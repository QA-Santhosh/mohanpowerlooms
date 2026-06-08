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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Plus, Search, Edit2, Shield, Eye, Trash2, DollarSign } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Zod validation schemas
const bankAccountSchema = z.object({
  accountHolderName: z.string().min(2, 'Holder name is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(8, 'Valid account number is required'),
  ifscCode: z.string().min(4, 'Valid IFSC code is required'),
  upiId: z.string().optional(),
});

const salaryConfigSchema = z.object({
  ratePerSaree: z.number().min(0),
  fixedMonthlySalary: z.number().min(0),
});

const workerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  mobileNumber: z.string().length(10, 'Mobile number must be exactly 10 digits'),
  address: z.string().min(5, 'Full address is required'),
  aadhaarNumber: z.string().length(12, 'Aadhaar must be exactly 12 digits').optional().or(z.literal('')),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  status: z.string(),
  workerType: z.enum(['WEAVER', 'HELPER', 'SUPERVISOR']),
  salaryType: z.enum(['PER_SAREE', 'FIXED_MONTHLY']),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  bankAccount: bankAccountSchema.optional(),
  salaryConfig: salaryConfigSchema.optional(),
  sareeTypeId: z.string().optional().or(z.literal('')),
});

type WorkerFormType = z.infer<typeof workerSchema>;

export default function WorkersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWorkerForDrawer, setSelectedWorkerForDrawer] = useState<any | null>(null);

  // Queries
  const { data: workers, isLoading } = useQuery<any[]>({
    queryKey: ['workers'],
    queryFn: () => api.get<any[]>('/workers'),
  });

  const { data: sareeTypes } = useQuery<any[]>({
    queryKey: ['saree-types'],
    queryFn: () => api.get<any[]>('/saree-types'),
  });

  // Mutators
  const createWorkerMutation = useMutation({
    mutationFn: (data: WorkerFormType) => api.post('/workers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkerFormType }) => api.put(`/workers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsEditOpen(false);
      setEditingWorker(null);
    },
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  // Forms
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WorkerFormType>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      status: 'ACTIVE',
      workerType: 'WEAVER',
      salaryType: 'PER_SAREE',
      sareeTypeId: '',
      bankAccount: {
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
      },
      salaryConfig: {
        ratePerSaree: 0,
        fixedMonthlySalary: 0,
      },
    },
  });

  const salaryTypeVal = watch('salaryType');

  // Trigger form population for editing
  const startEdit = (worker: any) => {
    setEditingWorker(worker);
    setValue('firstName', worker.firstName);
    setValue('lastName', worker.lastName);
    setValue('mobileNumber', worker.mobileNumber);
    setValue('address', worker.address);
    setValue('aadhaarNumber', worker.aadhaarNumber || '');
    setValue('dateOfJoining', new Date(worker.dateOfJoining).toISOString().split('T')[0]);
    setValue('status', worker.status);
    setValue('workerType', worker.workerType);
    setValue('salaryType', worker.salaryType);
    setValue('sareeTypeId', worker.sareeTypeId || '');
    setValue('email', worker.email || '');

    if (worker.bankAccount) {
      setValue('bankAccount.accountHolderName', worker.bankAccount.accountHolderName);
      setValue('bankAccount.bankName', worker.bankAccount.bankName);
      setValue('bankAccount.accountNumber', worker.bankAccount.accountNumber);
      setValue('bankAccount.ifscCode', worker.bankAccount.ifscCode);
      setValue('bankAccount.upiId', worker.bankAccount.upiId || '');
    }

    if (worker.salaryConfig) {
      setValue('salaryConfig.ratePerSaree', worker.salaryConfig.ratePerSaree);
      setValue('salaryConfig.fixedMonthlySalary', worker.salaryConfig.fixedMonthlySalary);
    }
    
    setIsEditOpen(true);
  };

  const onSubmitCreate = (data: WorkerFormType) => {
    // Sanitize blank values
    if (!data.email) delete data.email;
    if (!data.aadhaarNumber) delete data.aadhaarNumber;
    
    // If not PER_SAREE, nullify sareeTypeId. Otherwise, if empty string, nullify it.
    if (data.salaryType !== 'PER_SAREE' || !data.sareeTypeId) {
      data.sareeTypeId = null as any;
    }
    
    createWorkerMutation.mutate(data);
  };

  const onSubmitEdit = (data: WorkerFormType) => {
    if (!data.email) delete data.email;
    if (!data.aadhaarNumber) delete data.aadhaarNumber;
    
    // If not PER_SAREE, nullify sareeTypeId. Otherwise, if empty string, nullify it.
    if (data.salaryType !== 'PER_SAREE' || !data.sareeTypeId) {
      data.sareeTypeId = null as any;
    }
    
    updateWorkerMutation.mutate({ id: editingWorker.id, data });
  };

  const handleOpenDrawer = async (worker: any) => {
    if (!isAdmin) return; // Only Admin can view banking details
    try {
      const detailed = await api.get<any>(`/workers/${worker.id}`);
      setSelectedWorkerForDrawer(detailed);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter and search workers
  const filteredWorkers = (workers || []).filter((w) => {
    const fullName = `${w.firstName} ${w.lastName}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      w.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.mobileNumber.includes(searchTerm);
      
    const matchesType = typeFilter === 'ALL' || w.workerType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Workers Directory</h1>
          <p className="text-sm text-slate-400">View and update workers personal, banking, and salary details.</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all h-10 px-4 py-2 cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Add Worker
            </DialogTrigger>
            <DialogContent className="max-w-2xl sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-200 overflow-y-auto max-h-[90vh] rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Add User & Permissions</DialogTitle>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mt-3">
                  <span className="text-xs text-slate-400 font-semibold">User information</span>
                  <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 text-[10px] font-bold text-slate-200 bg-slate-900/50 hover:bg-slate-800 transition-all cursor-pointer">
                    <Plus className="h-3 w-3 text-emerald-500" /> Add New information
                  </button>
                </div>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-6">

                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
                  <div className="mb-2">
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">User Informations</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quickly select role, details, and access toggles.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">First Name</Label>
                      <Input {...register('firstName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.firstName && <span className="text-xs text-rose-400">{errors.firstName.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Last Name</Label>
                      <Input {...register('lastName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.lastName && <span className="text-xs text-rose-400">{errors.lastName.message}</span>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mobile Number (10 digits)</Label>
                      <Input {...register('mobileNumber')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.mobileNumber && <span className="text-xs text-rose-400">{errors.mobileNumber.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Aadhaar Card (12 digits)</Label>
                      <Input {...register('aadhaarNumber')} placeholder="Optional" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.aadhaarNumber && <span className="text-xs text-rose-400">{errors.aadhaarNumber.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Full Address</Label>
                      <Input {...register('address')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.address && <span className="text-xs text-rose-400">{errors.address.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address (Optional)</Label>
                      <Input {...register('email')} placeholder="Links login account" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Date of Joining</Label>
                      <Input type="date" {...register('dateOfJoining')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                      {errors.dateOfJoining && <span className="text-xs text-rose-400">{errors.dateOfJoining.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Worker Type</Label>
                      <select {...register('workerType')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                        <option value="WEAVER">Weaver</option>
                        <option value="HELPER">Helper</option>
                        <option value="SUPERVISOR">Supervisor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Salary Type</Label>
                      <select {...register('salaryType')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                        <option value="PER_SAREE">Rate Per Saree</option>
                        <option value="FIXED_MONTHLY">Fixed Monthly Salary</option>
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      {salaryTypeVal === 'PER_SAREE' ? (
                        <>
                          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saree Type Assignment</Label>
                          <select {...register('sareeTypeId')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                            <option value="">Select Saree Type</option>
                            {sareeTypes?.map((st: any) => (
                              <option key={st.id} value={st.id}>
                                {st.name} (₹{st.rate}/saree)
                              </option>
                            ))}
                          </select>
                          {errors.sareeTypeId && <span className="text-xs text-rose-400">{errors.sareeTypeId.message}</span>}
                        </>
                      ) : (
                        <>
                          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fixed Monthly Salary (₹)</Label>
                          <Input type="number" step="any" {...register('salaryConfig.fixedMonthlySalary', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                          {errors.salaryConfig?.fixedMonthlySalary && <span className="text-xs text-rose-400">{errors.salaryConfig.fixedMonthlySalary.message}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Account Section */}
                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4 mt-5">
                  <div className="mb-2">
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Banking Details</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Configure worker banking coordinates for payout disbursement.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Holder Name</Label>
                      <Input {...register('bankAccount.accountHolderName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.bankAccount?.accountHolderName && <span className="text-xs text-rose-400">{errors.bankAccount.accountHolderName.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bank Name</Label>
                      <Input {...register('bankAccount.bankName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.bankAccount?.bankName && <span className="text-xs text-rose-400">{errors.bankAccount.bankName.message}</span>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Number</Label>
                      <Input {...register('bankAccount.accountNumber')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.bankAccount?.accountNumber && <span className="text-xs text-rose-400">{errors.bankAccount.accountNumber.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">IFSC Code</Label>
                      <Input {...register('bankAccount.ifscCode')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 font-mono" />
                      {errors.bankAccount?.ifscCode && <span className="text-xs text-rose-400">{errors.bankAccount.ifscCode.message}</span>}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">UPI ID (Optional)</Label>
                    <Input {...register('bankAccount.upiId')} placeholder="e.g. name@okaxis" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/60 mt-6">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsCreateOpen(false)}
                    className="text-slate-450 hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createWorkerMutation.isPending} 
                    className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
                  >
                    {createWorkerMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters & Search Control Bar */}
      <Card className="bg-slate-900 border-slate-800 shadow-md">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by worker name, ID, or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border-slate-800 pl-10 text-slate-200"
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto shrink-0">
            <div className="w-1/2 md:w-40">
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'ALL')}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Worker Type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="WEAVER">Weaver</SelectItem>
                  <SelectItem value="HELPER">Helper</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2 md:w-40">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Workers Table */}
      <Card className="bg-slate-900 border-slate-800 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No workers match selected criteria.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-950 border-slate-800">
                <TableRow className="border-slate-800 hover:bg-slate-950">
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">ID</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Name</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Mobile</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Wages Type</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-right text-slate-400 font-bold text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-xs text-amber-500">{worker.workerId}</TableCell>
                    <TableCell 
                      className={`font-semibold ${isAdmin ? 'text-slate-200 hover:text-amber-500 cursor-pointer underline decoration-dotted' : 'text-slate-200'}`}
                      onClick={() => handleOpenDrawer(worker)}
                    >
                      {worker.firstName} {worker.lastName}
                    </TableCell>
                    <TableCell className="text-slate-300">{worker.mobileNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase bg-slate-950 border-slate-800 text-slate-300">
                        {worker.workerType.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {worker.salaryType === 'PER_SAREE' ? (
                        <div>
                          <span className="block text-slate-300">Rate Per Saree</span>
                          {worker.sareeType && (
                            <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider block mt-0.5">
                              {worker.sareeType.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="block text-slate-300">Fixed Monthly</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={worker.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}>
                        {worker.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {isAdmin && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => startEdit(worker)}
                            className="text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 h-8 w-8"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if (confirm(`Delete worker ${worker.firstName}?`)) {
                                deleteWorkerMutation.mutate(worker.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 h-8 w-8"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenDrawer(worker)}
                          className="text-slate-400 hover:text-blue-500 hover:bg-slate-800/50 h-8 w-8"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Worker Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-200 overflow-y-auto max-h-[90vh] rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Edit User & Permissions</DialogTitle>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mt-3">
              <span className="text-xs text-slate-400 font-semibold">User information</span>
              <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 text-[10px] font-bold text-slate-200 bg-slate-900/50 hover:bg-slate-800 transition-all cursor-pointer">
                <Plus className="h-3 w-3 text-emerald-500" /> Add New information
              </button>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">

            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
              <div className="mb-2">
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">User Informations</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quickly edit role, details, and access status.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">First Name</Label>
                  <Input {...register('firstName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.firstName && <span className="text-xs text-rose-400">{errors.firstName.message}</span>}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Last Name</Label>
                  <Input {...register('lastName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.lastName && <span className="text-xs text-rose-400">{errors.lastName.message}</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mobile Number</Label>
                  <Input {...register('mobileNumber')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.mobileNumber && <span className="text-xs text-rose-400">{errors.mobileNumber.message}</span>}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Aadhaar Card</Label>
                  <Input {...register('aadhaarNumber')} placeholder="Optional" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.aadhaarNumber && <span className="text-xs text-rose-400">{errors.aadhaarNumber.message}</span>}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</Label>
                  <select {...register('status')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Full Address</Label>
                  <Input {...register('address')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.address && <span className="text-xs text-rose-400">{errors.address.message}</span>}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address (Optional)</Label>
                  <Input {...register('email')} placeholder="Links login account" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Date of Joining</Label>
                  <Input type="date" {...register('dateOfJoining')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                  {errors.dateOfJoining && <span className="text-xs text-rose-400">{errors.dateOfJoining.message}</span>}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Worker Type</Label>
                  <select {...register('workerType')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                    <option value="WEAVER">Weaver</option>
                    <option value="HELPER">Helper</option>
                    <option value="SUPERVISOR">Supervisor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Salary Type</Label>
                  <select {...register('salaryType')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                    <option value="PER_SAREE">Rate Per Saree</option>
                    <option value="FIXED_MONTHLY">Fixed Monthly Salary</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  {salaryTypeVal === 'PER_SAREE' ? (
                    <>
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saree Type Assignment</Label>
                      <select {...register('sareeTypeId')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                        <option value="">Select Saree Type</option>
                        {sareeTypes?.map((st: any) => (
                          <option key={st.id} value={st.id}>
                            {st.name} (₹{st.rate}/saree)
                          </option>
                        ))}
                      </select>
                      {errors.sareeTypeId && <span className="text-xs text-rose-400">{errors.sareeTypeId.message}</span>}
                    </>
                  ) : (
                    <>
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fixed Monthly Salary (₹)</Label>
                      <Input type="number" step="any" {...register('salaryConfig.fixedMonthlySalary', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.salaryConfig?.fixedMonthlySalary && <span className="text-xs text-rose-400">{errors.salaryConfig.fixedMonthlySalary.message}</span>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bank Account Section */}
            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4 mt-5">
              <div className="mb-2">
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Banking Details</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Update worker banking coordinates for payout disbursement.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Holder Name</Label>
                  <Input {...register('bankAccount.accountHolderName')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bank Name</Label>
                  <Input {...register('bankAccount.bankName')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Number</Label>
                  <Input {...register('bankAccount.accountNumber')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">IFSC Code</Label>
                  <Input {...register('bankAccount.ifscCode')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 font-mono" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">UPI ID (Optional)</Label>
                <Input {...register('bankAccount.upiId')} placeholder="e.g. name@okaxis" className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/60 mt-6">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsEditOpen(false)}
                className="text-slate-450 hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateWorkerMutation.isPending} 
                className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
              >
                {updateWorkerMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Drawer to View Detailed Bank Info (Admin only) */}
      <Drawer open={!!selectedWorkerForDrawer} onOpenChange={() => setSelectedWorkerForDrawer(null)}>
        <DrawerContent className="bg-slate-950 border-slate-800 text-slate-200 p-6 max-w-md mx-auto">
          {selectedWorkerForDrawer && (
            <div className="space-y-6">
              <DrawerHeader className="p-0">
                <DrawerTitle className="text-xl font-bold text-amber-500 uppercase tracking-wide">
                  {selectedWorkerForDrawer.firstName} {selectedWorkerForDrawer.lastName}
                </DrawerTitle>
                <DrawerDescription className="text-slate-400 font-mono text-xs">
                  ID: {selectedWorkerForDrawer.workerId} • Joined: {new Date(selectedWorkerForDrawer.dateOfJoining).toLocaleDateString()}
                </DrawerDescription>
              </DrawerHeader>

              {/* Financial Summary */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-500" /> Salary Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Salary Schema</span>
                    <span className="font-semibold text-slate-200 capitalize">{selectedWorkerForDrawer.salaryType.toLowerCase().replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">
                      {selectedWorkerForDrawer.salaryType === 'PER_SAREE' ? 'Rate / Saree' : 'Monthly Salary'}
                    </span>
                    <span className="font-semibold text-slate-200 flex flex-col">
                      <span>
                        ₹{selectedWorkerForDrawer.salaryType === 'PER_SAREE' 
                          ? selectedWorkerForDrawer.salaryConfig?.ratePerSaree 
                          : selectedWorkerForDrawer.salaryConfig?.fixedMonthlySalary}
                      </span>
                      {selectedWorkerForDrawer.salaryType === 'PER_SAREE' && selectedWorkerForDrawer.sareeType && (
                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">
                          {selectedWorkerForDrawer.sareeType.name}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Bank Details (Confidential)
                </h3>
                {selectedWorkerForDrawer.bankAccount ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs block">Account Holder</span>
                      <span className="font-medium text-slate-200">{selectedWorkerForDrawer.bankAccount.accountHolderName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 text-xs block">Bank Name</span>
                        <span className="font-medium text-slate-200">{selectedWorkerForDrawer.bankAccount.bankName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">IFSC Code</span>
                        <span className="font-mono text-slate-200">{selectedWorkerForDrawer.bankAccount.ifscCode}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Account Number</span>
                      <span className="font-mono text-slate-200 font-semibold">{selectedWorkerForDrawer.bankAccount.accountNumber}</span>
                    </div>
                    {selectedWorkerForDrawer.bankAccount.upiId && (
                      <div>
                        <span className="text-slate-400 text-xs block">UPI Address</span>
                        <span className="font-mono text-amber-500">{selectedWorkerForDrawer.bankAccount.upiId}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No banking records submitted.</p>
                )}
              </div>

              <DrawerFooter className="p-0 pt-4">
                <Button onClick={() => setSelectedWorkerForDrawer(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 w-full">
                  Close Details
                </Button>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
