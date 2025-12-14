import React from 'react';
import { Utils } from '../../utils';
import { Clock, Tag, ArrowRight, Check } from 'lucide-react';

const TopicList = React.memo(({ title, topics, emptyMessage, emptyIcon, onMarkComplete, onViewDetails, type = 'focus' }) => {

    if (!topics || topics.length === 0) {
        return (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-[var(--border-subtle)] bg-transparent">
                    <div className="text-5xl mb-4 opacity-50">{emptyIcon || '📭'}</div>
                    <div className="text-lg font-semibold mb-2">{emptyMessage || 'No topics found'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in group">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {title}
                    <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                        {topics.length}
                    </span>
                </h2>
                {/* <button className="text-sm text-[var(--primary)] hover:underline">View All</button> */}
            </div>

            <div className="flex flex-col gap-4">
                {topics.map((topic, index) => (
                    <div
                        key={topic.id}
                        className="glass-card p-4 flex flex-col sm:flex-row gap-4 sm:items-center hover-scale group/item relative overflow-hidden"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Gradient Border Line */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover/item:w-1.5"
                            style={{ background: Utils.getSubjectColor(topic.subjectCategory) }}
                        />

                        {type === 'recent' && (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/20 text-green-500 shrink-0 border border-green-500/30">
                                <Check size={18} />
                            </div>
                        )}

                        <div className="flex-1 min-w-0 ml-2">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-lg text-[var(--text-primary)] truncate pr-2 group-hover/item:text-[var(--primary-light)] transition-colors">
                                    {topic.topicName}
                                </h4>
                            </div>

                            <div className="flex flex-wrap gap-3 text-xs text-[var(--text-secondary)] mt-2">
                                <span className="flex items-center gap-1 bg-[var(--bg-app)]/50 px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                                    <Tag size={12} />
                                    {topic.subjectCategory}
                                </span>
                                {type !== 'recent' && (
                                    <>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {Utils.formatDuration(topic.duration)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full border ${topic.priority?.includes('High')
                                                ? 'border-red-500/30 text-red-400 bg-red-500/10'
                                                : topic.priority?.includes('Moderate')
                                                    ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                                                    : 'border-[var(--border-subtle)]'
                                            }`}>
                                            {topic.priority || 'Normal'}
                                        </span>
                                    </>
                                )}
                                {type === 'recent' && (
                                    <span>Completed {Utils.getRelativeTime(topic.lastEditedTime)}</span>
                                )}
                            </div>
                        </div>

                        {type === 'focus' && (
                            <div className="flex gap-2 self-end sm:self-center shrink-0 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-all duration-200 transform sm:translate-x-4 sm:group-hover/item:translate-x-0">
                                <button
                                    className="p-2 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] shadow-lg hover:shadow-[var(--primary-glow)] transition-all"
                                    onClick={() => onMarkComplete(topic.id)}
                                    title="Mark Complete"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    className="p-2 rounded-lg bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] hover:border-[var(--border-highlight)] transition-all"
                                    onClick={() => onViewDetails(topic)}
                                    title="View Details"
                                >
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

export default TopicList;

