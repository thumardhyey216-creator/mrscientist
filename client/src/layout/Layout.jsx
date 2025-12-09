import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from '../components/Topbar';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const location = useLocation();

    // Determine page title based on path
    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/analytics': return 'Analytics';
            case '/planner': return 'Study Planner';
            case '/revision': return 'Revision Tracker';
            case '/pyq': return 'PYQ Explorer';
            case '/priority': return 'Priority Queue';
            case '/database': return 'Database Editor';
            case '/notes': return 'Notes';
            case '/study-hub': return 'Study Hub';
            default: return 'MedTutor AI';
        }
    };

    const title = getPageTitle(location.pathname);

    return (
        <div className="flex h-screen bg-[var(--bg-app)] text-[var(--text-main)] overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-[280px]">
                <Topbar
                    title={title}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    <Outlet context={{ lastUpdated }} />
                </main>
            </div>
        </div>
    );
};

export default Layout;
