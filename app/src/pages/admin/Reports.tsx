import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Download,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle2,
    FileText,
    Users,
    Building2,
    Clock,
    DollarSign,
    Briefcase,
    FileBarChart
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { type DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';
import { loadTechnicianDirectory, type TechnicianDirectoryEntry } from '@/lib/technicians';
import { MOCK_TECHS } from './Technicians';
import { MOCK_DEALERSHIPS } from './Dealerships';

// --- Types ---

interface KPI {
    label: string;
    value: string | number;
    change?: number; // percentage change from previous period
    trend?: 'up' | 'down' | 'neutral';
    icon: React.ReactNode;
}

interface DispatchStatus {
    status: string;
    count: number;
    percentage: number;
}

interface InvoiceStatus {
    state: string;
    count: number;
    total_amount?: number;
    is_critical?: boolean;
}

interface TechnicianPerformance {
    id: string;
    name: string;
    jobs_assigned: number;
    jobs_completed: number;
    avg_completion_time: string; // e.g. "45m"
    delays_count: number;
    refusals_count: number;
    revenue_generated: number;
}

interface DealershipPerformance {
    id: string;
    name: string;
    jobs_created: number;
    jobs_completed: number;
    avg_resolution_time: string; // e.g. "2h 15m"
    invoice_total: number;
    attention_flags: number;
}

// --- Mock Data ---

const MOCK_KPIS: KPI[] = [
    { label: 'Jobs Created', value: 142, change: 12, trend: 'up', icon: <Briefcase className="w-4 h-4 text-blue-600" /> },
    { label: 'Jobs Completed', value: 138, change: 8, trend: 'up', icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
    { label: 'Avg Completion Time', value: '45m', change: -5, trend: 'up', icon: <Clock className="w-4 h-4 text-orange-600" /> },
    { label: 'Technician Utilization', value: '85%', change: 2, trend: 'up', icon: <Users className="w-4 h-4 text-purple-600" /> },
    { label: 'Invoice Total', value: '$12,450', change: 15, trend: 'up', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
    { label: 'Pending Approvals', value: 5, change: -2, trend: 'up', icon: <FileText className="w-4 h-4 text-amber-600" /> },
];

const MOCK_DISPATCH_PERFORMANCE: DispatchStatus[] = [
    { status: 'Pending Review', count: 12, percentage: 8 },
    { status: 'Ready for Tech Acceptance', count: 45, percentage: 31 },
    { status: 'In Progress', count: 28, percentage: 19 },
    { status: 'Delayed', count: 5, percentage: 3 },
    { status: 'Completed', count: 50, percentage: 35 },
    { status: 'Cancelled', count: 2, percentage: 4 },
];

const MOCK_INVOICE_PERFORMANCE: InvoiceStatus[] = [
    { state: 'Pending Approval', count: 5, total_amount: 1250, is_critical: false },
    { state: 'Creating', count: 2, total_amount: 0, is_critical: false },
    { state: 'Created', count: 120, total_amount: 10500, is_critical: false },
    { state: 'Verified', count: 110, total_amount: 9800, is_critical: false },
    { state: 'Needs Manual Verification', count: 3, total_amount: 450, is_critical: true },
    { state: 'Failed', count: 1, total_amount: 0, is_critical: true },
];

const DEFAULT_TECH_PERFORMANCE_METRICS = {
    jobs_assigned: 0,
    jobs_completed: 0,
    avg_completion_time: '0m',
    delays_count: 0,
    refusals_count: 0,
    revenue_generated: 0
};

const SEEDED_TECH_PERFORMANCE_BY_ID: Record<string, Omit<TechnicianPerformance, 'id' | 'name'>> = {
    t1: {
        jobs_assigned: 45,
        jobs_completed: 44,
        avg_completion_time: '42m',
        delays_count: 1,
        refusals_count: 0,
        revenue_generated: 4500
    },
    t2: {
        jobs_assigned: 32,
        jobs_completed: 30,
        avg_completion_time: '55m',
        delays_count: 3,
        refusals_count: 1,
        revenue_generated: 3200
    },
    t3: {
        jobs_assigned: 60,
        jobs_completed: 60,
        avg_completion_time: '35m',
        delays_count: 0,
        refusals_count: 0,
        revenue_generated: 6000
    },
    t4: {
        jobs_assigned: 28,
        jobs_completed: 28,
        avg_completion_time: '48m',
        delays_count: 0,
        refusals_count: 0,
        revenue_generated: 2800
    }
};

const buildTechPerformance = (): TechnicianPerformance[] => {
    const fallbackDirectory: TechnicianDirectoryEntry[] = MOCK_TECHS.map((tech) => ({
        id: tech.id,
        name: tech.name,
        techCode: tech.tech_code,
        status: tech.status
    }));

    return loadTechnicianDirectory(fallbackDirectory)
        .map((tech) => ({
            id: tech.id,
            name: tech.name,
            ...(SEEDED_TECH_PERFORMANCE_BY_ID[tech.id] ?? DEFAULT_TECH_PERFORMANCE_METRICS),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

const MOCK_DEALERSHIP_PERFORMANCE: DealershipPerformance[] = MOCK_DEALERSHIPS.slice(4, 7).map((dealer, i) => ({
    id: dealer.id,
    name: dealer.name,
    jobs_created: [50, 35, 20][i] || 25,
    jobs_completed: [48, 35, 18][i] || 20,
    avg_resolution_time: ['1h 30m', '2h 15m', '1h 45m'][i] || '2h 00m',
    invoice_total: [5200, 3500, 1800][i] || 2000,
    attention_flags: [0, 2, 1][i] || 0
}));

const REPORT_TECH_EXPORT_COLUMNS = [
    'Technician',
    'Assigned',
    'Completed',
    'AvgTime',
    'Delays',
    'Refusals',
    'Revenue',
];

// --- Components ---

function KPICard({ kpi }: { kpi: KPI }) {
    return (
        <Card className="shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                </CardTitle>
                {kpi.icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                {kpi.change !== undefined && (
                    <p className={cn(
                        "text-xs flex items-center mt-1 font-medium",
                        kpi.change > 0 ? "text-green-600" : kpi.change < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                        {kpi.change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : kpi.change < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                        {Math.abs(kpi.change)}% from last period
                    </p>
                )}
            </CardContent>
        </Card>
    );
}


function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/50 min-h-[400px]">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                <FileBarChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No data available for selected period</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                There are no performance metrics to display for this timeframe. <br />
                Try expanding the date range.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
            </Button>
        </div>
    );
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date()
    });
    const [preset, setPreset] = useState<string>('last_week');

    // Data State
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [dispatchPerformance, setDispatchPerformance] = useState<DispatchStatus[]>([]);
    const [invoicePerformance, setInvoicePerformance] = useState<InvoiceStatus[]>([]);
    const [techPerformance, setTechPerformance] = useState<TechnicianPerformance[]>([]);
    const [dealershipPerformance, setDealershipPerformance] = useState<DealershipPerformance[]>([]);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Simulate backend fetch
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            const stored = localStorage.getItem('approved_invoices');
            const localApproved = stored ? JSON.parse(stored) : [];

            // Simulator: Random chance of empty data for "Custom" range if range is very short (e.g. same day)
            const isEmpty = dateRange?.from && dateRange?.to &&
                dateRange.from.toDateString() === dateRange.to.toDateString() &&
                preset === 'custom';

            if (isEmpty) {
                setKpis([]);
                setDispatchPerformance([]);
                setInvoicePerformance([]);
                setTechPerformance([]);
                setDealershipPerformance([]);
            } else {
                // Adjust KPIs based on local data
                const totalInvoiced = localApproved.reduce((acc: number, inv: any) => acc + inv.amount, 12450);
                const updatedKpis = [...MOCK_KPIS];
                updatedKpis[4] = { ...updatedKpis[4], value: `$${totalInvoiced.toLocaleString()}` };

                setKpis(updatedKpis);
                setDispatchPerformance(MOCK_DISPATCH_PERFORMANCE);
                setInvoicePerformance([...MOCK_INVOICE_PERFORMANCE, { state: 'Approved History', count: localApproved.length, total_amount: totalInvoiced - 12450 }]);
                setTechPerformance(buildTechPerformance());
                setDealershipPerformance(MOCK_DEALERSHIP_PERFORMANCE);
            }
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [dateRange, preset]);

    const handlePresetChange = (value: string) => {
        setPreset(value);
        const today = new Date();
        switch (value) {
            case 'this_week':
                setDateRange({ from: startOfWeek(today), to: endOfWeek(today) });
                break;
            case 'last_week':
                setDateRange({ from: startOfWeek(subDays(today, 7)), to: endOfWeek(subDays(today, 7)) });
                break;
            case 'this_month':
                setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
                break;
            case 'custom':
                if (!dateRange) setDateRange({ from: subDays(today, 7), to: today });
                break;
        }
    };

    const getTechPerformanceExportRows = () => techPerformance.map((tech) => ({
        Technician: tech.name,
        Assigned: tech.jobs_assigned,
        Completed: tech.jobs_completed,
        AvgTime: tech.avg_completion_time,
        Delays: tech.delays_count,
        Refusals: tech.refusals_count,
        Revenue: tech.revenue_generated,
    }));

    const handleExportCSV = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getTechPerformanceExportRows(), selectedColumns);
        exportArrayData(exportData, 'technician_performance_report', format);
    };

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Reports</h1>
                    <p className="text-sm text-muted-foreground font-medium">Operational and financial performance overview</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="hidden md:flex items-center text-xs text-gray-400 font-medium mr-2">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>

                    <Select value={preset} onValueChange={handlePresetChange}>
                        <SelectTrigger className="w-[130px] h-9">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="last_week">Last Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                size="sm"
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal h-9",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range) => {
                                    setDateRange(range);
                                    setPreset('custom');
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} className="h-9 gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>

                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLoading(true)}>
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Technician Performance"
                description="Select the technician performance columns you want in your CSV."
                availableColumns={REPORT_TECH_EXPORT_COLUMNS}
                onConfirm={handleExportCSV}
            />

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : kpis.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {/* 2. KPI Section */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {kpis.map((kpi, index) => (
                            <KPICard key={index} kpi={kpi} />
                        ))}
                    </div>

                    {/* 3. Operational Performance */}
                    <div className="grid gap-6 md:grid-cols-2">

                        {/* Dispatch Performance */}
                        <Card className="shadow-sm border-border">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Dispatch Performance</CardTitle>
                                <CardDescription>Job status distribution for the period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {dispatchPerformance.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full",
                                                    item.status === 'Completed' ? "bg-green-500" :
                                                        item.status === 'Delayed' ? "bg-red-500" :
                                                            item.status === 'In Progress' ? "bg-blue-500" :
                                                                "bg-gray-300"
                                                )} />
                                                <span className="font-medium text-foreground">{item.status}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-foreground">{item.count}</span>
                                                <span className="text-muted-foreground w-12 text-right text-xs">{item.percentage}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Invoice Performance */}
                        <Card className="shadow-sm border-border">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Invoice Performance</CardTitle>
                                <CardDescription>Invoicing lifecycle states</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="h-8">State</TableHead>
                                            <TableHead className="h-8 text-right">Count</TableHead>
                                            <TableHead className="h-8 text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoicePerformance.map((item, index) => (
                                            <TableRow key={index} className="hover:bg-transparent border-b border-gray-100 last:border-0">
                                                <TableCell className="py-2.5 font-medium text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        {item.is_critical && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                                                        <span className={cn(item.is_critical && "text-amber-500")}>{item.state}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-right font-mono text-foreground">{item.count}</TableCell>
                                                <TableCell className="py-2.5 text-right font-mono text-muted-foreground text-xs">
                                                    {item.total_amount ? `$${item.total_amount.toLocaleString()}` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 4. Technician Performance Table */}
                    <Card className="shadow-sm border-border">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4" /> Technician Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Technician</TableHead>
                                        <TableHead className="text-center">Assigned</TableHead>
                                        <TableHead className="text-center">Completed</TableHead>
                                        <TableHead className="text-center">Avg Time</TableHead>
                                        <TableHead className="text-center">Delays</TableHead>
                                        <TableHead className="text-center">Refusals</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {techPerformance.map((tech) => (
                                        <TableRow key={tech.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium text-foreground">{tech.name}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{tech.jobs_assigned}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{tech.jobs_completed}</TableCell>
                                            <TableCell className="text-center font-mono text-muted-foreground text-xs">{tech.avg_completion_time}</TableCell>
                                            <TableCell className="text-center">
                                                {tech.delays_count > 0 ? (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">{tech.delays_count}</Badge>
                                                ) : <span className="text-muted/50">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {tech.refusals_count > 0 ? (
                                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">{tech.refusals_count}</Badge>
                                                ) : <span className="text-muted/50">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-foreground font-medium">
                                                ${tech.revenue_generated.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* 5. Dealership Performance Table */}
                    <Card className="shadow-sm border-border">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Dealership Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Dealership</TableHead>
                                        <TableHead className="text-center">Created</TableHead>
                                        <TableHead className="text-center">Completed</TableHead>
                                        <TableHead className="text-center">Avg Res. Time</TableHead>
                                        <TableHead className="text-center">Flags</TableHead>
                                        <TableHead className="text-right">Total Invoiced</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dealershipPerformance.map((dealer) => (
                                        <TableRow key={dealer.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium text-foreground">{dealer.name}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{dealer.jobs_created}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{dealer.jobs_completed}</TableCell>
                                            <TableCell className="text-center font-mono text-muted-foreground text-xs">{dealer.avg_resolution_time}</TableCell>
                                            <TableCell className="text-center">
                                                {dealer.attention_flags > 0 ? (
                                                    <div className="flex items-center justify-center text-amber-500 text-xs font-medium">
                                                        <AlertCircle className="w-3 h-3 mr-1" /> {dealer.attention_flags}
                                                    </div>
                                                ) : <span className="text-muted/50">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-foreground font-medium">
                                                ${dealer.invoice_total.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* 6. Revenue Breakdown Section */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="shadow-sm border-border md:col-span-1">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Weekly Revenue Trend</CardTitle>
                                <CardDescription>Performance vs last week</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[200px] flex items-center justify-center border-t border-border bg-muted/10">
                                <div className="text-center">
                                    <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-foreground">+$2,450.00</p>
                                    <p className="text-xs text-muted-foreground">Across 18 approved invoices</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-border md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Invoicing Performance Detail</CardTitle>
                                <CardDescription>Monthly breakdown by category</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 border-t border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6 h-10">Technician</TableHead>
                                            <TableHead className="h-10 text-right">Approved Amt</TableHead>
                                            <TableHead className="h-10 text-right">Avg / Invoice</TableHead>
                                            <TableHead className="pr-6 h-10 text-right">Growth</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="pl-6 font-medium">Jolianne</TableCell>
                                            <TableCell className="text-right font-mono">$4,820</TableCell>
                                            <TableCell className="text-right font-mono">$109</TableCell>
                                            <TableCell className="pr-6 text-right text-emerald-500">+12%</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-6 font-medium">Victor</TableCell>
                                            <TableCell className="text-right font-mono">$3,240</TableCell>
                                            <TableCell className="text-right font-mono">$92</TableCell>
                                            <TableCell className="pr-6 text-right text-emerald-500">+4%</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-6 font-medium">Maxime</TableCell>
                                            <TableCell className="text-right font-mono">$6,120</TableCell>
                                            <TableCell className="text-right font-mono">$102</TableCell>
                                            <TableCell className="pr-6 text-right text-red-500">-2%</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
