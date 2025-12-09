import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';
import { ChevronRight, Plus, FileText, Save } from 'lucide-react';
import { Utils } from '../utils';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const TopicPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [topic, setTopic] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subPages, setSubPages] = useState([]);

    useEffect(() => {
        loadTopic();
        loadSubPages();
    }, [id]);

    const loadTopic = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('topics')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setTopic(data);
            setNotes(data.notes || '');
        } catch (err) {
            console.error('Error loading topic:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadSubPages = async () => {
        try {
            // Try to load sub-pages if table exists
            const { data, error } = await supabase
                .from('topics')
                .select('*')
                .eq('parent_id', id);

            if (!error && data) {
                setSubPages(data);
            }
        } catch (err) {
            // Sub-pages table might not exist yet
            console.log('Sub-pages not available yet');
        }
    };

    const saveNotes = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('topics')
                .update({ notes })
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Error saving notes:', err);
            alert('Failed to save notes');
        } finally {
            setSaving(false);
        }
    };

    const createSubPage = async () => {
        const title = prompt('Enter sub-page title:');
        if (!title) return;

        try {
            const { data, error } = await supabase
                .from('topics')
                .insert({
                    topic_name: title,
                    parent_id: id,
                    subject_category: topic.subject_category,
                })
                .select()
                .single();

            if (error) throw error;
            setSubPages(prev => [...prev, data]);
        } catch (err) {
            console.error('Error creating sub-page:', err);
            alert('Failed to create sub-page');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">Topic not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <button
                    onClick={() => navigate('/database')}
                    className="hover:text-[var(--primary)] transition-colors"
                >
                    Database
                </button>
                <ChevronRight size={16} />
                <span className="text-[var(--text-primary)]">{topic.topic_name}</span>
            </div>

            {/* Header */}
            <div className="space-y-4">
                <h1 className="text-4xl font-bold">{topic.topic_name}</h1>

                <div className="flex flex-wrap gap-2">
                    {topic.subject_category && (
                        <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                                backgroundColor: Utils.getSubjectColor(topic.subject_category) + '30',
                                color: Utils.getSubjectColor(topic.subject_category)
                            }}
                        >
                            {topic.subject_category}
                        </span>
                    )}
                    {topic.priority && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${topic.priority === 'High RR' ? 'bg-red-500/20 text-red-400' :
                                topic.priority === 'Moderate RR' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400'
                            }`}>
                            {topic.priority}
                        </span>
                    )}
                    {topic.completed === 'True' && (
                        <span className="px-3 py-1 bg-[var(--success)]/20 text-[var(--success)] rounded-full text-sm font-medium">
                            ✓ Completed
                        </span>
                    )}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    {topic.duration && <span>⏱️ {Utils.formatDuration(topic.duration)}</span>}
                    {topic.planned_date && <span>📅 {Utils.formatDate(topic.planned_date)}</span>}
                    {topic.source && <span>📚 {topic.source}</span>}
                </div>
            </div>

            {/* Notes Editor */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Notes</h2>
                    <button
                        onClick={saveNotes}
                        disabled={saving}
                        className="btn btn-primary btn-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your notes here..."
                    className="w-full h-96 p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)] resize-none text-[var(--text-primary)] font-mono text-sm"
                />
            </div>

            {/* Sub-pages */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Sub-pages</h2>
                    <button
                        onClick={createSubPage}
                        className="btn btn-secondary btn-sm flex items-center gap-2"
                    >
                        <Plus size={16} />
                        New Sub-page
                    </button>
                </div>

                {subPages.length === 0 ? (
                    <p className="text-center py-8 text-[var(--text-secondary)]">
                        No sub-pages yet. Click "+ New Sub-page" to create one.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {subPages.map(subPage => (
                            <button
                                key={subPage.id}
                                onClick={() => navigate(`/topic/${subPage.id}`)}
                                className="w-full flex items-center gap-3 p-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors text-left"
                            >
                                <FileText size={18} className="text-[var(--text-tertiary)]" />
                                <span className="flex-1">{subPage.topic_name}</span>
                                <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* PYQ Asked */}
            {topic.pyq_asked && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-3">Previously Asked (PYQ)</h3>
                    <p className="text-[var(--text-secondary)]">{topic.pyq_asked}</p>
                </div>
            )}
        </div>
    );
};

export default TopicPage;
