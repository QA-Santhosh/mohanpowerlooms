'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Download, BarChart, Ban } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeReportTab, setActiveReportTab] = useState('worker');
  const isWorker = user?.role === 'WORKER';

  // Fetch all necessary datasets for compilation
  const { data: workers, isLoading: workersLoading } = useQuery<any[]>({
    queryKey: ['report-workers'],
    queryFn: () => api.get<any[]>('/workers'),
    enabled: !isWorker,
  });

  const { data: warps, isLoading: warpsLoading } = useQuery<any[]>({
    queryKey: ['report-warps'],
    queryFn: () => api.get<any[]>('/warps'),
    enabled: !isWorker,
  });

  const { data: productions, isLoading: prodLoading } = useQuery<any[]>({
    queryKey: ['report-productions'],
    queryFn: () => api.get<any[]>('/production'),
    enabled: !isWorker,
  });

  const { data: ledgers, isLoading: ledgerLoading } = useQuery<any[]>({
    queryKey: ['report-ledgers'],
    queryFn: () => api.get<any[]>('/payments/ledger'),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  // Block Workers
  if (isWorker) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-3">
        <Ban className="h-10 w-10 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-200">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-sm">Workers are not permitted to access global factory reports or salary payouts summaries.</p>
      </div>
    );
  }

  const isLoading = workersLoading || warpsLoading || prodLoading || (user?.role === 'SUPER_ADMIN' && ledgerLoading);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  // Compile datasets
  // 1. Worker Report Data
  const workerReportData = (workers || []).map((w) => {
    // Find matching ledger (if admin) or simulate
    const ledger = (ledgers || []).find((l) => l.workerId === w.id);
    const workerProds = (productions || []).filter((p) => p.workerId === w.id);
    const netSarees = workerProds.reduce((sum, p) => sum + p.netSarees, 0);
    
    return {
      workerId: w.workerId,
      name: `${w.firstName} ${w.lastName}`,
      totalSarees: netSarees,
      totalEarned: ledger?.totalEarned || 0,
      totalPaid: ledger?.totalPaid || 0,
      totalPending: ledger?.totalPending || 0,
    };
  });

  // 2. Warp Report Data
  const warpReportData = (warps || []).map((w) => {
    const produced = w.stats?.producedSarees || 0;
    const defective = w.stats?.defectiveSarees || 0;
    const remaining = w.stats?.remainingProduction || 0;
    
    return {
      warpId: w.warpId,
      warpName: w.warpName,
      design: w.designName,
      expected: w.expectedSarees,
      produced,
      defective,
      remaining,
    };
  });

  // 3. Salary Report Data
  const salaryReportData = workerReportData.map((w) => ({
    workerId: w.workerId,
    name: w.name,
    earned: w.totalEarned,
    paid: w.totalPaid,
    pending: w.totalPending,
  }));

  // Export functions
  const exportToExcel = () => {
    let dataToExport: any[] = [];
    let fileName = 'Mohan_Looms_Report';

    if (activeReportTab === 'worker') {
      dataToExport = workerReportData.map(item => ({
        'Worker ID': item.workerId,
        'Name': item.name,
        'Total Sarees Woven': item.totalSarees,
        'Total Earned (₹)': item.totalEarned,
        'Total Paid (₹)': item.totalPaid,
        'Pending Balance (₹)': item.totalPending,
      }));
      fileName = 'Worker_Production_Report';
    } else if (activeReportTab === 'warp') {
      dataToExport = warpReportData.map(item => ({
        'Warp ID': item.warpId,
        'Warp Name': item.warpName,
        'Design': item.design,
        'Expected Sarees': item.expected,
        'Produced': item.produced,
        'Defective': item.defective,
        'Remaining': item.remaining,
      }));
      fileName = 'Warp_Completion_Report';
    } else if (activeReportTab === 'salary') {
      dataToExport = salaryReportData.map(item => ({
        'Worker ID': item.workerId,
        'Name': item.name,
        'Earned (₹)': item.earned,
        'Paid (₹)': item.paid,
        'Pending (₹)': item.pending,
      }));
      fileName = 'Salary_Ledger_Report';
    } else if (activeReportTab === 'production') {
      dataToExport = (productions || []).map(item => ({
        'Production ID': item.productionId,
        'Date': new Date(item.productionDate).toLocaleDateString(),
        'Worker': `${item.worker?.firstName} ${item.worker?.lastName}`,
        'Warp Yarn': item.warpYarn?.warpName,
        'Woven Count': item.sareeCount,
        'Defective Count': item.defectiveSareeCount,
        'Net Earned': item.netSarees,
        'Remarks': item.remarks || '',
      }));
      fileName = 'Production_Logs_Report';
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    
    // Title header
    doc.setFontSize(18);
    doc.setTextColor(217, 119, 6); // Amber Gold color
    doc.text('MOHAN POWER LOOMS', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`ERP Factory Systems Report • Date: ${dateStr}`, 14, 26);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 29, 196, 29);

    if (activeReportTab === 'worker') {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Worker Production & Wage Summary', 14, 38);
      
      const body = workerReportData.map(item => [
        item.workerId,
        item.name,
        item.totalSarees,
        `Rs. ${item.totalEarned.toFixed(2)}`,
        `Rs. ${item.totalPaid.toFixed(2)}`,
        `Rs. ${item.totalPending.toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: 44,
        head: [['ID', 'Name', 'Total Sarees', 'Wages Earned', 'Wages Paid', 'Pending Balance']],
        body: body,
        headStyles: { fillColor: [30, 58, 138] }, // Navy
      });
    } else if (activeReportTab === 'warp') {
      doc.setFontSize(14);
      doc.text('Warp Paavu Completion & Progress Report', 14, 38);
      
      const body = warpReportData.map(item => [
        item.warpId,
        item.warpName,
        item.design,
        item.expected,
        item.produced,
        item.defective,
        item.remaining,
      ]);

      autoTable(doc, {
        startY: 44,
        head: [['ID', 'Warp Name', 'Design Name', 'Expected', 'Produced', 'Defects', 'Remaining']],
        body: body,
        headStyles: { fillColor: [30, 58, 138] },
      });
    } else if (activeReportTab === 'salary') {
      doc.setFontSize(14);
      doc.text('Salary Ledger & Payroll Statement', 14, 38);
      
      const body = salaryReportData.map(item => [
        item.workerId,
        item.name,
        `Rs. ${item.earned.toFixed(2)}`,
        `Rs. ${item.paid.toFixed(2)}`,
        `Rs. ${item.pending.toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: 44,
        head: [['ID', 'Name', 'Total Earned', 'Total Paid', 'Pending Owed']],
        body: body,
        headStyles: { fillColor: [30, 58, 138] },
      });
    } else if (activeReportTab === 'production') {
      doc.setFontSize(14);
      doc.text('Weaving Production Submissions Logs', 14, 38);
      
      const body = (productions || []).map(item => [
        item.productionId,
        new Date(item.productionDate).toLocaleDateString(),
        `${item.worker?.firstName} ${item.worker?.lastName?.charAt(0)}.`,
        item.warpYarn?.warpName,
        item.sareeCount,
        item.defectiveSareeCount,
        item.netSarees,
      ]);

      autoTable(doc, {
        startY: 44,
        head: [['ID', 'Date', 'Weaver', 'Warp Paavu', 'Total', 'Defects', 'Net']],
        body: body,
        headStyles: { fillColor: [30, 58, 138] },
      });
    }

    doc.save(`MPL_Report_${activeReportTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 uppercase tracking-wide">Reports & Exports</h1>
          <p className="text-sm text-slate-400">Generate print-ready statements and download XLSX or PDF files of company records.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            onClick={exportToExcel}
            className="bg-slate-900 hover:bg-slate-800 text-amber-500 border border-slate-800 font-semibold"
          >
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button 
            onClick={exportToPDF}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-50 font-semibold shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all font-bold"
          >
            <FileDown className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="worker" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Workers Summary</TabsTrigger>
          <TabsTrigger value="warp" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Warp Progress</TabsTrigger>
          {user?.role === 'SUPER_ADMIN' && (
            <TabsTrigger value="salary" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Salary Ledger</TabsTrigger>
          )}
          <TabsTrigger value="production" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-50">Daily Production</TabsTrigger>
        </TabsList>

        {/* Worker tab */}
        <TabsContent value="worker" className="mt-0">
          <Card className="bg-slate-900 border-slate-800 shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950 border-slate-800">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 font-bold text-xs">Worker ID</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Name</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Total Sarees Woven</TableHead>
                    {user?.role === 'SUPER_ADMIN' && (
                      <>
                        <TableHead className="text-slate-400 font-bold text-xs">Total Earned</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs">Total Paid</TableHead>
                        <TableHead className="text-slate-400 font-bold text-xs">Pending Wages</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerReportData.map((item, idx) => (
                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-mono text-xs text-amber-500">{item.workerId}</TableCell>
                      <TableCell className="font-semibold text-slate-200">{item.name}</TableCell>
                      <TableCell className="text-slate-300 font-semibold">{item.totalSarees} Net</TableCell>
                      {user?.role === 'SUPER_ADMIN' && (
                        <>
                          <TableCell className="text-slate-300">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalEarned)}</TableCell>
                          <TableCell className="text-emerald-450">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalPaid)}</TableCell>
                          <TableCell className="text-amber-500 font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalPending)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warp tab */}
        <TabsContent value="warp" className="mt-0">
          <Card className="bg-slate-900 border-slate-800 shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950 border-slate-800">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 font-bold text-xs">Warp ID</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Warp Name</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Design</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Expected</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Produced</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Defective</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warpReportData.map((item, idx) => (
                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-mono text-xs text-amber-500">{item.warpId}</TableCell>
                      <TableCell className="font-semibold text-slate-200">{item.warpName}</TableCell>
                      <TableCell className="text-slate-300">{item.design}</TableCell>
                      <TableCell className="text-slate-300">{item.expected}</TableCell>
                      <TableCell className="text-blue-400 font-semibold">{item.produced}</TableCell>
                      <TableCell className="text-rose-450">{item.defective}</TableCell>
                      <TableCell className="text-amber-500 font-bold">{item.remaining}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Ledger tab */}
        {user?.role === 'SUPER_ADMIN' && (
          <TabsContent value="salary" className="mt-0">
            <Card className="bg-slate-900 border-slate-800 shadow">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-950 border-slate-800">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400 font-bold text-xs">Worker ID</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs">Name</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs">Total Wages Earned</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs">Total Wages Paid</TableHead>
                      <TableHead className="text-slate-400 font-bold text-xs">Pending Wages Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryReportData.map((item, idx) => (
                      <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-mono text-xs text-amber-500">{item.workerId}</TableCell>
                        <TableCell className="font-semibold text-slate-200">{item.name}</TableCell>
                        <TableCell className="text-slate-300">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.earned)}</TableCell>
                        <TableCell className="text-emerald-450">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.paid)}</TableCell>
                        <TableCell className="text-amber-500 font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.pending)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Daily Production tab */}
        <TabsContent value="production" className="mt-0">
          <Card className="bg-slate-900 border-slate-800 shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950 border-slate-800">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400 font-bold text-xs">ID</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Weaver</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Warp Paavu</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Woven</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Defective</TableHead>
                    <TableHead className="text-slate-400 font-bold text-xs">Net Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(productions || []).map((item) => (
                    <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell className="font-mono text-xs text-amber-500">{item.productionId}</TableCell>
                      <TableCell className="text-slate-300">{new Date(item.productionDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold text-slate-200">{item.worker?.firstName} {item.worker?.lastName}</TableCell>
                      <TableCell className="text-slate-300">{item.warpYarn?.warpName}</TableCell>
                      <TableCell className="text-slate-300">{item.sareeCount}</TableCell>
                      <TableCell className="text-rose-400 font-semibold">{item.defectiveSareeCount}</TableCell>
                      <TableCell className="text-blue-400 font-bold">{item.netSarees}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
