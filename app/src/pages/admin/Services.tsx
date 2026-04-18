import { useEffect, useState } from 'react';
import {
    Archive,
    CheckCircle2,
    Copy,
    DollarSign,
    Edit2,
    FileDown,
    FileText,
    History,
    Info,
    MoreVertical,
    Plus,
    RefreshCw,
    Search,
} from 'lucide-react';
import { exportArrayData, selectColumnsForExport, type ExportFormat } from '@/lib/export';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';

type ServiceStatus = 'active' | 'archived';

interface ServiceItem {
    id: string;
    code: string;
    name: string;
    sku: string | null;
    category: string;
    default_price: number;
    status: ServiceStatus;
    notes?: string;
    updated_at: string;
    updated_by?: string;
    allowed_actions: string[];
}

const DEFAULT_UPDATED_AT = '2026-03-04T00:00:00Z';

function createMockService(
    id: number,
    code: string,
    name: string,
    category: string,
    defaultPrice: number,
    sku: string | null = null,
    notes?: string,
): ServiceItem {
    return {
        id: `service-${id}`,
        code,
        name,
        sku,
        category,
        default_price: defaultPrice,
        status: 'active',
        notes,
        updated_at: DEFAULT_UPDATED_AT,
        updated_by: 'System Import',
        allowed_actions: ['edit', 'archive', 'duplicate'],
    };
}

export const MOCK_SERVICES: ServiceItem[] = [
    createMockService(1, 'PPF-ALA-AILES-COMP-2', 'Full Fender Protection (2 panels)', 'PPF', 400),
    createMockService(2, 'PPF-ALA-CAPOT-12', 'Hood Protection Strip 12"', 'PPF', 120),
    createMockService(3, 'PPF-ALA-CAPOT-18', 'Hood Protection Strip 18"', 'PPF', 170),
    createMockService(4, 'PPF-ALA-TOIT-4', 'Roof Protection Strip 4"', 'PPF', 40),
    createMockService(5, 'PPF-ALA-TOIT-6', 'Roof Protection Strip 6"', 'PPF', 50),
    createMockService(6, 'PPF-ALA-TOIT-8', 'Roof Protection Strip 8"', 'PPF', 75),
    createMockService(7, 'PPF-ALA-TOIT-12', 'Roof Protection Strip 12"', 'PPF', 100),
    createMockService(8, 'PPF-OPT-BANDE-AR', 'Rear Bumper Protection Strip', 'PPF', 50),
    createMockService(9, 'CER-EXT-1YR', '1 Year Ceramic Coating', 'Ceramic Coating', 250),
    createMockService(10, 'CER-EXT-3YR', '3 Year Ceramic Coating', 'Ceramic Coating', 550),
    createMockService(11, 'CER-EXT-5YR', 'Premium Ceramic Coating', 'Ceramic Coating', 900),
    createMockService(12, 'TINT-FRONT-PAIR', 'Front Window Tint', 'Window Tint', 120),
    createMockService(13, 'TINT-FULL-CAR', 'Full Vehicle Tint', 'Window Tint', 350),
    createMockService(14, 'TINT-WINDSHIELD', 'Windshield UV Protection Tint', 'Window Tint', 150),
    createMockService(15, 'PC-STAGE1', 'Stage 1 Paint Correction', 'Paint Correction', 200),
    createMockService(16, 'PC-STAGE2', 'Stage 2 Paint Correction', 'Paint Correction', 400),
    createMockService(17, 'PC-STAGE3', 'Stage 3 Paint Correction', 'Paint Correction', 700),
    createMockService(18, 'CW-BASIC', 'Basic Exterior Wash', 'Car Wash', 25),
    createMockService(19, 'CW-DELUXE', 'Deluxe Car Wash', 'Car Wash', 40),
    createMockService(20, 'CW-PREMIUM', 'Premium Car Wash', 'Car Wash', 60),
    createMockService(21, 'CW-UNDERBODY', 'Underbody Wash', 'Car Wash', 30),
    createMockService(22, 'INT-VAC', 'Interior Vacuum Cleaning', 'Interior Cleaning', 30),
    createMockService(23, 'INT-DEEP', 'Deep Interior Cleaning', 'Interior Cleaning', 90),
    createMockService(24, 'INT-LEATHER', 'Leather Seat Conditioning', 'Interior Cleaning', 80),
    createMockService(25, 'DET-INT-BASIC', 'Interior Detailing', 'Detailing', 120),
    createMockService(26, 'DET-EXT-BASIC', 'Exterior Detailing', 'Detailing', 100),
    createMockService(27, 'DET-FULL', 'Full Vehicle Detailing', 'Detailing', 220),
    createMockService(28, 'ENG-CLEAN', 'Engine Bay Cleaning', 'Engine Bay', 70),
    createMockService(29, 'ENG-DETAIL', 'Engine Bay Detailing', 'Engine Bay', 120),
    createMockService(30, 'HL-RESTORE', 'Headlight Restoration', 'Headlight', 85),
    createMockService(31, 'RS-BATTERY', 'Battery Replacement', 'Roadside', 120),
    createMockService(32, 'RS-JUMPSTART', 'Battery Jump Start', 'Roadside', 60),
    createMockService(33, 'RS-TIRE', 'Flat Tire Replacement', 'Roadside', 90),
    createMockService(34, 'RS-FUEL', 'Emergency Fuel Delivery', 'Roadside', 70),
    createMockService(35, 'QS-OIL', 'Oil Change Service', 'Quick Service', 95),
    createMockService(36, 'QS-BRAKE', 'Brake Pad Replacement', 'Quick Service', 220),
    createMockService(37, 'QS-AIRFILTER', 'Air Filter Replacement', 'Quick Service', 45),
    createMockService(38, 'QS-WIPER', 'Wiper Blade Replacement', 'Quick Service', 35),
];

function StatusBadge({ status }: { status: ServiceStatus }) {
    if (status === 'active') {
        return (
            <Badge className="border-blue-200 bg-blue-100 text-blue-700 shadow-none hover:bg-blue-100">
                Active
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-gray-200 text-gray-500">
            Archived
        </Badge>
    );
}

const SERVICE_EXPORT_COLUMNS = [
    'Code',
    'Name',
    'SKU',
    'Category',
    'DefaultPrice',
    'Status',
    'LastUpdated',
];

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortMode, setSortMode] = useState('catalog');
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        sku: '',
        category: '',
        default_price: '',
        notes: '',
    });

    const categoryOptions = Array.from(new Set(services.map((service) => service.category))).sort();

    const fetchServices = () => {
        setLoading(true);

        setTimeout(() => {
            setServices(MOCK_SERVICES);
            setLoading(false);
        }, 600);
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const getServiceExportRows = () =>
        services.map((service) => ({
            Code: service.code,
            Name: service.name,
            SKU: service.sku ?? '-',
            Category: service.category,
            DefaultPrice: service.default_price,
            Status: service.status,
            LastUpdated: new Date(service.updated_at).toLocaleDateString(),
        }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getServiceExportRows(), selectedColumns);
        exportArrayData(exportData, 'services_pricing_export', format);
    };

    const filteredServices = services
        .filter((service) => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                service.code.toLowerCase().includes(query) ||
                service.name.toLowerCase().includes(query) ||
                service.category.toLowerCase().includes(query) ||
                (service.sku ?? '').toLowerCase().includes(query);

            const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((left, right) => {
            if (sortMode === 'price-low') return left.default_price - right.default_price;
            if (sortMode === 'price-high') return right.default_price - left.default_price;
            if (sortMode === 'updated') {
                return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
            }

            return Number(left.id.split('-').at(-1)) - Number(right.id.split('-').at(-1));
        });

    const openDrawer = (service: ServiceItem) => {
        setSelectedService(service);
        setDrawerOpen(true);
    };

    const openAddModal = () => {
        setModalMode('add');
        setFormData({ code: '', name: '', sku: '', category: '', default_price: '', notes: '' });
        setSelectedService(null);
        setModalOpen(true);
    };

    const openEditModal = (service: ServiceItem) => {
        setModalMode('edit');
        setFormData({
            code: service.code,
            name: service.name,
            sku: service.sku ?? '',
            category: service.category,
            default_price: service.default_price.toString(),
            notes: service.notes ?? '',
        });
        setSelectedService(service);
        setModalOpen(true);
    };

    const handleSaveService = () => {
        if (!formData.code || !formData.name || !formData.category || !formData.default_price) {
            alert('Code, name, category, and default price are required.');
            return;
        }

        const price = parseFloat(formData.default_price);
        if (Number.isNaN(price) || price < 0) {
            alert('Price must be a valid non-negative number.');
            return;
        }

        const normalizedCode = formData.code.trim().toUpperCase();

        if (
            modalMode === 'add' &&
            services.some((service) => service.code.toLowerCase() === normalizedCode.toLowerCase())
        ) {
            alert('Service code already exists.');
            return;
        }

        if (modalMode === 'add') {
            const newService: ServiceItem = {
                id: `service-${Date.now()}`,
                code: normalizedCode,
                name: formData.name.trim(),
                sku: formData.sku.trim() || null,
                category: formData.category.trim(),
                default_price: price,
                status: 'active',
                notes: formData.notes.trim() || undefined,
                updated_at: new Date().toISOString(),
                updated_by: 'Current User',
                allowed_actions: ['edit', 'archive', 'duplicate'],
            };

            setServices((previous) => [newService, ...previous]);
        } else if (selectedService) {
            const updatedService: ServiceItem = {
                ...selectedService,
                code: normalizedCode,
                name: formData.name.trim(),
                sku: formData.sku.trim() || null,
                category: formData.category.trim(),
                default_price: price,
                notes: formData.notes.trim() || undefined,
                updated_at: new Date().toISOString(),
                updated_by: 'Current User',
            };

            setServices((previous) =>
                previous.map((service) => (service.id === selectedService.id ? updatedService : service)),
            );
            setSelectedService(updatedService);
        }

        setModalOpen(false);
    };

    const handleArchiveToggle = (service: ServiceItem) => {
        const updated: ServiceItem = {
            ...service,
            status: service.status === 'active' ? 'archived' : 'active',
            updated_at: new Date().toISOString(),
            updated_by: 'Current User',
        };

        setServices((previous) => previous.map((item) => (item.id === service.id ? updated : item)));

        if (selectedService?.id === service.id) {
            setSelectedService(updated);
        }
    };

    const handleDuplicateService = (service: ServiceItem) => {
        const duplicate: ServiceItem = {
            ...service,
            id: `service-${Date.now()}`,
            code: `${service.code}-COPY`,
            name: `${service.name} Copy`,
            updated_at: new Date().toISOString(),
            updated_by: 'Current User',
        };

        setServices((previous) => [duplicate, ...previous]);
    };

    return (
        <div className="flex h-full flex-col space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Services &amp; Pricing</h1>
                    <p className="text-sm font-medium text-gray-500">
                        Manage service catalog, default pricing, and approval flags
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="mr-2 hidden items-center text-xs font-medium text-gray-400 sm:flex">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>

                    <Button variant="outline" size="icon" onClick={fetchServices} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    </Button>

                    <Button variant="outline" onClick={() => setExportModalOpen(true)} className="gap-2">
                        <FileDown className="h-4 w-4" />
                        Export
                    </Button>

                    <Button onClick={openAddModal} className="bg-[#2F8E92] hover:bg-[#267276]">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Service
                    </Button>
                </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 sm:items-center">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 sm:mt-0" />
                <p>Price changes affect future jobs only. Previously approved invoices remain unchanged.</p>
            </div>

            <Card className="space-y-4 border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col items-center gap-4 lg:flex-row">
                    <div className="relative min-w-[300px] w-full flex-1 lg:w-auto">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search by service code or name..."
                            className="border-gray-200 bg-gray-50 pl-9 transition-all focus:bg-white"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>

                    <div className="flex w-full items-center gap-3 overflow-x-auto lg:w-auto">
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categoryOptions.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortMode} onValueChange={setSortMode}>
                            <SelectTrigger className="w-[170px]">
                                <SelectValue placeholder="Prices" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="catalog">Catalog Order</SelectItem>
                                <SelectItem value="price-low">Price: Low to High</SelectItem>
                                <SelectItem value="price-high">Price: High to Low</SelectItem>
                                <SelectItem value="updated">Recently Updated</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <div className="space-y-4 p-4">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-20 text-gray-500">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No services found</h3>
                        <p className="mt-1 text-sm">Try adjusting your filters or search query.</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                                setSearchQuery('');
                                setFilterCategory('all');
                                setSortMode('catalog');
                            }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-gray-50">
                            <TableRow>
                                <TableHead className="w-[180px] pl-6">Service Code</TableHead>
                                <TableHead className="min-w-[260px]">Service Name</TableHead>
                                <TableHead className="w-[120px]">SKU</TableHead>
                                <TableHead className="w-[160px]">Category</TableHead>
                                <TableHead className="w-[130px] pr-6 text-right">Default Price</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[150px] text-right">Last Updated</TableHead>
                                <TableHead className="w-[50px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServices.map((service) => (
                                <TableRow
                                    key={service.id}
                                    className="group cursor-pointer transition-colors hover:bg-gray-50"
                                    onClick={() => openDrawer(service)}
                                >
                                    <TableCell className="pl-6 font-semibold text-gray-900">
                                        {service.code}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700">{service.name}</TableCell>
                                    <TableCell className="font-mono text-sm text-gray-400">
                                        {service.sku ?? '-'}
                                    </TableCell>
                                    <TableCell className="text-gray-600">{service.category}</TableCell>
                                    <TableCell className="pr-6 text-right font-mono text-gray-600">
                                        ${service.default_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={service.status} />
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-mono text-gray-400">
                                        {new Date(service.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(event) => event.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditModal(service)}>
                                                        <Edit2 className="mr-2 h-4 w-4" />
                                                        Edit Service
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicateService(service)}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleArchiveToggle(service)}
                                                        className={service.status === 'active' ? 'text-red-600' : ''}
                                                    >
                                                        {service.status === 'active' ? (
                                                            <>
                                                                <Archive className="mr-2 h-4 w-4" />
                                                                Archive
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                Unarchive
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'add' ? 'Add New Service' : 'Edit Service'}</DialogTitle>
                        <DialogDescription>
                            Configure service details and default pricing.
                            <br />
                            <span className="text-xs font-medium text-amber-600">
                                Changes affect future jobs only.
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>
                                    Service Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="e.g. QS-OIL"
                                    value={formData.code}
                                    onChange={(event) =>
                                        setFormData((current) => ({ ...current, code: event.target.value }))
                                    }
                                    disabled={modalMode === 'edit'}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                    placeholder="Optional stock identifier"
                                    value={formData.sku}
                                    onChange={(event) =>
                                        setFormData((current) => ({ ...current, sku: event.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Service Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                placeholder="e.g. Oil Change Service"
                                value={formData.name}
                                onChange={(event) =>
                                    setFormData((current) => ({ ...current, name: event.target.value }))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>
                                    Category <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="e.g. Quick Service"
                                    value={formData.category}
                                    onChange={(event) =>
                                        setFormData((current) => ({ ...current, category: event.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Default Price ($) <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-9"
                                        value={formData.default_price}
                                        onChange={(event) =>
                                            setFormData((current) => ({
                                                ...current,
                                                default_price: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder="Internal notes about pricing, inclusions, or restrictions..."
                                value={formData.notes}
                                onChange={(event) =>
                                    setFormData((current) => ({ ...current, notes: event.target.value }))
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveService} className="bg-[#2F8E92] hover:bg-[#267276]">
                            {modalMode === 'add' ? 'Create Service' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Services"
                description="Select the service columns you want in your export."
                availableColumns={SERVICE_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="flex w-full flex-col gap-0 bg-gray-50/50 p-0 sm:max-w-md">
                    {selectedService && (
                        <>
                            <div className="border-b border-gray-200 bg-white px-6 py-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                                        <div className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-sm font-mono text-gray-500">
                                            {selectedService.code}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setDrawerOpen(false);
                                            openEditModal(selectedService);
                                        }}
                                    >
                                        <Edit2 className="mr-2 h-3 w-3" />
                                        Edit
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="space-y-6 p-6">
                                    <Card className="space-y-4 border-gray-200 p-4 shadow-sm">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                            <FileText className="h-4 w-4" />
                                            Service Details
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="block text-gray-500">Category</span>
                                                <span className="text-gray-900">{selectedService.category}</span>
                                            </div>

                                            <div>
                                                <span className="block text-gray-500">SKU</span>
                                                <span className="font-mono text-gray-900">
                                                    {selectedService.sku ?? '-'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-gray-500">Default Price</span>
                                                <span className="font-mono font-medium text-gray-900">
                                                    ${selectedService.default_price.toFixed(2)}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="block text-gray-500">Status</span>
                                                <StatusBadge status={selectedService.status} />
                                            </div>

                                            <div className="col-span-2">
                                                <span className="block text-gray-500">Last Updated</span>
                                                <span className="text-gray-900">
                                                    {new Date(selectedService.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedService.notes && (
                                            <div className="border-t border-gray-100 pt-4">
                                                <span className="mb-1 block text-xs text-gray-500">Notes</span>
                                                <p className="rounded border border-amber-100 bg-amber-50 p-2 text-sm text-gray-700">
                                                    {selectedService.notes}
                                                </p>
                                            </div>
                                        )}
                                    </Card>

                                    <div className="space-y-2">
                                        <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-gray-900">
                                            <History className="h-4 w-4" />
                                            Audit Trail
                                        </h3>

                                        <div className="mb-2 px-1 text-xs text-gray-500">
                                            Recent changes to this service configuration.
                                        </div>

                                        <div className="relative space-y-6 border-l-2 border-gray-200 py-2 pl-4">
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-400 ring-1 ring-gray-200" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        Service Updated
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(selectedService.updated_at).toLocaleString()} by{' '}
                                                        {selectedService.updated_by}
                                                    </span>
                                                    <p className="mt-1 text-xs text-gray-600">
                                                        Default price set to $
                                                        {selectedService.default_price.toFixed(2)} for the{' '}
                                                        {selectedService.category} catalog.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-gray-300 ring-1 ring-gray-200" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        Service Created
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        3/4/2026, 12:00:00 AM by System Import
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
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
