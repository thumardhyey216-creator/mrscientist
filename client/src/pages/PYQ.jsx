import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useDatabase } from '../context/useDatabase';
import { getTopics, markComplete } from '../services/api';
import { Utils } from '../utils';
import { ExternalLink, Check } from 'lucide-react';

const PYQ = () => {
    const { lastUpdated } = useOutletContext();
    const { user } = useAuth();
    const { currentDatabase } = useDatabase();
    const [topics, setTopics] = useState([]);
    const [filteredTopics, setFilteredTopics] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTopics(true, user?.id, currentDatabase?.id);
            // Filter only topics with PYQs
            const pyqs = data.filter(t => t.pyqAsked && t.pyqAsked.trim() !== '');
            setTopics(pyqs);
            filterTopics(pyqs, searchQuery, selectedSubject);
        } catch (error) {
            console.error("Failed to load topics:", error);
        } finally {
            setLoading(false);
        }
    };

    const filterTopics = (data, query, subject) => {
        let filtered = data;
        const lowerQuery = query.toLowerCase();

        if (query) {
            filtered = filtered.filter(t =>
                t.topicName.toLowerCase().includes(lowerQuery) ||
                t.pyqAsked.toLowerCase().includes(lowerQuery) ||
                (t.subjectCategory && t.subjectCategory.toLowerCase().includes(lowerQuery))
            );
        }

        if (subject !== 'all') {
            filtered = filtered.filter(t => t.subjectCategory === subject);
        }

        setFilteredTopics(filtered);
    };

    useEffect(() => {
        loadData();
    }, [lastUpdated, currentDatabase]);

    useEffect(() => {
        filterTopics(topics, searchQuery, selectedSubject);
    }, [searchQuery, selectedSubject, topics]);

    const handleMarkComplete = async (id) => {
        try {
            await markComplete(id);
            // Optimistic update
            setTopics(prev => prev.map(t => t.id === id ? { ...t, completed: 'True' } : t));
            setFilteredTopics(prev => prev.map(t => t.id === id ? { ...t, completed: 'True' } : t));
            // Trigger global sync if needed, mostly context will update eventually
        } catch (error) {
            console.error("Failed to mark complete", error);
        }
    };

    // Get unique subjects
    const subjects = ['all', ...new Set(topics.map(t => t.subjectCategory).filter(Boolean))].sort();

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">PYQ Explorer</h2>
                <p className="text-[var(--text-secondary)]">Searchable database of previous year questions.</p>
            </div>

            <div className="glass-card p-4 space-y-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="🔍 Search PYQs and topics..."
                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded md:text-sm focus:border-[var(--primary)] outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="min-w-[150px]">
                        <select
                            className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded md:text-sm focus:border-[var(--primary)] outline-none"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            {subjects.map(sub => (
                                <option key={sub} value={sub}>{sub === 'all' ? 'All Subjects' : sub}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                    Total PYQs: <strong className="text-[var(--text-primary)]">{filteredTopics.length}</strong>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTopics.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-tertiary)] bg-[var(--bg-card)] rounded-lg border border-[var(--border-secondary)] border-dashed">
                            <div className="text-4xl mb-2">🔍</div>
                            <p>No PYQs found matching your filters.</p>
                        </div>
                    ) : (
                        filteredTopics.map(topic => (
                            <div key={topic.id} className="glass-card p-4 hover:border-[var(--primary)] transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{topic.topicName}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <span className="badge" style={{ background: Utils.getSubjectColor(topic.subjectCategory), color: 'white' }}>
                                                {topic.subjectCategory}
                                            </span>
                                            {topic.completed === 'True' ? (
                                                <span className="badge bg-[var(--success)] text-white">✓ Completed</span>
                                            ) : (
                                                <span className="badge bg-[var(--warning)] text-white">Pending</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-secondary)] border-l-4 border-[var(--primary)] p-3 rounded mb-3">
                                    <div className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">📝 Previous Year Question</div>
                                    <div className="text-[var(--text-primary)] whitespace-pre-wrap">{topic.pyqAsked}</div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="text-sm text-[var(--text-secondary)] space-x-3">
                                        {topic.priority && <span>⭐ {topic.priority}</span>}
                                        {topic.timesRepeated && <span>🔄 {topic.timesRepeated}x</span>}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a
                                            href={topic.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-sm btn-secondary"
                                        >
                                            <ExternalLink size={14} className="mr-1" /> Open Notion
                                        </a>
                                        {topic.completed !== 'True' && (
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleMarkComplete(topic.id)}
                                            >
                                                <Check size={14} className="mr-1" /> Mark Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PYQ;
