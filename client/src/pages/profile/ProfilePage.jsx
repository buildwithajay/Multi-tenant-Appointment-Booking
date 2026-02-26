import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Building2, Shield } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authService.getMe()
            .then((r) => setProfile(r.data))
            .catch(() => toast.error('Failed to load profile'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

                {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-full bg-slate-200" />
                            <div>
                                <div className="h-5 bg-slate-200 rounded w-40 mb-2" />
                                <div className="h-4 bg-slate-100 rounded w-32" />
                            </div>
                        </div>
                        {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl mb-3" />)}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        {/* Avatar header */}
                        <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-8 flex items-center gap-5">
                            <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center text-white text-3xl font-bold">
                                {(profile?.firstName ?? user?.firstName ?? '?')[0]}
                            </div>
                            <div>
                                <h2 className="text-white text-xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
                                <p className="text-blue-100 text-sm mt-0.5">{user?.roles?.[0] ?? 'User'}</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            {[
                                { icon: Mail, label: 'Email', value: profile?.email ?? user?.email },
                                { icon: User, label: 'Full Name', value: `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() },
                                { icon: Building2, label: 'Tenant ID', value: profile?.tenantId ?? user?.tenantId ?? 'N/A' },
                                { icon: Shield, label: 'Roles', value: user?.roles?.join(', ') ?? 'N/A' },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                                        <Icon size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
                                        <p className="text-slate-900 text-sm mt-0.5 break-all">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
