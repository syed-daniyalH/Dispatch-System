import { Calendar, Clock, User, Briefcase, LogOut, Settings, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

function BottomNav({ activeTab }: { activeTab: 'available' | 'my-jobs' | 'schedule' | 'profile' }) {
    const navigate = useNavigate();

    const tabs = [
        { id: 'available', label: 'Available', icon: Briefcase, path: '/tech/available-jobs' },
        { id: 'my-jobs', label: 'My Jobs', icon: Calendar, path: '/tech/my-jobs' },
        { id: 'schedule', label: 'Schedule', icon: Clock, path: '/tech/schedule' },
        { id: 'profile', label: 'Profile', icon: User, path: '/tech/profile' },
    ] as const;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl z-50 safe-area-bottom">
            <div className="max-w-2xl mx-auto px-2 py-2">
                <div className="flex items-center justify-around gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.path)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl transition-all duration-200 flex-1",
                                    isActive
                                        ? "bg-[#2F8E92]/10 dark:bg-[#2F8E92]/20 text-[#2F8E92] dark:text-teal-400"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                                <span className={cn("text-xs font-semibold", isActive && "font-bold")}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/tech/login', { replace: true });
    };

    const userName = user?.name ?? 'Technician';
    const userEmail = user?.email ?? 'technician@sm2dispatch.com';
    const userPhone = user?.phone ?? '+1 (555) 000-0000';
    const initials = userName
        .split(' ')
        .filter(Boolean)
        .map((name) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-2xl mx-auto px-5 py-4">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Profile
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Manage your account
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-[#2F8E92] flex items-center justify-center text-white text-2xl font-bold">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {userName}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Technician
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{userEmail}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{userPhone}</span>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                    <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700">
                        <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Notifications</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Settings</span>
                    </button>
                </div>

                {/* Logout */}
                <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full h-12 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                    <LogOut className="w-5 h-5 mr-2" />
                    Logout
                </Button>
            </div>

            {/* Bottom Navigation */}
            <BottomNav activeTab="profile" />
        </div>
    );
}
