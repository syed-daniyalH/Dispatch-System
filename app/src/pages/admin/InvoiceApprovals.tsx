import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    Car,
    User,
    ShieldAlert,
    Download,
    MoreHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Plus,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';

// --- Types ---

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface PendingInvoice {
    job_id: string;
    job_code: string;
    dealership_name: string;
    technician_name: string | null;
    service_summary: string;
    vehicle_summary: string;
    completed_at: string;
    estimated_total: number;
    invoice_state: 'pending_approval' | 'creating' | 'approved'; // Only show pending/creating in this UI
    allowed_actions: string[];
    items: InvoiceItem[];
}

// --- Mock Data ---

const MOCK_PENDING_INVOICES: PendingInvoice[] = [
    {
        job_id: '1',
        job_code: 'SM2-2024-1045',
        dealership_name: 'Audi de Quebec',
        technician_name: 'Jolianne',
        service_summary: 'Key Programming',
        vehicle_summary: '2023 Ford F-150',
        completed_at: '2024-03-20T14:30:00Z',
        estimated_total: 210.60,
        invoice_state: 'pending_approval',
        allowed_actions: ['approve_invoice', 'edit_invoice'],
        items: [
            { id: 'i1', description: 'Transponder Key Program', quantity: 1, unit_price: 150.00, total: 150.00 },
            { id: 'i2', description: 'Service Call Fee', quantity: 1, unit_price: 45.00, total: 45.00 },
        ]
    },
    {
        job_id: '2',
        job_code: 'SM2-2024-1042',
        dealership_name: 'Toyota Ste-Foy',
        technician_name: 'Victor',
        service_summary: 'Lockout Service',
        vehicle_summary: '2022 Toyota Camry',
        completed_at: '2024-03-20T13:15:00Z',
        estimated_total: 125.00,
        invoice_state: 'pending_approval',
        allowed_actions: ['approve_invoice', 'edit_invoice'],
        items: [
            { id: 'i3', description: 'Emergency Lockout', quantity: 1, unit_price: 125.00, total: 125.00 },
        ]
    },
    {
        job_id: '3',
        job_code: 'SM2-2024-1038',
        dealership_name: 'Honda Donnacona',
        technician_name: 'Maxime',
        service_summary: 'Diagnostics',
        vehicle_summary: '2024 BMW X5',
        completed_at: '2024-03-20T11:45:00Z',
        estimated_total: 185.00,
        invoice_state: 'pending_approval',
        allowed_actions: ['approve_invoice', 'edit_invoice'],
        items: [
            { id: 'i4', description: 'System Diagnostics', quantity: 1, unit_price: 185.00, total: 185.00 },
        ]
    },
];

const INVOICE_APPROVAL_EXPORT_COLUMNS = [
    'JobCode',
    'Dealership',
    'Technician',
    'Service',
    'Vehicle',
    'CompletedAt',
    'EstimatedTotal',
    'InvoiceState',
];

// --- Components ---

function StatusBadge({ status }: { status: string }) {
    if (status === 'creating') {
        return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
                Generating...
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Needs Approval
        </Badge>
    );
}

export default function InvoiceApprovalsPage() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [approvalNote, setApprovalNote] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Editable Items State
    const [editItems, setEditItems] = useState<InvoiceItem[]>([]);

    // Mock Fetch
    const fetchInvoices = () => {
        setLoading(true);
        setTimeout(() => {
            setInvoices(MOCK_PENDING_INVOICES);
            setLoading(false);
        }, 600);
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Handlers
    const handleOpenDrawer = (invoice: PendingInvoice) => {
        setSelectedInvoice(invoice);
        setEditItems(JSON.parse(JSON.stringify(invoice.items))); // Deep copy
        setApprovalNote('');
        setDrawerOpen(true);
    };

    const calculateTotals = (items: InvoiceItem[]) => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
        const tax = subtotal * 0.08; // Mock 8% tax
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
        setEditItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                updated.total = updated.quantity * updated.unit_price;
                return updated;
            }
            return item;
        }));
    };

    const handleApprove = () => {
        if (!selectedInvoice) return;
        setIsApproving(true);
        setConfirmDialogOpen(false);

        // Prepare the approved invoice object
        const finalTotals = calculateTotals(editItems);
        const approvedInvoice = {
            id: `INV-${Date.now().toString().slice(-4)}`,
            job_code: selectedInvoice.job_code,
            dealership_name: selectedInvoice.dealership_name,
            technician_name: selectedInvoice.technician_name || 'Unassigned',
            amount: finalTotals.total,
            approved_at: new Date().toISOString(),
            approved_by: 'Admin Alex', // Mock current user
            status: 'verified' as const,
            items: editItems.map(item => ({
                description: item.description,
                quantity: item.quantity,
                price: item.unit_price,
                total: item.total
            }))
        };

        // Simulate backend call
        setTimeout(() => {
            // Save to localStorage
            const existing = localStorage.getItem('approved_invoices');
            const history = existing ? JSON.parse(existing) : [];
            localStorage.setItem('approved_invoices', JSON.stringify([approvedInvoice, ...history]));

            // Update local state to remove approved item
            setInvoices(prev => prev.filter(inv => inv.job_id !== selectedInvoice.job_id));
            setDrawerOpen(false);
            setIsApproving(false);
            setSelectedInvoice(null);
        }, 1500);
    };

    const totals = calculateTotals(editItems);

    const getInvoiceApprovalExportRows = () => invoices.map((invoice) => ({
        JobCode: invoice.job_code,
        Dealership: invoice.dealership_name,
        Technician: invoice.technician_name || '',
        Service: invoice.service_summary,
        Vehicle: invoice.vehicle_summary,
        CompletedAt: invoice.completed_at,
        EstimatedTotal: invoice.estimated_total,
        InvoiceState: invoice.invoice_state,
    }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getInvoiceApprovalExportRows(), selectedColumns);
        exportArrayData(exportData, 'invoice_approvals_export', format);
    };

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* 1. Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoice Approvals</h1>
                    <p className="text-sm text-gray-500 font-medium">Review pricing and approve invoice creation</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center text-xs text-gray-400 font-medium mr-2">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                    <Button variant="outline" className="h-9" onClick={fetchInvoices}>
                        <RefreshCw className={cn("w-4 h-4 mr-2 text-gray-500", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="outline" className="h-9" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4 mr-2 text-gray-500" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Invoice Approvals"
                description="Select the pending-approval columns you want in your CSV."
                availableColumns={INVOICE_APPROVAL_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            {/* 2. Filter Bar */}
            <Card className="p-4 border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full lg:w-auto min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by Job Code, Dealership, or VIN..."
                            className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <Button variant="outline" className="border-dashed text-gray-600">
                            <Filter className="w-4 h-4 mr-2" />
                            Dealership
                        </Button>
                        <Button variant="outline" className="border-dashed text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            Technician
                        </Button>
                        <div className="h-6 w-px bg-gray-200 mx-2" />
                        <Button variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200">
                            All Pending ({invoices.length})
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 3. Queue Table */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
                        <p className="text-sm mt-1 max-w-sm text-center">No invoices pending approval at this time. Great job.</p>
                        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/jobs')}>Go to Jobs</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[180px] pl-6 font-semibold text-xs text-gray-600 uppercase tracking-wider">Job Code</TableHead>
                                <TableHead className="w-[200px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Dealership</TableHead>
                                <TableHead className="w-[180px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Technician</TableHead>
                                <TableHead className="w-[150px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Completed At</TableHead>
                                <TableHead className="w-[180px] font-semibold text-xs text-gray-600 uppercase tracking-wider">Service</TableHead>
                                <TableHead className="w-[120px] text-right font-semibold text-xs text-gray-600 uppercase tracking-wider">Est. Total</TableHead>
                                <TableHead className="w-[140px] text-center font-semibold text-xs text-gray-600 uppercase tracking-wider">Status</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((inv) => (
                                <TableRow
                                    key={inv.job_id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                    onClick={() => handleOpenDrawer(inv)}
                                >
                                    <TableCell className="pl-6 font-medium text-gray-900 group-hover:text-[#2F8E92]">{inv.job_code}</TableCell>
                                    <TableCell className="text-gray-600">{inv.dealership_name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                                                {inv.technician_name?.substring(0, 2) || 'NA'}
                                            </div>
                                            <span className="text-sm text-gray-700">{inv.technician_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-xs font-mono">{new Date(inv.completed_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-gray-600 max-w-[180px] truncate">{inv.service_summary}</TableCell>
                                    <TableCell className="text-right font-mono font-medium text-gray-900">${inv.estimated_total.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={inv.invoice_state} />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* 4. Invoice Preview Drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0 shadow-2xl">
                    {selectedInvoice && (
                        <>
                            <div className="p-6 border-b border-gray-200 bg-gray-50">
                                <SheetHeader>
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                                            Pending Approval
                                        </Badge>
                                        <span className="text-xs font-mono text-gray-400">ID: {selectedInvoice.job_id}</span>
                                    </div>
                                    <SheetTitle className="text-xl font-bold text-gray-900">Invoice Preview — {selectedInvoice.job_code}</SheetTitle>
                                    <SheetDescription className="text-sm text-gray-500">
                                        Review and approve services for QuickBooks generation.
                                    </SheetDescription>
                                </SheetHeader>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">

                                    {/* A) Job Snapshot */}
                                    <section className="grid grid-cols-2 gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Dealership</h4>
                                            <div className="font-medium text-gray-900">{selectedInvoice.dealership_name}</div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Vehicle</h4>
                                            <div className="font-medium text-gray-900">{selectedInvoice.vehicle_summary}</div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Technician</h4>
                                            <div className="font-medium text-gray-900">{selectedInvoice.technician_name}</div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Completed</h4>
                                            <div className="font-medium text-gray-900">{new Date(selectedInvoice.completed_at).toLocaleDateString()}</div>
                                        </div>
                                    </section>

                                    {/* B) Editable Line Items */}
                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="tex-sm font-bold text-gray-900 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" /> Billable Items
                                            </h3>
                                            <Badge variant="secondary" className="text-xs text-blue-600 bg-blue-50 border-blue-100">Editable</Badge>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-gray-50">
                                                    <TableRow>
                                                        <TableHead className="h-8 text-xs font-semibold">Service / Description</TableHead>
                                                        <TableHead className="h-8 w-[60px] text-xs font-semibold text-center">Qty</TableHead>
                                                        <TableHead className="h-8 w-[100px] text-xs font-semibold text-right">Price</TableHead>
                                                        <TableHead className="h-8 w-[100px] text-xs font-semibold text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {editItems.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="py-2">
                                                                <Input
                                                                    className="h-8 text-sm border-transparent hover:border-gray-200 focus:border-blue-500 px-2"
                                                                    value={item.description}
                                                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="py-2">
                                                                <Input
                                                                    type="number"
                                                                    className="h-8 text-sm text-center border-transparent hover:border-gray-200 focus:border-blue-500 px-1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="py-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-8 text-sm text-right pl-5 border-transparent hover:border-gray-200 focus:border-blue-500 px-2"
                                                                        value={item.unit_price}
                                                                        onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right py-2 font-mono text-sm text-gray-700">
                                                                ${item.total.toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <div className="bg-gray-50/50 p-4 border-t border-gray-200 space-y-2">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Subtotal</span>
                                                    <span>${totals.subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Tax (8%)</span>
                                                    <span>${totals.tax.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                    <span>Total</span>
                                                    <span>${totals.total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* D) Audit Note */}
                                    <section>
                                        <Label htmlFor="audit-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                            Approval Note (Optional)
                                        </Label>
                                        <Textarea
                                            id="audit-note"
                                            placeholder="Add a note to the audit log about this approval..."
                                            className="resize-none"
                                            value={approvalNote}
                                            onChange={(e) => setApprovalNote(e.target.value)}
                                        />
                                    </section>

                                </div>
                            </ScrollArea>

                            {/* C) Footer Actions */}
                            <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-20">
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                                    <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="flex-[2] bg-[#2F8E92] hover:bg-[#267276] text-white shadow-sm font-semibold">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Approve & Generate
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-gray-900">
                                                    <ShieldAlert className="w-5 h-5 text-orange-600" /> Confirm Invoice Generation
                                                </DialogTitle>
                                                <DialogDescription className="pt-2">
                                                    This will immediately create an invoice in QuickBooks for <strong>{selectedInvoice.job_code}</strong> with a total of <strong>${totals.total.toFixed(2)}</strong>.
                                                    <br /><br />
                                                    This action cannot be undone from the portal. Are you sure?
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="mt-4">
                                                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={handleApprove} disabled={isApproving} className="bg-[#2F8E92] hover:bg-[#267276]">
                                                    {isApproving ? 'Processing...' : 'Yes, Create Invoice'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

        </div>
    );
}
