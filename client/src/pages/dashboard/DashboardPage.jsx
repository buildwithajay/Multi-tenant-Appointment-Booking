import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { serviceService } from '../../services/serviceService';
import { staffService } from '../../services/staffService';
import { tenantService } from '../../services/tenantService';
import { customerService } from '../../services/customerService';
import { bookingService } from '../../services/bookingService';
import { Briefcase, Users, Building2, ArrowRight, Activity, UserRound, CalendarDays } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, to }) {
    return (
        <Link to={to} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="text-white" size={22} />
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{value ?? <span className="animate-pulse bg-slate-200 rounded w-12 h-7 inline-block" />}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
        </Link>
    );
}

export default function DashboardPage() {
    const { user, isAdmin, isManager } = useAuth();
    const [counts, setCounts] = useState({ services: null, staff: null, customers: null, bookings: null, tenants: null });

    useEffect(() => {
        serviceService.getAll().then((r) => setCounts((c) => ({ ...c, services: r.data.length }))).catch(() => { });
        staffService.getAll().then((r) => setCounts((c) => ({ ...c, staff: r.data.length }))).catch(() => { });
        customerService.getAll().then((r) => setCounts((c) => ({ ...c, customers: r.data.length }))).catch(() => { });
        bookingService.getAll().then((r) => setCounts((c) => ({ ...c, bookings: r.data.length }))).catch(() => { });
        if (isAdmin()) {
            tenantService.getAll().then((r) => setCounts((c) => ({ ...c, tenants: r.data.length }))).catch(() => { });
        }
    }, []);

    return (
        <DashboardLayout>
            {/* Welcome */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    Good afternoon, {user?.firstName ?? 'there'} 👋
                </h1>
                <p className="text-slate-500 mt-1">Here's what's happening across your platform today.</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
                <StatCard icon={Briefcase} label="Total Services" value={counts.services} color="bg-blue-600" to="/services" />
                <StatCard icon={Users} label="Staff Members" value={counts.staff} color="bg-violet-600" to="/staff" />
                <StatCard icon={UserRound} label="Customers" value={counts.customers} color="bg-emerald-600" to="/customers" />
                <StatCard icon={CalendarDays} label="Bookings" value={counts.bookings} color="bg-amber-600" to="/bookings" />
                {isAdmin() && (
                    <StatCard icon={Building2} label="Tenants" value={counts.tenants} color="bg-emerald-600" to="/tenants" />
                )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-blue-600" /> Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isManager() && (
                        <>
                            <Link to="/services" className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-all">
                                <Briefcase size={18} /> Manage Services
                            </Link>
                            <Link to="/staff" className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50 text-slate-600 hover:text-violet-700 transition-all">
                                <Users size={18} /> Manage Staff
                            </Link>
                            <Link to="/customers" className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all">
                                <UserRound size={18} /> Manage Customers
                            </Link>
                            <Link to="/bookings" className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-all">
                                <CalendarDays size={18} /> Manage Bookings
                            </Link>
                        </>
                    )}
                    {isAdmin() && (
                        <Link to="/tenants" className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all">
                            <Building2 size={18} /> Manage Tenants
                        </Link>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
