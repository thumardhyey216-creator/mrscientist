import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
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

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
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
