import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, DollarSign, Store, UserRound, CheckCircle2 } from 'lucide-react';
import { publicBookingService } from '../../services/publicBookingService';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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

function getTenantSlugFromHost() {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('.localhost')) {
        const parts = host.split('.');
        if (parts.length >= 2 && parts[0] && parts[0] !== 'www') {
            return parts[0];
        }
    }
    return null;
}

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

export default function TenantHomePage() {
    const { tenantSlug } = useParams();
    const [slug, setSlug] = useState(null);
    const [catalog, setCatalog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [confirmation, setConfirmation] = useState(null);
    const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
    const [availability, setAvailability] = useState(null);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityError, setAvailabilityError] = useState(false);
    const [availabilityErrorMessage, setAvailabilityErrorMessage] = useState('');

    useEffect(() => {
        const resolvedSlug = tenantSlug || getTenantSlugFromHost();
        setSlug(resolvedSlug);
        if (!resolvedSlug) {
            setLoading(false);
            return;
        }

        publicBookingService.getCatalog(resolvedSlug)
            .then((r) => setCatalog(r.data))
            .catch((err) => toast.error(err.response?.data?.message ?? 'Failed to load tenant booking page'))
            .finally(() => setLoading(false));
    }, [tenantSlug]);

    const availableStaff = useMemo(() => {
        if (!catalog || !form.serviceId) return catalog?.staff ?? [];
        const serviceId = parseInt(form.serviceId);
        return (catalog.staff ?? []).filter((s) => (s.serviceIds ?? []).includes(serviceId));
    }, [catalog, form.serviceId]);

    const selectedService = useMemo(() => {
        if (!catalog || !form.serviceId) return null;
        return catalog.services.find((s) => s.id === parseInt(form.serviceId));
    }, [catalog, form.serviceId]);

    const selectedStaff = useMemo(() => {
        if (!form.staffId) return null;
        return availableStaff.find((s) => s.id === parseInt(form.staffId)) ?? null;
    }, [availableStaff, form.staffId]);

    useEffect(() => {
        if (!slug || !form.serviceId || !form.staffId || !selectedDate) {
            setAvailability(null);
            setAvailabilityError(false);
            setAvailabilityErrorMessage('');
            return;
        }

        setAvailabilityLoading(true);
        setAvailabilityError(false);
        setAvailabilityErrorMessage('');
        publicBookingService.getAvailability(slug, {
            serviceId: parseInt(form.serviceId),
            staffId: parseInt(form.staffId),
            date: selectedDate,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        })
            .then((r) => {
                setAvailability(r.data);
            })
            .catch((err) => {
                setAvailability(null);
                setAvailabilityError(true);
                const status = err.response?.status;
                const apiMessage =
                    err.response?.data?.message ||
                    err.response?.data?.title ||
                    (typeof err.response?.data === 'string' ? err.response.data : null);
                const message =
                    apiMessage ||
                    (status === 404 ? 'Availability route is missing on API. Verify backend is running on latest code and slug is correct.' : null) ||
                    err.message ||
                    'Failed to load availability';
                setAvailabilityErrorMessage(message);
            })
            .finally(() => setAvailabilityLoading(false));
    }, [slug, form.serviceId, form.staffId, selectedDate]);

    useEffect(() => {
        setForm((prev) => ({ ...prev, startTime: '' }));
    }, [form.serviceId, form.staffId, selectedDate]);

    const slots = useMemo(
        () => {
            const bookedSlots = availability?.date === selectedDate
                ? (availability?.bookedSlots ?? [])
                : [];
            return buildTimeSlots(selectedDate, selectedService?.durationMinutes, bookedSlots);
        },
        [selectedDate, selectedService?.durationMinutes, availability]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!slug) {
            toast.error('Invalid tenant site URL');
            return;
        }

        if (!form.startTime) {
            toast.error('Please choose an available time slot');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || null,
                serviceId: parseInt(form.serviceId),
                staffId: parseInt(form.staffId),
                startTime: new Date(form.startTime).toISOString(),
                notes: form.notes.trim() || null
            };
            const res = await publicBookingService.createBooking(slug, payload);
            setConfirmation(res.data);
            setForm(emptyForm);
            setAvailability(null);
            setSelectedDate(toDateInputValue(new Date()));
            toast.success('Appointment booked successfully');
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to book appointment');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">Loading tenant page...</div>;
    }

    if (!slug) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 text-center">
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Tenant Site URL Not Found</h1>
                    <p className="text-slate-600">
                        Open using a tenant subdomain, for example:
                        <br />
                        <span className="font-mono text-sm">http://localhost:5173/tenant-slug</span>
                    </p>
                </div>
            </div>
        );
    }

    if (!catalog) {
        return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">Tenant site not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-700 p-2 rounded-xl"><Store size={20} /></div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{catalog.tenantName}</h1>
                        <p className="text-sm text-slate-500">{catalog.description || 'Book your appointment online'}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Book an Appointment</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value, staffId: '' })} className="border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select service</option>
                                {(catalog.services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select staff</option>
                                {(availableStaff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                                            <p className="text-sm text-amber-700">
                                                {availabilityErrorMessage || 'Live availability could not be loaded. Showing standard time slots; final conflict check happens during booking.'}
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 mb-3">
                                        Blue = available, Red = booked, Gray = past.
                                    </p>
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
                            {saving ? 'Booking...' : 'Book Appointment'}
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
                                {selectedStaff && <p className="flex items-center gap-2"><UserRound size={14} className="text-blue-600" /> {selectedStaff.name}</p>}
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
                                <CheckCircle2 size={16} /> Booking Confirmed
                            </h3>
                            <p className="text-sm text-emerald-900">Booking ID: #{confirmation.bookingId}</p>
                            <p className="text-sm text-emerald-900 flex items-center gap-2 mt-1"><CalendarDays size={14} /> {new Date(confirmation.startTime).toLocaleString()}</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
