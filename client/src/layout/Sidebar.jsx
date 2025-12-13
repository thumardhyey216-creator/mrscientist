import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useDatabase } from '../context/useDatabase';
import {
    LayoutDashboard,
    BarChart2,
    Calendar,
    RotateCcw,
    FileText,
    Star,
    Database,
    BookOpen,
    Lock,
    LogOut,
    Plus,
    ChevronDown,
    ChevronUp,
    Trash2,
    Wifi,
    WifiOff
} from 'lucide-react';
import { api } from '../services/api';

const Sidebar = ({ isOpen, onClose }) => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const { databases = [], currentDatabase, switchDatabase, createDatabase, deleteDatabase } = useDatabase();
    const isSubscribed = profile?.subscription_status === 'active';
    const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
    const [isCreatingDb, setIsCreatingDb] = useState(false);
    const [newDbName, setNewDbName] = useState('');
    const [shouldInitialize, setShouldInitialize] = useState(true);
    const [serverStatus, setServerStatus] = useState('checking'); // 'connected', 'disconnected', 'checking'

    // Check Server Status
    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/');
                // Verify it's actually the backend, not the frontend HTML
                if (res.data && typeof res.data === 'string' && res.data.includes('MedTutor')) {
                    setServerStatus('connected');
                } else {
                    setServerStatus('disconnected');
                }
            } catch {
                setServerStatus('disconnected');
            }
        };
        
        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const handleCreateDb = async (e) => {
        e.preventDefault();
        if (!newDbName.trim()) return;
        try {
            await createDatabase(newDbName, '', '📚', shouldInitialize);
            setNewDbName('');
            setIsCreatingDb(false);
            setShouldInitialize(true);
        } catch (error) {
            console.error('Failed to create DB:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/planner', label: 'Study Planner', icon: Calendar },
        { path: '/database', label: 'Database', icon: Database },
        { path: '/analytics', label: 'Analytics', icon: BarChart2 },
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
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white shadow-lg shadow-[var(--primary-glow)]">
                            <span className="text-xl">🎯</span>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            MedTutor AI
                        </span>
                    </div>

                    {/* Database Switcher */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--primary)] transition-colors"
                        >
                            <span className="text-sm font-medium truncate flex items-center gap-2">
                                <span>{currentDatabase?.icon || '📚'}</span>
                                {currentDatabase?.name || 'Select Database'}
                            </span>
                            {isDbMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {isDbMenuOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="max-h-48 overflow-y-auto">
                                    {databases.map(db => (
                                        <div 
                                            key={db.id}
                                            className={`group flex items-center w-full hover:bg-[var(--bg-primary)] pr-2 ${currentDatabase?.id === db.id ? 'bg-[var(--bg-primary)]' : ''}`}
                                        >
                                            <button
                                                onClick={() => {
                                                    switchDatabase(db);
                                                    setIsDbMenuOpen(false);
                                                }}
                                                className={`flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 ${currentDatabase?.id === db.id ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                                            >
                                                <span>{db.icon || '📚'}</span>
                                                <span className="truncate">{db.name}</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (deleteDatabase && window.confirm(`Are you sure you want to delete "${db.name}"? This cannot be undone.`)) {
                                                        deleteDatabase(db.id);
                                                    }
                                                }}
                                                className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete Database"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-[var(--border-color)]">
                                    {isCreatingDb ? (
                                        <form onSubmit={handleCreateDb} className="flex flex-col gap-2">
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={newDbName}
                                                    onChange={(e) => setNewDbName(e.target.value)}
                                                    placeholder="Name..."
                                                    className="flex-1 bg-[var(--bg-primary)] text-xs p-1.5 rounded border border-[var(--border-color)]"
                                                    autoFocus
                                                />
                                                <button type="submit" className="p-1.5 bg-[var(--primary)] text-white rounded">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <label className="flex items-center gap-2 px-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={shouldInitialize} 
                                                    onChange={(e) => setShouldInitialize(e.target.checked)}
                                                    className="rounded border-[var(--border-color)] bg-[var(--bg-primary)]"
                                                />
                                                <span className="text-[10px] text-[var(--text-secondary)]">
                                                    Populate with Default Syllabus (785 topics)
                                                </span>
                                            </label>
                                        </form>
                                    ) : (
                                        <button 
                                            onClick={() => setIsCreatingDb(true)}
                                            className="w-full flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] px-2 py-1"
                                        >
                                            <Plus size={14} /> New Database
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
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
                            
                            {/* Lock Icon for non-subscribed users */}
                            {!isSubscribed && item.path !== '/dashboard' && (
                                <Lock size={16} className="ml-auto opacity-50" />
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mt-auto space-y-4">
                    {/* Server Status Indicator */}
                    <div 
                        className={`px-4 py-2 text-xs flex items-center gap-2 rounded-lg transition-colors border ${
                            serverStatus === 'connected' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 
                            serverStatus === 'disconnected' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 
                            'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                        }`}
                        title={serverStatus === 'disconnected' ? 'Backend unreachable. AI & Payments disabled.' : 'Backend connected'}
                    >
                        {serverStatus === 'connected' && <Wifi size={14} />}
                        {serverStatus === 'disconnected' && <WifiOff size={14} />}
                        {serverStatus === 'checking' && <span className="animate-pulse">●</span>}
                        
                        <span className="font-medium">
                            {serverStatus === 'connected' ? 'Online' : 
                            serverStatus === 'disconnected' ? 'Offline' : 'Connecting...'}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 group"
                    >
                        <span className="transition-transform duration-300 group-hover:scale-110">
                            <LogOut size={20} />
                        </span>
                        <span className="font-medium">Logout</span>
                    </button>

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

