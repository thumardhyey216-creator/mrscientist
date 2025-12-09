import React from 'react';
import ChatInterface from '../components/chat/ChatInterface';

const StudyHub = () => {
    return (
        <div className="h-full animate-fade-in flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">AI Tutor</h2>
                <p className="text-[var(--text-secondary)]">Ask questions, generate flashcards, or get summaries.</p>
            </div>

            <div className="flex-1 min-h-0">
                <ChatInterface />
            </div>
        </div>
    );
};

export default StudyHub;
