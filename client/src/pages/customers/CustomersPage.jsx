import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check, UserRound } from 'lucide-react';

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 rounded-lg p-1"><X size={20} /></button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

const empty = { name: '', email: '', notes: '', isActive: true };

const parsePublicCustomerNotes = (notes) => {
    if (!notes) return null;

    if (notes.startsWith('PublicBooking|')) {
        const parts = notes.split('|');
        if (parts.length < 5) return null;
        return {
            fullName: `${parts[1]} ${parts[2]}`.trim(),
            email: parts[3] || null,
            notes: parts.slice(5).join('|') || null,
        };
    }

    if (notes.startsWith('CustomerProfile|')) {
        const parts = notes.split('|');
        if (parts.length < 4) return null;
        return {
            fullName: parts[1] || null,
            email: parts[2] || null,
            notes: parts.slice(3).join('|') || null,
        };
    }

    return null;
};

export default function CustomersPage() {
    const { isManager } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        customerService.getAll()
            .then((r) => setCustomers(r.data))
            .catch(() => toast.error('Failed to load customers'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const openCreate = () => { setForm(empty); setModal('create'); };
    const openEdit = (c) => {
        const parsed = parsePublicCustomerNotes(c.notes);
        setSelected(c);
        setForm({
            name: c.user?.fullName ?? parsed?.fullName ?? '',
            email: c.user?.email ?? parsed?.email ?? '',
            notes: c.notes ?? '',
            isActive: c.isActive
        });
        setModal('edit');
    };
    const closeModal = () => { setModal(null); setSelected(null); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modal === 'create') {
                await customerService.create({
                    name: form.name,
                    email: form.email,
                    notes: form.notes
                });
                toast.success('Customer created!');
            } else {
                await customerService.update(selected.id, { notes: form.notes, isActive: form.isActive });
                toast.success('Customer updated!');
            }
            closeModal();
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Error saving customer');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer?')) return;
        try {
            await customerService.delete(id);
            toast.success('Customer deleted');
            load();
        } catch {
            toast.error('Failed to delete customer');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage customer profiles and notes</p>
                </div>
                {isManager() && (
                    <button onClick={openCreate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-emerald-600/20">
                        <Plus size={16} /> Add Customer
                    </button>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
                            <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
                            <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : customers.length === 0 ? (
                <div className="text-center py-20">
                    <div className="bg-slate-100 rounded-2xl p-6 inline-flex mb-4"><UserRound size={32} className="text-slate-400" /></div>
                    <p className="text-slate-500">No customers yet.</p>
                    {isManager() && <button onClick={openCreate} className="mt-4 bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Add Customer</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customers.map((c) => (
                        (() => {
                            const parsed = parsePublicCustomerNotes(c.notes);
                            const name = c.user?.fullName || parsed?.fullName || 'Unlinked Customer';
                            const email = c.user?.email || parsed?.email || c.userId || 'No user linked';
                            const displayNotes = parsed?.notes ?? c.notes;
                            return (
                        <div key={c.id} className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all overflow-hidden">
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-semibold text-slate-900">{name}</p>
                                        <p className="text-xs text-slate-500">{email}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {c.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-3">{displayNotes || 'No notes'}</p>
                                <div className="text-xs text-slate-500">
                                    <p>Total bookings: {c.totalBookings}</p>
                                    <p>Last booking: {c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                            {isManager() && (
                                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                                    <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700">
                                        <Pencil size={12} /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600">
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                            );
                        })()
                    ))}
                </div>
            )}

            {modal && (
                <Modal title={modal === 'create' ? 'Add Customer' : 'Edit Customer'} onClose={closeModal}>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                                <input
                                    type="text"
                                    required={modal === 'create'}
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="John Doe"
                                    disabled={modal === 'edit'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required={modal === 'create'}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="john@example.com"
                                    disabled={modal === 'edit'}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={3}
                                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                placeholder="Customer notes..."
                            />
                        </div>
                        {modal === 'edit' && (
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    className="accent-emerald-600"
                                />
                                Active
                            </label>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                {modal === 'create' ? 'Create' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </DashboardLayout>
    );
}
