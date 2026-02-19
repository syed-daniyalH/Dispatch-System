import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types';

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  PENDING_REVIEW: {
    label: 'Pending Review',
    className: 'badge-status-pending',
  },
  READY_FOR_TECH_ACCEPTANCE: {
    label: 'Ready for Tech',
    className: 'badge-status-pending',
  },
  DISPATCHING: {
    label: 'Dispatching',
    className: 'badge-status-in-progress',
  },
  SCHEDULED: {
    label: 'Scheduled',
    className: 'badge-status-in-progress',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'badge-status-in-progress',
  },
  DELAYED: {
    label: 'Delayed',
    className: 'badge-status-pending',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'badge-status-completed',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'badge-status-cancelled',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
