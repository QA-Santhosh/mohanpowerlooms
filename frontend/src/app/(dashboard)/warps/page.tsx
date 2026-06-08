'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { Plus, Edit2, Layers, Calendar, ClipboardCheck, Users, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const warpSchema = z.object({
  warpName: z.string().min(2, 'Warp Name is required'),
  designName: z.string().min(2, 'Design Name is required'),
  sareeType: z.string().min(2, 'Saree Type is required'),
  color: z.string().min(2, 'Color is required'),
  yarnQuality: z.string().min(2, 'Yarn Quality details are required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']),
  expectedSarees: z.number().min(1, 'Expected sarees must be at least 1'),
  expectedWarpLength: z.number().min(1, 'Warp length is required'),
  productionTarget: z.number().min(1, 'Target count is required'),
  assignedWorkerIds: z.array(z.string()).optional(),
});

type WarpFormType = z.infer<typeof warpSchema>;

export default function WarpsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWarp, setEditingWarp] = useState<any | null>(null);

  // Queries
  const { data: warps, isLoading: warpsLoading } = useQuery<any[]>({
    queryKey: ['warps'],
    queryFn: () => api.get<any[]>('/warps'),
  });

  const { data: workers } = useQuery<any[]>({
    queryKey: ['workers'],
    queryFn: () => api.get<any[]>('/workers'),
  });

  // Mutators
  const createWarpMutation = useMutation({
    mutationFn: (data: WarpFormType) => api.post('/warps', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warps'] });
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateWarpMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WarpFormType }) => api.put(`/warps/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warps'] });
      setIsEditOpen(false);
      setEditingWarp(null);
    },
  });

  const deleteWarpMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/warps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warps'] });
    },
  });

  // Forms
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<WarpFormType>({
    resolver: zodResolver(warpSchema),
    defaultValues: {
      status: 'ACTIVE',
      expectedSarees: 40,
      expectedWarpLength: 240,
      productionTarget: 45,
      assignedWorkerIds: [],
    },
  });

  const selectedWorkers = watch('assignedWorkerIds') || [];

  const handleWorkerToggle = (workerId: string) => {
    const current = [...selectedWorkers];
    const idx = current.indexOf(workerId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(workerId);
    }
    setValue('assignedWorkerIds', current);
  };

  const onSubmitCreate = (data: WarpFormType) => {
    if (!data.endDate) delete data.endDate;
    createWarpMutation.mutate(data);
  };

  const onSubmitEdit = (data: WarpFormType) => {
    if (!data.endDate) delete data.endDate;
    updateWarpMutation.mutate({ id: editingWarp.id, data });
  };

  const startEdit = (warp: any) => {
    setEditingWarp(warp);
    setValue('warpName', warp.warpName);
    setValue('designName', warp.designName);
    setValue('sareeType', warp.sareeType);
    setValue('color', warp.color);
    setValue('yarnQuality', warp.yarnQuality);
    setValue('startDate', new Date(warp.startDate).toISOString().split('T')[0]);
    setValue('endDate', warp.endDate ? new Date(warp.endDate).toISOString().split('T')[0] : '');
    setValue('status', warp.status);
    setValue('expectedSarees', warp.expectedSarees);
    setValue('expectedWarpLength', warp.expectedWarpLength);
    setValue('productionTarget', warp.productionTarget);
    setValue('assignedWorkerIds', warp.assignments?.map((a: any) => a.workerId) || []);
    setIsEditOpen(true);
  };

  // Group warps by status
  const groupedWarps = {
    ACTIVE: (warps || []).filter(w => w.status === 'ACTIVE'),
    ON_HOLD: (warps || []).filter(w => w.status === 'ON_HOLD'),
    COMPLETED: (warps || []).filter(w => w.status === 'COMPLETED'),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Warp Yarn Management (Paavu)</h1>
          <p className="text-sm text-slate-400">Design, length configuration, and weaver assignments for active warps.</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all h-10 px-4 py-2 cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Add Warp Paavu
            </DialogTrigger>
            <DialogContent className="max-w-2xl sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-200 overflow-y-auto max-h-[90vh] rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Configure New Warp Yarn</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
                  Define yarn characteristics, length targets, and weave assignments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-6">
                
                {/* Section header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/10">
                    Warp Thread Configuration
                  </span>
                </div>

                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
                  <div className="mb-2">
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Yarn Parameters</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quickly select yarn color, design patterns, and name.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Warp (Paavu) Name</Label>
                      <Input {...register('warpName')} placeholder="e.g. Soft Silk Paavu Blue" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.warpName && <span className="text-xs text-rose-400">{errors.warpName.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Design Name</Label>
                      <Input {...register('designName')} placeholder="e.g. Kanchipuram Border" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.designName && <span className="text-xs text-rose-400">{errors.designName.message}</span>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saree Type</Label>
                      <Input {...register('sareeType')} placeholder="e.g. Silk Saree" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.sareeType && <span className="text-xs text-rose-400">{errors.sareeType.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Color</Label>
                      <Input {...register('color')} placeholder="e.g. Royal Blue" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.color && <span className="text-xs text-rose-400">{errors.color.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Yarn Quality</Label>
                      <Input {...register('yarnQuality')} placeholder="e.g. 60 Count Silk" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.yarnQuality && <span className="text-xs text-rose-400">{errors.yarnQuality.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Expected Sarees</Label>
                      <Input type="number" {...register('expectedSarees', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.expectedSarees && <span className="text-xs text-rose-400">{errors.expectedSarees.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Warp Length (Meters)</Label>
                      <Input type="number" step="any" {...register('expectedWarpLength', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.expectedWarpLength && <span className="text-xs text-rose-400">{errors.expectedWarpLength.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Production Target</Label>
                      <Input type="number" {...register('productionTarget', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.productionTarget && <span className="text-xs text-rose-400">{errors.productionTarget.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Start Date</Label>
                      <Input type="date" {...register('startDate')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                      {errors.startDate && <span className="text-xs text-rose-400">{errors.startDate.message}</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">End Date (Optional)</Label>
                      <Input type="date" {...register('endDate')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                    </div>
                  </div>
                </div>

                {/* Weaver Multi-Select Section */}
                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4 mt-5">
                  <div className="mb-2">
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Weaver Assignments</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Select and assign weavers responsible for weaving this warp yarn.</p>
                  </div>
                  
                  <div>
                    <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(workers || []).map((worker) => (
                        <div 
                          key={worker.id} 
                          onClick={() => handleWorkerToggle(worker.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition border ${
                            selectedWorkers.includes(worker.id) 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold' 
                              : 'border-slate-800 hover:bg-slate-850/40 text-slate-400'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={selectedWorkers.includes(worker.id)}
                            onChange={() => {}} // Controlled via card click
                            className="accent-emerald-500 pointer-events-none"
                          />
                          <span className="text-xs truncate">{worker.firstName} {worker.lastName} ({worker.workerId})</span>
                        </div>
                      ))}
                    </div>
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
                    disabled={createWarpMutation.isPending} 
                    className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
                  >
                    {createWarpMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban / Status Grid Columns */}
      {warpsLoading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Active column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <h3 className="text-sm font-bold text-blue-400 tracking-wide uppercase flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Active Paavu ({groupedWarps.ACTIVE.length})
              </h3>
            </div>
            <div className="space-y-4">
              {groupedWarps.ACTIVE.map((warp) => (
                <WarpCard key={warp.id} warp={warp} onEdit={startEdit} isAdmin={isAdmin} onDelete={deleteWarpMutation.mutate} />
              ))}
              {groupedWarps.ACTIVE.length === 0 && <p className="text-xs text-slate-500 italic text-center py-6">No active warp yarns.</p>}
            </div>
          </div>

          {/* On Hold column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <h3 className="text-sm font-bold text-amber-450 tracking-wide uppercase flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> On Hold ({groupedWarps.ON_HOLD.length})
              </h3>
            </div>
            <div className="space-y-4">
              {groupedWarps.ON_HOLD.map((warp) => (
                <WarpCard key={warp.id} warp={warp} onEdit={startEdit} isAdmin={isAdmin} onDelete={deleteWarpMutation.mutate} />
              ))}
              {groupedWarps.ON_HOLD.length === 0 && <p className="text-xs text-slate-500 italic text-center py-6">No warps on hold.</p>}
            </div>
          </div>

          {/* Completed column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <h3 className="text-sm font-bold text-emerald-450 tracking-wide uppercase flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed ({groupedWarps.COMPLETED.length})
              </h3>
            </div>
            <div className="space-y-4">
              {groupedWarps.COMPLETED.map((warp) => (
                <WarpCard key={warp.id} warp={warp} onEdit={startEdit} isAdmin={isAdmin} onDelete={deleteWarpMutation.mutate} />
              ))}
              {groupedWarps.COMPLETED.length === 0 && <p className="text-xs text-slate-500 italic text-center py-6">No completed warps.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Warp Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-200 overflow-y-auto max-h-[90vh] rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Edit Warp Configuration</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
              Update design settings, targets, and assignments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
            
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/10">
                Warp Thread Configuration
              </span>
            </div>

            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
              <div className="mb-2">
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Yarn Parameters</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Edit yarn color, design configurations, and status.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Warp Name</Label>
                  <Input {...register('warpName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.warpName && <span className="text-xs text-rose-400">{errors.warpName.message}</span>}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Design Name</Label>
                  <Input {...register('designName')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.designName && <span className="text-xs text-rose-400">{errors.designName.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saree Type</Label>
                  <Input {...register('sareeType')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Color</Label>
                  <Input {...register('color')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Yarn Quality</Label>
                  <Input {...register('yarnQuality')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Expected Sarees</Label>
                  <Input type="number" {...register('expectedSarees', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Warp Length (M)</Label>
                  <Input type="number" step="any" {...register('expectedWarpLength', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Target Count</Label>
                  <Input type="number" {...register('productionTarget', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</Label>
                  <select {...register('status')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Start Date</Label>
                  <Input type="date" {...register('startDate')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">End Date (Optional)</Label>
                  <Input type="date" {...register('endDate')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                </div>
              </div>
            </div>

            {/* Weaver Multi-Select Section */}
            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4 mt-5">
              <div className="mb-2">
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Weaver Assignments</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Select and assign weavers responsible for weaving this warp yarn.</p>
              </div>
              
              <div>
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(workers || []).map((worker) => (
                    <div 
                      key={worker.id} 
                      onClick={() => handleWorkerToggle(worker.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition border ${
                        selectedWorkers.includes(worker.id) 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold' 
                          : 'border-slate-800 hover:bg-slate-855/40 text-slate-400'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedWorkers.includes(worker.id)}
                        onChange={() => {}}
                        className="accent-emerald-500 pointer-events-none"
                      />
                      <span className="text-xs truncate">{worker.firstName} {worker.lastName}</span>
                    </div>
                  ))}
                </div>
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
                disabled={updateWarpMutation.isPending} 
                className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
              >
                {updateWarpMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponent: WarpCard
function WarpCard({ warp, onEdit, isAdmin, onDelete }: { warp: any; onEdit: (warp: any) => void; isAdmin: boolean; onDelete: (id: string) => void }) {
  const progress = warp.stats?.progressPercentage || 0;
  const produced = warp.stats?.producedSarees || 0;
  const expected = warp.expectedSarees;

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 shadow transition duration-200">
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="overflow-hidden">
          <CardTitle className="text-base font-bold text-slate-200 truncate">{warp.warpName}</CardTitle>
          <span className="text-[10px] font-mono text-amber-500">{warp.warpId}</span>
        </div>
        {isAdmin && (
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(warp)}
              className="text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 h-7 w-7"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (confirm(`Delete warp Paavu ${warp.warpName}?`)) {
                  onDelete(warp.id);
                }
              }}
              className="text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 h-7 w-7"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Characteristics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800 py-2">
          <div>
            <span className="text-slate-500 block">Design</span>
            <span className="font-semibold text-slate-300">{warp.designName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Color / Quality</span>
            <span className="font-semibold text-slate-300 truncate block">{warp.color} ({warp.yarnQuality})</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Produced: {produced} / {expected}</span>
            <span className="text-amber-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Info Rows */}
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-500" /> {new Date(warp.startDate).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3 text-slate-500" /> Target: {warp.productionTarget}</span>
        </div>

        {/* Assigned Workers badges */}
        {warp.assignments && warp.assignments.length > 0 && (
          <div className="space-y-1.5 border-t border-slate-800 pt-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-500" /> Assigned Weavers
            </span>
            <div className="flex flex-wrap gap-1">
              {warp.assignments.map((asg: any) => (
                <Badge key={asg.id} variant="outline" className="text-[10px] bg-slate-950 border-slate-800 text-slate-400 font-medium">
                  {asg.worker?.firstName} {asg.worker?.lastName?.charAt(0)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
