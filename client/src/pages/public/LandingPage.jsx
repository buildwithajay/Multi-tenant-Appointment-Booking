import { Link } from 'react-router-dom';
import { Calendar, Users, Briefcase, CheckCircle2, ArrowRight } from 'lucide-react';
import AppointlyLogo from '../../components/AppointlyLogo';

export default function LandingPage() {
    const plans = [
        {
            name: 'Starter',
            price: 'Free',
            description: 'Perfect for independent professionals just getting started.',
            features: ['Up to 50 bookings/month', '1 Staff Member', 'Basic Calendar', 'Email Support'],
            planId: 0 // Free
        },
        {
            name: 'Growth',
            price: '$29/mo',
            description: 'Ideal for small businesses looking to scale their operations.',
            features: ['Unlimited bookings', 'Up to 5 Staff Members', 'Advanced Analytics', 'Priority Support', 'Custom Branding'],
            planId: 1 // Basic
        },
        {
            name: 'Enterprise',
            price: '$99/mo',
            description: 'For large organizations needing maximum power and control.',
            features: ['Unlimited everything', 'Dedicated Account Manager', 'Custom Integrations', '24/7 Phone Support', 'API Access'],
            planId: 2 // Premium
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AppointlyLogo className="h-12 w-auto" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                            Log in
                        </Link>
                        <Link
                            to="/register-business"
                            className="text-sm font-semibold bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-center mb-6">
                        <AppointlyLogo className="h-20 sm:h-24 w-auto" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                        Manage your bookings <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                            without the headache.
                        </span>
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        The all-in-one platform for salons, clinics, consultants, and service businesses to manage appointments, staff, and clients effortlessly.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/register-business"
                            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                            Start for free <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12 text-center text-slate-900">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 text-blue-600">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
                            <p className="text-slate-600">Say goodbye to double bookings. Our intelligent calendar manages your availability perfectly.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 text-indigo-600">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Staff Management</h3>
                            <p className="text-slate-600">Assign services, set working hours, and manage your entire team from one centralized dashboard.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-6 text-violet-600">
                                <Briefcase size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Business Insights</h3>
                            <p className="text-slate-600">Track your revenue, popular services, and staff performance with real-time analytics.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 bg-slate-50" id="pricing">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
                        <p className="text-lg text-slate-600">Choose the perfect plan for your business size.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {plans.map((plan, i) => (
                            <div
                                key={plan.name}
                                className={`flex flex-col p-8 rounded-3xl bg-white border ${i === 1 ? 'border-blue-500 shadow-2xl shadow-blue-500/10 relative scale-105' : 'border-slate-200 shadow-sm'}`}
                            >
                                {i === 1 && (
                                    <div className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center">
                                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</span>
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                                </div>
                                <p className="text-slate-600 text-sm mb-8 flex-grow">{plan.description}</p>
                                <div className="space-y-4 mb-8">
                                    {plan.features.map(f => (
                                        <div key={f} className="flex items-center gap-3">
                                            <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0" />
                                            <span className="text-slate-700 text-sm font-medium">{f}</span>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    to={`/register-business?plan=${plan.planId}`}
                                    className={`w-full py-3.5 rounded-xl font-bold text-center transition-all ${i === 1
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                        }`}
                                >
                                    Get started
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
                        <AppointlyLogo className="h-10 w-auto" />
                    </div>
                    <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Appointly. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
