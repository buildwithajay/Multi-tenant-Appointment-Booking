import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { bookingService } from '../../services/bookingService';
import { serviceService } from '../../services/serviceService';
import { staffService } from '../../services/staffService';
import toast from 'react-hot-toast';
import {
    CalendarDays,
    Search,
    RefreshCw,
    Download,
    TrendingUp,
    TrendingDown,
    Briefcase,
    DollarSign,
    UserX,
    Gauge,
} from 'lucide-react';

const bookingStatus = {
    Pending: 0,
    Confirmed: 1,
    Completed: 2,
    Cancelled: 3,
    NoShow: 4,
};

const formatMoney = (value) => `$${value.toFixed(2)}`;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const dateToLabel = (date) =>
    date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }).toUpperCase();

const getStaffName = (member) =>
    member.user?.fullName ||
    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ') ||
    member.name ||
    `Staff #${member.id}`;

function getRangeByPreset(preset) {
    const today = new Date();
    const end = startOfDay(today);

    if (preset === 'quarter') {
        return { start: addDays(end, -89), end };
    }
    if (preset === 'ytd') {
        return { start: new Date(end.getFullYear(), 0, 1), end };
    }
    return { start: addDays(end, -29), end };
}

function buildSeries(rangeStart, rangeEnd, valueByDate) {
    const points = [];
    const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1);
    const step = Math.max(1, Math.floor(totalDays / 8));

    for (let i = 0; i < totalDays; i += step) {
        const d = addDays(rangeStart, i);
        const key = d.toISOString().slice(0, 10);
        points.push({ date: d, value: valueByDate.get(key) ?? 0 });
    }

    const lastKey = rangeEnd.toISOString().slice(0, 10);
    if (points.length === 0 || points[points.length - 1].date.toISOString().slice(0, 10) !== lastKey) {
        points.push({ date: rangeEnd, value: valueByDate.get(lastKey) ?? 0 });
    }
    return points;
}

function buildPath(points, width, height, maxY) {
    if (!points.length) return '';
    const safeMax = Math.max(1, maxY);
    return points
        .map((p, i) => {
            const x = (i / (points.length - 1 || 1)) * width;
            const y = height - (p.value / safeMax) * height;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}

function KpiCard({ title, value, delta, deltaPositive, icon: Icon, iconBg }) {
    return (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon size={18} />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${deltaPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                    {deltaPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {Math.abs(delta).toFixed(1)}%
                </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{title}</p>
            <h3 className="text-3xl font-bold mt-1 text-slate-900">{value}</h3>
        </div>
    );
}

export default function AnalyticsPage() {
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [preset, setPreset] = useState('30d');

    const loadData = () => {
        setLoading(true);
        Promise.all([bookingService.getAll(), serviceService.getAll(), staffService.getAll()])
            .then(([bookingRes, serviceRes, staffRes]) => {
                setBookings(bookingRes.data ?? []);
                setServices(serviceRes.data ?? []);
                setStaff(staffRes.data ?? []);
            })
            .catch(() => toast.error('Failed to load analytics data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const serviceMap = useMemo(() => {
        const map = new Map();
        services.forEach((s) => map.set(s.id, s));
        return map;
    }, [services]);

    const { start: rangeStart, end: rangeEnd } = useMemo(() => getRangeByPreset(preset), [preset]);
    const prevRangeEnd = addDays(rangeStart, -1);
    const prevRangeStart = addDays(prevRangeEnd, -Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)));

    const inRange = (value, start, end) => {
        const d = startOfDay(new Date(value));
        return d >= start && d <= end;
    };

    const filteredBookings = useMemo(() => {
        const base = bookings.filter((b) => inRange(b.startTime, rangeStart, rangeEnd));
        if (!search.trim()) return base;
        const query = search.toLowerCase().trim();
        return base.filter((b) => {
            const serviceName = serviceMap.get(b.serviceId)?.name ?? '';
            return `${serviceName} ${b.customerName ?? ''} ${b.staffName ?? ''}`.toLowerCase().includes(query);
        });
    }, [bookings, rangeStart, rangeEnd, search, serviceMap]);

    const prevBookings = useMemo(
        () => bookings.filter((b) => inRange(b.startTime, prevRangeStart, prevRangeEnd)),
        [bookings, prevRangeStart, prevRangeEnd]
    );

    const metrics = useMemo(() => {
        const revenueOf = (list) =>
            list
                .filter((b) => b.status !== bookingStatus.Cancelled)
                .reduce((sum, b) => sum + (Number(serviceMap.get(b.serviceId)?.price) || 0), 0);

        const currentRevenue = revenueOf(filteredBookings);
        const previousRevenue = revenueOf(prevBookings);
        const currentBookings = filteredBookings.filter((b) => b.status !== bookingStatus.Cancelled).length;
        const previousBookings = prevBookings.filter((b) => b.status !== bookingStatus.Cancelled).length;
        const currentNoShowRate = filteredBookings.length
            ? (filteredBookings.filter((b) => b.status === bookingStatus.NoShow).length / filteredBookings.length) * 100
            : 0;
        const previousNoShowRate = prevBookings.length
            ? (prevBookings.filter((b) => b.status === bookingStatus.NoShow).length / prevBookings.length) * 100
            : 0;
        const currentAvg = currentBookings ? currentRevenue / currentBookings : 0;
        const previousAvg = previousBookings ? previousRevenue / previousBookings : 0;

        const diffPercent = (current, previous) => {
            if (!previous && !current) return 0;
            if (!previous) return 100;
            return ((current - previous) / previous) * 100;
        };

        return {
            currentRevenue,
            currentBookings,
            currentNoShowRate,
            currentAvg,
            bookingsDelta: diffPercent(currentBookings, previousBookings),
            revenueDelta: diffPercent(currentRevenue, previousRevenue),
            noShowDelta: diffPercent(currentNoShowRate, previousNoShowRate),
            avgDelta: diffPercent(currentAvg, previousAvg),
        };
    }, [filteredBookings, prevBookings, serviceMap]);

    const revenueSeries = useMemo(() => {
        const dailyValue = new Map();
        filteredBookings
            .filter((b) => b.status !== bookingStatus.Cancelled)
            .forEach((b) => {
                const key = startOfDay(new Date(b.startTime)).toISOString().slice(0, 10);
                const current = dailyValue.get(key) ?? 0;
                dailyValue.set(key, current + (Number(serviceMap.get(b.serviceId)?.price) || 0));
            });

        const prevDaily = new Map();
        prevBookings
            .filter((b) => b.status !== bookingStatus.Cancelled)
            .forEach((b) => {
                const key = startOfDay(new Date(b.startTime)).toISOString().slice(0, 10);
                const current = prevDaily.get(key) ?? 0;
                prevDaily.set(key, current + (Number(serviceMap.get(b.serviceId)?.price) || 0));
            });

        const currentSeries = buildSeries(rangeStart, rangeEnd, dailyValue);
        const previousSeries = buildSeries(prevRangeStart, prevRangeEnd, prevDaily);
        const maxY = Math.max(
            1,
            ...currentSeries.map((p) => p.value),
            ...previousSeries.map((p) => p.value)
        );

        return {
            currentSeries,
            previousSeries,
            maxY,
            currentPath: buildPath(currentSeries, 800, 220, maxY),
            previousPath: buildPath(previousSeries, 800, 220, maxY),
        };
    }, [filteredBookings, prevBookings, serviceMap, rangeStart, rangeEnd, prevRangeStart, prevRangeEnd]);

    const serviceBreakdown = useMemo(() => {
        const counts = new Map();
        filteredBookings.forEach((b) => {
            if (b.status === bookingStatus.Cancelled) return;
            counts.set(b.serviceId, (counts.get(b.serviceId) ?? 0) + 1);
        });

        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        const palette = ['#2563eb', '#06b6d4', '#14b8a6', '#f59e0b', '#8b5cf6'];
        const rows = Array.from(counts.entries())
            .map(([serviceId, count], idx) => ({
                serviceId,
                name: serviceMap.get(serviceId)?.name ?? `Service #${serviceId}`,
                count,
                pct: total ? (count / total) * 100 : 0,
                color: palette[idx % palette.length],
            }))
            .sort((a, b) => b.count - a.count);
        return { rows, total };
    }, [filteredBookings, serviceMap]);

    const donutSegments = useMemo(() => {
        let acc = 0;
        return serviceBreakdown.rows.slice(0, 3).map((row) => {
            const segment = {
                ...row,
                dashArray: `${row.pct} ${100 - row.pct}`,
                dashOffset: -acc,
            };
            acc += row.pct;
            return segment;
        });
    }, [serviceBreakdown.rows]);

    const staffPerformance = useMemo(() => {
        return staff
            .map((member) => {
                const memberBookings = filteredBookings.filter((b) => b.staffId === member.id);
                const completed = memberBookings.filter((b) => b.status === bookingStatus.Completed).length;
                const noShow = memberBookings.filter((b) => b.status === bookingStatus.NoShow).length;
                const effective = memberBookings.filter((b) => b.status !== bookingStatus.Cancelled).length;
                const revenue = memberBookings.reduce(
                    (sum, b) => sum + (Number(serviceMap.get(b.serviceId)?.price) || 0),
                    0
                );
                const successRate = effective ? Math.round((completed / effective) * 100) : 0;
                const efficiency = effective ? Math.round(((completed - noShow) / effective) * 100) : 0;

                return {
                    id: member.id,
                    name: getStaffName(member),
                    role: member.specialization || 'Staff Member',
                    bookings: effective,
                    revenue,
                    successRate,
                    efficiency,
                };
            })
            .sort((a, b) => b.efficiency - a.efficiency || b.revenue - a.revenue);
    }, [staff, filteredBookings, serviceMap]);

    const handleExportReport = () => {
        const summaryRows = [
            ['Metric', 'Value'],
            ['Range Start', rangeStart.toISOString().slice(0, 10)],
            ['Range End', rangeEnd.toISOString().slice(0, 10)],
            ['Total Bookings', metrics.currentBookings],
            ['Gross Revenue', metrics.currentRevenue.toFixed(2)],
            ['No-show Rate (%)', metrics.currentNoShowRate.toFixed(2)],
            ['Avg Booking Value', metrics.currentAvg.toFixed(2)],
            [],
        ];

        const serviceRows = [
            ['Service Breakdown'],
            ['Service', 'Bookings', 'Share (%)'],
            ...serviceBreakdown.rows.map((row) => [row.name, row.count, row.pct.toFixed(2)]),
            [],
        ];

        const staffRows = [
            ['Staff Performance'],
            ['Staff', 'Role', 'Bookings', 'Revenue', 'Success Rate (%)', 'Efficiency (%)'],
            ...staffPerformance.map((row) => [
                row.name,
                row.role,
                row.bookings,
                row.revenue.toFixed(2),
                row.successRate,
                row.efficiency,
            ]),
        ];

        const allRows = [...summaryRows, ...serviceRows, ...staffRows];
        const csv = allRows
            .map((row) =>
                row
                    .map((cell) => {
                        const value = `${cell ?? ''}`.replace(/"/g, '""');
                        return `"${value}"`;
                    })
                    .join(',')
            )
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `analytics-report-${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Report downloaded');
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">Business Analytics & Reports</h1>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="hidden md:flex items-center bg-white border border-slate-200 px-3 py-2 rounded-xl">
                            <Search className="text-slate-400 mr-2" size={16} />
                            <input
                                className="bg-transparent border-none focus:ring-0 text-sm p-0 w-52 placeholder:text-slate-400"
                                placeholder="Search data..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <button onClick={handleExportReport} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-700">
                            <Download size={16} />
                            Export Report
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-xl w-fit shadow-sm">
                        <button onClick={() => setPreset('30d')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg ${preset === '30d' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>Last 30 Days</button>
                        <button onClick={() => setPreset('quarter')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg ${preset === 'quarter' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>Last Quarter</button>
                        <button onClick={() => setPreset('ytd')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg ${preset === 'ytd' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>Year to Date</button>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <CalendarDays size={14} />
                        {dateToLabel(rangeStart)} - {dateToLabel(rangeEnd)}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KpiCard title="Total Bookings" value={metrics.currentBookings} delta={metrics.bookingsDelta} deltaPositive={metrics.bookingsDelta >= 0} icon={Briefcase} iconBg="bg-blue-100 text-blue-700" />
                            <KpiCard title="Gross Revenue" value={formatMoney(metrics.currentRevenue)} delta={metrics.revenueDelta} deltaPositive={metrics.revenueDelta >= 0} icon={DollarSign} iconBg="bg-cyan-100 text-cyan-700" />
                            <KpiCard title="No-show Rate" value={`${metrics.currentNoShowRate.toFixed(1)}%`} delta={metrics.noShowDelta} deltaPositive={metrics.noShowDelta <= 0} icon={UserX} iconBg="bg-amber-100 text-amber-700" />
                            <KpiCard title="Avg. Booking Value" value={formatMoney(metrics.currentAvg)} delta={metrics.avgDelta} deltaPositive={metrics.avgDelta >= 0} icon={Gauge} iconBg="bg-teal-100 text-teal-700" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-5">
                                    <div>
                                        <h4 className="text-base font-bold text-slate-900">Revenue Trend</h4>
                                        <p className="text-xs text-slate-500">Current vs previous period</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-blue-600" />Current</span>
                                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-cyan-500" />Previous</span>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 240">
                                        <line stroke="#e2e8f0" strokeDasharray="4" x1="0" x2="800" y1="40" y2="40" />
                                        <line stroke="#e2e8f0" strokeDasharray="4" x1="0" x2="800" y1="90" y2="90" />
                                        <line stroke="#e2e8f0" strokeDasharray="4" x1="0" x2="800" y1="140" y2="140" />
                                        <line stroke="#e2e8f0" strokeDasharray="4" x1="0" x2="800" y1="190" y2="190" />
                                        <path d={revenueSeries.currentPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                                        <path d={revenueSeries.previousPath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeDasharray="6" />
                                    </svg>
                                </div>
                                <div className="flex justify-between mt-3 px-1">
                                    {revenueSeries.currentSeries.slice(0, 5).map((point) => (
                                        <span key={point.date.toISOString()} className="text-[10px] font-bold text-slate-400">
                                            {dateToLabel(point.date)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h4 className="text-base font-bold text-slate-900 mb-6">Bookings by Service</h4>
                                <div className="relative size-48 mx-auto flex items-center justify-center">
                                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                        {donutSegments.map((segment) => (
                                            <circle
                                                key={segment.serviceId}
                                                cx="18"
                                                cy="18"
                                                r="16"
                                                fill="none"
                                                stroke={segment.color}
                                                strokeWidth="4"
                                                strokeDasharray={segment.dashArray}
                                                strokeDashoffset={segment.dashOffset}
                                            />
                                        ))}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-slate-900">{serviceBreakdown.total}</span>
                                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</span>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-3">
                                    {serviceBreakdown.rows.slice(0, 3).map((row) => (
                                        <div key={row.serviceId} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                                <span className="text-xs font-medium text-slate-600">{row.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-800">{row.pct.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                    {serviceBreakdown.rows.length === 0 && <p className="text-xs text-slate-500">No bookings in selected period.</p>}
                                </div>
                            </div>

                            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-base font-bold text-slate-900">Staff Performance</h4>
                                        <p className="text-xs text-slate-500">Completion rate and revenue by staff member</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                    {staffPerformance.map((row, idx) => (
                                        <div key={row.id} className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-10 rounded-full border-2 flex items-center justify-center text-sm font-bold ${idx % 2 === 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                                                    {row.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{row.name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{row.role}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-slate-400">EFFICIENCY</span>
                                                    <span className="text-blue-700">{row.efficiency}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600" style={{ width: `${row.efficiency}%` }} />
                                                </div>
                                                <div className="flex justify-between mt-2">
                                                    <div className="text-center flex-1 border-r border-slate-100">
                                                        <p className="text-xs font-bold text-slate-900">{row.bookings}</p>
                                                        <p className="text-[9px] text-slate-400 uppercase">Bookings</p>
                                                    </div>
                                                    <div className="text-center flex-1">
                                                        <p className="text-xs font-bold text-slate-900">{formatMoney(row.revenue)}</p>
                                                        <p className="text-[9px] text-slate-400 uppercase">Revenue</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {staffPerformance.length === 0 && (
                                        <p className="text-sm text-slate-500 col-span-full">No staff performance data in selected period.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
