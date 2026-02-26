import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { staffService } from '../../services/staffService';
import { serviceService } from '../../services/serviceService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check, Link2, User2 } from 'lucide-react';

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 rounded-lg p-1"><X size={20} /></button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

const emptyStaff = {
    userId: '',
    specialization: '',
    workingHoursJson: '',
    serviceIds: [],
    firstName: '',
    lastName: '',
    email: '',
    password: ''
};

const workingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const createEmptyWorkingHours = () =>
    workingDays.reduce((acc, day) => {
        acc[day] = { enabled: false, start: '09:00', end: '17:00' };
        return acc;
    }, {});

const parseWorkingHoursJson = (value) => {
    const base = createEmptyWorkingHours();
    if (!value) return base;
    try {
        const parsed = JSON.parse(value);
        for (const day of workingDays) {
            const raw = parsed?.[day];
            if (typeof raw !== 'string' || !raw.includes('-')) continue;
            const [start, end] = raw.split('-', 2);
            if (start && end) {
                base[day] = { enabled: true, start, end };
            }
        }
    } catch {
        return base;
    }
    return base;
};

const buildWorkingHoursJson = (workingHours) => {
    const payload = {};
    for (const day of workingDays) {
        const slot = workingHours[day];
        if (!slot?.enabled) continue;
        if (!slot.start || !slot.end) continue;
        payload[day] = `${slot.start}-${slot.end}`;
    }
    return Object.keys(payload).length ? JSON.stringify(payload) : '';
};

export default function StaffPage() {
    const { isManager } = useAuth();
    const [staff, setStaff] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // 'create' | 'edit' | 'assign'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyStaff);
    const [workingHours, setWorkingHours] = useState(createEmptyWorkingHours);
    const [assignIds, setAssignIds] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        staffService.getAll()
            .then((r) => setStaff(r.data))
            .catch(() => toast.error('Failed to load staff'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        serviceService.getAll().then((r) => setServices(r.data)).catch(() => { });
    }, []);

    const openCreate = () => {
        setForm(emptyStaff);
        setWorkingHours(createEmptyWorkingHours());
        setModal('create');
    };
    const openEdit = (s) => {
        setSelected(s);
        setForm({
            specialization: s.specialization ?? '',
            userId: s.userId ?? '',
            workingHoursJson: s.workingHoursJson ?? '',
            serviceIds: [],
            firstName: '', lastName: '', email: '', password: '' // Edit doesn't need these usually, but good to reset
        });
        setWorkingHours(parseWorkingHoursJson(s.workingHoursJson));
        setModal('edit');
    };
    const openAssign = (s) => {
        setSelected(s);
        setAssignIds(s.services?.map((sv) => sv.id) ?? []);
        setModal('assign');
    };
    const closeModal = () => { setModal(null); setSelected(null); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                workingHoursJson: buildWorkingHoursJson(workingHours)
            };
            if (modal === 'create') {
                await staffService.create(payload);
                toast.success('Staff member created!');
            } else {
                await staffService.update(selected.id, payload);
                toast.success('Staff member updated!');
            }
            closeModal();
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Error saving staff');
        } finally {
            setSaving(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await staffService.assignService(selected.id, assignIds);
            toast.success('Services assigned!');
            closeModal();
            load();
        } catch {
            toast.error('Failed to assign services');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this staff member?')) return;
        try {
            await staffService.delete(id);
            toast.success('Staff deleted');
            load();
        } catch {
            toast.error('Failed to delete staff');
        }
    };

    const toggleService = (id) =>
        setAssignIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage your team members</p>
                </div>
                {isManager() && (
                    <button onClick={openCreate} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-violet-600/20">
                        <Plus size={16} /> Add Staff
                    </button>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-slate-200" />
                                <div className="h-4 bg-slate-200 rounded w-32" />
                            </div>
                            <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                            <div className="h-3 bg-slate-100 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : staff.length === 0 ? (
                <div className="text-center py-20">
                    <div className="bg-slate-100 rounded-2xl p-6 inline-flex mb-4"><User2 size={32} className="text-slate-400" /></div>
                    <p className="text-slate-500">No staff members yet.</p>
                    {isManager() && <button onClick={openCreate} className="mt-4 bg-violet-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Add Staff</button>}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium">Name</th>
                                    <th className="text-left px-4 py-3 font-medium">Email</th>
                                    <th className="text-left px-4 py-3 font-medium">Specialization</th>
                                    <th className="text-left px-4 py-3 font-medium">Services</th>
                                    {isManager() && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map((s) => (
                                    <tr key={s.id} className="border-t border-slate-100">
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {s.user?.fullName || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || `Staff #${s.id}`}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{s.user?.email || 'N/A'}</td>
                                        <td className="px-4 py-3 text-slate-700">{s.specialization || 'N/A'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(s.services?.length ?? 0) > 0 ? (
                                                    s.services.map((sv) => (
                                                        <span key={sv.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                                            {sv.name || services.find((x) => x.id === sv.id)?.name || `Service #${sv.id}`}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 text-xs">No assigned services</span>
                                                )}
                                            </div>
                                        </td>
                                        {isManager() && (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    <button onClick={() => openAssign(s)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700">
                                                        <Link2 size={12} /> Assign
                                                    </button>
                                                    <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700">
                                                        <Pencil size={12} /> Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(s.id)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600">
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

            {/* Create / Edit Staff modal */}
            {(modal === 'create' || modal === 'edit') && (
                <Modal title={modal === 'create' ? 'Add Staff Member' : 'Edit Staff Member'} onClose={closeModal}>
                    <form onSubmit={handleSave} className="space-y-4">
                        {modal === 'create' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.firstName}
                                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            placeholder="Jane"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.lastName}
                                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            placeholder="Smith"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(for login)</span></label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="jane.smith@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-slate-400 font-normal">(min 6 chars)</span></label>
                                    <input
                                        type="password"
                                        required
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                            <input
                                type="text"
                                value={form.specialization}
                                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                                placeholder="e.g. Hair Styling"
                                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Working Hours</label>
                            <div className="space-y-2 border border-slate-200 rounded-xl p-3">
                                {workingDays.map((day) => (
                                    <div key={day} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-2">
                                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={workingHours[day]?.enabled ?? false}
                                                onChange={(e) =>
                                                    setWorkingHours((prev) => ({
                                                        ...prev,
                                                        [day]: { ...prev[day], enabled: e.target.checked }
                                                    }))
                                                }
                                                className="accent-violet-600"
                                            />
                                            {day}
                                        </label>
                                        <input
                                            type="time"
                                            value={workingHours[day]?.start ?? '09:00'}
                                            disabled={!workingHours[day]?.enabled}
                                            onChange={(e) =>
                                                setWorkingHours((prev) => ({
                                                    ...prev,
                                                    [day]: { ...prev[day], start: e.target.value }
                                                }))
                                            }
                                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                        <input
                                            type="time"
                                            value={workingHours[day]?.end ?? '17:00'}
                                            disabled={!workingHours[day]?.enabled}
                                            onChange={(e) =>
                                                setWorkingHours((prev) => ({
                                                    ...prev,
                                                    [day]: { ...prev[day], end: e.target.value }
                                                }))
                                            }
                                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Saved as JSON automatically.</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                {modal === 'create' ? 'Create' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Assign Services Modal */}
            {modal === 'assign' && (
                <Modal title="Assign Services to Staff" onClose={closeModal}>
                    <form onSubmit={handleAssign} className="space-y-4">
                        <p className="text-sm text-slate-600">Select which services this staff member can perform:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {services.map((sv) => (
                                <label key={sv.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${assignIds.includes(sv.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="checkbox"
                                        checked={assignIds.includes(sv.id)}
                                        onChange={() => toggleService(sv.id)}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{sv.name}</span>
                                    <span className="ml-auto text-xs text-slate-500">${sv.price} · {sv.durationMinutes}m</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                Assign
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </DashboardLayout>
    );
}
