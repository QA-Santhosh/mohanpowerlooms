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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Search, Calendar, RefreshCcw, Trash2, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const productionSchema = z.object({
  productionDate: z.string().min(1, 'Date is required'),
  workerId: z.string().min(1, 'Worker selection is required'),
  warpYarnId: z.string().min(1, 'Warp Yarn selection is required'),
  sareeCount: z.number().min(0, 'Saree count cannot be negative'),
  defectiveSareeCount: z.number().min(0, 'Defective count cannot be negative'),
  remarks: z.string().optional(),
});

type ProductionFormType = z.infer<typeof productionSchema>;

export default function ProductionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isWorker = user?.role === 'WORKER';
  const canWrite = isAdmin || isSupervisor;

  // Filters state
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState('ALL');
  const [selectedWarpFilter, setSelectedWarpFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);

  // Queries
  const { data: productions, isLoading } = useQuery<any[]>({
    queryKey: ['productions', selectedWorkerFilter, selectedWarpFilter, startDateFilter, endDateFilter],
    queryFn: () => {
      let query = '/production?';
      if (selectedWorkerFilter !== 'ALL') query += `workerId=${selectedWorkerFilter}&`;
      if (selectedWarpFilter !== 'ALL') query += `warpYarnId=${selectedWarpFilter}&`;
      if (startDateFilter) query += `startDate=${startDateFilter}&`;
      if (endDateFilter) query += `endDate=${endDateFilter}&`;
      return api.get<any[]>(query);
    },
  });

  const { data: workers } = useQuery<any[]>({
    queryKey: ['workers'],
    queryFn: () => api.get<any[]>('/workers'),
    enabled: !isWorker, // Workers don't need listing other workers
  });

  const { data: warps } = useQuery<any[]>({
    queryKey: ['warps'],
    queryFn: () => api.get<any[]>('/warps'),
  });

  // Mutators
  const createProductionMutation = useMutation({
    mutationFn: (data: ProductionFormType) => api.post('/production', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateProductionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductionFormType }) => api.put(`/production/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      setIsEditOpen(false);
      setEditingEntry(null);
    },
  });

  const deleteProductionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/production/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
    },
  });

  // Forms
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductionFormType>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      productionDate: new Date().toISOString().split('T')[0],
      workerId: isWorker ? user.workerProfile?.id || '' : '',
      sareeCount: 0,
      defectiveSareeCount: 0,
      remarks: '',
    },
  });

  const sareeCountVal = watch('sareeCount') || 0;
  const defectiveVal = watch('defectiveSareeCount') || 0;
  const netSareesPreview = Math.max(0, sareeCountVal - defectiveVal);

  const onSubmitCreate = (data: ProductionFormType) => {
    createProductionMutation.mutate(data);
  };

  const onSubmitEdit = (data: ProductionFormType) => {
    updateProductionMutation.mutate({ id: editingEntry.id, data });
  };

  const startEdit = (entry: any) => {
    setEditingEntry(entry);
    setValue('productionDate', new Date(entry.productionDate).toISOString().split('T')[0]);
    setValue('workerId', entry.workerId);
    setValue('warpYarnId', entry.warpYarnId);
    setValue('sareeCount', entry.sareeCount);
    setValue('defectiveSareeCount', entry.defectiveSareeCount);
    setValue('remarks', entry.remarks || '');
    setIsEditOpen(true);
  };

  // Filter logs by tab (Daily, Weekly, Monthly) based on client timestamp
  const getFilteredLogs = () => {
    const list = productions || [];
    const now = new Date();
    
    if (activeTab === 'daily') {
      // Today only
      return list.filter(item => {
        const d = new Date(item.productionDate);
        return d.toDateString() === now.toDateString();
      });
    } else if (activeTab === 'weekly') {
      // Last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return list.filter(item => new Date(item.productionDate) >= oneWeekAgo);
    } else if (activeTab === 'monthly') {
      // Current month
      return list.filter(item => {
        const d = new Date(item.productionDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    
    return list;
  };

  const currentLogs = getFilteredLogs();
  const totalNetSarees = currentLogs.reduce((sum, item) => sum + item.netSarees, 0);
  const totalDefects = currentLogs.reduce((sum, item) => sum + item.defectiveSareeCount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Production Logs</h1>
          <p className="text-sm text-slate-400">Record and monitor daily saree weaving logs across active power looms.</p>
        </div>
        {canWrite && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all h-10 px-4 py-2 cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Log Production
            </DialogTrigger>
            <DialogContent className="max-w-2xl sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-200 overflow-y-auto max-h-[90vh] rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Log Daily Production</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
                  Record weaving details for calculations of earned wages.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-6">
                
                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
                  <div className="mb-2">
                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Production Information</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quickly select role, details, and access toggles.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Production Date</Label>
                      <Input type="date" {...register('productionDate')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                      {errors.productionDate && <span className="text-xs text-rose-400">{errors.productionDate.message}</span>}
                    </div>

                    {!isWorker ? (
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Weaver / Worker</Label>
                        <select {...register('workerId')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                          <option value="">-- Choose Worker --</option>
                          {(workers || []).map((w) => (
                            <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.workerId})</option>
                          ))}
                        </select>
                        {errors.workerId && <span className="text-xs text-rose-400">{errors.workerId.message}</span>}
                      </div>
                    ) : (
                      <input type="hidden" {...register('workerId')} />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Warp Yarn (Paavu)</Label>
                      <select {...register('warpYarnId')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                        <option value="">-- Choose Warp --</option>
                        {(warps || []).filter(w => w.status === 'ACTIVE').map((w) => (
                          <option key={w.id} value={w.id}>{w.warpName} ({w.warpId})</option>
                        ))}
                      </select>
                      {errors.warpYarnId && <span className="text-xs text-rose-400">{errors.warpYarnId.message}</span>}
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Remarks / Quality Notes</Label>
                      <Input {...register('remarks')} placeholder="e.g. Silk zari borders" className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Sarees Woven</Label>
                      <Input type="number" {...register('sareeCount', { valueAsNumber: true })} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.sareeCount && <span className="text-xs text-rose-400">{errors.sareeCount.message}</span>}
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Defective Sarees</Label>
                      <Input type="number" {...register('defectiveSareeCount', { valueAsNumber: true })} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                      {errors.defectiveSareeCount && <span className="text-xs text-rose-400">{errors.defectiveSareeCount.message}</span>}
                    </div>
                  </div>

                  {/* Net Sarees Math Preview */}
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center text-sm font-semibold mt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Net Earned Sarees:</span>
                    <span className="text-amber-500 text-lg font-black">{netSareesPreview}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/60 mt-6">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsCreateOpen(false)}
                    className="text-slate-455 hover:text-slate-250 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductionMutation.isPending} 
                    className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
                  >
                    {createProductionMutation.isPending ? 'Logging...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Summary Panel */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <span className="text-slate-500 text-xs uppercase tracking-wider block">Scope Net Sarees</span>
          <span className="text-2xl font-bold text-slate-100">{totalNetSarees}</span>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <span className="text-slate-500 text-xs uppercase tracking-wider block">Scope Defective Sarees</span>
          <span className="text-2xl font-bold text-rose-400">{totalDefects}</span>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-4">
          <span className="text-slate-500 text-xs uppercase tracking-wider block">Log Count</span>
          <span className="text-2xl font-bold text-blue-400">{currentLogs.length} Entries</span>
        </Card>
      </div>

      {/* Filters Control Bar */}
      <Card className="bg-slate-900 border-slate-800 shadow-md">
        <CardContent className="p-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
          {!isWorker && (
            <div>
              <Label className="text-slate-400 text-xs font-semibold mb-1 block">Filter by Worker</Label>
              <select 
                value={selectedWorkerFilter} 
                onChange={(e) => setSelectedWorkerFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="ALL">All Workers</option>
                {(workers || []).map((w) => (
                  <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-slate-400 text-xs font-semibold mb-1 block">Filter by Warp Paavu</Label>
            <select 
              value={selectedWarpFilter} 
              onChange={(e) => setSelectedWarpFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Warps</option>
              {(warps || []).map((w) => (
                <option key={w.id} value={w.id}>{w.warpName}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-slate-400 text-xs font-semibold mb-1 block">Start Date</Label>
            <Input 
              type="date" 
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-xs font-semibold mb-1 block">End Date</Label>
            <Input 
              type="date" 
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">All Logs</TabsTrigger>
            <TabsTrigger value="daily" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Daily View</TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Weekly View</TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Monthly View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <Card className="bg-slate-900 border-slate-800 shadow-md">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
              ) : currentLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No production entries recorded for this time range.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-950 border-slate-800">
                    <TableRow className="border-slate-800 hover:bg-slate-950">
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">ID</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Date</TableHead>
                      {!isWorker && <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Weaver</TableHead>}
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Warp Paavu</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Woven</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Defective</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Net Earned</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Remarks</TableHead>
                      {canWrite && <TableHead className="text-right text-slate-400 font-bold text-xs uppercase tracking-wide">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentLogs.map((entry) => (
                      <TableRow key={entry.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-mono text-xs text-amber-500">{entry.productionId}</TableCell>
                        <TableCell className="text-slate-300">{new Date(entry.productionDate).toLocaleDateString()}</TableCell>
                        {!isWorker && <TableCell className="font-semibold text-slate-200">{entry.worker?.firstName} {entry.worker?.lastName}</TableCell>}
                        <TableCell className="text-slate-300">{entry.warpYarn?.warpName}</TableCell>
                        <TableCell className="text-slate-300">{entry.sareeCount}</TableCell>
                        <TableCell className="text-rose-400 font-semibold">{entry.defectiveSareeCount}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                            {entry.netSarees}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs italic max-w-xs truncate">{entry.remarks || '-'}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => startEdit(entry)}
                              className="text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 h-8 w-8"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  if (confirm(`Delete production entry ${entry.productionId}?`)) {
                                    deleteProductionMutation.mutate(entry.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 h-8 w-8"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Production Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-200 overflow-y-auto max-h-[90vh] rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Edit Production Entry</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
              Update logs and automatically balance salary ledgers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
            
            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
              <div className="mb-2">
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">Production Details</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quickly update daily saree weaving metrics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Production Date</Label>
                  <Input type="date" {...register('productionDate')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500 w-full" />
                  {errors.productionDate && <span className="text-xs text-rose-400">{errors.productionDate.message}</span>}
                </div>

                {!isWorker ? (
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Weaver / Worker</Label>
                    <select {...register('workerId')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                      <option value="">-- Choose Worker --</option>
                      {(workers || []).map((w) => (
                        <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                      ))}
                    </select>
                    {errors.workerId && <span className="text-xs text-rose-400">{errors.workerId.message}</span>}
                  </div>
                ) : (
                  <input type="hidden" {...register('workerId')} />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Warp Yarn (Paavu)</Label>
                  <select {...register('warpYarnId')} className="flex h-10 w-full rounded-xl border border-slate-855 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                    <option value="">-- Choose Warp --</option>
                    {(warps || []).map((w) => (
                      <option key={w.id} value={w.id}>{w.warpName}</option>
                    ))}
                  </select>
                  {errors.warpYarnId && <span className="text-xs text-rose-400">{errors.warpYarnId.message}</span>}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Remarks / Quality Notes</Label>
                  <Input {...register('remarks')} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.remarks && <span className="text-xs text-rose-400">{errors.remarks.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Sarees Woven</Label>
                  <Input type="number" {...register('sareeCount', { valueAsNumber: true })} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.sareeCount && <span className="text-xs text-rose-400">{errors.sareeCount.message}</span>}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Defective Sarees</Label>
                  <Input type="number" {...register('defectiveSareeCount', { valueAsNumber: true })} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                  {errors.defectiveSareeCount && <span className="text-xs text-rose-400">{errors.defectiveSareeCount.message}</span>}
                </div>
              </div>

              {/* Net Sarees Math Preview */}
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex justify-between items-center text-sm font-semibold mt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Net Earned Sarees:</span>
                <span className="text-amber-500 text-lg font-black">{netSareesPreview}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/60 mt-6">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsEditOpen(false)}
                className="text-slate-455 hover:text-slate-250 text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProductionMutation.isPending} 
                className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
              >
                {updateProductionMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
