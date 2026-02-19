import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock,
    MapPin,
    Building2,
    Briefcase,
    AlertCircle,
    Home,
    ClipboardList,
    CalendarDays,
    User,
    RefreshCw,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_SERVICES } from '../admin/Services';
import { MOCK_DEALERSHIPS } from '../admin/Dealerships';

// Types
interface ScheduledJob {
    job_id: string;
    job_code: string;
    dealership_name: string;
    service_name: string;
    status: 'scheduled' | 'in_progress' | 'delayed' | 'completed';
    urgency: 'critical' | 'high' | 'normal' | 'low' | null;
    scheduled_start_dt: string | null; // ISO timestamp
    scheduled_end_dt: string | null; // ISO timestamp
    zone: string | null;
}

interface DateGroup {
    date: string; // YYYY-MM-DD
    label: string; // "Today", "Tomorrow", "Wed, Feb 12"
    jobs: ScheduledJob[];
}

// Mock Data Generator
const generateMockSchedule = (): ScheduledJob[] => {
    const today = new Date();
    const jobs: ScheduledJob[] = [];
    const services = MOCK_SERVICES.map(s => s.name);
    const dealers = MOCK_DEALERSHIPS.map(d => d.name);
    const zones = ['Québec', 'Lévis', 'Donnacona', 'St-Raymond'];

    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    // Today's jobs
    const todayDate = new Date(today);
    jobs.push(
        {
            job_id: 'job-sch-1',
            job_code: 'SM2-2024-1105',
            dealership_name: getRandom(dealers) || 'Audi de Quebec',
            service_name: getRandom(services) || 'Bande pare-brise teintée',
            status: 'scheduled',
            urgency: 'high',
            scheduled_start_dt: new Date(todayDate.setHours(9, 30, 0)).toISOString(),
            scheduled_end_dt: new Date(todayDate.setHours(10, 15, 0)).toISOString(),
            zone: getRandom(zones)
        },
        {
            job_id: 'job-sch-2',
            job_code: 'SM2-2024-1106',
            dealership_name: getRandom(dealers) || 'Toyota Ste-Foy',
            service_name: getRandom(services) || 'Démarreur 2-Way – Audi',
            status: 'scheduled',
            urgency: 'normal',
            scheduled_start_dt: new Date(todayDate.setHours(11, 0, 0)).toISOString(),
            scheduled_end_dt: new Date(todayDate.setHours(12, 0, 0)).toISOString(),
            zone: getRandom(zones)
        },
        {
            job_id: 'job-sch-3',
            job_code: 'SM2-2024-1107',
            dealership_name: getRandom(dealers) || 'Honda Donnacona',
            service_name: getRandom(services) || 'Main-d’œuvre – régulier',
            status: 'in_progress',
            urgency: 'critical',
            scheduled_start_dt: new Date(todayDate.setHours(14, 30, 0)).toISOString(),
            scheduled_end_dt: new Date(todayDate.setHours(15, 0, 0)).toISOString(),
            zone: getRandom(zones)
        }
    );

    // Tomorrow's jobs
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);
    jobs.push(
        {
            job_id: 'job-sch-4',
            job_code: 'SM2-2024-1108',
            dealership_name: getRandom(dealers) || 'Metro Auto Center',
            service_name: getRandom(services) || 'PPF capot 12" + ailes',
            status: 'scheduled',
            urgency: 'high',
            scheduled_start_dt: new Date(tomorrowDate.setHours(10, 0, 0)).toISOString(),
            scheduled_end_dt: new Date(tomorrowDate.setHours(11, 30, 0)).toISOString(),
            zone: getRandom(zones)
        },
        {
            job_id: 'job-sch-5',
            job_code: 'SM2-2024-1109',
            dealership_name: getRandom(dealers) || 'Valley Motors',
            service_name: getRandom(services) || 'Teintage complet – standard',
            status: 'scheduled',
            urgency: null,
            scheduled_start_dt: new Date(tomorrowDate.setHours(13, 30, 0)).toISOString(),
            scheduled_end_dt: new Date(tomorrowDate.setHours(14, 0, 0)).toISOString(),
            zone: getRandom(zones)
        }
    );

    // Day after tomorrow
    const dayAfterDate = new Date(today);
    dayAfterDate.setDate(today.getDate() + 2);
    jobs.push(
        {
            job_id: 'job-sch-6',
            job_code: 'SM2-2024-1110',
            dealership_name: getRandom(dealers) || 'Audi de Quebec',
            service_name: getRandom(services) || 'Bande pare-brise teintée',
            status: 'scheduled',
            urgency: 'normal',
            scheduled_start_dt: new Date(dayAfterDate.setHours(9, 0, 0)).toISOString(),
            scheduled_end_dt: new Date(dayAfterDate.setHours(9, 45, 0)).toISOString(),
            zone: getRandom(zones)
        },
        {
            job_id: 'job-sch-7',
            job_code: 'SM2-2024-1111',
            dealership_name: getRandom(dealers) || 'Toyota Ste-Foy',
            service_name: getRandom(services) || 'Démarreur 2-Way – Audi',
            status: 'scheduled',
            urgency: null,
            scheduled_start_dt: new Date(dayAfterDate.setHours(15, 0, 0)).toISOString(),
            scheduled_end_dt: new Date(dayAfterDate.setHours(16, 0, 0)).toISOString(),
            zone: getRandom(zones)
        }
    );

    // Add a few more future jobs
    for (let i = 3; i < 7; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);

        if (i % 2 === 0) { // Some days have jobs, some don't
            jobs.push({
                job_id: `job-sch-${10 + i}`,
                job_code: `SM2-2024-11${10 + i}`,
                dealership_name: getRandom(dealers) || 'Honda Donnacona',
                service_name: getRandom(services) || 'Main-d’œuvre – régulier',
                status: 'scheduled',
                urgency: 'normal',
                scheduled_start_dt: new Date(futureDate.setHours(11, 0, 0)).toISOString(),
                scheduled_end_dt: new Date(futureDate.setHours(12, 0, 0)).toISOString(),
                zone: getRandom(zones)
            });
        }
    }

    return jobs;
};

export default function SchedulePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [jobs, setJobs] = useState<ScheduledJob[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        setLoading(true);
        setError(false);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            const mockData = generateMockSchedule();
            setJobs(mockData);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Group jobs by date
    const groupJobsByDate = (): DateGroup[] => {
        const groups: DateGroup[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const dateMap = new Map<string, ScheduledJob[]>();

        jobs.forEach(job => {
            if (!job.scheduled_start_dt) return;

            const jobDate = new Date(job.scheduled_start_dt);
            jobDate.setHours(0, 0, 0, 0);
            const dateStr = jobDate.toISOString().split('T')[0];

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, []);
            }
            dateMap.get(dateStr)!.push(job);
        });

        // Sort and create groups
        const sortedDates = Array.from(dateMap.keys()).sort();

        sortedDates.forEach(dateStr => {
            const jobDate = new Date(dateStr);
            jobDate.setHours(0, 0, 0, 0);

            let label: string;
            if (jobDate.getTime() === today.getTime()) {
                label = 'TODAY';
            } else if (jobDate.getTime() === tomorrow.getTime()) {
                label = 'TOMORROW';
            } else {
                label = jobDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                }).toUpperCase();
            }

            const dayJobs = dateMap.get(dateStr)!;
            dayJobs.sort((a, b) => {
                const timeA = a.scheduled_start_dt ? new Date(a.scheduled_start_dt).getTime() : 0;
                const timeB = b.scheduled_start_dt ? new Date(b.scheduled_start_dt).getTime() : 0;
                return timeA - timeB;
            });

            groups.push({
                date: dateStr,
                label,
                jobs: dayJobs
            });
        });

        return groups;
    };

    const dateGroups = groupJobsByDate();

    const formatTime = (isoString: string | null) => {
        if (!isoString) return 'Time TBD';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatTimeRange = (start: string | null, end: string | null) => {
        if (!start) return 'Time TBD';
        const startTime = formatTime(start);
        const endTime = end ? formatTime(end) : null;
        return endTime ? `${startTime} - ${endTime}` : startTime;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_progress': return 'bg-[#2F8E92] text-white';
            case 'delayed': return 'bg-orange-500 text-white';
            case 'scheduled': return 'bg-gray-500 dark:bg-gray-600 text-white';
            case 'completed': return 'bg-green-600 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_progress': return 'In Progress';
            case 'delayed': return 'Delayed';
            case 'scheduled': return 'Scheduled';
            case 'completed': return 'Completed';
            default: return status;
        }
    };

    const getUrgencyColor = (urgency: string | null) => {
        if (!urgency) return null;
        switch (urgency) {
            case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
            case 'high': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
            case 'normal': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'low': return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
            default: return null;
        }
    };

    const handleJobClick = (jobId: string) => {
        navigate('/tech/my-jobs');
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col pb-20">
                {/* Header Skeleton */}
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                        <div className="h-9 w-9 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-40"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28"></div>
                            </div>
                        </div>
                    ))}
                </div>

                <TechnicianBottomNav currentPage="schedule" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h1>
                        {lastUpdated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={fetchSchedule}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Refresh schedule"
                    >
                        <RefreshCw className={cn("w-5 h-5 text-gray-500 dark:text-gray-400", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-800 dark:text-red-300">
                                Could not load schedule.
                            </span>
                        </div>
                        <button
                            onClick={fetchSchedule}
                            className="text-sm font-semibold text-red-700 dark:text-red-400 hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Schedule Content - Agenda List */}
            <div className="flex-1 overflow-y-auto">
                {dateGroups.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <CalendarDays className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Scheduled Jobs
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                            New assignments will appear here.
                        </p>
                    </div>
                ) : (
                    // Agenda Groups
                    <div className="p-4 space-y-6">
                        {dateGroups.map((group) => (
                            <div key={group.date} className="space-y-3">
                                {/* Date Header */}
                                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                                    {group.label}
                                </h2>

                                {/* Jobs for this date */}
                                <div className="space-y-2">
                                    {group.jobs.map((job) => (
                                        <div
                                            key={job.job_id}
                                            onClick={() => handleJobClick(job.job_id)}
                                            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                        >
                                            {/* Time Range & Status */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatTimeRange(job.scheduled_start_dt, job.scheduled_end_dt)}
                                                    </span>
                                                </div>
                                                <span className={cn("text-xs font-medium px-2 py-1 rounded-md", getStatusColor(job.status))}>
                                                    {getStatusLabel(job.status)}
                                                </span>
                                            </div>

                                            {/* Job Info */}
                                            <div className="space-y-2">
                                                {/* Job Code & Urgency */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                            {job.job_code}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                            {job.service_name}
                                                        </p>
                                                    </div>
                                                    {job.urgency && (
                                                        <span className={cn(
                                                            "text-xs font-semibold px-2 py-1 rounded-md border uppercase flex-shrink-0",
                                                            getUrgencyColor(job.urgency)
                                                        )}>
                                                            {job.urgency}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Dealership */}
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                                                    <span className="font-medium truncate">{job.dealership_name}</span>
                                                </div>

                                                {/* Zone */}
                                                {job.zone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                                                        <span className="truncate">{job.zone}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleJobClick(job.job_id);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 bg-[#2F8E92] hover:bg-[#267276] text-white font-semibold py-2.5 rounded-lg transition-colors"
                                                >
                                                    Open Job
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <TechnicianBottomNav currentPage="schedule" />
        </div>
    );
}

// Bottom Navigation Component
function TechnicianBottomNav({ currentPage }: { currentPage: 'available' | 'my-jobs' | 'schedule' | 'profile' }) {
    const navigate = useNavigate();

    const navItems = [
        { id: 'available', label: 'Available', icon: Briefcase, path: '/tech/available-jobs' },
        { id: 'my-jobs', label: 'My Jobs', icon: ClipboardList, path: '/tech/my-jobs' },
        { id: 'schedule', label: 'Schedule', icon: CalendarDays, path: '/tech/schedule' },
        { id: 'profile', label: 'Profile', icon: User, path: '/tech/profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom z-50">
            <div className="flex items-center justify-around px-2 py-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === currentPage;

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[70px]",
                                isActive
                                    ? "bg-[#2F8E92]/10 dark:bg-teal-900/30"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-6 h-6 transition-colors",
                                    isActive
                                        ? "text-[#2F8E92] dark:text-teal-400"
                                        : "text-gray-500 dark:text-gray-400"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-xs font-medium transition-colors",
                                    isActive
                                        ? "text-[#2F8E92] dark:text-teal-400"
                                        : "text-gray-600 dark:text-gray-400"
                                )}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
