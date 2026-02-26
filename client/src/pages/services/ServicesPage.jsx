import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { serviceService } from '../../services/serviceService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Check,
    Search,
    SlidersHorizontal,
    ArrowUpDown,
    BriefcaseMedical,
    Sparkles,
    Activity,
    Clock3,
    DollarSign,
    Info,
    TrendingUp,
    RefreshCcw,
} from 'lucide-react';

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

const empty = { name: '', description: '', price: '', durationMinutes: '', category: '' };

const categoryIcon = {
    wellness: BriefcaseMedical,
    therapy: Sparkles,
    maintenance: Activity,
};

const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'duration', label: 'Duration' },
];

export default function ServicesPage() {
    const { isManager } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');

    const load = () => {
        setLoading(true);
        serviceService.getAll()
            .then((r) => setServices(r.data))
            .catch(() => toast.error('Failed to load services'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const openCreate = () => { setForm(empty); setModal('create'); };
    const openEdit = (service) => {
        setSelected(service);
        setForm({
            name: service.name,
            description: service.description ?? '',
            price: service.price,
            durationMinutes: service.durationMinutes,
            category: service.category ?? ''
        });
        setModal('edit');
    };
    const closeModal = () => { setModal(null); setSelected(null); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: parseFloat(form.price),
                durationMinutes: parseInt(form.durationMinutes, 10)
            };

            if (modal === 'create') {
                await serviceService.create(payload);
                toast.success('Service created!');
            } else {
                await serviceService.update(selected.id, payload);
                toast.success('Service updated!');
            }
            closeModal();
            load();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Error saving service');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this service?')) return;
        try {
            await serviceService.delete(id);
            toast.success('Service deleted');
            load();
        } catch {
            toast.error('Failed to delete service');
        }
    };

    const filteredServices = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const filtered = services.filter((service) => {
            const matchesSearch = !q || `${service.name} ${service.category ?? ''}`.toLowerCase().includes(q);
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'active' && service.isActive)
                || (statusFilter === 'inactive' && !service.isActive);
            return matchesSearch && matchesStatus;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'price') return Number(b.price) - Number(a.price);
            if (sortBy === 'duration') return Number(b.durationMinutes) - Number(a.durationMinutes);
            return a.name.localeCompare(b.name);
        });
    }, [services, searchTerm, statusFilter, sortBy]);

    const topService = useMemo(() => {
        if (filteredServices.length === 0) return null;
        return [...filteredServices].sort((a, b) => Number(b.price) - Number(a.price))[0];
    }, [filteredServices]);

    const formFields = [
        { key: 'name', label: 'Service Name', type: 'text', placeholder: 'e.g. Haircut', required: true },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Short description...', required: false },
        { key: 'price', label: 'Price ($)', type: 'number', placeholder: '0.00', required: true },
        { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number', placeholder: '30', required: true },
        { key: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Hair', required: false },
    ];

    return (
        <DashboardLayout>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 md:px-8 py-6 border-b border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Services & Resources</h2>
                            <p className="text-slate-500 text-sm mt-1">Manage your business offerings, staff members, and equipment.</p>
                        </div>
                        {isManager() && (
                            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm inline-flex items-center gap-2 shadow-sm">
                                <Plus size={18} /> Add Service
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-8 mt-7 border-b border-slate-100">
                        <span className="border-b-2 border-blue-600 pb-3 text-sm font-bold text-slate-900">Services</span>
                        <span className="pb-3 text-sm font-medium text-slate-400">Staff</span>
                        <span className="pb-3 text-sm font-medium text-slate-400">Resources</span>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white">
                            <div className="relative w-full md:w-96">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search services by name or category"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 rounded-lg border border-slate-200">
                                    <SlidersHorizontal size={16} />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="bg-transparent focus:outline-none"
                                    >
                                        <option value="all">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 rounded-lg border border-slate-200">
                                    <ArrowUpDown size={16} />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-transparent focus:outline-none"
                                    >
                                        {sortOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[760px]">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        {isManager() && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={isManager() ? 6 : 5} className="px-6 py-4">
                                                    <div className="h-10 rounded bg-slate-100 animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredServices.length === 0 ? (
                                        <tr>
                                            <td colSpan={isManager() ? 6 : 5} className="px-6 py-10 text-center text-sm text-slate-500">
                                                No services found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredServices.map((service) => {
                                            const category = (service.category ?? 'General').trim();
                                            const lowerCategory = category.toLowerCase();
                                            const Icon = categoryIcon[lowerCategory] || BriefcaseMedical;
                                            return (
                                                <tr key={service.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                <Icon size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                                                                <p className="text-xs text-slate-500">{service.description || 'No description'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 uppercase">
                                                            {category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock3 size={14} /> {service.durationMinutes} mins
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                                        <span className="inline-flex items-center gap-1">
                                                            <DollarSign size={14} className="text-emerald-600" />{Number(service.price).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${service.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${service.isActive ? 'bg-blue-600' : 'bg-slate-400'}`} />
                                                            {service.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    {isManager() && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <button
                                                                    onClick={() => openEdit(service)}
                                                                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700"
                                                                >
                                                                    <Pencil size={13} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(service.id)}
                                                                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700"
                                                                >
                                                                    <Trash2 size={13} /> Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-medium tracking-wide">Showing {filteredServices.length} services</p>
                            <button onClick={load} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600">
                                <RefreshCcw size={14} /> Refresh
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3 text-blue-700 mb-2">
                                <Info size={17} />
                                <h4 className="font-bold text-sm">Pro Tip</h4>
                            </div>
                            <p className="text-xs text-blue-700/80 leading-relaxed font-medium">Group similar services by category to make public booking faster.</p>
                        </div>
                        <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 text-slate-600 mb-2">
                                <TrendingUp size={17} />
                                <h4 className="font-bold text-sm">Highest Value</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {topService ? `${topService.name} is currently the highest priced service.` : 'Add services to view top performers.'}
                            </p>
                        </div>
                        <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 text-slate-600 mb-2">
                                <Activity size={17} />
                                <h4 className="font-bold text-sm">Catalog Health</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {services.filter((s) => s.isActive).length} active of {services.length} total services.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {modal && (
                <Modal title={modal === 'create' ? 'Add New Service' : 'Edit Service'} onClose={closeModal}>
                    <form onSubmit={handleSave} className="space-y-4">
                        {formFields.map(({ key, label, type, placeholder, required }) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                                {type === 'textarea' ? (
                                    <textarea
                                        value={form[key]}
                                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                        placeholder={placeholder}
                                        rows={3}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                ) : (
                                    <input
                                        type={type}
                                        required={required}
                                        value={form[key]}
                                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                        placeholder={placeholder}
                                        step={type === 'number' ? '0.01' : undefined}
                                        min={type === 'number' ? '0' : undefined}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                            </div>
                        ))}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
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
