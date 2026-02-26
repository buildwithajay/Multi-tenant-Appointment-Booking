import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { bookingService } from '../../services/bookingService';
import { customerService } from '../../services/customerService';
import { publicBookingService } from '../../services/publicBookingService';
import { serviceService } from '../../services/serviceService';
import { staffService } from '../../services/staffService';
import { tenantService } from '../../services/tenantService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Check,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Search,
    Clock3,
    UserRound,
    Briefcase,
    Users,
    DollarSign,
} from 'lucide-react';

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 rounded-lg p-1"><X size={20} /></button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

const toDateTimeLocal = (value) => {
    if (!value) return '';
    const d = new Date(value);
    const pad = (n) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toDateInputValue = (date) => {
    const d = new Date(date);
    const pad = (n) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const buildTimeSlots = (selectedDate, durationMinutes, bookedSlots) => {
    if (!selectedDate || !durationMinutes) return [];

    const slots = [];
    const dayStart = new Date(`${selectedDate}T00:00`);
    const now = new Date();
    const slotStep = 30;
    const businessStart = 9 * 60;
    const businessEnd = 18 * 60;

    for (let minute = businessStart; minute + durationMinutes <= businessEnd; minute += slotStep) {
        const start = new Date(dayStart);
        start.setMinutes(minute, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + durationMinutes);

        const isBooked = bookedSlots.some((b) => {
            const bookedStart = new Date(b.startTime);
            const bookedEnd = new Date(b.endTime);
            return start < bookedEnd && bookedStart < end;
        });

        const isPast = start < now;
        slots.push({
            start,
            end,
            value: toDateTimeLocal(start),
            label: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isBooked,
            isPast,
            isAvailable: !isBooked && !isPast
        });
    }

    return slots;
};

const emptyEdit = {
    customerId: '',
    customerName: '',
    customerEmail: '',
    serviceId: '',
    staffId: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 0,
    paymentStatus: 0
};

const emptyCreate = {
    customerName: '',
    customerEmail: '',
    serviceId: '',
    staffId: '',
    startTime: '',
    notes: ''
};

const bookingStatusOptions = [
    { value: 0, label: 'Pending' },
    { value: 1, label: 'Confirmed' },
    { value: 2, label: 'Completed' },
    { value: 3, label: 'Cancelled' },
    { value: 4, label: 'No Show' }
];

const paymentStatusOptions = [
    { value: 0, label: 'Pending' },
    { value: 1, label: 'Paid' },
    { value: 2, label: 'Failed' },
    { value: 3, label: 'Refunded' }
];

const hours = Array.from({ length: 10 }, (_, i) => 9 + i);

const getWeekStart = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
};

const addDays = (date, amount) => {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d;
};

const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const formatHour = (hour) => {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const normalized = hour % 12 || 12;
    return `${normalized}:00 ${suffix}`;
};

const formatWeekRange = (startDate) => {
    const endDate = addDays(startDate, 6);
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};

const bookingStatusStyles = {
    0: 'bg-amber-50 border-amber-200 text-amber-700',
    1: 'bg-blue-50 border-blue-200 text-blue-700',
    2: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    3: 'bg-rose-50 border-rose-200 text-rose-700',
    4: 'bg-slate-100 border-slate-200 text-slate-600',
};

const parsePublicCustomerNotes = (notes) => {
    if (!notes) return null;
    if (notes.startsWith('PublicBooking|')) {
        const parts = notes.split('|');
        if (parts.length < 5) return null;
        return { fullName: `${parts[1]} ${parts[2]}`.trim() };
    }
    if (notes.startsWith('CustomerProfile|')) {
        const parts = notes.split('|');
        if (parts.length < 4) return null;
        return { fullName: parts[1] };
    }
    return null;
};

export default function BookingsPage() {
    const { isManager } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [editForm, setEditForm] = useState(emptyEdit);
    const [createForm, setCreateForm] = useState(emptyCreate);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
    const [tenantSlug, setTenantSlug] = useState('');
    const [createSelectedDate, setCreateSelectedDate] = useState(toDateInputValue(new Date()));
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availability, setAvailability] = useState(null);
    const [availabilityError, setAvailabilityError] = useState('');

    const availableStaffForEdit = editForm.serviceId
        ? staff.filter((s) => (s.services ?? []).some((srv) => srv.id === parseInt(editForm.serviceId)))
        : staff;

    const availableStaffForCreate = createForm.serviceId
        ? staff.filter((s) => (s.services ?? []).some((srv) => srv.id === parseInt(createForm.serviceId)))
        : staff;

    const load = () => {
        setLoading(true);
        bookingService.getAll()
            .then((r) => {
                setBookings(r.data);
            })
            .catch(() => toast.error('Failed to load bookings'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        customerService.getAll().then((r) => setCustomers(r.data)).catch(() => { });
        serviceService.getAll().then((r) => setServices(r.data)).catch(() => { });
        staffService.getAll().then((r) => setStaff(r.data)).catch(() => { });
        tenantService.getAll().then((r) => setTenantSlug(r.data?.[0]?.slug ?? '')).catch(() => { });
    }, []);

    const openCreate = () => {
        setCreateForm(emptyCreate);
        setCreateSelectedDate(toDateInputValue(new Date()));
        setAvailability(null);
        setAvailabilityError('');
        setModal('create');
    };
    const openEdit = (b) => {
        setSelected(b);
        setEditForm({
            customerId: b.customerId,
            customerName: '',
            customerEmail: '',
            serviceId: b.serviceId,
            staffId: b.staffId,
            startTime: toDateTimeLocal(b.startTime),
            endTime: toDateTimeLocal(b.endTime),
            notes: b.notes ?? '',
            status: b.status,
            paymentStatus: b.paymentStatus
        });
        setModal('edit');
    };
    const closeModal = () => { setModal(null); setSelected(null); };

    const customerNameById = useMemo(() => {
        const map = new Map();
        customers.forEach((c) => {
            const parsed = parsePublicCustomerNotes(c.notes);
            map.set(c.id, c.user?.fullName || parsed?.fullName || `Customer #${c.id}`);
        });
        return map;
    }, [customers]);

    const staffNameById = useMemo(() => {
        const map = new Map();
        staff.forEach((s) => {
            map.set(s.id, s.user?.fullName || `Staff #${s.id}`);
        });
        return map;
    }, [staff]);

    const serviceNameById = useMemo(() => {
        const map = new Map();
        services.forEach((s) => {
            map.set(s.id, s.name);
        });
        return map;
    }, [services]);

    const createSelectedService = useMemo(
        () => services.find((s) => s.id === parseInt(createForm.serviceId)),
        [services, createForm.serviceId]
    );

    const createSelectedStaff = useMemo(
        () => availableStaffForCreate.find((s) => s.id === parseInt(createForm.staffId)),
        [availableStaffForCreate, createForm.staffId]
    );

    const getCustomerName = (booking) =>
        booking.customerName || customerNameById.get(booking.customerId) || `Customer #${booking.customerId}`;
    const getServiceName = (booking) => booking.serviceName || serviceNameById.get(booking.serviceId) || `Service #${booking.serviceId}`;
    const getStaffName = (booking) => booking.staffName || staffNameById.get(booking.staffId) || `Staff #${booking.staffId}`;

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    );

    const weekBookings = useMemo(() => {
        const weekEnd = addDays(weekStart, 7);
        return bookings.filter((b) => {
            const start = new Date(b.startTime);
            return start >= weekStart && start < weekEnd;
        });
    }, [bookings, weekStart]);

    const filteredWeekBookings = useMemo(() => {
        if (!searchTerm.trim()) return weekBookings;
        const q = searchTerm.trim().toLowerCase();
        return weekBookings.filter((b) =>
            `${getCustomerName(b)} ${getServiceName(b)} ${getStaffName(b)}`
                .toLowerCase()
                .includes(q)
        );
    }, [weekBookings, searchTerm, customerNameById, serviceNameById, staffNameById]);

    const bookingsByCell = useMemo(() => {
        const grouped = new Map();
        filteredWeekBookings.forEach((b) => {
            const start = new Date(b.startTime);
            const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1;
            const key = `${dayIndex}-${start.getHours()}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(b);
        });
        return grouped;
    }, [filteredWeekBookings, weekStart]);

    const selectedBooking = useMemo(
        () => bookings.find((b) => b.id === selected?.id) || selected || filteredWeekBookings[0] || null,
        [bookings, selected, filteredWeekBookings]
    );

    useEffect(() => {
        if (modal !== 'create') return;
        if (!tenantSlug || !createForm.serviceId || !createForm.staffId || !createSelectedDate) {
            setAvailability(null);
            setAvailabilityError('');
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError('');
        publicBookingService.getAvailability(tenantSlug, {
            serviceId: parseInt(createForm.serviceId),
            staffId: parseInt(createForm.staffId),
            date: createSelectedDate,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        })
            .then((r) => setAvailability(r.data))
            .catch((err) => {
                setAvailability(null);
                setAvailabilityError(err.response?.data?.message ?? 'Unable to load availability');
            })
            .finally(() => setAvailabilityLoading(false));
    }, [modal, tenantSlug, createForm.serviceId, createForm.staffId, createSelectedDate]);

    useEffect(() => {
        if (modal === 'create') {
            setCreateForm((prev) => ({ ...prev, startTime: '' }));
        }
    }, [modal, createForm.serviceId, createForm.staffId, createSelectedDate]);

    const createSlots = useMemo(() => {
        const bookedSlots = availability?.date === createSelectedDate ? (availability?.bookedSlots ?? []) : [];
        return buildTimeSlots(createSelectedDate, createSelectedService?.durationMinutes, bookedSlots);
    }, [createSelectedDate, createSelectedService?.durationMinutes, availability]);

    const now = new Date();
    const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const showNowLine = isSameDay(now, weekDays[currentDayIndex]) && hours.includes(now.getHours());
    const nowTop = ((now.getHours() - hours[0]) * 80) + ((now.getMinutes() / 60) * 80);

    const goToPreviousWeek = () => setWeekStart((prev) => addDays(prev, -7));
    const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
    const goToCurrentWeek = () => setWeekStart(getWeekStart(new Date()));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modal === 'create') {
                if (!createForm.serviceId || !createForm.staffId) {
                    toast.error('Please select service and staff');
                    return;
                }
                if (!createForm.startTime) {
                    toast.error('Please choose an available time slot');
                    return;
                }

                await bookingService.create({
                    customerId: null,
                    customerName: createForm.customerName.trim() || null,
                    customerEmail: createForm.customerEmail.trim() || null,
                    serviceId: parseInt(createForm.serviceId),
                    staffId: parseInt(createForm.staffId),
                    startTime: new Date(createForm.startTime).toISOString(),
                    notes: createForm.notes.trim() || null
                });
                toast.success('Booking created!');
            } else {
                if (!editForm.customerId || !editForm.serviceId || !editForm.staffId) {
                    toast.error('Please select customer, service and staff');
                    return;
                }

                await bookingService.update(selected.id, {
                    customerId: parseInt(editForm.customerId),
                    serviceId: parseInt(editForm.serviceId),
                    staffId: parseInt(editForm.staffId),
                    startTime: new Date(editForm.startTime).toISOString(),
                    endTime: editForm.endTime ? new Date(editForm.endTime).toISOString() : null,
                    status: parseInt(editForm.status),
                    paymentStatus: parseInt(editForm.paymentStatus),
                    notes: editForm.notes
                });
                toast.success('Booking updated!');
            }
            closeModal();
            load();
        } catch (err) {
            const apiMessage = err.response?.data?.message;
            const modelErrors = err.response?.data?.errors;
            if (modelErrors && typeof modelErrors === 'object') {
                const firstError = Object.values(modelErrors).flat()?.[0];
                toast.error(firstError ?? apiMessage ?? 'Error saving booking');
            } else {
                toast.error(apiMessage ?? 'Error saving booking');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this booking?')) return;
        try {
            await bookingService.delete(id);
            toast.success('Booking deleted');
            load();
        } catch {
            toast.error('Failed to delete booking');
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage weekly appointments and scheduling</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search bookings..."
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {isManager() && (
                        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20">
                            <Plus size={16} /> New Booking
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6">
                <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">{formatWeekRange(weekStart)}</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={goToPreviousWeek} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={goToCurrentWeek} className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100">
                                Today
                            </button>
                            <button onClick={goToNextWeek} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-auto">
                        <div className="min-w-[900px]">
                            <div
                                className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200"
                                style={{ display: 'grid', gridTemplateColumns: '88px repeat(7, minmax(0, 1fr))' }}
                            >
                                <div className="p-3 border-r border-slate-200" />
                                {weekDays.map((day, idx) => {
                                    const isToday = isSameDay(day, new Date());
                                    return (
                                        <div key={idx} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                                            <p className={`text-[11px] font-semibold uppercase ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </p>
                                            <p className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>
                                                {day.getDate()}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                                    </div>
                                )}
                                {showNowLine && (
                                    <div
                                        className="absolute z-10 h-px bg-rose-500 pointer-events-none"
                                        style={{
                                            top: `${nowTop}px`,
                                            left: `calc(88px + (${currentDayIndex} * ((100% - 88px) / 7)))`,
                                            width: 'calc((100% - 88px) / 7)',
                                        }}
                                    />
                                )}
                                {hours.map((hour) => (
                                    <div
                                        key={hour}
                                        className="border-b border-slate-200"
                                        style={{ display: 'grid', gridTemplateColumns: '88px repeat(7, minmax(0, 1fr))' }}
                                    >
                                        <div className="h-20 px-2 py-2 border-r border-slate-200 text-[11px] font-semibold text-slate-400">
                                            {formatHour(hour)}
                                        </div>
                                        {weekDays.map((_, dayIndex) => {
                                            const key = `${dayIndex}-${hour}`;
                                            const cellBookings = bookingsByCell.get(key) || [];
                                            return (
                                                <div key={key} className="h-20 border-r border-slate-200 last:border-r-0 p-1 space-y-1 overflow-hidden">
                                                    {cellBookings.map((booking) => (
                                                        <button
                                                            key={booking.id}
                                                            onClick={() => setSelected(booking)}
                                                            className={`w-full text-left rounded-lg border px-2 py-1.5 transition-colors ${bookingStatusStyles[booking.status] || 'bg-slate-50 border-slate-200 text-slate-700'} ${selectedBooking?.id === booking.id ? 'ring-2 ring-blue-300' : ''}`}
                                                        >
                                                            <p className="text-[10px] font-bold uppercase leading-none">
                                                                {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            <p className="text-xs font-semibold truncate mt-1">{getCustomerName(booking)}</p>
                                                            <p className="text-[10px] truncate">{getServiceName(booking)}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="bg-white rounded-2xl border border-slate-200 p-5 h-fit xl:sticky xl:top-6">
                    <h3 className="text-base font-semibold text-slate-900 mb-4">Booking Details</h3>
                    {!selectedBooking ? (
                        <div className="text-center py-10">
                            <div className="bg-slate-100 rounded-2xl p-5 inline-flex mb-4">
                                <CalendarDays size={24} className="text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">Select a booking to view details.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-lg font-semibold text-slate-900">{getCustomerName(selectedBooking)}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {bookingStatusOptions.find((x) => x.value === selectedBooking.status)?.label || 'Status'}
                                </p>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Briefcase size={15} className="text-blue-600" />
                                    <span>{getServiceName(selectedBooking)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Users size={15} className="text-blue-600" />
                                    <span>{getStaffName(selectedBooking)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Clock3 size={15} className="text-blue-600" />
                                    <span>{new Date(selectedBooking.startTime).toLocaleString()}</span>
                                </div>
                                {selectedBooking.endTime && (
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Clock3 size={15} className="text-blue-600" />
                                        <span>Ends {new Date(selectedBooking.endTime).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-700">
                                    <UserRound size={15} className="text-blue-600" />
                                    <span>{paymentStatusOptions.find((x) => x.value === selectedBooking.paymentStatus)?.label || 'Payment Pending'}</span>
                                </div>
                            </div>

                            {selectedBooking.notes && (
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                    <p className="text-[11px] font-semibold uppercase text-slate-500 mb-1">Notes</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-line">{selectedBooking.notes}</p>
                                </div>
                            )}

                            {isManager() && (
                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={() => openEdit(selectedBooking)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700"
                                    >
                                        <Pencil size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedBooking.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </aside>
            </div>

            {modal && (
                <Modal title={modal === 'create' ? 'Add Booking' : 'Edit Booking'} onClose={closeModal}>
                    {modal === 'create' ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                                    <input
                                        required
                                        value={createForm.customerName}
                                        onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={createForm.customerEmail}
                                        onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                                    <select
                                        required
                                        value={createForm.serviceId}
                                        onChange={(e) => setCreateForm({ ...createForm, serviceId: e.target.value, staffId: '' })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select service</option>
                                        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Staff</label>
                                    <select
                                        required
                                        value={createForm.staffId}
                                        onChange={(e) => setCreateForm({ ...createForm, staffId: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select staff</option>
                                        {availableStaffForCreate.map((s) => <option key={s.id} value={s.id}>{s.user?.fullName || `Staff #${s.id}`}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <label className="text-sm font-medium text-slate-700">Choose Date</label>
                                    <input
                                        type="date"
                                        value={createSelectedDate}
                                        min={toDateInputValue(new Date())}
                                        onChange={(e) => setCreateSelectedDate(e.target.value)}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {!createSelectedService || !createSelectedStaff ? (
                                    <p className="text-sm text-slate-500">Select service and staff to view availability.</p>
                                ) : availabilityLoading ? (
                                    <p className="text-sm text-slate-500">Loading available slots...</p>
                                ) : (
                                    <>
                                        {availabilityError && (
                                            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                <p className="text-sm text-amber-700">{availabilityError}</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 mb-3">Blue = available, Red = booked, Gray = past.</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {createSlots.map((slot) => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    disabled={!slot.isAvailable}
                                                    onClick={() => setCreateForm((prev) => ({ ...prev, startTime: slot.value }))}
                                                    className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                                                        createForm.startTime === slot.value
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : slot.isBooked
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-not-allowed'
                                                                : slot.isPast
                                                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                    }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {createSelectedService && (
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                                    <p className="text-xs uppercase text-slate-500 font-semibold mb-2">Selected Service</p>
                                    <div className="space-y-1 text-sm text-slate-700">
                                        <p className="font-medium">{createSelectedService.name}</p>
                                        <p className="flex items-center gap-2"><Clock3 size={14} className="text-blue-600" /> {createSelectedService.durationMinutes} minutes</p>
                                        <p className="flex items-center gap-2"><DollarSign size={14} className="text-emerald-600" /> ${createSelectedService.price}</p>
                                        {createSelectedStaff && <p className="flex items-center gap-2"><UserRound size={14} className="text-blue-600" /> {createSelectedStaff.user?.fullName || `Staff #${createSelectedStaff.id}`}</p>}
                                    </div>
                                </div>
                            )}

                            {createForm.startTime && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                    <p className="text-xs uppercase text-blue-700 font-semibold mb-2">Selected Time</p>
                                    <p className="text-sm text-blue-900 flex items-center gap-2">
                                        <CalendarDays size={14} />
                                        {new Date(createForm.startTime).toLocaleString()}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea
                                    rows={3}
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Booking notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                    Create Booking
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                                    <select
                                        required
                                        value={editForm.customerId}
                                        onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select</option>
                                        {customers.map((c) => {
                                            const parsed = parsePublicCustomerNotes(c.notes);
                                            return <option key={c.id} value={c.id}>{c.user?.fullName || parsed?.fullName || `Customer #${c.id}`}</option>;
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                                    <select
                                        required
                                        value={editForm.serviceId}
                                        onChange={(e) => setEditForm({ ...editForm, serviceId: e.target.value, staffId: '' })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select</option>
                                        {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Staff</label>
                                    <select
                                        required
                                        value={editForm.staffId}
                                        onChange={(e) => setEditForm({ ...editForm, staffId: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select</option>
                                        {availableStaffForEdit.map((s) => <option key={s.id} value={s.id}>{s.user?.fullName || `Staff #${s.id}`}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={editForm.startTime}
                                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.endTime}
                                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Booking Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {bookingStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                                    <select
                                        value={editForm.paymentStatus}
                                        onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {paymentStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea
                                    rows={3}
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Booking notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-medium flex items-center gap-2">
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
                                    Save changes
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>
            )}
        </DashboardLayout>
    );
}
