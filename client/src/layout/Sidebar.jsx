import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart2,
    Calendar,
    RotateCcw,
    FileText,
    Star,
    Database,
    BookOpen
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/database', label: 'Database', icon: Database },
        { path: '/analytics', label: 'Analytics', icon: BarChart2 },
        { path: '/revision', label: 'Revision Tracker', icon: RotateCcw },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <aside className={`sidebar glass-panel flex flex-col fixed left-0 top-0 h-screen w-[280px] z-30 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white shadow-lg shadow-[var(--primary-glow)]">
                            <span className="text-xl">🎯</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            MedTutor AI
                        </span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => window.innerWidth < 768 && onClose()}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                ${isActive
                                    ? 'bg-[var(--primary-glow)] text-white shadow-[var(--shadow-glow)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white'
                                }
                            `}
                        >
                            <span className={`transition-transform duration-300 group-hover:scale-110`}>
                                <item.icon size={20} />
                            </span>
                            <span className="font-medium">{item.label}</span>
                            {/* Active Indicator */}
                            {/* <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} /> */}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mt-auto">
                    <div className="glass-card p-4 rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent border border-[var(--primary)]/20">
                        <div className="text-sm font-semibold text-[var(--primary-light)] mb-1">Streak 🔥</div>
                        <div className="text-xs text-[var(--text-secondary)]">Keep up the momentum!</div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

