import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { tenantService } from '../../services/tenantService';
import {
    Building2,
    Palette,
    Clock3,
    Bell,
    Shield,
    Save,
} from 'lucide-react';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenantId, setTenantId] = useState(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        description: '',
        timeZone: 'UTC',
        logoUrl: '',
        notificationsEnabled: true,
        reminderMinutes: 60,
        allowPublicBooking: true,
    });

    useEffect(() => {
        tenantService.getAll()
            .then((res) => {
                const tenant = res.data?.[0];
                if (!tenant) return;
                setTenantId(tenant.id);
                setForm((prev) => ({
                    ...prev,
                    name: tenant.name ?? '',
                    email: tenant.email ?? '',
                    phone: tenant.phone ?? '',
                    description: tenant.description ?? '',
                    timeZone: tenant.timeZone ?? 'UTC',
                    logoUrl: tenant.logoUrl ?? '',
                }));
            })
            .catch(() => toast.error('Failed to load tenant settings'))
            .finally(() => setLoading(false));
    }, []);

    const saveSettings = async (e) => {
        e.preventDefault();
        if (!tenantId) {
            toast.error('Tenant not found');
            return;
        }
        setSaving(true);
        try {
            await tenantService.update(tenantId, {
                name: form.name,
                email: form.email || null,
                phone: form.phone || null,
                description: form.description || null,
                timeZone: form.timeZone || 'UTC',
                logoUrl: form.logoUrl || null,
            });
            toast.success('Settings saved successfully');
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto w-full space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Business Settings</h1>
                        <p className="text-sm text-slate-500 mt-1">Configure your workspace, preferences and branding.</p>
                    </div>
                    <button
                        onClick={saveSettings}
                        disabled={saving || loading}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[...Array(4)].map((_, idx) => (
                            <div key={idx} className="h-48 rounded-2xl border border-slate-200 bg-white animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <form onSubmit={saveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-700"><Building2 size={18} /></div>
                                <h2 className="font-semibold text-slate-900">Business Profile</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Business Name</label>
                                    <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Email</label>
                                        <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Phone</label>
                                        <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Description</label>
                                    <textarea className={`${inputClass} resize-none`} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700"><Palette size={18} /></div>
                                <h2 className="font-semibold text-slate-900">Branding & Locale</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Logo URL</label>
                                    <input className={inputClass} placeholder="https://..." value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Time Zone</label>
                                    <select className={inputClass} value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })}>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="America/Chicago">America/Chicago</option>
                                        <option value="America/Denver">America/Denver</option>
                                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 rounded-lg bg-teal-100 text-teal-700"><Clock3 size={18} /></div>
                                <h2 className="font-semibold text-slate-900">Booking Preferences</h2>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Allow Public Booking</p>
                                        <p className="text-xs text-slate-500">Customers can book directly from your public page.</p>
                                    </div>
                                    <input type="checkbox" checked={form.allowPublicBooking} onChange={(e) => setForm({ ...form, allowPublicBooking: e.target.checked })} />
                                </label>
                                <div>
                                    <label className="block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5">Reminder Minutes Before Appointment</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={5}
                                        className={inputClass}
                                        value={form.reminderMinutes}
                                        onChange={(e) => setForm({ ...form, reminderMinutes: Number(e.target.value || 0) })}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700"><Bell size={18} /></div>
                                <h2 className="font-semibold text-slate-900">Notifications & Security</h2>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Email Notifications</p>
                                        <p className="text-xs text-slate-500">Receive booking updates in email.</p>
                                    </div>
                                    <input type="checkbox" checked={form.notificationsEnabled} onChange={(e) => setForm({ ...form, notificationsEnabled: e.target.checked })} />
                                </label>

                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                                        <Shield size={16} /> Security Tip
                                    </div>
                                    <p className="text-xs text-amber-700 mt-1">Use a strong password and rotate API keys regularly in production.</p>
                                </div>
                            </div>
                        </section>
                    </form>
                )}
            </div>
        </DashboardLayout>
    );
}
