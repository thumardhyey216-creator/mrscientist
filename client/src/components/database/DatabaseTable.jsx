import React from 'react';
import { Utils } from '../../utils';
import { ExternalLink, FileText } from 'lucide-react';

const DatabaseTable = React.memo(({ topics, onSelectTopic }) => {
    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold">Topic Name</th>
                            <th className="p-4 font-semibold">Subject</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Priority</th>
                            <th className="p-4 font-semibold">Planned Date</th>
                            <th className="p-4 font-semibold">1st Revision</th>
                            <th className="p-4 font-semibold">2nd Revision</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-secondary)]">
                        {topics.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-[var(--text-tertiary)]">
                                    No topics found
                                </td>
                            </tr>
                        ) : (
                            topics.map(topic => (
                                <tr key={topic.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-[var(--text-primary)]">{topic.topicName}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="badge" style={{ background: Utils.getSubjectColor(topic.subjectCategory), color: 'white' }}>
                                            {topic.subjectCategory || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`badge ${topic.completed === 'True' ? 'badge-success' : 'badge-warning'}`}>
                                            {topic.completed === 'True' ? 'Done' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="badge" style={{ background: Utils.getPriorityColor(topic.priority), color: 'white' }}>
                                            {topic.priority || 'Normal'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                                        {Utils.formatDate(topic.plannedDate)}
                                    </td>
                                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                                        {Utils.formatDate(topic.firstRevisionDate)}
                                    </td>
                                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                                        {Utils.formatDate(topic.secondRevisionDate)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-sm btn-secondary p-1.5"
                                                onClick={() => onSelectTopic(topic)}
                                                title="View/Edit Page"
                                            >
                                                <FileText size={16} />
                                            </button>
                                            <a
                                                href={topic.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-sm btn-secondary p-1.5"
                                                title="Open in Notion"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default DatabaseTable;
