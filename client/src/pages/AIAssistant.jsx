import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { askAI } from '../services/api';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AIAssistant = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        { 
            role: 'assistant', 
            content: "Hello! I'm your Medical AI Assistant. I can help you with your studies, answer medical queries, and retrieve information from your database. How can I assist you today?" 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const data = await askAI(userMessage, user?.id);

            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "I'm sorry, I encountered an error while processing your request. Please try again." 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-hidden">
            <div className="mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] flex items-center gap-3">
                    <Sparkles className="text-[var(--primary)]" />
                    AI Assistant
                </h1>
                <p className="text-[var(--text-secondary)] mt-2">
                    Ask questions, get study tips, or search your database.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto glass-panel rounded-2xl p-4 mb-4 space-y-4">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center shrink-0
                            ${msg.role === 'user' 
                                ? 'bg-[var(--primary)] text-white' 
                                : 'bg-[var(--card-bg)] text-[var(--primary)] border border-[var(--border-color)]'}
                        `}>
                            {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                        </div>
                        
                        <div className={`
                            max-w-[80%] rounded-2xl p-4 
                            ${msg.role === 'user' 
                                ? 'bg-[var(--primary)] text-white rounded-tr-none' 
                                : 'glass-card rounded-tl-none'}
                        `}>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] text-[var(--primary)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                            <Bot size={18} />
                        </div>
                        <div className="glass-card rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
                            <span className="text-sm text-[var(--text-secondary)]">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="glass-panel p-2 rounded-xl flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim()}
                    className="bg-[var(--primary)] text-white p-3 rounded-lg hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default AIAssistant;
