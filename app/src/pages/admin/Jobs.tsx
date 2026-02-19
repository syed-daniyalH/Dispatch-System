import { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Filter,
    Download,
    RefreshCw,
    MoreHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Truck,
    User,
    Calendar,
    X,
    SlidersHorizontal,
    ArrowUp,
    ArrowDown,
    Plus,
    MoreVertical,
    Car,
    MapPin,
    History,
    ArrowRight,
    Building2,
    Users,
    ClipboardList,
    ShieldAlert,
    LayoutDashboard,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { calculateJobRanking, sortJobsByRanking } from '@/lib/priority';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';

import { priorityRules } from '@/mock/data';
import type { UrgencyLevel } from '@/types';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';
import { MOCK_SERVICES } from './Services';
import { MOCK_TECHS } from './Technicians';
import { MOCK_DEALERSHIPS } from './Dealerships';

// --- Types ---

type JobStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type InvoiceState = 'draft' | 'pending_approval' | 'approved' | 'synced' | 'failed' | 'void';
type Urgency = 'low' | 'normal' | 'high' | 'critical';

interface Job {
    job_id: string;
    job_code: string;
    dealership_name: string;
    service_name: string;
    vehicle_summary: string;
    urgency: Urgency;
    assigned_technician_name: string | null;
    job_status: JobStatus;
    invoice_state: InvoiceState;
    attention_flag: boolean;
    created_at: string;
    updated_at: string;
    allowed_actions: string[];
    ranking_score?: number;
    applied_rules?: string[];
}



interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

interface NewJobFormState {
    dealership_name: string;
    service_name: string;
    vehicle_summary: string;
    urgency: Urgency;
    assigned_technician_name: string;
    push_to_available: boolean;
}

// --- Reference Data ---

const DEALERSHIPS = MOCK_DEALERSHIPS.map(d => d.name);
const SERVICES = MOCK_SERVICES.map(s => s.name);
const ADMIN_JOBS_STORAGE_KEY = 'sm_dispatch_admin_jobs';
const AVAILABLE_JOBS_STORAGE_KEY = 'sm_dispatch_available_jobs';
const JOB_EXPORT_COLUMNS = [
    'JobCode',
    'Dealership',
    'Service',
    'Vehicle',
    'Urgency',
    'Technician',
    'JobStatus',
    'InvoiceState',
    'CreatedAt',
    'UpdatedAt',
];

const loadPersistedJobs = (): Job[] => {
    try {
        const raw = localStorage.getItem(ADMIN_JOBS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Job[]) : [];
    } catch {
        return [];
    }
};

const persistJobs = (jobs: Job[]) => {
    localStorage.setItem(ADMIN_JOBS_STORAGE_KEY, JSON.stringify(jobs));
};

const appendAuditLog = (
    _event_type: string,
    _summary: string,
    _payload_json: Record<string, unknown>,
    _severity: 'info' | 'warning' | 'critical' = 'info'
) => {
    // Audit logging intentionally disabled.
};

const syncJobToAvailableQueue = (job: Job) => {
    if (job.job_status !== 'pending') return;

    const dealershipLocation =
        MOCK_DEALERSHIPS.find((dealership) => dealership.name === job.dealership_name)?.city || 'Unspecified';
    const assignedTechId =
        MOCK_TECHS.find((tech) => tech.name === job.assigned_technician_name)?.id;

    const queueJob = {
        job_id: job.job_id,
        job_code: job.job_code,
        dealership_name: job.dealership_name,
        service_name: job.service_name,
        urgency: job.urgency,
        zone: dealershipLocation,
        created_at: job.created_at,
        note_preview: 'Created from Jobs section for technician acceptance testing.',
        status: 'READY_FOR_TECH_ACCEPTANCE',
        eligible_tech_ids: assignedTechId ? [assignedTechId] : undefined,
        rejected_tech_ids: [],
    };

    try {
        const raw = localStorage.getItem(AVAILABLE_JOBS_STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        const safeExisting = Array.isArray(existing) ? existing : [];
        const deduped = safeExisting.filter((entry) => entry?.job_id !== queueJob.job_id);
        localStorage.setItem(AVAILABLE_JOBS_STORAGE_KEY, JSON.stringify([queueJob, ...deduped]));
    } catch {
        localStorage.setItem(AVAILABLE_JOBS_STORAGE_KEY, JSON.stringify([queueJob]));
    }
};

// --- Components ---

function StatusBadge({ status, type }: { status: string; type: 'job' | 'invoice' | 'urgency' }) {
    const styles: Record<string, string> = {
        // Job Status
        pending: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        scheduled: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        in_progress: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        completed: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        cancelled: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800 font-medium',

        // Invoice State
        draft: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800',
        pending_approval: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        approved: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        synced: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        failed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
        void: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700 line-through',

        // Urgency
        low: 'bg-slate-100 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
        normal: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        high: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        critical: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse',

    };

    const labels: Record<string, string> = {
        pending: 'Pending', scheduled: 'Scheduled', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
        draft: 'Draft', pending_approval: 'Needs Approval', approved: 'Approved', synced: ' synced', failed: 'Failed', void: 'Void',
        low: 'Low', normal: 'Normal', high: 'High', critical: 'Critical'
    };

    return (
        <Badge variant="outline" className={cn('capitalize font-medium border shadow-sm', styles[status] || 'bg-muted text-foreground')}>
            {labels[status] || status.replace('_', ' ')}
        </Badge>
    );
}

export default function JobsPage() {
    const initialNewJobForm: NewJobFormState = {
        dealership_name: DEALERSHIPS[0] ?? '',
        service_name: SERVICES[0] ?? '',
        vehicle_summary: '2024 Ford F-150',
        urgency: 'normal',
        assigned_technician_name: 'unassigned',
        push_to_available: true,
    };

    // State
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Job[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [createJobOpen, setCreateJobOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [newJobForm, setNewJobForm] = useState<NewJobFormState>(initialNewJobForm);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

    // Load Data Simulation
    const fetchData = () => {
        setLoading(true);
        // Simulate API Latency and Server-Side Filtering
        setTimeout(() => {
            let filtered = [...loadPersistedJobs()];

            // Filter logic (simulating backend)
            if (searchQuery) {
                const lower = searchQuery.toLowerCase();
                filtered = filtered.filter(j =>
                    j.job_code.toLowerCase().includes(lower) ||
                    j.dealership_name.toLowerCase().includes(lower) ||
                    j.vehicle_summary.toLowerCase().includes(lower)
                );
            }
            if (statusFilter !== 'all') filtered = filtered.filter(j => j.job_status === statusFilter);
            if (invoiceFilter !== 'all') filtered = filtered.filter(j => j.invoice_state === invoiceFilter);
            if (urgencyFilter !== 'all') filtered = filtered.filter(j => j.urgency === urgencyFilter);

            // Sort by priority score (descending)
            filtered = [...filtered].sort((a, b) => (b.ranking_score || 0) - (a.ranking_score || 0));

            const total = filtered.length;
            const totalPages = Math.ceil(total / pagination.pageSize);
            const start = (pagination.page - 1) * pagination.pageSize;
            const paginatedData = filtered.slice(start, start + pagination.pageSize);

            setData(paginatedData);
            setPagination(prev => ({ ...prev, total, totalPages }));
            setLoading(false);
        }, 600);
    };

    useEffect(() => {
        fetchData();
    }, [pagination.page, pagination.pageSize, searchQuery, statusFilter, invoiceFilter, urgencyFilter]);

    // Handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRows(new Set(data.map(j => j.job_id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedRows);
        if (checked) newSelected.add(id);
        else newSelected.delete(id);
        setSelectedRows(newSelected);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setInvoiceFilter('all');
        setUrgencyFilter('all');
        setPagination(p => ({ ...p, page: 1 }));
    };

    const handleCreateJob = () => {
        const dealershipName = newJobForm.dealership_name.trim();
        const serviceName = newJobForm.service_name.trim();
        const vehicleSummary = newJobForm.vehicle_summary.trim();

        if (!dealershipName || !serviceName || !vehicleSummary) {
            alert('Dealership, service, and vehicle are required.');
            return;
        }

        const dealership = MOCK_DEALERSHIPS.find((entry) => entry.name === dealershipName);
        const service = MOCK_SERVICES.find((entry) => entry.name === serviceName);
        const vehicleMake = vehicleSummary.split(' ')[1] || '';

        const urgencyMap: Record<Urgency, UrgencyLevel> = {
            low: 'LOW',
            normal: 'MEDIUM',
            high: 'HIGH',
            critical: 'CRITICAL',
        };
        const reverseUrgencyMap: Record<UrgencyLevel, Urgency> = {
            LOW: 'low',
            MEDIUM: 'normal',
            HIGH: 'high',
            CRITICAL: 'critical',
        };

        const priorityResult = calculateJobRanking({
            dealershipId: dealership?.id || '',
            serviceId: service?.id || '',
            urgency: urgencyMap[newJobForm.urgency],
            vehicleMake,
        }, priorityRules);

        const nowIso = new Date().toISOString();
        const newJob: Job = {
            job_id: `job-local-${Date.now()}`,
            job_code: `SM2-NEW-${String(Date.now()).slice(-6)}`,
            dealership_name: dealershipName,
            service_name: serviceName,
            vehicle_summary: vehicleSummary,
            urgency: reverseUrgencyMap[priorityResult.finalUrgency] || newJobForm.urgency,
            assigned_technician_name: newJobForm.assigned_technician_name === 'unassigned' ? null : newJobForm.assigned_technician_name,
            job_status: 'pending',
            invoice_state: 'draft',
            attention_flag: false,
            created_at: nowIso,
            updated_at: nowIso,
            allowed_actions: ['view', 'edit', 'cancel', 'assign'],
            ranking_score: priorityResult.score,
            applied_rules: priorityResult.appliedRules,
        };

        const nextPersisted = [newJob, ...loadPersistedJobs()];
        persistJobs(nextPersisted);

        if (newJobForm.push_to_available) {
            syncJobToAvailableQueue(newJob);
        }

        appendAuditLog(
            'job.created',
            `Job ${newJob.job_code} created from Jobs section`,
            {
                job_id: newJob.job_id,
                job_code: newJob.job_code,
                dealership_name: newJob.dealership_name,
                service_name: newJob.service_name,
                status: newJob.job_status,
                pushed_to_available_queue: newJobForm.push_to_available,
            }
        );

        setCreateJobOpen(false);
        setNewJobForm(initialNewJobForm);
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchData();
    };

    const getJobsForExport = () => (
        selectedRows.size > 0
            ? data.filter((job) => selectedRows.has(job.job_id))
            : data
    );

    const getJobExportRows = (jobsToExport: Job[]) => jobsToExport.map((job) => ({
        JobCode: job.job_code,
        Dealership: job.dealership_name,
        Service: job.service_name,
        Vehicle: job.vehicle_summary,
        Urgency: job.urgency,
        Technician: job.assigned_technician_name || '',
        JobStatus: job.job_status,
        InvoiceState: job.invoice_state,
        CreatedAt: job.created_at,
        UpdatedAt: job.updated_at,
    }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportRows = getJobExportRows(getJobsForExport());
        const exportData = selectColumnsForExport(exportRows, selectedColumns);
        const filename = selectedRows.size > 0 ? 'jobs_selected_export' : 'jobs_export';
        exportArrayData(exportData, filename, format);
    };

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* 1. Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Jobs</h1>
                    <p className="text-sm text-muted-foreground font-medium">Monitor and manage all dispatch jobs</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="h-9 bg-[#2F8E92] hover:bg-[#267276]" onClick={() => setCreateJobOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Job
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4 mr-2 text-muted-foreground" />
                        Export CSV
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchData}>
                        <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Create New Job</DialogTitle>
                        <DialogDescription>
                            Add a job from the Jobs section. You can also push it to technician Available Jobs as READY_FOR_TECH_ACCEPTANCE.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dealership</Label>
                                <Select
                                    value={newJobForm.dealership_name}
                                    onValueChange={(value) => setNewJobForm((prev) => ({ ...prev, dealership_name: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select dealership" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEALERSHIPS.map((dealership) => (
                                            <SelectItem key={dealership} value={dealership}>{dealership}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Service</Label>
                                <Select
                                    value={newJobForm.service_name}
                                    onValueChange={(value) => setNewJobForm((prev) => ({ ...prev, service_name: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SERVICES.map((service) => (
                                            <SelectItem key={service} value={service}>{service}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Vehicle Summary</Label>
                            <Input
                                value={newJobForm.vehicle_summary}
                                onChange={(event) => setNewJobForm((prev) => ({ ...prev, vehicle_summary: event.target.value }))}
                                placeholder="e.g. 2024 Audi A4"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Urgency</Label>
                                <Select
                                    value={newJobForm.urgency}
                                    onValueChange={(value) => setNewJobForm((prev) => ({ ...prev, urgency: value as Urgency }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Assigned Technician</Label>
                                <Select
                                    value={newJobForm.assigned_technician_name}
                                    onValueChange={(value) => setNewJobForm((prev) => ({ ...prev, assigned_technician_name: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {MOCK_TECHS.map((tech) => (
                                            <SelectItem key={tech.id} value={tech.name}>{tech.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                            <Checkbox
                                checked={newJobForm.push_to_available}
                                onCheckedChange={(checked) => setNewJobForm((prev) => ({ ...prev, push_to_available: Boolean(checked) }))}
                                id="push-to-available"
                            />
                            <Label htmlFor="push-to-available" className="text-sm font-medium cursor-pointer">
                                Push to technician queue as `READY_FOR_TECH_ACCEPTANCE`
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateJobOpen(false);
                                setNewJobForm(initialNewJobForm);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button className="bg-[#2F8E92] hover:bg-[#267276]" onClick={handleCreateJob}>
                            Create Job
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Jobs"
                description="Select the job columns you want in your CSV."
                availableColumns={JOB_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            {/* 2. Filter Bar (Enterprise Grade) */}
            <Card className="p-4 border-border shadow-sm space-y-4 bg-card">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                            placeholder="Search by Job Code, VIN, Stock, or Dealership..."
                            className="pl-9 bg-muted/20 border-border focus:bg-background transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-background border-dashed border-border text-foreground">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Job Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                            <SelectTrigger className="w-[180px] bg-background border-dashed border-border text-foreground">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Invoice State" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Invoices</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="pending_approval">Needs Approval</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                            <SelectTrigger className="w-[160px] bg-background border-dashed border-border text-foreground">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Urgency" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Urgency</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                            </SelectContent>
                        </Select>

                        {(statusFilter !== 'all' || invoiceFilter !== 'all' || urgencyFilter !== 'all' || searchQuery) && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2">
                                <X className="w-4 h-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Quick Filter Chips */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Pending Review', query: 'pending_approval', count: 8, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                        { label: 'Awaiting Tech Acceptance', query: 'pending', count: 12, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                        { label: 'Invoice Approval Required', query: 'pending_approval', count: 5, color: 'text-purple-600 bg-purple-50 border-purple-200' },
                        { label: 'Attention Required', query: 'failed', count: 4, color: 'text-red-600 bg-red-50 border-red-200' },
                    ].map((chip) => (
                        <button
                            key={chip.label}
                            className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-colors hover:opacity-80",
                                chip.color
                            )}
                            // Simplified: Just demo buttons for now, would link to complex filtering
                            onClick={() => { }}
                        >
                            {chip.label}
                            <span className="ml-2 bg-white/50 px-1.5 py-0.5 rounded-full text-[10px]">{chip.count}</span>
                        </button>
                    ))}
                </div>
            </Card>

            {/* 3. Jobs Table */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No jobs found</h3>
                        <p className="text-sm mt-1 max-w-sm text-center">We couldn't find any jobs matching your filters. Try adjusting your search criteria.</p>
                        <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear all filters</Button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[40px] pl-4">
                                        <Checkbox
                                            checked={selectedRows.size === data.length && data.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[200px]">
                                        <Button variant="ghost" size="sm" className="-ml-3 h-8 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Job Details <ArrowUpDown className="ml-2 h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="w-[180px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Dealership</TableHead>
                                    <TableHead className="w-[200px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Vehicle</TableHead>
                                    <TableHead className="w-[180px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Technician</TableHead>
                                    <TableHead className="w-[120px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Urgency</TableHead>
                                    <TableHead className="w-[100px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Ranking</TableHead>

                                    <TableHead className="w-[140px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Status</TableHead>

                                    <TableHead className="w-[140px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Invoice</TableHead>
                                    <TableHead className="w-[50px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((job) => (
                                    <TableRow
                                        key={job.job_id}
                                        className={cn(
                                            "hover:bg-gray-50 transition-colors cursor-pointer group",
                                            job.attention_flag && "bg-red-50/30 hover:bg-red-50/50"
                                        )}
                                    >
                                        <TableCell className="pl-4 relative">
                                            {/* Attention Indicator */}
                                            {job.attention_flag && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-sm" />
                                            )}
                                            <Checkbox
                                                checked={selectedRows.has(job.job_id)}
                                                onCheckedChange={(checked) => handleSelectRow(job.job_id, checked as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 group-hover:text-[#2F8E92] transition-colors">{job.job_code}</span>
                                                <span className="text-xs text-gray-500">{job.service_name}</span>
                                                {job.attention_flag && (
                                                    <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1">
                                                        <AlertCircle className="w-3 h-3" /> Attention
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2Icon className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-700">{job.dealership_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-gray-700 font-medium">{job.vehicle_summary}</div>
                                        </TableCell>
                                        <TableCell>
                                            {job.assigned_technician_name ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                                                        {job.assigned_technician_name.substring(0, 2)}
                                                    </div>
                                                    <span className="text-sm text-gray-700">{job.assigned_technician_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={job.urgency} type="urgency" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Badge className="w-fit bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                                    Rank: {job.ranking_score}
                                                </Badge>


                                                {job.applied_rules && job.applied_rules.length > 0 && (
                                                    <span className="text-[10px] text-gray-400 mt-1 truncate max-w-[80px]" title={job.applied_rules.join(', ')}>
                                                        {job.applied_rules.length} rules
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge status={job.job_status} type="job" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={job.invoice_state} type="invoice" />
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>Open Job</DropdownMenuItem>
                                                    <DropdownMenuItem>View Invoice</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {job.allowed_actions.includes('assign') && (
                                                        <DropdownMenuItem>Assign Technician</DropdownMenuItem>
                                                    )}
                                                    {job.allowed_actions.includes('cancel') && (
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">Cancel Job</DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination & Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing <span className="font-medium text-gray-900">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to <span className="font-medium text-gray-900">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> entries
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Rows per page</span>
                            <Select
                                value={pagination.pageSize.toString()}
                                onValueChange={(val) => setPagination(prev => ({ ...prev, pageSize: Number(val), page: 1 }))}
                            >
                                <SelectTrigger className="w-[70px] h-8 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="text-sm font-medium px-2">
                                Page {pagination.page} of {pagination.totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Bulk Actions (Floating) */}
            {selectedRows.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold">{selectedRows.size}</div>
                        <span className="text-sm font-medium">Selected</span>
                    </div>
                    <div className="h-4 w-px bg-white/20" />
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="hover:bg-white/10 text-white hover:text-white h-8">
                            <User className="w-4 h-4 mr-2" />
                            Assign Tech
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:bg-white/10 text-white hover:text-white h-8">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark Reviewed
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:bg-white/10 text-white hover:text-white h-8" onClick={() => setExportModalOpen(true)}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                    <div className="ml-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-full hover:bg-white/20 text-gray-400 hover:text-white"
                            onClick={() => setSelectedRows(new Set())}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icon Helper
function Building2Icon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
        </svg>
    )
}
