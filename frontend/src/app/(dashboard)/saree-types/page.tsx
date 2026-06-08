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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Scissors } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const sareeTypeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  rate: z.number().min(0, 'Rate must be a positive number'),
});

type SareeTypeFormType = z.infer<typeof sareeTypeSchema>;

export default function SareeTypesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);

  // Queries
  const { data: sareeTypes, isLoading } = useQuery<any[]>({
    queryKey: ['saree-types'],
    queryFn: () => api.get<any[]>('/saree-types'),
  });

  // Mutators
  const createTypeMutation = useMutation({
    mutationFn: (data: SareeTypeFormType) => api.post('/saree-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saree-types'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] }); // Invalidate workers since their rates might be affected
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SareeTypeFormType }) => api.put(`/saree-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saree-types'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsEditOpen(false);
      setEditingType(null);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/saree-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saree-types'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  // Forms
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SareeTypeFormType>({
    resolver: zodResolver(sareeTypeSchema),
    defaultValues: {
      name: '',
      rate: 0,
    },
  });

  const startEdit = (type: any) => {
    setEditingType(type);
    setValue('name', type.name);
    setValue('rate', type.rate);
    setIsEditOpen(true);
  };

  const onSubmitCreate = (data: SareeTypeFormType) => {
    createTypeMutation.mutate(data);
  };

  const onSubmitEdit = (data: SareeTypeFormType) => {
    updateTypeMutation.mutate({ id: editingType.id, data });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Saree Types Master</h1>
          <p className="text-sm text-slate-400">Configure saree varieties and set standard weaving rates per piece.</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all h-10 px-4 py-2 cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Add Saree Type
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-md bg-slate-900 border-slate-800 text-slate-200 rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Add Saree Type Config</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
                  Define new saree patterns and configure their corresponding piece wage rates.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-6">
                
                <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saree Type Name</Label>
                    <Input {...register('name')} placeholder="e.g. Kanchipuram Brocade" className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                    {errors.name && <span className="text-xs text-rose-400">{errors.name.message}</span>}
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rate Per Saree (₹)</Label>
                    <Input type="number" step="any" {...register('rate', { valueAsNumber: true })} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                    {errors.rate && <span className="text-xs text-rose-400">{errors.rate.message}</span>}
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
                    disabled={createTypeMutation.isPending} 
                    className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
                  >
                    {createTypeMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main List Table */}
      <Card className="bg-slate-900 border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500/20" />
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : !sareeTypes || sareeTypes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No saree types configured. Add one to assign to workers.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-950 border-slate-800">
                <TableRow className="border-slate-800 hover:bg-slate-950">
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Icon</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Name</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase tracking-wide">Standard Rate</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right text-slate-400 font-bold text-xs uppercase tracking-wide">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sareeTypes.map((type) => (
                  <TableRow key={type.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell>
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-md w-fit">
                        <Scissors className="h-4 w-4" />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-200">
                      {type.name}
                    </TableCell>
                    <TableCell className="text-slate-100 font-semibold font-mono">
                      {formatCurrency(type.rate)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => startEdit(type)}
                          className="text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 h-8 w-8"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (confirm(`Delete Saree Type "${type.name}"? This will unlink associated workers.`)) {
                              deleteTypeMutation.mutate(type.id);
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md sm:max-w-md bg-slate-900 border-slate-800 text-slate-200 rounded-[24px] md:rounded-[32px] p-8 border shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-black text-slate-100 tracking-tight">Edit Saree Type Config</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
              Update rate settings. Changes will cascade to all weavers linked to this type.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
            
            <div className="border border-slate-800 rounded-3xl p-6 bg-slate-950/40 shadow-sm space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Saree Type Name</Label>
                <Input {...register('name')} className="bg-slate-900 border-slate-850 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                {errors.name && <span className="text-xs text-rose-400">{errors.name.message}</span>}
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rate Per Saree (₹)</Label>
                <Input type="number" step="any" {...register('rate', { valueAsNumber: true })} className="bg-slate-900 border-slate-855 rounded-xl h-10 px-3 text-slate-100 placeholder:text-slate-500" />
                {errors.rate && <span className="text-xs text-rose-400">{errors.rate.message}</span>}
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
                disabled={updateTypeMutation.isPending} 
                className="bg-slate-50 text-slate-900 font-bold hover:bg-slate-200 rounded-xl px-5 py-2.5 shadow-md transition-all text-xs cursor-pointer"
              >
                {updateTypeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
