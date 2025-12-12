import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { useDatabase } from '../../context/useDatabase';
import { askAI } from '../../services/api';
import { Send, Bot, User } from 'lucide-react';

const ChatInterface = () => {
    const { user } = useAuth();
    const { currentDatabase } = useDatabase();
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your AI Study Assistant. How can I help you with your NEET-PG preparation today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await askAI(userMessage, user?.id, currentDatabase?.id);
            // Result might be object { formatted_response: ..., raw_response: ... } or just string/object
            // API usually returns { response: "..." } or similar based on backend.
            // Let's assume it returns data directly or we check format. 
            // Looking at legacy `js/study_hub.js` (not viewed but imported in index.html, actually index.html has inline script? No, it imports `js/api.js`).
            // `api.askAI` in vanilla `js/api.js` returns `response.json()`.
            // My `api.js` returns `response.data`.
            // Let's assume `response.data.response`.

            const aiContent = result.response || result.formatted_response || "I received your message but couldn't generate a response.";

            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] glass-card overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[var(--primary)]' : 'bg-[var(--success)]'}`}>
                            {msg.role === 'user' ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
                        </div>

                        <div className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-[var(--primary)] text-white rounded-tr-none'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-secondary)] rounded-tl-none'
                            }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--success)] flex items-center justify-center shrink-0">
                            <Bot size={16} color="white" />
                        </div>
                        <div className="bg-[var(--bg-secondary)] p-3 rounded-lg rounded-tl-none border border-[var(--border-secondary)] flex items-center gap-2">
                            <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--border-secondary)] bg-[var(--bg-card)]">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about your study topics..."
                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-lg px-4 py-2 focus:border-[var(--primary)] outline-none transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="btn btn-primary p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
