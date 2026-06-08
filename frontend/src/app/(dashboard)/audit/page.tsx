'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ban, Search, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

export default function AuditPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const isNotAdmin = user?.role !== 'SUPER_ADMIN';

  // Queries
  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<any[]>('/audit'),
    enabled: !isNotAdmin,
  });

  // Block Supervisors & Workers
  if (isNotAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-3">
        <Ban className="h-10 w-10 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-200">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-sm">Only the Super Admin (Owner) is authorized to browse system security and modification audit files.</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const formatJson = (jsonStr: string | null) => {
    if (!jsonStr) return '-';
    try {
      const obj = JSON.parse(jsonStr);
      return <pre className="text-[10px] font-mono bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto max-w-xl">{JSON.stringify(obj, null, 2)}</pre>;
    } catch (e) {
      return <span className="text-xs font-mono text-slate-400">{jsonStr}</span>;
    }
  };

  // Filter logs
  const filteredLogs = (logs || []).filter((log) => {
    const userFullName = log.user 
      ? `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase()
      : 'system';
      
    const matchesSearch = 
      userFullName.includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;

    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-500" /> Security Audit Log
        </h1>
        <p className="text-sm text-slate-400">Read-only logging tracker capturing database creations, revisions, and payroll disbursements.</p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-slate-900 border-slate-800 shadow-md">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by action, email, or operator name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border-slate-800 pl-10 text-slate-200"
            />
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <Select value={moduleFilter} onValueChange={(val) => setModuleFilter(val || 'ALL')}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                <SelectValue placeholder="Module Filter" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                <SelectItem value="ALL">All Modules</SelectItem>
                <SelectItem value="Worker Management">Worker Management</SelectItem>
                <SelectItem value="Warp Yarn Management">Warp Yarn Management</SelectItem>
                <SelectItem value="Saree Production">Saree Production</SelectItem>
                <SelectItem value="Salary & Banking">Salary & Banking</SelectItem>
                <SelectItem value="System">System Configurations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Logs Table */}
      <Card className="bg-slate-900 border-slate-800 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No security audit logs match selected criteria.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-950 border-slate-800">
                <TableRow className="border-slate-800 hover:bg-slate-950">
                  <TableHead className="w-10 hover:bg-slate-950"></TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase">Timestamp</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase">Operator (User)</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase">Module</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs uppercase">Action Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const operatorName = log.user 
                    ? `${log.user.firstName} ${log.user.lastName}` 
                    : 'System Provisioner';
                  const operatorEmail = log.user ? log.user.email : 'system@mohanlooms.com';

                  return (
                    <React.Fragment key={log.id}>
                      <TableRow className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleExpand(log.id)}
                            className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-slate-800/40"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-200 text-sm block">{operatorName}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">{operatorEmail}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 uppercase">{log.module}</TableCell>
                        <TableCell>
                          <span className="inline-block bg-slate-950 text-amber-500 border border-slate-800 px-2 py-0.5 rounded text-xs font-semibold">
                            {log.action}
                          </span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-slate-950/20 border-slate-800">
                          <TableCell colSpan={5} className="p-4 bg-slate-950/30">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label className="text-xs text-slate-500 mb-1 block uppercase font-bold tracking-wider">Previous State Data (Old)</Label>
                                {formatJson(log.oldValue)}
                              </div>
                              <div>
                                <Label className="text-xs text-slate-500 mb-1 block uppercase font-bold tracking-wider">Modified Payload Data (New)</Label>
                                {formatJson(log.newValue)}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
