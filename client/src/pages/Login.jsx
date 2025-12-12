import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { initializeUser } from '../services/api';
import { Mail, Lock, Loader2, AlertCircle, Phone, MessageSquare } from 'lucide-react';

const Login = () => {
    const [mode, setMode] = useState('email'); // 'email' | 'phone'
    
    // Email State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Phone State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { signIn, signInWithGoogle, signInWithOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { user } = await signIn(email, password);
            if (user) {
                try {
                    await initializeUser(user.id);
                } catch (initErr) {
                    console.error('Failed to initialize data:', initErr);
                }
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!otpSent) {
                // Send OTP
                await signInWithOtp(phone);
                setOtpSent(true);
            } else {
                // Verify OTP
                const { user } = await verifyOtp(phone, otp);
                if (user) {
                    try {
                        await initializeUser(user.id);
                    } catch (initErr) {
                        console.error('Failed to initialize data:', initErr);
                    }
                }
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
            <div className="w-full max-w-md space-y-8 glass-card p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-[var(--text-secondary)]">Sign in to your dashboard</p>
                </div>

                {/* Mode Switcher */}
                <div className="flex p-1 bg-[var(--bg-secondary)] rounded-lg">
                    <button
                        onClick={() => { setMode('email'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'email' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Email
                    </button>
                    <button
                        onClick={() => { setMode('phone'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'phone' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Phone
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {mode === 'email' ? (
                    <form onSubmit={handleEmailLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
                                <input
                                    type="email"
                                    required
                                    placeholder="Email address"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
                                <input
                                    type="password"
                                    required
                                    placeholder="Password"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handlePhoneSubmit} className="space-y-6">
                        <div className="space-y-4">
                            {!otpSent ? (
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
                                    <input
                                        type="tel"
                                        required
                                        placeholder="Phone Number (e.g. +919876543210)"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={20} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter OTP"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (otpSent ? 'Verify OTP' : 'Send OTP')}
                        </button>
                    </form>
                )}

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-[var(--border-primary)]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[var(--bg-primary)] px-2 text-[var(--text-tertiary)]">Or continue with</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-[var(--bg-secondary)] hover:bg-[var(--hover-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Google
                </button>

                <p className="text-center text-sm text-[var(--text-secondary)]">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-[var(--primary)] hover:underline font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
