import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, DollarSign, UserRound } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { bookingService } from '../../services/bookingService';
import { publicBookingService } from '../../services/publicBookingService';
import { serviceService } from '../../services/serviceService';
import { staffService } from '../../services/staffService';
import { tenantService } from '../../services/tenantService';

const emptyForm = {
    customerName: '',
    customerEmail: '',
    serviceId: '',
    staffId: '',
    startTime: '',
    notes: ''
};

const toDateInputValue = (date) => {
    const d = new Date(date);
    const pad = (n) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDateTimeLocal = (date) => {
    const d = new Date(date);
    const pad = (n) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function buildTimeSlots(selectedDate, durationMinutes, bookedSlots) {
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
}

export default function AddBookingPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [tenantSlug, setTenantSlug] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availability, setAvailability] = useState(null);
    const [availabilityError, setAvailabilityError] = useState('');
    const [confirmation, setConfirmation] = useState(null);

    useEffect(() => {
        Promise.all([
            serviceService.getAll(),
            staffService.getAll(),
            tenantService.getAll()
        ])
            .then(([servicesRes, staffRes, tenantsRes]) => {
                setServices(servicesRes.data ?? []);
                setStaff(staffRes.data ?? []);
                setTenantSlug(tenantsRes.data?.[0]?.slug ?? '');
            })
            .catch(() => toast.error('Failed to load booking setup data'))
            .finally(() => setLoading(false));
    }, []);

    const selectedService = useMemo(
        () => services.find((s) => s.id === parseInt(form.serviceId)),
        [services, form.serviceId]
    );

    const availableStaff = useMemo(() => {
        if (!form.serviceId) return staff;
        const serviceId = parseInt(form.serviceId);
        return staff.filter((s) => (s.services ?? []).some((srv) => srv.id === serviceId));
    }, [staff, form.serviceId]);

    const selectedStaff = useMemo(
        () => availableStaff.find((s) => s.id === parseInt(form.staffId)),
        [availableStaff, form.staffId]
    );

    useEffect(() => {
        if (!tenantSlug || !form.serviceId || !form.staffId || !selectedDate) {
            setAvailability(null);
            setAvailabilityError('');
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError('');
        publicBookingService.getAvailability(tenantSlug, {
            serviceId: parseInt(form.serviceId),
            staffId: parseInt(form.staffId),
            date: selectedDate,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        })
            .then((r) => setAvailability(r.data))
            .catch((err) => {
                setAvailability(null);
                setAvailabilityError(err.response?.data?.message ?? 'Unable to load availability');
            })
            .finally(() => setAvailabilityLoading(false));
    }, [tenantSlug, form.serviceId, form.staffId, selectedDate]);

    useEffect(() => {
        setForm((prev) => ({ ...prev, startTime: '' }));
    }, [form.serviceId, form.staffId, selectedDate]);

    const slots = useMemo(() => {
        const bookedSlots = availability?.date === selectedDate ? (availability?.bookedSlots ?? []) : [];
        return buildTimeSlots(selectedDate, selectedService?.durationMinutes, bookedSlots);
    }, [selectedDate, selectedService?.durationMinutes, availability]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.startTime) {
            toast.error('Please choose an available time slot');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                customerName: form.customerName.trim(),
                customerEmail: form.customerEmail.trim(),
                serviceId: parseInt(form.serviceId),
                staffId: parseInt(form.staffId),
                startTime: new Date(form.startTime).toISOString(),
                notes: form.notes.trim() || null
            };
            const res = await bookingService.create(payload);
            setConfirmation(res.data);
            toast.success('Booking created successfully');
            setForm(emptyForm);
            setAvailability(null);
            setSelectedDate(toDateInputValue(new Date()));
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to create booking');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="text-slate-500">Loading add booking page...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Add Booking</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Create a booking from dashboard using live availability.</p>
                    </div>
                    <button
                        onClick={() => navigate('/bookings')}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                    >
                        <ArrowLeft size={16} /> Back to Bookings
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking Details</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input required placeholder="Customer full name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <input required type="email" placeholder="Customer email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value, staffId: '' })} className="border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select service</option>
                                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select staff</option>
                                    {availableStaff.map((s) => <option key={s.id} value={s.id}>{s.user?.fullName || `Staff #${s.id}`}</option>)}
                                </select>
                            </div>

                            <div className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <label className="text-sm font-medium text-slate-700">Choose Date</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        min={toDateInputValue(new Date())}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {!selectedService || !selectedStaff ? (
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
                                            {slots.map((slot) => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    disabled={!slot.isAvailable}
                                                    onClick={() => setForm((prev) => ({ ...prev, startTime: slot.value }))}
                                                    className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                                                        form.startTime === slot.value
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

                            <textarea rows={3} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

                            <button type="submit" disabled={saving} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                                {saving ? 'Creating...' : 'Create Booking'}
                            </button>
                        </form>
                    </section>

                    <section className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900 mb-3">Selected Service</h3>
                            {selectedService ? (
                                <div className="space-y-2 text-sm text-slate-700">
                                    <p className="font-medium">{selectedService.name}</p>
                                    <p className="flex items-center gap-2"><Clock3 size={14} className="text-blue-600" /> {selectedService.durationMinutes} minutes</p>
                                    <p className="flex items-center gap-2"><DollarSign size={14} className="text-emerald-600" /> ${selectedService.price}</p>
                                    {selectedStaff && <p className="flex items-center gap-2"><UserRound size={14} className="text-blue-600" /> {selectedStaff.user?.fullName || `Staff #${selectedStaff.id}`}</p>}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Choose a service to see details.</p>
                            )}
                        </div>

                        {form.startTime && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                <h3 className="font-semibold text-blue-800 mb-2">Selected Time</h3>
                                <p className="text-sm text-blue-900 flex items-center gap-2">
                                    <CalendarDays size={14} />
                                    {new Date(form.startTime).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {confirmation && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                                <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Booking Created
                                </h3>
                                <p className="text-sm text-emerald-900">Booking ID: #{confirmation.id || confirmation.bookingId}</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
