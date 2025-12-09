import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';
import { getTopics } from '../services/api';
import { Utils } from '../utils';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Target, RotateCcw } from 'lucide-react';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const FirstRevision = () => {
    const { lastUpdated } = useOutletContext();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        loadData();
    }, [lastUpdated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTopics();
            // Filter topics that have a first_revision_date or need first revision
            const revisionTopics = data.filter(t => t.first_revision_date || t.completed === 'True');
            setTopics(revisionTopics);
        } catch (error) {
            console.error("Failed to load topics:", error);
        } finally {
            setLoading(false);
        }
    };

    const markRevisionComplete = async (topicId) => {
        try {
            const { error } = await supabase
                .from('topics')
                .update({ first_revision: 'TRUE' })
                .eq('id', topicId);

            if (error) throw error;

            setTopics(prev => prev.map(t =>
                t.id === topicId ? { ...t, first_revision: 'TRUE' } : t
            ));
        } catch (err) {
            console.error('Error updating revision:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner"></div>
            </div>
        );
    }

    const getWeekDates = (date) => {
        const curr = new Date(date);
        const first = curr.getDate() - curr.getDay();
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(curr);
            day.setDate(first + i);
            dates.push(new Date(day));
        }
        return dates;
    };

    const weekDates = getWeekDates(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getTopicsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return topics.filter(t => {
            if (!t.first_revision_date) return false;
            return t.first_revision_date.split('T')[0] === dateStr;
        });
    };

    const navigateWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const weekTopics = weekDates.flatMap(d => getTopicsForDate(d));
    const weekCompleted = weekTopics.filter(t => t.first_revision === 'TRUE').length;
    const totalDue = topics.filter(t => t.completed === 'True' && t.first_revision !== 'TRUE').length;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <RotateCcw className="text-[var(--primary)]" />
                        1st Revision Tracker
                    </h2>
                    <p className="text-[var(--text-secondary)]">Track your first revision of completed topics</p>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => navigateWeek(-1)} className="btn btn-secondary btn-sm">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="font-medium min-w-[200px] text-center">
                        {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigateWeek(1)} className="btn btn-secondary btn-sm">
                        <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="btn btn-primary btn-sm ml-2">
                        Today
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                    <Target className="mx-auto mb-2 text-[var(--primary)]" size={24} />
                    <div className="text-2xl font-bold">{weekTopics.length}</div>
                    <div className="text-sm text-[var(--text-secondary)]">This Week</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <CheckCircle2 className="mx-auto mb-2 text-[var(--success)]" size={24} />
                    <div className="text-2xl font-bold">{weekCompleted}</div>
                    <div className="text-sm text-[var(--text-secondary)]">Revised</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <RotateCcw className="mx-auto mb-2 text-[var(--warning)]" size={24} />
                    <div className="text-2xl font-bold">{totalDue}</div>
                    <div className="text-sm text-[var(--text-secondary)]">Total Due</div>
                </div>
            </div>

            {/* Calendar */}
            <div className="glass-card p-4 overflow-x-auto">
                <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                    {weekDates.map((date, idx) => {
                        const dayTopics = getTopicsForDate(date);
                        const isToday = date.toDateString() === today.toDateString();
                        const isPast = date < today;

                        return (
                            <div
                                key={idx}
                                className={`rounded-lg p-3 min-h-[150px] transition-all ${isToday
                                        ? 'bg-[var(--primary)] bg-opacity-20 border-2 border-[var(--primary)]'
                                        : isPast
                                            ? 'bg-[var(--bg-secondary)] opacity-60'
                                            : 'bg-[var(--bg-secondary)]'
                                    }`}
                            >
                                <div className="text-center mb-2">
                                    <div className="text-xs text-[var(--text-secondary)] uppercase">
                                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>
                                    <div className={`text-lg font-bold ${isToday ? 'text-[var(--primary)]' : ''}`}>
                                        {date.getDate()}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {dayTopics.slice(0, 3).map(topic => (
                                        <button
                                            key={topic.id}
                                            onClick={() => markRevisionComplete(topic.id)}
                                            className={`w-full text-xs p-1.5 rounded truncate text-left transition-all hover:scale-105 ${topic.first_revision === 'TRUE'
                                                    ? 'bg-[var(--success)] bg-opacity-20 text-[var(--success)] line-through'
                                                    : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
                                                }`}
                                            title={topic.topicName}
                                        >
                                            {topic.topicName}
                                        </button>
                                    ))}
                                    {dayTopics.length > 3 && (
                                        <div className="text-xs text-[var(--text-tertiary)] text-center">
                                            +{dayTopics.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pending List */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Pending 1st Revisions</h3>
                <div className="space-y-3">
                    {topics.filter(t => t.first_revision !== 'TRUE' && t.completed === 'True').slice(0, 10).map(topic => (
                        <div
                            key={topic.id}
                            className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="w-2 h-8 rounded-full"
                                    style={{ backgroundColor: Utils.getSubjectColor(topic.subjectCategory) }}
                                />
                                <div>
                                    <div className="font-medium">{topic.topicName}</div>
                                    <div className="text-xs text-[var(--text-secondary)]">{topic.subjectCategory}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => markRevisionComplete(topic.id)}
                                className="btn btn-sm btn-success"
                            >
                                Mark Revised
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FirstRevision;
