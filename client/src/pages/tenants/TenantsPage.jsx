import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { tenantService } from '../../services/tenantService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check, Building2, Copy, ExternalLink } from 'lucide-react';

const BUSINESS_TYPES = [
    { value: 1, label: 'Clinic' }, { value: 2, label: 'Salon' }, { value: 3, label: 'Tutoring' },
    { value: 4, label: 'Gym' }, { value: 5, label: 'Repair Service' }, { value: 6, label: 'Consulting Firm' }, { value: 99, label: 'Other' },
];
const SUBSCRIPTION_PLANS = ['Starter', 'Growth', 'Enterprise'];

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"><X size={20} /></button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

const emptyCreate = {
    name: '', email: '', phone: '', businessType: 1, description: '',
    addressLine1: '', city: '', state: '', country: '', postalCode: '', website: '',
    subscriptionPlan: 0,
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
};
const emptyUpdate = {
    name: '', email: '', phone: '', description: '', timeZone: 'UTC',
    logoUrl: '', subscriptionPlan: 0,
};

export default function TenantsPage() {
    const { isAdmin } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // 'create' | 'edit'
    const [selected, setSelected] = useState(null);
    const [createForm, setCreateForm] = useState(emptyCreate);
    const [updateForm, setUpdateForm] = useState(emptyUpdate);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        tenantService.getAll().then((r) => setTenants(r.data)).catch(() => toast.error('Failed to load tenants')).finally(() => setLoading(false));
    };

    useEffect(load, []);

    const openCreate = () => { setCreateForm(emptyCreate); setModal('create'); };
    const openEdit = (t) => {
        setSelected(t);
        setUpdateForm({ name: t.name ?? '', email: t.email ?? '', phone: t.phone ?? '', description: t.description ?? '', timeZone: t.timeZone ?? 'UTC', logoUrl: t.logoUrl ?? '', subscriptionPlan: t.subscriptionPlan ?? 0 });
        setModal('edit');
    };
    const closeModal = () => { setModal(null); setSelected(null); };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await tenantService.create({ ...createForm, businessType: parseInt(createForm.businessType) });
            toast.success('Tenant created!');
            closeModal();
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to create tenant');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await tenantService.update(selected.id, updateForm);
            toast.success('Tenant updated!');
            closeModal();
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to update tenant');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this tenant? This is irreversible.')) return;
        try {
            await tenantService.delete(id);
            toast.success('Tenant deleted');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to delete tenant');
        }
    };

    const getBookingUrl = (slug) => `http://localhost:5173/${slug}`;
    const copyBookingUrl = async (slug) => {
        const url = getBookingUrl(slug);
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Booking URL copied');
        } catch {
            toast.error('Failed to copy URL');
        }
    };

    const inputClass = "w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage all registered businesses</p>
                </div>
                {isAdmin() && (
                    <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-emerald-600/20">
                        <Plus size={16} /> Add Tenant
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-200" />
                            <div className="flex-1">
                                <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-32" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : tenants.length === 0 ? (
                <div className="text-center py-20">
                    <div className="bg-slate-100 rounded-2xl p-6 inline-flex mb-4"><Building2 size={32} className="text-slate-400" /></div>
                    <p className="text-slate-500">No tenants registered yet.</p>
                    {isAdmin() && <button onClick={openCreate} className="mt-4 bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Add Tenant</button>}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Business</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Slug</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Public Booking URL</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Email</th>
                                    {isAdmin() && <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tenants.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-emerald-100 rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0">
                                                    <Building2 size={18} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{t.name}</p>
                                                    <p className="text-slate-400 text-xs md:hidden">{t.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{t.slug}</span>
                                        </td>
                                        <td className="px-5 py-4 hidden xl:table-cell">
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={getBookingUrl(t.slug)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-mono text-xs text-blue-700 hover:text-blue-800 underline underline-offset-2"
                                                >
                                                    {getBookingUrl(t.slug)}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => copyBookingUrl(t.slug)}
                                                    className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                    title="Copy booking URL"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                                <a
                                                    href={getBookingUrl(t.slug)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                    title="Open booking page"
                                                >
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-600 hidden lg:table-cell">{t.email}</td>
                                        {isAdmin() && (
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(t)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition-all">
                                                        <Pencil size={12} /> Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(t.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 transition-all">
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Tenant Modal */}
            {modal === 'create' && (
                <Modal title="Register New Tenant" onClose={closeModal}>
                    <form onSubmit={handleCreate} className="space-y-5">
                        <fieldset className="border border-slate-200 rounded-xl p-4">
                            <legend className="text-xs font-semibold text-slate-500 uppercase px-2">Business Info</legend>
                            <div className="space-y-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label><input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Acme Corp" className={inputClass} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Business Email *</label><input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="info@acme.com" className={inputClass} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+1 234 567 8900" className={inputClass} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Business Type *</label>
                                    <select required value={createForm.businessType} onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })} className={inputClass}>
                                        {BUSINESS_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Subscription</label>
                                    <select value={createForm.subscriptionPlan} onChange={(e) => setCreateForm({ ...createForm, subscriptionPlan: parseInt(e.target.value) })} className={inputClass}>
                                        {SUBSCRIPTION_PLANS.map((p, i) => <option key={i} value={i}>{p}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={2} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className={`${inputClass} resize-none`} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">City</label><input value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} className={inputClass} /></div>
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Country</label><input value={createForm.country} onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })} className={inputClass} /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Website</label><input type="url" value={createForm.website} onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })} placeholder="https://" className={inputClass} /></div>
                            </div>
                        </fieldset>

                        <fieldset className="border border-slate-200 rounded-xl p-4">
                            <legend className="text-xs font-semibold text-slate-500 uppercase px-2">Admin Account</legend>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label><input required value={createForm.adminFirstName} onChange={(e) => setCreateForm({ ...createForm, adminFirstName: e.target.value })} className={inputClass} /></div>
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label><input required value={createForm.adminLastName} onChange={(e) => setCreateForm({ ...createForm, adminLastName: e.target.value })} className={inputClass} /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Admin Email *</label><input type="email" required value={createForm.adminEmail} onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })} className={inputClass} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Admin Password *</label><input type="password" required minLength={8} value={createForm.adminPassword} onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })} className={inputClass} /></div>
                            </div>
                        </fieldset>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />} Create Tenant
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Tenant Modal */}
            {modal === 'edit' && (
                <Modal title="Update Tenant" onClose={closeModal}>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label><input value={updateForm.name} onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input type="email" value={updateForm.email} onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone</label><input value={updateForm.phone} onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label><input value={updateForm.timeZone} onChange={(e) => setUpdateForm({ ...updateForm, timeZone: e.target.value })} className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label><input type="url" value={updateForm.logoUrl} onChange={(e) => setUpdateForm({ ...updateForm, logoUrl: e.target.value })} placeholder="https://" className={inputClass} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Subscription</label>
                            <select value={updateForm.subscriptionPlan} onChange={(e) => setUpdateForm({ ...updateForm, subscriptionPlan: parseInt(e.target.value) })} className={inputClass}>
                                {SUBSCRIPTION_PLANS.map((p, i) => <option key={i} value={i}>{p}</option>)}
                            </select>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={2} value={updateForm.description} onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })} className={`${inputClass} resize-none`} /></div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />} Save changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </DashboardLayout>
    );
}
