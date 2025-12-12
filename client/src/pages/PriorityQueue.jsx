import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useDatabase } from '../context/useDatabase';
import { getTopics, markComplete } from '../services/api';
import { Utils } from '../utils';
import { Star, Filter, ExternalLink, Check, Clock, AlertTriangle, Zap } from 'lucide-react';

const PriorityQueue = () => {
    const { lastUpdated } = useOutletContext();
    const { user } = useAuth();
    const { currentDatabase } = useDatabase();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'high', 'moderate', 'low'
    const [sortBy, setSortBy] = useState('priority'); // 'priority', 'duration', 'date'

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await getTopics(true, user?.id, currentDatabase?.id);
                setTopics(data);
            } catch (error) {
                console.error("Failed to load topics:", error);
            } finally {
                setLoading(false);
            }
        };
        
        if (user) {
            loadData();
        }
    }, [lastUpdated, user, currentDatabase]);

    const handleMarkComplete = async (id) => {
        try {
            await markComplete(id);
            setTopics(prev => prev.map(t => t.id === id ? { ...t, completed: 'True' } : t));
        } catch (error) {
            console.error("Failed to mark complete:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner"></div>
            </div>
        );
    }

    // Filter incomplete topics only
    let pendingTopics = topics.filter(t => t.completed !== 'True');

    // Apply priority filter
    if (filter !== 'all') {
        pendingTopics = pendingTopics.filter(t => {
            if (filter === 'high') return t.priority === 'High RR';
            if (filter === 'moderate') return t.priority === 'Moderate RR';
            if (filter === 'low') return t.priority === 'Low RR';
            return true;
        });
    }

    // Sort topics
    const priorityOrder = { 'High RR': 1, 'Moderate RR': 2, 'Low RR': 3, 'video+notes➡️Main': 4, 'Notes ➡️ RR': 5 };

    pendingTopics.sort((a, b) => {
        if (sortBy === 'priority') {
            const aPriority = priorityOrder[a.priority] || 99;
            const bPriority = priorityOrder[b.priority] || 99;
            return aPriority - bPriority;
        }
        if (sortBy === 'duration') {
            return (a.duration || 0) - (b.duration || 0);
        }
        if (sortBy === 'date') {
            if (!a.plannedDate) return 1;
            if (!b.plannedDate) return -1;
            return new Date(a.plannedDate) - new Date(b.plannedDate);
        }
        return 0;
    });

    // Stats
    const highPriority = topics.filter(t => t.priority === 'High RR' && t.completed !== 'True').length;
    const moderatePriority = topics.filter(t => t.priority === 'Moderate RR' && t.completed !== 'True').length;
    const lowPriority = topics.filter(t => t.priority === 'Low RR' && t.completed !== 'True').length;
    const overdue = topics.filter(t => Utils.isOverdue(t.plannedDate) && t.completed !== 'True').length;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Star className="text-[var(--warning)]" />
                    Priority Queue
                </h2>
                <p className="text-[var(--text-secondary)]">Focus on what matters most. Tackle high-priority topics first.</p>
            </div>

            {/* Priority Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <PriorityCard
                    label="High Priority"
                    count={highPriority}
                    color="var(--error)"
                    icon={<AlertTriangle size={20} />}
                    onClick={() => setFilter(filter === 'high' ? 'all' : 'high')}
                    active={filter === 'high'}
                />
                <PriorityCard
                    label="Moderate"
                    count={moderatePriority}
                    color="var(--warning)"
                    icon={<Zap size={20} />}
                    onClick={() => setFilter(filter === 'moderate' ? 'all' : 'moderate')}
                    active={filter === 'moderate'}
                />
                <PriorityCard
                    label="Low Priority"
                    count={lowPriority}
                    color="var(--success)"
                    icon={<Star size={20} />}
                    onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}
                    active={filter === 'low'}
                />
                <PriorityCard
                    label="Overdue"
                    count={overdue}
                    color="var(--error)"
                    icon={<Clock size={20} />}
                />
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <Filter size={16} className="text-[var(--text-secondary)]" />
                    <span className="text-[var(--text-secondary)]">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-md px-2 py-1"
                    >
                        <option value="priority">Priority</option>
                        <option value="duration">Duration</option>
                        <option value="date">Planned Date</option>
                    </select>
                </div>
                {filter !== 'all' && (
                    <button
                        onClick={() => setFilter('all')}
                        className="btn btn-sm btn-secondary"
                    >
                        Clear Filter
                    </button>
                )}
                <span className="text-sm text-[var(--text-tertiary)] ml-auto">
                    Showing {pendingTopics.length} topics
                </span>
            </div>

            {/* Topic List */}
            <div className="space-y-3">
                {pendingTopics.length === 0 ? (
                    <div className="glass-card p-12 text-center text-[var(--text-tertiary)]">
                        <div className="text-4xl mb-2">🎉</div>
                        <p>No pending topics in this category!</p>
                    </div>
                ) : (
                    pendingTopics.map((topic, index) => (
                        <div
                            key={topic.id}
                            className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center"
                        >
                            {/* Priority Indicator & Rank */}
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-[var(--text-tertiary)] w-8">
                                    #{index + 1}
                                </span>
                                <div
                                    className="w-2 h-12 rounded-full"
                                    style={{ backgroundColor: Utils.getPriorityColor(topic.priority) }}
                                />
                            </div>

                            {/* Topic Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-lg truncate">{topic.topicName}</h4>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span
                                        className="badge text-white"
                                        style={{ backgroundColor: Utils.getSubjectColor(topic.subjectCategory) }}
                                    >
                                        {topic.subjectCategory}
                                    </span>
                                    <span
                                        className="badge"
                                        style={{
                                            backgroundColor: Utils.getPriorityColor(topic.priority) + '20',
                                            color: Utils.getPriorityColor(topic.priority)
                                        }}
                                    >
                                        {topic.priority || 'No Priority'}
                                    </span>
                                    {topic.duration && (
                                        <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                            <Clock size={12} /> {Utils.formatDuration(topic.duration)}
                                        </span>
                                    )}
                                    {topic.plannedDate && (
                                        <span className={`text-xs flex items-center gap-1 ${Utils.isOverdue(topic.plannedDate) ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}>
                                            📅 {Utils.formatDate(topic.plannedDate)}
                                            {Utils.isOverdue(topic.plannedDate) && ' (Overdue)'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 self-end md:self-auto">
                                {topic.url && (
                                    <a
                                        href={topic.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-sm btn-secondary p-2"
                                        title="Open in Notion"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                )}
                                <button
                                    className="btn btn-sm btn-success p-2 px-3"
                                    onClick={() => handleMarkComplete(topic.id)}
                                    title="Mark Complete"
                                >
                                    <Check size={16} className="mr-1" />
                                    Done
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Helper Component
const PriorityCard = ({ label, count, color, icon, onClick, active }) => (
    <div
        className={`glass-card p-4 text-center cursor-pointer transition-all ${active ? 'ring-2' : ''}`}
        style={{
            '--tw-ring-color': color,
            borderColor: active ? color : undefined
        }}
        onClick={onClick}
    >
        <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm text-[var(--text-secondary)]">{label}</div>
    </div>
);

export default PriorityQueue;
