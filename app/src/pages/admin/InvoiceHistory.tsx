import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    Eye,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    FileText,
    User,
    Building2,
    Calendar,
    ArrowUpRight,
    CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';

// --- Types ---

interface InvoiceHistoryItem {
    id: string;
    job_code: string;
    dealership_name: string;
    technician_name: string;
    amount: number;
    approved_at: string;
    approved_by: string;
    status: 'paid' | 'sent' | 'verified';
    items: { description: string; quantity: number; price: number; total: number }[];
}

// --- Mock Data ---

const MOCK_HISTORY: InvoiceHistoryItem[] = [
    {
        id: 'INV-001',
        job_code: 'SM2-2024-0985',
        dealership_name: 'Audi de Quebec',
        technician_name: 'Jolianne',
        amount: 345.50,
        approved_at: '2024-03-15T10:00:00Z',
        approved_by: 'Admin Alex',
        status: 'verified',
        items: [
            { description: 'Electronic Key Programming', quantity: 1, price: 250.00, total: 250.00 },
            { description: 'Service Call', quantity: 1, price: 95.50, total: 95.50 },
        ]
    },
    {
        id: 'INV-002',
        job_code: 'SM2-2024-0982',
        dealership_name: 'Toyota Ste-Foy',
        technician_name: 'Victor',
        amount: 150.00,
        approved_at: '2024-03-14T15:30:00Z',
        approved_by: 'Admin Alex',
        status: 'paid',
        items: [
            { description: 'Emergency Lockout', quantity: 1, price: 150.00, total: 150.00 },
        ]
    },
    {
        id: 'INV-003',
        job_code: 'SM2-2024-0978',
        dealership_name: 'Honda Donnacona',
        technician_name: 'Maxime',
        amount: 520.00,
        approved_at: '2024-03-12T09:15:00Z',
        approved_by: 'Admin Alex',
        status: 'sent',
        items: [
            { description: 'Ignition Repair', quantity: 1, price: 450.00, total: 450.00 },
            { description: 'Travel Fee', quantity: 1, price: 70.00, total: 70.00 },
        ]
    },
    {
        id: 'INV-004',
        job_code: 'SM2-2024-0975',
        dealership_name: 'BMW Quebec',
        technician_name: 'Dany',
        amount: 89.00,
        approved_at: '2024-03-10T11:45:00Z',
        approved_by: 'Admin Alex',
        status: 'verified',
        items: [
            { description: 'Battery Boost', quantity: 1, price: 89.00, total: 89.00 },
        ]
    }
];

const INVOICE_HISTORY_EXPORT_COLUMNS = [
    'InvoiceID',
    'JobCode',
    'Dealership',
    'Technician',
    'Amount',
    'ApprovedAt',
    'ApprovedBy',
    'Status',
];

export default function InvoiceHistoryPage() {
    const [history, setHistory] = useState<InvoiceHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceHistoryItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    const fetchHistory = () => {
        setLoading(true);
        setTimeout(() => {
            // Merge with localStorage if exists (for newly approved ones)
            const stored = localStorage.getItem('approved_invoices');
            const localApproved = stored ? JSON.parse(stored) : [];
            setHistory([...localApproved, ...MOCK_HISTORY]);
            setLoading(false);
        }, 600);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const filteredHistory = history.filter(inv =>
        inv.job_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.dealership_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.technician_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleViewInvoice = (invoice: InvoiceHistoryItem) => {
        setSelectedInvoice(invoice);
        setDrawerOpen(true);
    };

    const getInvoiceHistoryExportRows = () => filteredHistory.map((invoice) => ({
        InvoiceID: invoice.id,
        JobCode: invoice.job_code,
        Dealership: invoice.dealership_name,
        Technician: invoice.technician_name,
        Amount: invoice.amount,
        ApprovedAt: invoice.approved_at,
        ApprovedBy: invoice.approved_by,
        Status: invoice.status,
    }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getInvoiceHistoryExportRows(), selectedColumns);
        exportArrayData(exportData, 'invoice_history_export', format);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Invoice History</h1>
                    <p className="text-sm text-muted-foreground font-medium">Archive of all approved and processed invoices</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchHistory} className="h-9 gap-2">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4" /> Export Archive
                    </Button>
                </div>
            </div>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Invoice History"
                description="Select the invoice history columns you want in your CSV."
                availableColumns={INVOICE_HISTORY_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            <Card className="p-4 border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Job Code, Dealership or Tech..."
                            className="pl-9 bg-muted/30 border-border focus:bg-background transition-all h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[150px] h-10">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="h-10 gap-2">
                            <Calendar className="w-4 h-4" /> Period
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-medium text-foreground">No invoices found</p>
                        <p className="text-sm">Try adjusting your search filters</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Invoice / Job</TableHead>
                                <TableHead>Dealership</TableHead>
                                <TableHead>Technician</TableHead>
                                <TableHead>Approved Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-[80px] pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHistory.map((inv) => (
                                <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => handleViewInvoice(inv)}>
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground text-sm">{inv.id}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{inv.job_code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-foreground font-medium text-sm">{inv.dealership_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-[#2F8E92]/10 flex items-center justify-center text-[10px] font-bold text-[#2F8E92]">
                                                {inv.technician_name.substring(0, 2)}
                                            </div>
                                            <span className="text-foreground text-sm">{inv.technician_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground text-xs">{format(new Date(inv.approved_at), 'MMM dd, yyyy · HH:mm')}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-foreground">
                                        ${inv.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "capitalize text-[10px] px-2 py-0.5",
                                                inv.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    inv.status === 'sent' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                        "bg-gray-500/10 text-muted-foreground border-border"
                                            )}
                                        >
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-6 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowUpRight className="w-4 h-4 text-[#2F8E92]" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-xl w-full flex flex-col p-0">
                    {selectedInvoice && (
                        <>
                            <div className="p-6 bg-muted/30 border-b border-border">
                                <SheetHeader>
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">Processed by {selectedInvoice.approved_by}</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-bold text-foreground">{selectedInvoice.id}</SheetTitle>
                                    <SheetDescription>Invoice details for job {selectedInvoice.job_code}</SheetDescription>
                                </SheetHeader>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Dealership</label>
                                            <p className="text-foreground font-semibold">{selectedInvoice.dealership_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Technician</label>
                                            <p className="text-foreground font-semibold">{selectedInvoice.technician_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Approved At</label>
                                            <p className="text-foreground text-sm">{format(new Date(selectedInvoice.approved_at), 'PPPP · HH:mm')}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">QB Sync Status</label>
                                            <p className="text-emerald-500 text-sm font-medium flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3" /> Synced successfully
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="text-[10px] uppercase font-bold">Line Description</TableHead>
                                                    <TableHead className="text-[10px] uppercase font-bold text-center w-[60px]">Qty</TableHead>
                                                    <TableHead className="text-[10px] uppercase font-bold text-right w-[100px]">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedInvoice.items.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="text-sm text-foreground py-3">{item.description}</TableCell>
                                                        <TableCell className="text-sm text-center py-3">{item.quantity}</TableCell>
                                                        <TableCell className="text-sm text-right font-mono py-3">${item.total.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <div className="p-4 bg-muted/20 border-t border-border flex justify-between items-center">
                                            <span className="text-sm font-bold text-foreground">Invoice Total</span>
                                            <span className="text-xl font-bold text-[#2F8E92] font-mono">${selectedInvoice.amount.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button className="flex-1 gap-2" variant="outline">
                                            <Download className="w-4 h-4" /> Download PDF
                                        </Button>
                                        <Button className="flex-1 gap-2 bg-[#2F8E92] hover:bg-[#2F8E92]/90">
                                            <ArrowUpRight className="w-4 h-4" /> View in QuickBooks
                                        </Button>
                                    </div>
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
