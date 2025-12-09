import React from 'react';
import { Menu, Bell } from 'lucide-react';


const Topbar = ({ title, onToggleSidebar }) => {
    return (
        <header className="sticky top-0 z-30 transition-all duration-300 backdrop-blur-md bg-[var(--bg-app)]/80 border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white transition-colors"
                    onClick={onToggleSidebar}
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={20} />
                </button>

                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--text-secondary)] animate-fade-in">
                    {title}
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <button className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-card-hover)] hover:text-white transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent-pink)] rounded-full ring-2 ring-[var(--bg-app)]" />
                </button>
            </div>
        </header>
    );
};

export default Topbar;

