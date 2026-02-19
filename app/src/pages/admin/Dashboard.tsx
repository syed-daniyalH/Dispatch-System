import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  X,
  FileCheck,
  Users,
  Building2,
  AlertCircle,
  PlayCircle,
  CheckSquare,
  FilePlus,
  FileText,
  Activity,
  Server,
  Database,
  Link,
  Wifi,
  WifiOff,
  ChevronRight,
  ShieldAlert,
  ClipboardList,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Types ---

type AlertSeverity = 'critical' | 'warning' | 'info';

interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: string;
}

interface KPICardData {
  id: string;
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'orange' | 'red' | 'gray';
  filterStatus?: string; // Query param value for filter
}

interface ActivityEvent {
  id: string;
  title: string;
  jobCode?: string;
  actor: 'SYSTEM' | 'ADMIN' | 'TECH' | 'MAKE';
  description: string;
  timestamp: string;
  icon: React.ElementType;
  type: 'info' | 'success' | 'warning' | 'error';
}

// --- Mock Data ---

const MOCK_ALERTS: SystemAlert[] = [
  {
    id: '1',
    title: 'QuickBooks connection delayed',
    description: 'Sync latency > 300ms. Retrying automatically.',
    severity: 'warning',
    timestamp: '2 min ago'
  },
  {
    id: '2',
    title: 'High parsing failure rate',
    description: 'Invoice OCR failing for Dealership Group B (15%).',
    severity: 'critical',
    timestamp: '15 min ago'
  }
];

const KPI_DATA: KPICardData[] = [
  { id: 'jobs-today', label: 'Jobs Today', value: '42', icon: ClipboardList, color: 'blue', filterStatus: 'today' },
  { id: 'pending-review', label: 'Pending Review', value: '8', icon: FileCheck, color: 'orange', filterStatus: 'pending_review' },
  { id: 'awaiting-tech', label: 'Awaiting Tech Acceptance', value: '3', icon: Users, color: 'orange', filterStatus: 'awaiting_tech' },
  { id: 'in-progress', label: 'In Progress', value: '12', icon: PlayCircle, color: 'blue', filterStatus: 'in_progress' },
  { id: 'completed-today', label: 'Completed Today', value: '19', icon: CheckSquare, color: 'green', filterStatus: 'completed' },
  { id: 'approval-req', label: 'Invoice Approval Required', value: '5', icon: ShieldAlert, color: 'orange', filterStatus: 'invoice_approval' },
  { id: 'invoice-creating', label: 'Invoice Creating', value: '2', icon: FilePlus, color: 'blue', filterStatus: 'invoice_creating' },
  { id: 'invoice-created', label: 'Invoice Created', value: '84', icon: FileText, color: 'green', filterStatus: 'invoice_created' },
  { id: 'attention', label: 'Attention Required', value: '4', icon: AlertTriangle, color: 'red', filterStatus: 'attention_required' },
];

const ACTIVITY_FEED: ActivityEvent[] = [
  { id: 'e1', title: 'Job Assigned', jobCode: 'SM2-2024-1021', actor: 'ADMIN', description: 'Assigned to Jolianne', timestamp: '2 min ago', icon: Users, type: 'info' },
  { id: 'e2', title: 'Invoice Approved', jobCode: 'SM2-2024-1008', actor: 'ADMIN', description: 'Approved for processing to QuickBooks.', timestamp: '14 min ago', icon: FileCheck, type: 'success' },
  { id: 'e3', title: 'Technician Completed Job', jobCode: 'SM2-2024-1015', actor: 'TECH', description: 'Marked as completed. Photos uploaded.', timestamp: '32 min ago', icon: CheckCircle2, type: 'success' },
  { id: 'e4', title: 'Invoice Verification Required', jobCode: 'SM2-2024-1022', actor: 'SYSTEM', description: 'Total mismatch detected. Admin review needed.', timestamp: '45 min ago', icon: ShieldAlert, type: 'warning' },
  { id: 'e5', title: 'Parsing Confidence Low', jobCode: 'SM2-2024-1025', actor: 'MAKE', description: 'OCR confidence 65% (below threshold of 85%).', timestamp: '1h ago', icon: AlertCircle, type: 'error' },
  { id: 'e6', title: 'New Job Created', jobCode: 'SM2-2024-1026', actor: 'SYSTEM', description: 'Received from email parser.', timestamp: '1h 15m ago', icon: FilePlus, type: 'info' },
  { id: 'e7', title: 'Technician Arrived', jobCode: 'SM2-2024-1019', actor: 'TECH', description: 'Tech onsite at dealership.', timestamp: '1h 30m ago', icon: MapPin, type: 'info' },
  { id: 'e8', title: 'System Health Check', actor: 'SYSTEM', description: 'All workers operational.', timestamp: '2h ago', icon: Activity, type: 'success' },
];

// --- Components ---

function AlertItem({ alert, onDismiss }: { alert: SystemAlert; onDismiss: () => void }) {
  const styles = {
    critical: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-400',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400',
  };


  const icons = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Activity,
  };

  const Icon = icons[alert.severity];

  return (
    <div className={cn('flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 shadow-sm', styles[alert.severity])}>
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-tight">{alert.title}</h4>
        <p className="text-sm mt-1 opacity-90 leading-relaxed">{alert.description}</p>
        <button className="text-xs font-semibold underline mt-2 hover:opacity-75 transition-opacity">View details</button>
      </div>
      <button
        onClick={onDismiss}
        className="text-inherit opacity-60 hover:opacity-100 p-1.5 hover:bg-black/5 rounded-lg transition-colors bg-transparent border-0 cursor-pointer"
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function KPIWidget({ data, onClick }: { data: KPICardData; onClick: () => void }) {
  const colorStyles = {
    green: 'border-emerald-200 dark:border-emerald-800 bg-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10',
    blue: 'border-blue-200 dark:border-blue-800 bg-card hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10',
    orange: 'border-amber-200 dark:border-amber-800 bg-card hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/30 dark:hover:bg-amber-900/10',
    red: 'border-rose-200 dark:border-rose-800 bg-card hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/30 dark:hover:bg-rose-900/10',
    gray: 'border-gray-200 dark:border-gray-800 bg-card hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/30 dark:hover:bg-gray-900/10',
  };


  const iconStyles = {
    green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    orange: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    red: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  };


  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col p-5 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer group active:scale-[0.98]',
        colorStyles[data.color]
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{data.label}</span>
        <div className={cn('p-2 rounded-lg transition-colors', iconStyles[data.color])}>
          <data.icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <span className="text-3xl font-bold text-foreground tracking-tight leading-none">{data.value}</span>
      </div>

    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const badgeStyles = {
    SYSTEM: 'bg-muted text-muted-foreground border-border',
    ADMIN: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    TECH: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    MAKE: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  };


  const Icon = event.icon;

  return (
    <div className="group relative flex items-start gap-4 pb-8 last:pb-0 hover:bg-gray-50/50 -mx-4 px-4 py-3 transition-colors cursor-pointer rounded-lg">

      {/* Connector Line */}
      <div className="absolute left-[27px] top-10 bottom-0 w-px bg-gray-100 group-last:hidden" />

      <div className={cn(
        'relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border',
        event.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
          event.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
            event.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              'bg-blue-50 text-blue-600 border-blue-100'
      )}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{event.title}</span>
          <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-semibold rounded-md uppercase tracking-wider border whitespace-nowrap', badgeStyles[event.actor])}>
            {event.actor}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap font-medium">{event.timestamp}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-normal">{event.description}</p>


        {event.jobCode && (
          <div className="mt-2 flex items-center">
            <span className="inline-flex items-center text-xs font-semibold text-[#2F8E92] bg-[#E6F4F4] px-2 py-1 rounded-md border border-[#2F8E92]/20 group-hover:bg-[#2F8E92] group-hover:text-white transition-colors">
              <ClipboardList className="w-3 h-3 mr-1" />
              {event.jobCode}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({ label, icon: Icon, description, onClick }: { label: string; icon: React.ElementType; description: string; onClick?: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-auto flex flex-col items-start p-4 gap-3 bg-card hover:bg-accent hover:border-accent border-border shadow-sm transition-all text-left w-full group active:scale-[0.98]"
    >
      <div className="p-2.5 rounded-lg bg-[#E6F4F4] dark:bg-[#2F8E92]/20 text-[#2F8E92] group-hover:bg-[#2F8E92] group-hover:text-white transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-bold text-foreground leading-tight">{label}</div>
        <div className="text-xs text-muted-foreground font-medium mt-1 leading-normal group-hover:text-accent-foreground">{description}</div>
      </div>
    </Button>

  );
}

function SystemHealthItem({ label, status, value }: { label: string; status: 'healthy' | 'degraded' | 'offline'; value?: string }) {
  const statusConfig = {
    healthy: { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Healthy' },
    degraded: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Degraded' },
    offline: { color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', label: 'Offline' },
  };

  const conf = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/50 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('h-2.5 w-2.5 rounded-full ring-2 ring-background shadow-sm', conf.color)} />
        <span className="text-sm font-semibold text-foreground/80">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {value && <span className="text-xs text-muted-foreground font-mono font-medium">{value}</span>}
        <Badge variant="outline" className={cn('border-0 font-bold px-2 py-0.5', conf.bg, conf.text, status === 'healthy' && 'dark:bg-emerald-900/20 dark:text-emerald-400')}>
          {status === 'healthy' ? 'Online' : conf.label}
        </Badge>
      </div>
    </div>
  );

}

// --- Loading Skeleton ---
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-[1600px] mx-auto">
      <div className="h-20 bg-gray-100 rounded-xl w-full" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 h-[500px] bg-gray-100 rounded-xl" />
        <div className="space-y-4">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-60 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SystemAlert[]>(MOCK_ALERTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleKPIClick = (filterStatus?: string) => {
    if (filterStatus) {
      navigate(`/admin/jobs?status=${filterStatus}`);
    } else {
      navigate('/admin/jobs');
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">

      {/* 2. System Alerts Section (Top Priority) */}
      <section className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          ))
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold text-sm">All systems operational. Network and workers are healthy.</span>
          </div>
        )}
      </section>

      {/* 3. KPI Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {KPI_DATA.map(kpi => (
          <KPIWidget
            key={kpi.id}
            data={kpi}
            onClick={() => handleKPIClick(kpi.filterStatus)}
          />
        ))}
      </section>

      {/* 4. Main Content Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Column — Recent Activity Timeline */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">Live feed of system events and actions</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[#2F8E92] hover:text-[#27797d] hover:bg-[#E6F4F4] font-medium" onClick={() => navigate('/admin/jobs')}>
              View All Activity <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <Card className="border-border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="h-[600px] pr-0">
                <div className="p-6">
                  {ACTIVITY_FEED.map(event => (
                    <ActivityRow key={event.id} event={event} />
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <span className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Showing last 20 events</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Quick Actions & System Health */}
        <div className="space-y-8">

          {/* Quick Actions Panel */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-foreground px-1">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <QuickActionButton
                label="View All Jobs"
                icon={ClipboardList}
                description="Access master job list"
                onClick={() => navigate('/admin/jobs')}
              />
              <QuickActionButton
                label="Review Invoice Approvals"
                icon={ShieldAlert}
                description="5 pending verifications"
                onClick={() => navigate('/admin/invoice-approvals')}
              />
              <QuickActionButton
                label="Manage Technicians"
                icon={Users}
                description="View availability & status"
                onClick={() => navigate('/admin/technicians')}
              />
              <QuickActionButton
                label="View Reports"
                icon={Activity}
                description="Performance analytics"
                onClick={() => navigate('/admin/reports')}
              />
            </div>
          </section>

          {/* System Health Widget */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-foreground px-1">System Health</h3>
            <Card className="border-border shadow-sm">
              <CardContent className="p-5 space-y-1">
                <SystemHealthItem label="Backend Status" status="healthy" value="99.9% uptime" />
                <SystemHealthItem label="Make Worker Status" status="healthy" value="4 active" />
                <SystemHealthItem label="QuickBooks Integration" status="degraded" value="Sync delayed" />
                <div className="pt-5 mt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Last Invoice Created</span>
                    <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">10:42 AM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
