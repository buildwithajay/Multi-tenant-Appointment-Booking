import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tenantService } from '../../services/tenantService';
import toast from 'react-hot-toast';
import { UserPlus, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppointlyLogo from '../../components/AppointlyLogo';

const BUSINESS_TYPES = [
    { id: 0, label: 'Salon' },
    { id: 1, label: 'Spa' },
    { id: 2, label: 'Clinic' },
    { id: 3, label: 'Consultancy' },
    { id: 4, label: 'Fitness' },
    { id: 5, label: 'Other' },
];

const PLANS = [
    { id: 0, label: 'Free Starter Plan' },
    { id: 1, label: 'Growth Plan ($29/mo)' },
    { id: 2, label: 'Enterprise Plan ($99/mo)' },
];

export default function RegisterBusinessPage() {
    const PENDING_TENANT_KEY = 'pending_tenant_activation_id';
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const presetPlan = searchParams.get('plan');
    const paymentStatus = searchParams.get('status');
    const paymentTenantId = searchParams.get('tenantId');
    const paymentSessionId = searchParams.get('session_id');

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Business Details
    const [businessForm, setBusinessForm] = useState({
        name: '',
        email: '',
        phone: '',
        businessType: 0,
        subscriptionPlan: presetPlan ? parseInt(presetPlan, 10) : 0,
    });

    // Step 2: Admin Details
    const [adminForm, setAdminForm] = useState({
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const getErrorMessage = (err) => {
        const data = err?.response?.data;
        if (!data) return 'Failed to register business';
        if (typeof data === 'string') return data;
        if (data.message) return data.message;
        if (data.title) return data.title;
        if (data.errors && typeof data.errors === 'object') {
            const firstKey = Object.keys(data.errors)[0];
            const firstError = firstKey ? data.errors[firstKey]?.[0] : null;
            if (firstError) return firstError;
        }
        return 'Failed to register business';
    };

    const isStrongPassword = (password) => {
        if (password.length < 8) return false;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        return hasUpper && hasLower && hasDigit && hasSpecial;
    };

    // Autofill admin email from business email if empty when transitioning to step 2
    useEffect(() => {
        const confirmPayment = async () => {
            if (paymentStatus !== 'paid') return;

            const tenantIdToConfirm = paymentTenantId || localStorage.getItem(PENDING_TENANT_KEY);
            if (!tenantIdToConfirm) {
                toast.success('Payment successful. You can now log in.');
                navigate('/login');
                return;
            }

            try {
                await tenantService.confirmStripePayment(tenantIdToConfirm, paymentSessionId);
                localStorage.removeItem(PENDING_TENANT_KEY);
                toast.success('Payment successful. Your dashboard is now active.');
                navigate('/login');
            } catch (err) {
                toast.error(getErrorMessage(err) || 'Payment verified but activation failed. Please contact support.');
            }
        };

        if (paymentStatus === 'cancelled') {
            toast.error('Payment cancelled. Complete payment to activate your dashboard.');
            return;
        }

        confirmPayment();
    }, [paymentStatus, paymentTenantId, paymentSessionId, navigate]);

    const nextStep = () => {
        if (!businessForm.name || !businessForm.email || !businessForm.phone) {
            toast.error('Please fill in all required business fields');
            return;
        }
        if (!adminForm.adminEmail) {
            setAdminForm(prev => ({ ...prev, adminEmail: businessForm.email }));
        }
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isStrongPassword(adminForm.adminPassword)) {
            toast.error('Password must be at least 8 chars with uppercase, lowercase, number, and special character');
            return;
        }
        if (adminForm.adminPassword !== confirmPassword) {
            toast.error('Password and confirm password do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await tenantService.create({
                ...businessForm,
                ...adminForm
            });
            
            if (res.data?.requiresPayment && res.data?.checkoutUrl) {
                if (res.data?.id) {
                    localStorage.setItem(PENDING_TENANT_KEY, res.data.id);
                }
                toast.success('Redirecting to secure payment...');
                window.location.href = res.data.checkoutUrl;
                return;
            }

            if (res.data?.requiresPayment && !res.data?.checkoutUrl) {
                toast.error('Payment session was created but checkout URL is missing. Please try again.');
                return;
            }

            toast.success('Business registered successfully! Please log in.');
            localStorage.removeItem(PENDING_TENANT_KEY);
            navigate('/login');
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
    const labelStyle = "block text-sm font-semibold text-slate-700 mb-1.5";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors">
                <ArrowLeft size={18} /> Back to home
            </Link>

            <div className="w-full max-w-2xl">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-5">
                        <AppointlyLogo className="h-16 w-auto" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Set up your business</h1>
                    <p className="text-slate-500 mt-2 text-lg">Join Appointly and streamline your operations today.</p>
                </div>

                {/* Custom Progress Bar */}
                <div className="flex items-center justify-center mb-10 gap-4">
                    <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-blue-600 text-white shadow-md' : step === 2 ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
                            {step === 2 ? <CheckCircle2 size={18} /> : 1}
                        </div>
                        <span className="font-semibold text-sm hidden sm:block">Business Info</span>
                    </div>
                    <div className={`w-12 h-1 rounded-full ${step === 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 2 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200'}`}>
                            2
                        </div>
                        <span className="font-semibold text-sm hidden sm:block">Admin Account</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Business Details</h2>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelStyle}>Business Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={businessForm.name}
                                        onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                                        placeholder="E.g., Serenity Spa"
                                        className={inputStyle}
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelStyle}>Business Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={businessForm.email}
                                            onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                                            placeholder="contact@business.com"
                                            className={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Phone Number *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={businessForm.phone}
                                            onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                            className={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelStyle}>Business Type *</label>
                                        <select
                                            value={businessForm.businessType}
                                            onChange={(e) => setBusinessForm({ ...businessForm, businessType: parseInt(e.target.value, 10) })}
                                            className={inputStyle}
                                        >
                                            {BUSINESS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Subscription Plan *</label>
                                        <select
                                            value={businessForm.subscriptionPlan}
                                            onChange={(e) => setBusinessForm({ ...businessForm, subscriptionPlan: parseInt(e.target.value, 10) })}
                                            className={inputStyle}
                                        >
                                            {PLANS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="w-full mt-6 bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md"
                                >
                                    Continue to Admin Setup <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Owner / Admin Account</h2>
                            <div className="space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelStyle}>First Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={adminForm.adminFirstName}
                                            onChange={(e) => setAdminForm({ ...adminForm, adminFirstName: e.target.value })}
                                            className={inputStyle}
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Last Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={adminForm.adminLastName}
                                            onChange={(e) => setAdminForm({ ...adminForm, adminLastName: e.target.value })}
                                            className={inputStyle}
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelStyle}>Admin Login Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={adminForm.adminEmail}
                                        onChange={(e) => setAdminForm({ ...adminForm, adminEmail: e.target.value })}
                                        className={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label className={labelStyle}>Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={adminForm.adminPassword}
                                            onChange={(e) => setAdminForm({ ...adminForm, adminPassword: e.target.value })}
                                            placeholder="Min. 8 chars, uppercase, lowercase, number, special"
                                            className={`${inputStyle} pr-11`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelStyle}>Confirm Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            className={`${inputStyle} pr-11`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((v) => !v)}
                                            className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                                            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <UserPlus size={20} />
                                                {businessForm.subscriptionPlan === 0 ? 'Complete Registration' : 'Checkout'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                <div className="mt-8 text-center text-slate-500 text-sm">
                    Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in here</Link>
                </div>
            </div>
        </div>
    );
}
