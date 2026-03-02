import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Building2, Briefcase, Users, Menu, X,
    LogOut, User, ChevronDown, Bell, Settings, CalendarDays, UserRound, ChartNoAxesColumn
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppointlyLogo from '../components/AppointlyLogo';

const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tenants', label: 'Tenants', icon: Building2, roles: ['Admin'] },
    { to: '/analytics', label: 'Analytics', icon: ChartNoAxesColumn, roles: ['Admin'] },
    { to: '/services', label: 'Services', icon: Briefcase },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/customers', label: 'Customers', icon: UserRound },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }) {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const visibleLinks = navLinks.filter(
        (l) => !l.roles || l.roles.some((r) => hasRole(r))
    );

    const sidebar = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
                <AppointlyLogo className="h-10 w-auto" />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                {visibleLinks.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* User card */}
            <div className="px-4 py-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800">
                    <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user?.firstName?.[0] ?? user?.email?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-slate-400 text-xs truncate">{user?.roles?.[0] ?? 'User'}</p>
                    </div>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-1 rounded-lg">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-slate-900 flex-shrink-0">
                {sidebar}
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col z-10">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        {sidebar}
                    </aside>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
                    <button
                        className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={20} />
                    </button>
                    <div className="hidden lg:block" />

                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 relative">
                            <Bell size={18} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-700"
                            >
                                <div className="bg-blue-600 rounded-full w-7 h-7 flex items-center justify-center text-white text-xs font-bold">
                                    {user?.firstName?.[0] ?? '?'}
                                </div>
                                <span className="hidden sm:block">{user?.firstName}</span>
                                <ChevronDown size={14} />
                            </button>
                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                                    <NavLink
                                        to="/profile"
                                        onClick={() => setProfileOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <User size={14} /> Profile
                                    </NavLink>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut size={14} /> Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
