import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  type BackendCalendarEvent,
  type BackendCalendarEventCreatePayload,
  createAdminCalendarEvent,
  fetchAdminCalendarEvents,
  getStoredAdminToken,
} from '@/lib/backend-api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CalendarView = 'month' | 'week' | 'day';
type CalendarEventType = 'appointment' | 'delivery' | 'invoice' | 'custom';
type CalendarDataSource = 'backend' | 'local';

interface CalendarEvent {
  id: string;
  title: string;
  customerName: string;
  technicianId?: string | null;
  technicianName?: string | null;
  type: CalendarEventType;
  start: Date;
  end: Date;
  location?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CreateAppointmentFormValues {
  title: string;
  customerName: string;
  technicianId: string;
  eventType: CalendarEventType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
}

interface ScheduleSlot {
  label: string;
  value: string;
}

interface TechnicianOption {
  value: string;
  label: string;
  isActive: boolean;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

type StoredCalendarEvent = {
  id: string;
  title: string;
  customerName: string;
  technicianId?: string | null;
  technicianName?: string | null;
  type: CalendarEventType;
  start: string;
  end: string;
  location?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const LOCAL_CALENDAR_STORAGE_KEY = 'sm_dispatch_calendar_events';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Calendar', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Jobs', path: '/admin/jobs', icon: Briefcase },
  { label: 'Invoice Approvals', path: '/admin/invoice-approvals', icon: FileText },
  { label: 'Invoice History', path: '/admin/invoice-history', icon: FileClock },
  { label: 'Technicians', path: '/admin/technicians', icon: Users },
  { label: 'Tech Accounts', path: '/admin/technician-accounts', icon: UserCog },
  { label: 'Customers', path: '/admin/dealerships', icon: Users },
  { label: 'Services', path: '/admin/services', icon: Wrench },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const EVENT_TYPE_OPTIONS: Array<{ label: string; value: CalendarEventType | 'all' }> = [
  { label: 'All Event Types', value: 'all' },
  { label: 'Appointment', value: 'appointment' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Invoice', value: 'invoice' },
  { label: 'Custom', value: 'custom' },
];

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  appointment: 'Appointment',
  delivery: 'Delivery',
  invoice: 'Invoice',
  custom: 'Custom',
};

const EVENT_TYPE_STYLES: Record<CalendarEventType, string> = {
  appointment: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  delivery: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  invoice: 'border-amber-200 bg-amber-50 text-amber-700',
  custom: 'border-slate-200 bg-slate-100 text-slate-700',
};

const DAY_VIEW_SLOTS: ScheduleSlot[] = [
  { label: '8:00 AM', value: '08:00' },
  { label: '9:30 AM', value: '09:30' },
  { label: '11:00 AM', value: '11:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '4:30 PM', value: '16:30' },
];

function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) => (
    left.start.getTime() - right.start.getTime()
    || left.end.getTime() - right.end.getTime()
    || left.title.localeCompare(right.title)
  ));
}

function eventDayKey(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function eventIntersectsRange(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): boolean {
  return event.end >= rangeStart && event.start <= rangeEnd;
}

function mergeCalendarEvents(existing: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const merged = new Map(existing.map((event) => [event.id, event]));
  incoming.forEach((event) => merged.set(event.id, event));
  return sortCalendarEvents(Array.from(merged.values()));
}

function upsertCalendarEvent(events: CalendarEvent[], event: CalendarEvent): CalendarEvent[] {
  return mergeCalendarEvents(events, [event]);
}

function mapBackendEvent(event: BackendCalendarEvent): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    customerName: event.customer_name,
    technicianId: event.technician_id ?? null,
    technicianName: event.technician_name ?? null,
    type: event.event_type,
    start: parseISO(event.start_at),
    end: parseISO(event.end_at),
    location: event.location ?? null,
    notes: event.notes ?? null,
    createdAt: parseISO(event.created_at),
    updatedAt: parseISO(event.updated_at),
  };
}

function toStoredCalendarEvent(event: CalendarEvent): StoredCalendarEvent {
  return {
    id: event.id,
    title: event.title,
    customerName: event.customerName,
    technicianId: event.technicianId ?? null,
    technicianName: event.technicianName ?? null,
    type: event.type,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    location: event.location ?? null,
    notes: event.notes ?? null,
    createdAt: event.createdAt?.toISOString(),
    updatedAt: event.updatedAt?.toISOString(),
  };
}

function parseStoredCalendarEvent(input: unknown): CalendarEvent | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Partial<StoredCalendarEvent>;
  if (
    typeof record.id !== 'string'
    || typeof record.title !== 'string'
    || typeof record.customerName !== 'string'
    || typeof record.type !== 'string'
    || typeof record.start !== 'string'
    || typeof record.end !== 'string'
  ) {
    return null;
  }

  if (!['appointment', 'delivery', 'invoice', 'custom'].includes(record.type)) {
    return null;
  }

  const start = parseISO(record.start);
  const end = parseISO(record.end);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    return null;
  }

  const createdAt = record.createdAt ? parseISO(record.createdAt) : undefined;
  const updatedAt = record.updatedAt ? parseISO(record.updatedAt) : undefined;

  return {
    id: record.id,
    title: record.title,
    customerName: record.customerName,
    technicianId: typeof record.technicianId === 'string' ? record.technicianId : null,
    technicianName: typeof record.technicianName === 'string' ? record.technicianName : null,
    type: record.type as CalendarEventType,
    start,
    end,
    location: typeof record.location === 'string' ? record.location : null,
    notes: typeof record.notes === 'string' ? record.notes : null,
    createdAt: createdAt && !Number.isNaN(createdAt.valueOf()) ? createdAt : undefined,
    updatedAt: updatedAt && !Number.isNaN(updatedAt.valueOf()) ? updatedAt : undefined,
  };
}

function readStoredCalendarEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_CALENDAR_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(LOCAL_CALENDAR_STORAGE_KEY);
      return [];
    }
    return sortCalendarEvents(parsed.map(parseStoredCalendarEvent).filter((event): event is CalendarEvent => event !== null));
  } catch {
    window.localStorage.removeItem(LOCAL_CALENDAR_STORAGE_KEY);
    return [];
  }
}

function persistCalendarEvents(events: CalendarEvent[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  const payload = events.map(toStoredCalendarEvent);
  window.localStorage.setItem(LOCAL_CALENDAR_STORAGE_KEY, JSON.stringify(payload));
}

function buildEventWindow(formValues: CreateAppointmentFormValues): { start: Date; end: Date } {
  const start = new Date(`${formValues.date}T${formValues.startTime}`);
  const resolvedEnd = formValues.endTime
    ? new Date(`${formValues.date}T${formValues.endTime}`)
    : addHours(start, 1);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(resolvedEnd.valueOf())) {
    throw new Error('Choose a valid appointment date and time.');
  }
  if (resolvedEnd <= start) {
    throw new Error('End time must be later than the start time.');
  }

  return { start, end: resolvedEnd };
}

function createDefaultAppointmentForm(referenceDate: Date): CreateAppointmentFormValues {
  return {
    title: '',
    customerName: '',
    technicianId: 'unassigned',
    eventType: 'appointment',
    date: format(referenceDate, 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    notes: '',
  };
}

function addHourToTimeValue(value: string): string {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number.parseInt(hoursText ?? '', 10);
  const minutes = Number.parseInt(minutesText ?? '', 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '10:00';
  }

  const normalizedHours = Math.min(hours + 1, 23);
  return `${normalizedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function buildCreatePayload(formValues: CreateAppointmentFormValues): BackendCalendarEventCreatePayload {
  const { start, end } = buildEventWindow(formValues);
  return {
    title: formValues.title.trim() || undefined,
    customer_name: formValues.customerName.trim(),
    technician_id: formValues.technicianId !== 'unassigned' ? formValues.technicianId : undefined,
    event_type: formValues.eventType,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    location: formValues.location.trim() || undefined,
    notes: formValues.notes.trim() || undefined,
  };
}

function createLocalEvent(
  formValues: CreateAppointmentFormValues,
  technicianOptions: TechnicianOption[],
): CalendarEvent {
  const { start, end } = buildEventWindow(formValues);
  const now = new Date();
  const technician = technicianOptions.find((option) => option.value === formValues.technicianId);
  const generatedId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${now.getTime()}`;

  return {
    id: generatedId,
    title: formValues.title.trim() || `${EVENT_TYPE_LABELS[formValues.eventType]} for ${formValues.customerName.trim()}`,
    customerName: formValues.customerName.trim(),
    technicianId: formValues.technicianId !== 'unassigned' ? formValues.technicianId : null,
    technicianName: technician?.label ?? null,
    type: formValues.eventType,
    start,
    end,
    location: formValues.location.trim() || null,
    notes: formValues.notes.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
}

function formatEventTime(event: CalendarEvent): string {
  return `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`;
}

function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="border-r border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.02)]">
      <div className="flex h-full min-h-screen flex-col">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
              <span className="absolute text-[10px] font-black tracking-tight">C</span>
            </div>
            <div className="pt-0.5">
              <div className="text-[13px] font-bold leading-tight text-slate-900">
                <span className="block">Client-Crew</span>
                <span className="block">Dispatch</span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Operations Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path
              || (item.path !== '/admin' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-all',
                  isActive
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-indigo-600' : 'text-slate-500')} />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function UserMenu() {
  const { logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
            AM
          </span>
          <span className="text-xs font-bold tracking-wide text-slate-700">ADMIN</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={logout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateAppointmentDialog({
  open,
  onOpenChange,
  formValues,
  technicianOptions,
  isSubmitting,
  errorMessage,
  onFieldChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: CreateAppointmentFormValues;
  technicianOptions: TechnicianOption[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onFieldChange: <Key extends keyof CreateAppointmentFormValues>(
    field: Key,
    value: CreateAppointmentFormValues[Key],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Create Appointment</DialogTitle>
          <DialogDescription>
            Save a dispatch event to the shared scheduling calendar.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="grid gap-2">
              <label htmlFor="appointment-title" className="text-sm font-medium text-slate-700">
                Title
              </label>
              <Input
                id="appointment-title"
                value={formValues.title}
                onChange={(event) => onFieldChange('title', event.target.value)}
                placeholder="Optional custom title"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="event-type" className="text-sm font-medium text-slate-700">
                Event Type
              </label>
              <Select value={formValues.eventType} onValueChange={(value) => onFieldChange('eventType', value as CalendarEventType)}>
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="customer-name" className="text-sm font-medium text-slate-700">
                Customer
              </label>
              <Input
                id="customer-name"
                value={formValues.customerName}
                onChange={(event) => onFieldChange('customerName', event.target.value)}
                placeholder="Customer or account name"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="technician" className="text-sm font-medium text-slate-700">
                Technician
              </label>
              <Select value={formValues.technicianId} onValueChange={(value) => onFieldChange('technicianId', value)}>
                <SelectTrigger id="technician">
                  <SelectValue placeholder="Assign technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {technicianOptions.map((tech) => (
                    <SelectItem key={tech.value} value={tech.value}>
                      {tech.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label htmlFor="appointment-date" className="text-sm font-medium text-slate-700">
                Date
              </label>
              <Input
                id="appointment-date"
                type="date"
                value={formValues.date}
                onChange={(event) => onFieldChange('date', event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="appointment-start" className="text-sm font-medium text-slate-700">
                Start
              </label>
              <Input
                id="appointment-start"
                type="time"
                value={formValues.startTime}
                onChange={(event) => onFieldChange('startTime', event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="appointment-end" className="text-sm font-medium text-slate-700">
                End
              </label>
              <Input
                id="appointment-end"
                type="time"
                value={formValues.endTime}
                onChange={(event) => onFieldChange('endTime', event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="appointment-location" className="text-sm font-medium text-slate-700">
              Location
            </label>
            <Input
              id="appointment-location"
              value={formValues.location}
              onChange={(event) => onFieldChange('location', event.target.value)}
              placeholder="Street, dealership, or delivery destination"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="appointment-notes" className="text-sm font-medium text-slate-700">
              Notes
            </label>
            <Textarea
              id="appointment-notes"
              value={formValues.notes}
              onChange={(event) => onFieldChange('notes', event.target.value)}
              placeholder="Add scheduling notes, reminders, or dispatch context..."
              className="min-h-28"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save Appointment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock3;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </Card>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-slate-500">{children}</p>;
}

function AvailabilityPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        color,
      )}
    >
      {label}
    </span>
  );
}

function CalendarEventPill({
  event,
  selected,
  onSelect,
}: {
  event: CalendarEvent;
  selected: boolean;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onSelect(event);
      }}
      className={cn(
        'w-full rounded-lg border px-2 py-1 text-left text-[11px] font-medium transition',
        EVENT_TYPE_STYLES[event.type],
        selected && 'ring-1 ring-inset ring-slate-900/15',
      )}
    >
      <div className="truncate">{event.title}</div>
      <div className="mt-0.5 truncate opacity-80">{format(event.start, 'h:mm a')}</div>
    </button>
  );
}

function CalendarCell({
  day,
  currentMonth,
  dayEvents,
  isSelectedDay,
  selectedEventId,
  onCreateFromDay,
  onSelectEvent,
}: {
  day: Date;
  currentMonth: Date;
  dayEvents: CalendarEvent[];
  isSelectedDay: boolean;
  selectedEventId: string | null;
  onCreateFromDay: (day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const today = startOfDay(new Date());
  const isToday = isSameDay(day, today);
  const inMonth = isSameMonth(day, currentMonth);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCreateFromDay(day)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCreateFromDay(day);
        }
      }}
      className={cn(
        'flex min-h-[128px] flex-col border border-slate-200 bg-white p-2 text-left transition',
        inMonth ? 'text-slate-900' : 'bg-slate-50 text-slate-300',
        isToday && 'bg-sky-50/90',
        isSelectedDay && 'ring-1 ring-inset ring-indigo-400',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[11px] font-semibold', inMonth ? 'text-slate-500' : 'text-slate-300')}>
          {format(day, 'd')}
        </span>
        {isToday ? (
          <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            Today
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        {dayEvents.slice(0, 3).map((event) => (
          <CalendarEventPill
            key={event.id}
            event={event}
            selected={selectedEventId === event.id}
            onSelect={onSelectEvent}
          />
        ))}
        {dayEvents.length > 3 ? (
          <div className="px-1 text-[11px] font-medium text-slate-500">
            +{dayEvents.length - 3} more
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { technicianAccounts, hasBackendAdminToken } = useAuth();
  const today = startOfDay(new Date());
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(today));
  const [view, setView] = useState<CalendarView>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | CalendarEventType>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormValues, setCreateFormValues] = useState<CreateAppointmentFormValues>(() => createDefaultAppointmentForm(today));
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<CalendarDataSource>('local');
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);

  const technicianOptions = useMemo<TechnicianOption[]>(
    () => technicianAccounts.map((account) => ({
      value: account.id,
      label: account.name,
      isActive: account.isActive,
    })),
    [technicianAccounts],
  );

  const visibleDays = useMemo(() => {
    if (view === 'day') {
      return [selectedDate ?? startOfDay(currentDate)];
    }

    if (view === 'week') {
      const anchor = selectedDate ?? startOfDay(currentDate);
      const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    }

    const monthStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const monthEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate, selectedDate, view]);

  const rangeStart = useMemo(() => startOfDay(visibleDays[0]), [visibleDays]);
  const rangeEnd = useMemo(() => endOfDay(visibleDays[visibleDays.length - 1]), [visibleDays]);

  const calendarLabel = useMemo(() => {
    if (view === 'week') {
      return `${format(visibleDays[0], 'MMM d')} - ${format(visibleDays[visibleDays.length - 1], 'MMM d, yyyy')}`;
    }
    if (view === 'day') {
      return format(visibleDays[0], 'MMMM d, yyyy');
    }
    return format(startOfMonth(currentDate), 'MMMM yyyy');
  }, [currentDate, view, visibleDays]);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      const cachedEvents = readStoredCalendarEvents();
      const cachedRange = cachedEvents.filter((event) => eventIntersectsRange(event, rangeStart, rangeEnd));
      const token = getStoredAdminToken();

      setIsLoading(true);

      if (!token) {
        if (!cancelled) {
          setEvents(cachedRange);
          setDataSource('local');
          setCalendarNotice('Backend sync is offline right now. Calendar changes will stay in local draft mode until FastAPI reconnects.');
          setLastRefreshed(new Date());
          setIsLoading(false);
        }
        return;
      }

      try {
        const payload = await fetchAdminCalendarEvents(token, {
          from_date: format(rangeStart, 'yyyy-MM-dd'),
          to_date: format(rangeEnd, 'yyyy-MM-dd'),
        });
        if (cancelled) {
          return;
        }

        const backendEvents = sortCalendarEvents(payload.map(mapBackendEvent));
        const mergedEvents = mergeCalendarEvents(cachedEvents, backendEvents);
        persistCalendarEvents(mergedEvents);
        setEvents(backendEvents);
        setDataSource('backend');
        setCalendarNotice(null);
        setLastRefreshed(new Date());
      } catch (error) {
        if (cancelled) {
          return;
        }

        setEvents(cachedRange);
        setDataSource('local');
        setCalendarNotice(
          `${error instanceof Error ? error.message : 'Calendar API unavailable.'} Showing locally cached events while the backend recovers.`,
        );
        setLastRefreshed(new Date());
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [hasBackendAdminToken, rangeEnd, rangeStart, refreshNonce]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      const matchesQuery =
        query.length === 0
        || [
          event.title,
          event.customerName,
          event.technicianName ?? '',
          event.location ?? '',
          event.notes ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);

      const matchesTechnician =
        technicianFilter === 'all'
        || event.technicianId === technicianFilter;

      const matchesType = eventTypeFilter === 'all' || event.type === eventTypeFilter;

      return matchesQuery && matchesTechnician && matchesType;
    });
  }, [eventTypeFilter, events, searchQuery, technicianFilter]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    filteredEvents.forEach((event) => {
      const key = eventDayKey(event.start);
      const existing = grouped.get(key) ?? [];
      existing.push(event);
      grouped.set(key, sortCalendarEvents(existing));
    });

    return grouped;
  }, [filteredEvents]);

  const selectedEvent = useMemo(
    () => filteredEvents.find((event) => event.id === selectedEventId) ?? null,
    [filteredEvents, selectedEventId],
  );

  useEffect(() => {
    if (selectedEventId && !filteredEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [filteredEvents, selectedEventId]);

  const selectedDayEvents = selectedDate ? eventsByDay.get(eventDayKey(selectedDate)) ?? [] : [];
  const dayViewDate = selectedDate ?? startOfDay(currentDate);
  const dayViewEvents = eventsByDay.get(eventDayKey(dayViewDate)) ?? [];

  const now = new Date();
  const currentDayEvents = filteredEvents.filter((event) => isSameDay(event.start, today));
  const upcomingEvents = filteredEvents
    .filter((event) => event.type === 'appointment' && isAfter(event.start, now))
    .slice(0, 3);
  const pendingDeliveries = filteredEvents
    .filter((event) => event.type === 'delivery' && (isAfter(event.end, now) || isSameDay(event.start, today)))
    .slice(0, 3);

  const availabilityAnchor = selectedDate ?? today;
  const busyTechnicianIds = new Set(
    filteredEvents
      .filter((event) => event.technicianId && isSameDay(event.start, availabilityAnchor))
      .map((event) => event.technicianId as string),
  );
  const activeTechnicians = technicianAccounts.filter((account) => account.isActive);
  const busyTechnicians = activeTechnicians.filter((account) => busyTechnicianIds.has(account.id)).length;
  const liveTechnicians = Math.max(activeTechnicians.length - busyTechnicians, 0);
  const offTechnicians = technicianAccounts.filter((account) => !account.isActive).length;

  const highlightedDateLabel = selectedDate ? format(selectedDate, 'EEE, MMM d') : null;

  const updateFormField = <Key extends keyof CreateAppointmentFormValues>(
    field: Key,
    value: CreateAppointmentFormValues[Key],
  ) => {
    setCreateFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const openCreateDialog = (
    referenceDate?: Date,
    overrides: Partial<CreateAppointmentFormValues> = {},
  ) => {
    const anchor = referenceDate ?? selectedDate ?? startOfDay(currentDate);
    setCreateFormValues({
      ...createDefaultAppointmentForm(anchor),
      ...overrides,
    });
    setCreateError(null);
    setCreateDialogOpen(true);
  };

  const handleCreateFromDay = (day: Date, startTime?: string) => {
    const normalizedDay = startOfDay(day);
    setSelectedDate(normalizedDay);
    setSelectedEventId(null);
    setCurrentDate(view === 'month' ? startOfMonth(normalizedDay) : normalizedDay);

    openCreateDialog(
      normalizedDay,
      startTime
        ? {
          startTime,
          endTime: addHourToTimeValue(startTime),
        }
        : {},
    );
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDate(startOfDay(event.start));
    setSelectedEventId(event.id);
    if (view !== 'month') {
      setCurrentDate(startOfDay(event.start));
    }
  };

  const moveCalendar = (direction: 'prev' | 'next') => {
    const forward = direction === 'next';

    if (view === 'month') {
      setCurrentDate((current) => (forward ? addMonths(current, 1) : subMonths(current, 1)));
      setSelectedDate(null);
      setSelectedEventId(null);
      return;
    }

    const anchor = selectedDate ?? startOfDay(currentDate);
    const nextAnchor = view === 'week'
      ? (forward ? addWeeks(anchor, 1) : subWeeks(anchor, 1))
      : (forward ? addDays(anchor, 1) : subDays(anchor, 1));

    setCurrentDate(startOfDay(nextAnchor));
    setSelectedDate(startOfDay(nextAnchor));
    setSelectedEventId(null);
  };

  const handleToday = () => {
    setCurrentDate(view === 'month' ? startOfMonth(today) : today);
    setSelectedDate(today);
    setSelectedEventId(null);
  };

  const handleViewChange = (nextView: CalendarView) => {
    const anchor = selectedDate ?? today;
    setView(nextView);
    setCurrentDate(nextView === 'month' ? startOfMonth(anchor) : startOfDay(anchor));
    if (nextView !== 'month' && !selectedDate) {
      setSelectedDate(anchor);
    }
  };

  const handleRefresh = () => {
    setRefreshNonce((current) => current + 1);
  };

  const handleCreateAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const customerName = createFormValues.customerName.trim();
    if (!customerName) {
      setCreateError('Customer name is required.');
      return;
    }

    let payload: BackendCalendarEventCreatePayload;
    try {
      payload = buildCreatePayload(createFormValues);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not prepare the appointment.');
      return;
    }

    setIsSubmitting(true);

    const token = getStoredAdminToken();
    const cachedEvents = readStoredCalendarEvents();

    try {
      let createdEvent: CalendarEvent;
      let noticeMessage: string | null = null;

      if (token) {
        try {
          const response = await createAdminCalendarEvent(token, payload);
          createdEvent = mapBackendEvent(response);
          setDataSource('backend');
        } catch (error) {
          createdEvent = createLocalEvent(createFormValues, technicianOptions);
          noticeMessage = `${error instanceof Error ? error.message : 'Calendar API unavailable.'} Saved this appointment locally so planning can continue.`;
          setDataSource('local');
        }
      } else {
        createdEvent = createLocalEvent(createFormValues, technicianOptions);
        noticeMessage = 'Backend sync is still offline. This appointment was saved locally as a draft.';
        setDataSource('local');
      }

      const merged = upsertCalendarEvent(cachedEvents, createdEvent);
      persistCalendarEvents(merged);

      if (eventIntersectsRange(createdEvent, rangeStart, rangeEnd)) {
        setEvents((currentEvents) => upsertCalendarEvent(currentEvents, createdEvent));
      }

      setCalendarNotice(noticeMessage);
      setCurrentDate(view === 'month' ? startOfMonth(createdEvent.start) : startOfDay(createdEvent.start));
      setSelectedDate(startOfDay(createdEvent.start));
      setSelectedEventId(createdEvent.id);
      setLastRefreshed(new Date());
      setCreateDialogOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to save the appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[172px_minmax(0,1fr)]">
        <AppSidebar />

        <div className="min-w-0 border-r border-slate-200 bg-slate-50">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
            <div className="text-[15px] font-semibold text-slate-900">Calendar</div>
            <UserMenu />
          </header>

          <div className="space-y-5 px-4 py-5 xl:px-5">
            <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-1">
                  <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
                    Calendar & Scheduling
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">
                    Plan appointments, dispatch technician work, track deliveries, and manage reminders in one place.
                  </p>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-500">
                    Click any calendar date to create an appointment
                  </p>
                </div>

                <Button
                  onClick={() => openCreateDialog()}
                  className="h-10 self-start rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-violet-500"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Appointment
                </Button>
            </section>

            {calendarNotice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                {calendarNotice}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_326px] xl:items-start">
              <main className="min-w-0 space-y-5">
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-500 shadow-sm"
                        onClick={() => moveCalendar('prev')}
                        aria-label={`Previous ${view}`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-500 shadow-sm"
                        onClick={() => moveCalendar('next')}
                        aria-label={`Next ${view}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                        onClick={handleToday}
                      >
                        Today
                      </Button>
                      <div className="pl-1 text-[17px] font-bold tracking-tight text-slate-900">
                        {calendarLabel}
                      </div>
                      <Badge
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] font-semibold capitalize shadow-none',
                          dataSource === 'backend'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50',
                        )}
                      >
                        {dataSource === 'backend' ? 'Backend synced' : 'Local draft mode'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {(['month', 'week', 'day'] as CalendarView[]).map((item) => {
                        const active = view === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleViewChange(item)}
                            className={cn(
                              'rounded-full border px-4 py-2 text-xs font-semibold transition',
                              active
                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                            )}
                          >
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search events, customers, technicians..."
                        className="h-10 rounded-xl border-slate-200 bg-white pl-9 shadow-sm"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:w-auto xl:grid-cols-[repeat(3,minmax(0,11rem))]">
                      <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm">
                          <SelectValue placeholder="All Technicians" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Technicians</SelectItem>
                          {technicianOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={eventTypeFilter} onValueChange={(value) => setEventTypeFilter(value as 'all' | CalendarEventType)}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm">
                          <SelectValue placeholder="All Event Types" />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                      >
                        <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
                {view === 'month' ? (
                  <>
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                        <div
                          key={day}
                          className="px-3 py-3 text-center text-[11px] font-semibold tracking-[0.24em] text-slate-500"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-slate-200">
                      {visibleDays.map((day) => (
                        <CalendarCell
                          key={day.toISOString()}
                          day={day}
                          currentMonth={startOfMonth(currentDate)}
                          dayEvents={eventsByDay.get(eventDayKey(day)) ?? []}
                          isSelectedDay={selectedDate ? isSameDay(day, selectedDate) : false}
                          selectedEventId={selectedEventId}
                          onCreateFromDay={handleCreateFromDay}
                          onSelectEvent={handleSelectEvent}
                        />
                      ))}
                    </div>
                  </>
                ) : view === 'week' ? (
                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                      {visibleDays.map((day) => {
                        const dayEvents = eventsByDay.get(eventDayKey(day)) ?? [];
                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                        const isToday = isSameDay(day, today);

                        return (
                          <div
                            key={day.toISOString()}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleCreateFromDay(day)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleCreateFromDay(day);
                              }
                            }}
                            className={cn(
                              'min-h-[200px] rounded-2xl border border-slate-200 bg-white p-3 text-left transition',
                              isToday && 'bg-sky-50/70',
                              isSelected && 'ring-1 ring-inset ring-indigo-400',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {format(day, 'EEE')}
                              </div>
                              <div className={cn('text-sm font-semibold', isToday ? 'text-sky-700' : 'text-slate-700')}>
                                {format(day, 'd')}
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              {dayEvents.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                                  No events
                                </div>
                              ) : (
                                dayEvents.map((event) => (
                                  <CalendarEventPill
                                    key={event.id}
                                    event={event}
                                    selected={selectedEventId === event.id}
                                    onSelect={handleSelectEvent}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Day view</p>
                          <h2 className="mt-1 text-xl font-bold text-slate-900">
                            {format(dayViewDate, 'EEEE, MMMM d')}
                          </h2>
                        </div>
                        <Badge className="rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                          {dayViewEvents.length} event{dayViewEvents.length === 1 ? '' : 's'}
                        </Badge>
                      </div>

                      <div className="mt-5 space-y-3">
                        {dayViewEvents.length === 0 ? (
                          DAY_VIEW_SLOTS.map((slot) => (
                            <button
                              key={slot.value}
                              type="button"
                              onClick={() => handleCreateFromDay(dayViewDate, slot.value)}
                              className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
                            >
                              <div className="w-16 text-sm font-semibold text-slate-500">{slot.label}</div>
                              <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                              <div className="text-sm text-slate-400">Open schedule slot</div>
                            </button>
                          ))
                        ) : (
                          dayViewEvents.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => handleSelectEvent(event)}
                              className={cn(
                                'w-full rounded-2xl border bg-white px-4 py-4 text-left shadow-sm transition',
                                EVENT_TYPE_STYLES[event.type],
                                selectedEventId === event.id && 'ring-1 ring-inset ring-slate-900/20',
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold">{event.title}</div>
                                  <div className="mt-1 text-xs opacity-80">
                                    {event.customerName}
                                    {event.technicianName ? ` | ${event.technicianName}` : ''}
                                  </div>
                                </div>
                                <Badge className="rounded-full bg-white/80 text-slate-700 hover:bg-white/80">
                                  {EVENT_TYPE_LABELS[event.type]}
                                </Badge>
                              </div>
                              <div className="mt-3 text-sm opacity-90">{formatEventTime(event)}</div>
                              {event.location ? (
                                <div className="mt-1 text-xs opacity-80">{event.location}</div>
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </main>

            <aside className="space-y-4 xl:sticky xl:top-[4.75rem] xl:h-fit">
              <SectionCard icon={Clock3} title="Today's Schedule">
                {currentDayEvents.length === 0 ? (
                  <EmptyState>No events scheduled for today.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {currentDayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300"
                      >
                        <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {event.customerName} | {formatEventTime(event)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={CalendarDays} title="Upcoming Appointments">
                {upcomingEvents.length === 0 ? (
                  <EmptyState>No upcoming appointments.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300"
                      >
                        <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {format(event.start, 'MMM d, h:mm a')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={Users} title="Technician Availability">
                <div className="flex flex-wrap gap-2">
                  <AvailabilityPill label={`${liveTechnicians} Live`} color="border-emerald-200 bg-emerald-50 text-emerald-700" />
                  <AvailabilityPill label={`${busyTechnicians} Busy`} color="border-amber-200 bg-amber-50 text-amber-700" />
                  <AvailabilityPill label={`${offTechnicians} Off`} color="border-slate-200 bg-slate-50 text-slate-600" />
                </div>
                <div className="mt-4">
                  {technicianOptions.length === 0 ? (
                    <EmptyState>No technicians found.</EmptyState>
                  ) : (
                    <div className="space-y-2">
                      {technicianOptions.slice(0, 5).map((technician) => {
                        const isBusy = busyTechnicianIds.has(technician.value);
                        const statusLabel = !technician.isActive ? 'Off' : isBusy ? 'Busy' : 'Live';
                        const statusClass = !technician.isActive
                          ? 'border-slate-200 bg-slate-50 text-slate-600'
                          : isBusy
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700';

                        return (
                          <div key={technician.value} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                            <span className="text-sm font-medium text-slate-700">{technician.label}</span>
                            <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', statusClass)}>
                              {statusLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard icon={Package} title="Pending Deliveries">
                {pendingDeliveries.length === 0 ? (
                  <EmptyState>No pending deliveries.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {pendingDeliveries.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300"
                      >
                        <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {format(event.start, 'MMM d, h:mm a')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={BarChart3} title="Selected Event">
                {selectedEvent ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{selectedEvent.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {EVENT_TYPE_LABELS[selectedEvent.type]} | {formatEventTime(selectedEvent)}
                        </div>
                      </div>
                      <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-none', EVENT_TYPE_STYLES[selectedEvent.type])}>
                        {EVENT_TYPE_LABELS[selectedEvent.type]}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Customer:</span> {selectedEvent.customerName}</p>
                      <p><span className="font-semibold text-slate-900">Technician:</span> {selectedEvent.technicianName ?? 'Unassigned'}</p>
                      <p><span className="font-semibold text-slate-900">Date:</span> {format(selectedEvent.start, 'EEEE, MMM d')}</p>
                      <p><span className="font-semibold text-slate-900">Time:</span> {formatEventTime(selectedEvent)}</p>
                      <p><span className="font-semibold text-slate-900">Location:</span> {selectedEvent.location || 'Not set'}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                      {selectedEvent.notes || 'No additional dispatch notes for this event yet.'}
                    </div>
                  </div>
                ) : selectedDate ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {selectedDayEvents.length === 0
                          ? 'No scheduled events on this date yet.'
                          : `${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? 's' : ''} linked to this day.`}
                      </div>
                    </div>

                    {selectedDayEvents.length === 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl border-slate-200 bg-white text-slate-700"
                        onClick={() => openCreateDialog(selectedDate)}
                      >
                        Create appointment
                      </Button>
                    ) : (
                      selectedDayEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => handleSelectEvent(event)}
                          className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300"
                        >
                          <div className="text-sm font-semibold text-slate-900">{event.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {event.customerName} | {formatEventTime(event)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <EmptyState>Select a calendar event to inspect details and actions.</EmptyState>
                )}
              </SectionCard>

              <SectionCard icon={Briefcase} title="Dispatch Integrations">
                <div className="space-y-2 text-[11px] leading-5 text-slate-600">
                  <p>Jobs module sync: {filteredEvents.length} events linked in the visible range</p>
                  <p>Technicians module sync: {technicianOptions.length} profiles loaded</p>
                  <p>Invoices module sync: {filteredEvents.filter((event) => event.type === 'invoice').length} records checked</p>
                  <p>Calendar custom events: {filteredEvents.filter((event) => event.type === 'custom').length} in current range</p>
                </div>
              </SectionCard>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {isLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>
                  Refreshed {format(lastRefreshed, 'MMM d, h:mm a')}
                  {highlightedDateLabel ? ` | selected ${highlightedDateLabel}` : ''}
                </span>
              </div>
            </aside>
          </div>
        </div>
        </div>
      </div>

      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        formValues={createFormValues}
        technicianOptions={technicianOptions}
        isSubmitting={isSubmitting}
        errorMessage={createError}
        onFieldChange={updateFormField}
        onSubmit={handleCreateAppointment}
      />
    </div>
  );
}
