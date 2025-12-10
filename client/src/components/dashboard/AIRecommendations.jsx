import React, { useState, useEffect } from 'react';
import { getRevisionInsights } from '../../services/api';
import { Sparkles, RefreshCw, AlertTriangle, Target, TrendingUp, BookOpen, Lightbulb } from 'lucide-react';

const AIRecommendations = ({ topics }) => {
    const [recommendations, setRecommendations] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRecommendations = async () => {
        console.log('🤖 AIRecommendations: Fetching insights for topics:', topics);
        if (!topics || topics.length === 0) {
            console.log('🤖 AIRecommendations: No topics available');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getRevisionInsights(topics);
            setRecommendations(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch AI recommendations:', err);
            const errorData = err.response?.data;
            const errorMessage = errorData?.details || errorData?.error || err.message || 'Unknown error occurred';
            setError(`Unable to generate recommendations: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (topics && topics.length > 0 && !recommendations) {
            fetchRecommendations();
        }
    }, [topics]);

    const getUrgencyColor = (urgency) => {
        switch (urgency?.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/20';
            case 'low': return 'text-green-400 bg-green-500/20';
            default: return 'text-blue-400 bg-blue-500/20';
        }
    };

    if (!topics || topics.length === 0) {
        return (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 rounded-full bg-[var(--bg-secondary)]">
                    <Sparkles className="text-[var(--text-tertiary)]" size={24} />
                </div>
                <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">AI Recommendations</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Add some topics to your database to get personalized study insights!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Sparkles className="text-purple-400" size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">AI Study Recommendations</h3>
                        <p className="text-xs text-[var(--text-tertiary)]">
                            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Powered by Gemini AI'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchRecommendations}
                    disabled={loading}
                    className="btn btn-secondary btn-sm flex items-center gap-2"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Analyzing...' : 'Refresh'}
                </button>
            </div>

            {/* Loading State */}
            {loading && !recommendations && (
                <div className="flex flex-col items-center justify-center py-8 text-[var(--text-secondary)]">
                    <div className="spinner mb-3"></div>
                    <p className="text-sm">AI is analyzing your study patterns...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    <AlertTriangle size={20} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Recommendations */}
            {recommendations && !loading && (
                <div className="space-y-5">
                    {/* Priority Topics */}
                    {recommendations.priorityTopics && recommendations.priorityTopics.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Target size={16} className="text-[var(--primary)]" />
                                <span>Priority Topics to Revise</span>
                            </div>
                            <div className="space-y-2">
                                {recommendations.priorityTopics.slice(0, 5).map((topic, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{topic.name}</div>
                                            <div className="text-xs text-[var(--text-tertiary)] mt-1">{topic.reason}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(topic.urgency)}`}>
                                            {topic.urgency}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Study Insights */}
                    {recommendations.insights && (
                        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <TrendingUp size={18} className="text-blue-400 mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium text-blue-300 mb-1">Study Pattern Insight</div>
                                    <p className="text-sm text-[var(--text-secondary)]">{recommendations.insights}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Subject Focus */}
                    {recommendations.subjectFocus && recommendations.subjectFocus.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <BookOpen size={16} className="text-[var(--warning)]" />
                                <span>Subjects Needing Attention</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recommendations.subjectFocus.map((subject, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1.5 bg-[var(--warning)]/10 text-[var(--warning)] rounded-full text-xs font-medium"
                                    >
                                        {subject}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Motivational Tip */}
                    {recommendations.motivationalTip && (
                        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                            <Lightbulb size={18} className="text-green-400 mt-0.5" />
                            <p className="text-sm text-green-300 italic">"{recommendations.motivationalTip}"</p>
                        </div>
                    )}

                    {/* Raw response fallback */}
                    {recommendations.raw && (
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{recommendations.raw}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIRecommendations;
