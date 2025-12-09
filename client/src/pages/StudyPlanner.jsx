import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';
import { getTopics } from '../services/api';
import { Utils } from '../utils';
import { Calendar, ChevronLeft, ChevronRight, Clock, Target, CheckCircle2, Plus, Edit } from 'lucide-react';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const StudyPlanner = () => {
    const { lastUpdated } = useOutletContext();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingTopic, setEditingTopic] = useState(null);
    const [newDate, setNewDate] = useState('');

    useEffect(() => {
        loadData();
    }, [lastUpdated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTopics();
            setTopics(data);
        } catch (error) {
            console.error("Failed to load topics:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateTopicDate = async (topicId, newPlannedDate) => {
        try {
            const { error } = await supabase
                .from('topics')
                .update({ planned_date: newPlannedDate })
                .eq('id', topicId);

            if (error) throw error;

            // Update local state
            setTopics(prev => prev.map(t =>
                t.id === topicId ? { ...t, plannedDate: newPlannedDate } : t
            ));
            setEditingTopic(null);
        } catch (err) {
            console.error('Error updating date:', err);
            alert('Failed to update date');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner"></div>
            </div>
        );
    }

    // Get current week dates
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

    // Get topics for a specific date
    const getTopicsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return topics.filter(t => {
            if (!t.plannedDate) return false;
            return t.plannedDate.split('T')[0] === dateStr;
        });
    };

    // Navigation
    const navigateWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    // Stats for the week
    const weekTopics = weekDates.flatMap(d => getTopicsForDate(d));
    const weekCompleted = weekTopics.filter(t => t.completed === 'True').length;
    const weekTotal = weekTopics.length;

    // Upcoming topics
    const upcomingTopics = topics
        .filter(t => {
            if (!t.plannedDate || t.completed === 'True') return false;
            const plannedDate = new Date(t.plannedDate);
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            return plannedDate >= today && plannedDate <= weekFromNow;
        })
        .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate))
        .slice(0, 10);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="text-[var(--primary)]" />
                        Study Planner
                    </h2>
                    <p className="text-[var(--text-secondary)]">Plan and track your daily study schedule. Click topics to reschedule.</p>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigateWeek(-1)}
                        className="btn btn-secondary btn-sm"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="font-medium min-w-[200px] text-center">
                        {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                        onClick={() => navigateWeek(1)}
                        className="btn btn-secondary btn-sm"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="btn btn-primary btn-sm ml-2"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* Week Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center">
                    <Target className="mx-auto mb-2 text-[var(--primary)]" size={24} />
                    <div className="text-2xl font-bold">{weekTotal}</div>
                    <div className="text-sm text-[var(--text-secondary)]">Planned This Week</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <CheckCircle2 className="mx-auto mb-2 text-[var(--success)]" size={24} />
                    <div className="text-2xl font-bold">{weekCompleted}</div>
                    <div className="text-sm text-[var(--text-secondary)]">Completed</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <Clock className="mx-auto mb-2 text-[var(--warning)]" size={24} />
                    <div className="text-2xl font-bold">{weekTotal - weekCompleted}</div>
                    <div className="text-sm text-[var(--text-secondary)]">Remaining</div>
                </div>
            </div>

            {/* Week Calendar View */}
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
                                            onClick={() => {
                                                setEditingTopic(topic);
                                                setNewDate(topic.plannedDate?.split('T')[0] || '');
                                            }}
                                            className={`w-full text-xs p-1.5 rounded truncate text-left transition-all hover:scale-105 ${topic.completed === 'True'
                                                ? 'bg-[var(--success)] bg-opacity-20 text-[var(--success)] line-through'
                                                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]'
                                                }`}
                                            title="Click to reschedule"
                                        >
                                            {topic.topicName}
                                        </button>
                                    ))}
                                    {dayTopics.length > 3 && (
                                        <div className="text-xs text-[var(--text-tertiary)] text-center">
                                            +{dayTopics.length - 3} more
                                        </div>
                                    )}
                                    {dayTopics.length === 0 && (
                                        <div className="text-xs text-[var(--text-tertiary)] text-center py-2">
                                            No topics
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming Topics List */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Upcoming Study Topics</h3>
                {upcomingTopics.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                        <div className="text-3xl mb-2">📅</div>
                        <p>No upcoming topics in the next 7 days</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {upcomingTopics.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => {
                                    setEditingTopic(topic);
                                    setNewDate(topic.plannedDate?.split('T')[0] || '');
                                }}
                                className="w-full flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-2 h-8 rounded-full"
                                        style={{ backgroundColor: Utils.getSubjectColor(topic.subjectCategory) }}
                                    />
                                    <div className="text-left">
                                        <div className="font-medium">{topic.topicName}</div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {topic.subjectCategory}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="text-sm font-medium">
                                            {Utils.formatDate(topic.plannedDate)}
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {Utils.formatDuration(topic.duration)}
                                        </div>
                                    </div>
                                    <Edit size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary)]" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Date Modal */}
            {editingTopic && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setEditingTopic(null)}>
                    <div className="glass-panel p-6 rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Reschedule Topic</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-[var(--text-secondary)] block mb-1">Topic</label>
                                <div className="font-medium">{editingTopic.topicName}</div>
                            </div>
                            <div>
                                <label className="text-sm text-[var(--text-secondary)] block mb-2">New Date</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => updateTopicDate(editingTopic.id, newDate)}
                                    className="btn btn-primary flex-1"
                                >
                                    Update
                                </button>
                                <button
                                    onClick={() => setEditingTopic(null)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyPlanner;
