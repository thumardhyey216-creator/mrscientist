import React from 'react';

const StatCard = React.memo(({ label, value, subtext, icon, gradient, trend }) => {
    return (
        <div className="group glass-card p-6 relative overflow-hidden hover-scale transition-all duration-300">
            {/* Background Glow */}
            <div
                className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-xl transition-all duration-500 group-hover:scale-150"
                style={{ background: gradient || 'var(--primary)' }}
            />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                        style={{ background: gradient || 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white' }}
                    >
                        {icon}
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${trend > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                    <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
                </div>

                {subtext && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                        <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-2">
                            {subtext}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;

