import React from 'react';

const Placeholder = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-fade-in">
            <div className="text-6xl">🚧</div>
            <h2 className="text-2xl font-bold">{title || 'Under Construction'}</h2>
            <p className="text-[var(--text-muted)] max-w-md">
                This page is currently being migrated to the new React architecture. Check back soon!
            </p>
        </div>
    );
};

export default Placeholder;
