import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    RefreshCw,
    Plus,
    MoreVertical,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    FileText,
    History,
    Archive,
    Trash2,
    Edit2,
    Copy,
    Info,
    FileDown
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import ColumnExportDialog from '@/components/modals/ColumnExportDialog';

// --- Types ---

interface ServiceItem {
    id: string;
    code: string;
    name: string;
    default_price: number;
    approval_required: boolean;
    status: 'active' | 'archived';
    notes?: string;
    updated_at: string;
    updated_by?: string;
    allowed_actions: string[];
}

// --- Mock Data ---

export const MOCK_SERVICES: ServiceItem[] = [
    { id: 's1', code: 'TEINTE-BANDE-PB', name: 'Bande pare-brise teintée', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's2', code: 'FORDDN-SVC-TINT-BANDE-PB', name: 'Bande pare-brise teintée (Ford)', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's3', code: 'GEN-PROD-CBL-062', name: 'Câble CBL-062', default_price: 51, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's4', code: 'AUDI-SVC-2WAY', name: 'Démarreur 2-Way – Audi', default_price: 480, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's5', code: 'AUDI-SVC-2WAY-S3RS3-2526', name: 'Démarreur 2-Way – Audi S3/RS3 2025-2026', default_price: 580, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's6', code: 'AUDI-SVC-MYCAR2', name: 'Démarreur MyCar 2 – Audi', default_price: 590, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's7', code: 'AUDI-SVC-MYCAR-S3RS3-2526', name: 'Démarreur MyCar – Audi S3/RS3 2025-2026', default_price: 690, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's8', code: 'AUDI-SVC-DOMINO', name: 'Domino repérage – Audi', default_price: 320, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's9', code: 'GEN-PROD-CSA', name: 'Fils CSA (au pied)', default_price: 1.05, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's10', code: 'PG-SVC-KM', name: 'Frais de déplacement (km)', default_price: 0.7, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's11', code: 'GEN-FEE-SHIPPING', name: 'Frais d’expédition', default_price: 0, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's12', code: 'PG-SVC-HOTEL', name: 'Hébergement technicien', default_price: 0, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's13', code: 'PG-SVC-MO-9PLUS', name: 'Main-d’œuvre – après 9 h', default_price: 195, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's14', code: 'PG-SVC-MO-WE', name: 'Main-d’œuvre – fin de semaine', default_price: 195, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's15', code: 'PG-SVC-MO-REG', name: 'Main-d’œuvre – régulier', default_price: 130, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's16', code: 'GEN-FEE-ATELIER', name: 'Matériel d’atelier', default_price: 0, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's17', code: 'GEN-SVC-PB-MO', name: 'Pare-brise – main-d’œuvre', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's18', code: 'PG-SVC-PERDIEM', name: 'Per diem – repas', default_price: 80, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's19', code: 'PPF-ALA-AILES-COMP-2', name: 'PPF ailes complètes (2)', default_price: 400, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's20', code: 'PPF-ALA-CAPOT-12', name: 'PPF bande de capot 12"', default_price: 120, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's21', code: 'PPF-ALA-CAPOT-18', name: 'PPF bande de capot 18"', default_price: 170, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's22', code: 'PPF-ALA-TOIT-12', name: 'PPF bande de toit 12"', default_price: 100, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's23', code: 'PPF-ALA-TOIT-4', name: 'PPF bande de toit 4"', default_price: 40, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's24', code: 'PPF-ALA-TOIT-6', name: 'PPF bande de toit 6"', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's25', code: 'PPF-ALA-TOIT-8', name: 'PPF bande de toit 8"', default_price: 75, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's26', code: 'PPF-OPT-BANDE-AR', name: 'PPF bande pare-chocs arrière (à partir de)', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's27', code: 'FORDDN-SVC-PPF-BANDE-AR', name: 'PPF bande pare-chocs arrière – Donnacona Ford', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's28', code: 'HONDA-DON-SVC-PPF-BANDE-AR', name: 'PPF bande pare-chocs arrière – Honda', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's29', code: 'PPF-ALA-BAS-CAISSES-12', name: 'PPF bas de caisses 12"', default_price: 375, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's30', code: 'PPF-ALA-BAS-CAISSES-8', name: 'PPF bas de caisses 8"', default_price: 240, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's31', code: 'PPF-PKG-CAPOT12-AILES', name: 'PPF capot 12" + ailes', default_price: 135, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's32', code: 'FORDDN-SVC-PPF-CAPOT12-AILES', name: 'PPF capot 12" + ailes – Donnacona Ford', default_price: 135, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's33', code: 'FORDDN-SVC-PPF-CAPOT12-F150', name: 'PPF capot 12" + ailes – F-150', default_price: 175, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's34', code: 'FORDDN-SVC-PPF-CAPOT12-F250', name: 'PPF capot 12" + ailes – F-250', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's35', code: 'FORDDN-SVC-PPF-CAPOT12-COMBO-F150', name: 'PPF capot 12" + ailes + pare-chocs avant (combo) – F-150', default_price: 150, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's36', code: 'FORDDN-SVC-PPF-CAPOT12-COMBO-F250', name: 'PPF capot 12" + ailes + pare-chocs avant (combo) – F-250', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's37', code: 'PPF-PKG-CAPOT12-AILES-POINTE', name: 'PPF capot 12" + ailes + pointes (à partir de)', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's38', code: 'FORDDN-SVC-PPF-CAPOT16-AUTRE', name: 'PPF capot 16" + ailes (autre)', default_price: 175, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's39', code: 'PPF-PKG-CAPOT16-AILES', name: 'PPF capot 16" + ailes (base)', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's40', code: 'HONDA-DON-SVC-PPF-16-CRVHRV', name: 'PPF capot 16" + ailes – CRV/HRV/Ridgeline/Prologue', default_price: 170, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's41', code: 'FORDDN-SVC-PPF-CAPOT16-F150', name: 'PPF capot 16" + ailes – F-150', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's42', code: 'FORDDN-SVC-PPF-CAPOT16-F250', name: 'PPF capot 16" + ailes – F-250', default_price: 250, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's43', code: 'HONDA-DON-SVC-PPF-16-ODY', name: 'PPF capot 16" + ailes – Odyssey', default_price: 180, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's44', code: 'FORDDN-SVC-PPF-CAPOT16-COMBO-F150', name: 'PPF capot 16" + ailes + pare-chocs avant (combo) – F-150', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's45', code: 'FORDDN-SVC-PPF-CAPOT16-COMBO-F250', name: 'PPF capot 16" + ailes + pare-chocs avant (combo) – F-250', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's46', code: 'PPF-PKG-CAPOT16-AILES-POINTE', name: 'PPF capot 16" + ailes + pointe (à partir de)', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's47', code: 'FORDDN-SVC-PPF-CAPOT16-AUTRE-POINTE', name: 'PPF capot 16" + ailes + pointe (autre)', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's48', code: 'PPF-PKG-CAPOT24-POINTE', name: 'PPF capot 24" + pointe', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's49', code: 'HONDA-DON-SVC-PPF-CIVIC-24', name: 'PPF capot 24" + pointe – Civic', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's50', code: 'FORDDN-SVC-PPF-CAPOT24-POINTE', name: 'PPF capot 24" + pointe – Donnacona Ford', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's51', code: 'PPF-ALA-CAPOT-COMP', name: 'PPF capot complet (à partir de)', default_price: 325, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's52', code: 'PPF-ALA-POIGNEES', name: 'PPF intérieur de poignées (ch.)', default_price: 10, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's53', code: 'PPF-OPT-MIROIRS', name: 'PPF miroirs (2)', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's54', code: 'FORDDN-SVC-PPF-MIROIRS', name: 'PPF miroirs – Donnacona Ford', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's55', code: 'HONDA-DON-SVC-PPF-MIROIRS', name: 'PPF miroirs – Honda', default_price: 50, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's56', code: 'PPF-ALA-MONTANT-PB', name: 'PPF montant de pare-brise (ch.)', default_price: 30, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's57', code: 'FORDDN-SVC-PPF-PARECHOCS-AV-AUTRE', name: 'PPF pare-chocs avant – autre modèle', default_price: 325, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's58', code: 'PPF-OPT-PARECHOCS-AV', name: 'PPF pare-chocs avant (base)', default_price: 350, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's59', code: 'FORDDN-SVC-PPF-PARECHOCS-AV-F150', name: 'PPF pare-chocs avant – F-150', default_price: 250, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's60', code: 'FORDDN-SVC-PPF-PARECHOCS-AV-F250', name: 'PPF pare-chocs avant – F-250', default_price: 300, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's61', code: 'HONDA-DON-SVC-PPF-PARECHOCS-AV', name: 'PPF pare-chocs avant – Honda', default_price: 325, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's62', code: 'PPF-ALA-PHARES-AJOUT', name: 'PPF phares (ajout)', default_price: 70, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's63', code: 'PPF-ALA-PHARES-SEUL', name: 'PPF phares (seul)', default_price: 110, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's64', code: 'PPF-ALA-SEUIL-COFFRE', name: 'PPF seuil de coffre', default_price: 45, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's65', code: 'PPF-ALA-SEUIL-PORTE', name: 'PPF seuil de porte (ch.)', default_price: 25, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's66', code: 'PPF-OPT-TOIT12-AJOUT', name: 'PPF toit 12" (ajout)', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's67', code: 'FORDDN-SVC-PPF-TOIT12-AJOUT', name: 'PPF toit 12" (ajout) – Donnacona Ford', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's68', code: 'HONDA-DON-SVC-PPF-TOIT12-AJOUT', name: 'PPF toit 12" (ajout) – Honda', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's69', code: 'PPF-OPT-TOIT12-SEUL', name: 'PPF toit 12" (seul)', default_price: 115, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's70', code: 'FORDDN-SVC-PPF-TOIT12-SEUL', name: 'PPF toit 12" (seul) – Donnacona Ford', default_price: 115, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's71', code: 'HONDA-DON-SVC-PPF-TOIT12-SEUL', name: 'PPF toit 12" (seul) – Honda', default_price: 115, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's72', code: 'AUDI-SVC-PB-MO', name: 'Remplacement de pare-brise – Audi', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's73', code: 'GEN-SVC-911PRO', name: 'Service 911 Pro (heure)', default_price: 75.95, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's74', code: 'GEN-SVC-ESTH', name: 'Services d’esthétique', default_price: 0, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's75', code: 'GEN-FEE-PARK', name: 'Stationnement mensuel', default_price: 217.43, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's76', code: 'TEINTE-COMP-LIMO', name: 'Teintage complet – arrière limo', default_price: 240, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's77', code: 'FORDDN-SVC-TINT-COMP-LIMO', name: 'Teintage complet – arrière limo (Ford)', default_price: 240, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's78', code: 'TEINTE-COMP-STD', name: 'Teintage complet – standard', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's79', code: 'FORDDN-SVC-TINT-COMP-STD', name: 'Teintage complet – standard (Ford)', default_price: 225, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's80', code: 'TEINTE-AR-LIMO', name: 'Teintage vitres arrière – limo', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's81', code: 'FORDDN-SVC-TINT-AR-LIMO', name: 'Teintage vitres arrière – limo (Ford)', default_price: 200, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's82', code: 'TEINTE-AR-STD', name: 'Teintage vitres arrière – standard', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's83', code: 'FORDDN-SVC-TINT-AR-STD', name: 'Teintage vitres arrière – standard (Ford)', default_price: 185, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's84', code: 'TEINTE-AV-CER', name: 'Teintage vitres avant – céramique', default_price: 100, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's85', code: 'FORDDN-SVC-TINT-AV-CER', name: 'Teintage vitres avant – céramique (Ford)', default_price: 100, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's86', code: 'TEINTE-AV-STD', name: 'Teintage vitres avant – standard', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's87', code: 'FORDDN-SVC-TINT-AV-STD', name: 'Teintage vitres avant – standard (Ford)', default_price: 90, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's88', code: 'PG-SVC-TR-REG', name: 'Temps de déplacement – régulier', default_price: 75, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's89', code: 'GEN-SVC-INSTALL', name: 'Temps d’installation', default_price: 0, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's90', code: 'GEN-SVC-OVERTIME', name: 'Temps supplémentaire', default_price: 0, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's91', code: 'PG-SVC-TR-9PLUS', name: 'Transport – après 9 h', default_price: 112.5, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's92', code: 'PG-SVC-TR-WE', name: 'Transport – fin de semaine', default_price: 112.5, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] },
    { id: 's93', code: 'GEN-PROD-URETH', name: 'Uréthane', default_price: 66.15, approval_required: false, status: 'active', updated_at: '2024-02-11T12:00:00Z', updated_by: 'System Import', allowed_actions: ['edit', 'archive', 'duplicate'] }
];

// --- Components ---

function ApprovalBadge({ required }: { required: boolean }) {
    if (required) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Yes</Badge>;
    return <Badge variant="outline" className="text-gray-500 border-gray-200">No</Badge>;
}

function StatusBadge({ status }: { status: 'active' | 'archived' }) {
    if (status === 'active') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none">Active</Badge>;
    return <Badge variant="outline" className="text-gray-500 border-gray-200">Archived</Badge>;
}

const SERVICE_EXPORT_COLUMNS = [
    'Code',
    'Name',
    'DefaultPrice',
    'ApprovalRequired',
    'Status',
    'Notes',
];

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterApproval, setFilterApproval] = useState<string>('all');

    // Drawers & Modals
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [exportModalOpen, setExportModalOpen] = useState(false);

    // Forms
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        default_price: '',
        approval_required: false,
        notes: ''
    });

    // Initial Fetch
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

    const getServiceExportRows = () => services.map(s => ({
            Code: s.code,
            Name: s.name,
            DefaultPrice: s.default_price,
            ApprovalRequired: s.approval_required ? 'Yes' : 'No',
            Status: s.status,
            Notes: s.notes || ''
        }));

    const handleExport = (selectedColumns: string[], format: ExportFormat = 'csv') => {
        const exportData = selectColumnsForExport(getServiceExportRows(), selectedColumns);
        exportArrayData(exportData, 'services_pricing_export', format);
    };

    // Filter Logic
    const filteredServices = services.filter(s => {
        const matchesSearch =
            s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesApproval = true;
        if (filterApproval === 'yes') matchesApproval = s.approval_required;
        if (filterApproval === 'no') matchesApproval = !s.approval_required;

        return matchesSearch && matchesApproval;
    });

    // Handlers
    const handleOpenDrawer = (s: ServiceItem) => {
        setSelectedService(s);
        setDrawerOpen(true);
    };

    const handleOpenAddModal = () => {
        setModalMode('add');
        setFormData({ code: '', name: '', default_price: '', approval_required: false, notes: '' });
        setModalOpen(true);
    };

    const handleOpenEditModal = (s: ServiceItem) => {
        setModalMode('edit');
        setFormData({
            code: s.code,
            name: s.name,
            default_price: s.default_price.toString(),
            approval_required: s.approval_required,
            notes: s.notes || ''
        });
        setSelectedService(s);
        setModalOpen(true);
    };

    const handleSaveService = () => {
        if (!formData.code || !formData.name || !formData.default_price) {
            alert("Code, Name, and Default Price are required.");
            return;
        }

        const price = parseFloat(formData.default_price);
        if (isNaN(price) || price < 0) {
            alert("Price must be a valid non-negative number.");
            return;
        }

        if (modalMode === 'add') {
            // Check uniqueness
            if (services.some(s => s.code === formData.code)) {
                alert("Service code already exists.");
                return;
            }

            const newService: ServiceItem = {
                id: Date.now().toString(),
                code: formData.code,
                name: formData.name,
                default_price: price,
                approval_required: formData.approval_required,
                status: 'active',
                notes: formData.notes,
                updated_at: new Date().toISOString(),
                updated_by: 'Current User', // In real app from auth context
                allowed_actions: ['edit', 'archive', 'duplicate']
            };
            setServices(prev => [newService, ...prev]);

        } else if (modalMode === 'edit' && selectedService) {
            const updatedService = {
                ...selectedService,
                code: formData.code,
                name: formData.name,
                default_price: price,
                approval_required: formData.approval_required,
                notes: formData.notes,
                updated_at: new Date().toISOString(),
                updated_by: 'Current User'
            };
            setServices(prev => prev.map(s => s.id === selectedService.id ? updatedService : s));
            setSelectedService(updatedService); // Update drawer if open
        }

        setModalOpen(false);
        // Toast success here
    };

    const handleArchiveToggle = (s: ServiceItem) => {
        const newStatus = s.status === 'active' ? 'archived' : 'active';
        const updated = { ...s, status: newStatus as 'active' | 'archived', updated_at: new Date().toISOString() };
        setServices(prev => prev.map(item => item.id === s.id ? updated : item));
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Services & Pricing</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage service catalog, default pricing, and approval flags</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center text-xs text-gray-400 font-medium mr-2">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchServices} disabled={loading}>
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                    <Button variant="outline" onClick={() => setExportModalOpen(true)} className="gap-2">
                        <FileDown className="w-4 h-4" /> Export
                    </Button>
                    <Button onClick={handleOpenAddModal} className="bg-[#2F8E92] hover:bg-[#267276]">
                        <Plus className="w-4 h-4 mr-2" /> Add Service
                    </Button>
                </div>
            </div>

            {/* 2. Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start sm:items-center gap-3 text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 sm:mt-0 flex-shrink-0 text-blue-600" />
                <p>Price changes affect future jobs only. Previously approved invoices remain unchanged.</p>
            </div>

            {/* 3. Filter Bar */}
            <Card className="p-4 border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full lg:w-auto min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by service code or name..."
                            className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <Select value={filterApproval} onValueChange={setFilterApproval}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Approval Required" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any Approval Status</SelectItem>
                                <SelectItem value="yes">Approval Required</SelectItem>
                                <SelectItem value="no">No Approval Needed</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <Badge variant="secondary"
                            className="cursor-pointer bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            onClick={() => setFilterApproval('yes')}
                        >
                            Approval Required ({services.filter(s => s.approval_required).length})
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* 4. Services Table */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No services found</h3>
                        <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                        <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setFilterApproval('all'); }}>Clear Filters</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="pl-6 w-[150px]">Service Code</TableHead>
                                <TableHead className="min-w-[200px]">Service Name</TableHead>
                                <TableHead className="w-[120px] text-right pr-6">Default Price</TableHead>
                                <TableHead className="w-[150px] text-center">Approval Req.</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[80px] text-center">Notes</TableHead>
                                <TableHead className="w-[180px] text-right">Last Updated</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServices.map((service) => (
                                <TableRow
                                    key={service.id}
                                    className="group hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleOpenDrawer(service)}
                                >
                                    <TableCell className="pl-6 font-semibold text-gray-900">{service.code}</TableCell>
                                    <TableCell className="text-gray-700 font-medium">{service.name}</TableCell>
                                    <TableCell className="text-right pr-6 font-mono text-gray-600">
                                        ${service.default_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <ApprovalBadge required={service.approval_required} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge status={service.status} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {service.notes && <AlertCircle className="w-4 h-4 text-blue-500 mx-auto" />}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-gray-400 font-mono">
                                        {new Date(service.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenEditModal(service)}>
                                                        <Edit2 className="w-4 h-4 mr-2" /> Edit Service
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleArchiveToggle(service)} className={service.status === 'active' ? "text-red-600" : ""}>
                                                        {service.status === 'active' ? (
                                                            <><Archive className="w-4 h-4 mr-2" /> Archive</>
                                                        ) : (
                                                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Unarchive</>
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

            {/* 6. Add/Edit Service Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'add' ? 'Add New Service' : 'Edit Service'}</DialogTitle>
                        <DialogDescription>
                            Configure service details and default pricing. <br />
                            <span className="text-xs text-amber-600 font-medium">Changes affect future jobs only.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Service Code <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. SRV-001"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    disabled={modalMode === 'edit'} // Lock code on edit usually desirable
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Default Price ($) <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.default_price}
                                        onChange={e => setFormData({ ...formData, default_price: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Service Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="e.g. Standard Inspection" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50">
                            <div className="space-y-0.5">
                                <Label className="text-base">Approval Required</Label>
                                <p className="text-xs text-gray-500">Flag invoices containing this service for review.</p>
                            </div>
                            <Switch
                                checked={formData.approval_required}
                                onCheckedChange={c => setFormData({ ...formData, approval_required: c })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                placeholder="Internal notes about pricing logic or restrictions..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveService} className="bg-[#2F8E92] hover:bg-[#267276]">{modalMode === 'add' ? 'Create Service' : 'Save Changes'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ColumnExportDialog
                open={exportModalOpen}
                onOpenChange={setExportModalOpen}
                title="Export Services"
                description="Select the service columns you want in your CSV."
                availableColumns={SERVICE_EXPORT_COLUMNS}
                onConfirm={handleExport}
            />

            {/* 7. Service Drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-md w-full p-0 flex flex-col gap-0 bg-gray-50/50">
                    {selectedService && (
                        <>
                            <div className="bg-white px-6 py-4 border-b border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                                        </div>
                                        <div className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block">
                                            {selectedService.code}
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => { setDrawerOpen(false); handleOpenEditModal(selectedService); }}>
                                        <Edit2 className="w-3 h-3 mr-2" /> Edit
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-6">
                                    <Card className="p-4 border-gray-200 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Service Details
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 block">Default Price</span>
                                                <span className="font-mono font-medium text-gray-900">${selectedService.default_price.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Status</span>
                                                <StatusBadge status={selectedService.status} />
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Approval Required</span>
                                                <ApprovalBadge required={selectedService.approval_required} />
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Last Updated</span>
                                                <span className="text-gray-900">{new Date(selectedService.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {selectedService.notes && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <span className="text-gray-500 block text-xs mb-1">Notes</span>
                                                <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-100">
                                                    {selectedService.notes}
                                                </p>
                                            </div>
                                        )}
                                    </Card>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 px-1">
                                            <History className="w-4 h-4" /> Audit Trail
                                        </h3>
                                        <div className="text-xs text-gray-500 px-1 mb-2">
                                            Recent changes to this service configuration.
                                        </div>

                                        <div className="relative pl-4 border-l-2 border-gray-200 space-y-6 py-2">
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-400 border-2 border-white ring-1 ring-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">Price Update</span>
                                                    <span className="text-xs text-gray-500">{new Date(selectedService.updated_at).toLocaleString()} by {selectedService.updated_by}</span>
                                                    <p className="text-xs mt-1 text-gray-600">Updated default price to ${selectedService.default_price.toFixed(2)}.</p>
                                                </div>
                                            </div>
                                            {/* Mock history item */}
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-300 border-2 border-white ring-1 ring-gray-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">Service Created</span>
                                                    <span className="text-xs text-gray-500">2023-01-01 09:00:00 by System</span>
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
