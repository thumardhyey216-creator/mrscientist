import React from 'react';
import { Utils } from '../../utils';
import { X, Calendar, Clock, Bookmark, AlertCircle, CheckCircle } from 'lucide-react';

const TopicDetailsModal = ({ topic, onClose }) => {
    if (!topic) return null;

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div
                className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar glass-panel rounded-2xl shadow-2xl transform transition-all scale-100 animate-fade-in border border-[var(--border-highlight)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-20 flex justify-between items-start p-6 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="badge" style={{ background: Utils.getSubjectColor(topic.subjectCategory), color: 'white' }}>
                                {topic.subjectCategory || 'Uncategorized'}
                            </span>
                            <span className={`badge ${topic.completed === 'True' ? 'badge-success' : 'badge-warning'}`}>
                                {topic.completed === 'True' ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--text-secondary)]">
                            {topic.topicName}
                        </h2>
                    </div>
                    <button
                        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-colors"
                        onClick={onClose}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <DetailCard
                            icon={<Clock size={16} className="text-[var(--accent-cyan)]" />}
                            label="Duration"
                            value={Utils.formatDuration(topic.duration)}
                        />
                        <DetailCard
                            icon={<AlertCircle size={16} className="text-[var(--accent-orange)]" />}
                            label="Priority"
                            value={topic.priority || 'Normal'}
                        />
                        <DetailCard
                            icon={<Calendar size={16} className="text-[var(--accent-pink)]" />}
                            label="Planned Date"
                            value={Utils.formatDate(topic.plannedDate)}
                        />
                        <DetailCard
                            icon={<Bookmark size={16} className="text-[var(--primary-light)]" />}
                            label="Source"
                            value={topic.source || 'Not specified'}
                        />
                    </div>

                    {topic.pyqAsked && (
                        <div className="glass-card p-4 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--bg-card)] border border-[var(--primary)]/20">
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--primary-light)] uppercase tracking-wider mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>
                                PYQ / Notes
                            </label>
                            <div className="text-sm leading-relaxed text-[var(--text-primary)]">
                                {topic.pyqAsked}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]/50">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const DetailCard = ({ icon, label, value }) => (
    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-start gap-3 hover:border-[var(--border-highlight)] transition-colors">
        <div className="mt-0.5">{icon}</div>
        <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-0.5">{label}</label>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
        </div>
    </div>
);

export default TopicDetailsModal;

