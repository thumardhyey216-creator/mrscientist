import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPaymentOrder, verifyPayment, startTrial } from '../services/api';
import { Check, CreditCard, Loader2, ShieldCheck } from 'lucide-react';

const Subscription = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePayment = async () => {
        setLoading(true);
        setError('');

        try {
            // 1. Create Order
            const order = await createPaymentOrder(25000); // 250 Rs (50% Discount)

            // 2. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder', 
                amount: order.amount,
                currency: order.currency,
                name: "MedTutor AI",
                description: "Monthly Subscription (50% OFF)",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        const verifyRes = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            user_id: user.id,
                            amount: 25000 // Send amount to backend for plan confirmation
                        });

                        if (verifyRes.success) {
                            alert('Subscription Activated Successfully! 🎉');
                            navigate('/dashboard');
                        }
                    } catch (err) {
                        console.error("Verification Failed", err);
                        setError('Payment Verification Failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user?.user_metadata?.full_name || '',
                    email: user?.email || '',
                    contact: user?.phone || ''
                },
                theme: {
                    color: "#3B82F6"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response){
                setError(response.error.description);
            });
            rzp1.open();

        } catch (err) {
            console.error("Payment Error", err);
            const msg = err.response?.data?.error || err.message || 'Failed to initiate payment. Try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleTrial = async () => {
        setLoading(true);
        setError('');
        try {
            await startTrial(user.id);
            alert('7-Day Free Trial Activated! 🚀');
            navigate('/dashboard');
        } catch (err) {
            console.error("Trial Error", err);
            const msg = err.response?.data?.error || err.message || 'Failed to start trial.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
            <div className="w-full max-w-lg glass-card p-8 border border-[var(--border-primary)] relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

                <div className="text-center mb-8 relative z-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mb-4">
                        <CreditCard size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Upgrade to Pro</h2>
                    <p className="mt-2 text-[var(--text-secondary)]">Unlock full access to AI Study Planner & Resources</p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-xl p-6 mb-8 border border-[var(--border-primary)] relative z-10">
                    <div className="flex flex-col items-center justify-center mb-6">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-lg text-[var(--text-secondary)] line-through">₹500</span>
                             <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-sm font-medium">50% OFF</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="text-4xl font-bold text-[var(--text-primary)]">₹250</span>
                            <span className="text-[var(--text-secondary)] ml-2">/ month</span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Limited Time Offer for Students</p>
                    </div>

                    <ul className="space-y-4 mb-6">
                        {[
                            "Unlimited AI Study Schedules",
                            "Advanced Revision Tracker",
                            "Priority Topic Analysis",
                            "Secure Cloud Sync",
                            "24/7 AI Tutor Access"
                        ].map((item, idx) => (
                            <li key={idx} className="flex items-center text-[var(--text-primary)]">
                                <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-3 relative z-10">
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full btn btn-primary py-3 text-lg font-semibold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Subscribe Now @ ₹250'}
                    </button>

                    <button
                        onClick={handleTrial}
                        disabled={loading}
                        className="w-full btn bg-transparent border border-[var(--border-primary)] text-[var(--text-primary)] py-3 text-lg font-semibold flex items-center justify-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        Start 7-Day Free Trial
                    </button>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)] relative z-10">
                    <ShieldCheck size={14} />
                    Secure Payment via Razorpay
                </div>
            </div>
        </div>
    );
};

export default Subscription;
