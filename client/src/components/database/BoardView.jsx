import React, { useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Utils } from '../../utils';

const BoardView = ({ topics, onTopicClick, groupByField = 'completed', onUpdateTopic }) => {
    const [draggedTopic, setDraggedTopic] = useState(null);

    // Define columns based on groupByField
    const getColumns = () => {
        switch (groupByField) {
            case 'completed':
                return [
                    { id: 'False', title: 'Pending', color: '#f59e0b' },
                    { id: 'True', title: 'Completed', color: '#10b981' }
                ];
            case 'priority':
                return [
                    { id: 'High RR', title: 'High Priority', color: '#ef4444' },
                    { id: 'Moderate RR', title: 'Moderate', color: '#f59e0b' },
                    { id: 'Low RR', title: 'Low Priority', color: '#3b82f6' },
                    { id: null, title: 'No Priority', color: '#6b7280' }
                ];
            case 'subject_category': {
                const subjects = [...new Set(topics.map(t => t.subject_category).filter(Boolean))];
                return subjects.map(s => ({
                    id: s,
                    title: s,
                    color: Utils.getSubjectColor(s)
                }));
            }
            default:
                return [
                    { id: 'False', title: 'Pending', color: '#f59e0b' },
                    { id: 'True', title: 'Completed', color: '#10b981' }
                ];
        }
    };

    const columns = getColumns();

    const getTopicsForColumn = (columnId) => {
        return topics.filter(t => {
            const value = t[groupByField];
            if (columnId === null) return !value;
            return value === columnId;
        });
    };

    const handleDragStart = (e, topic) => {
        setDraggedTopic(topic);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, columnId) => {
        e.preventDefault();
        if (draggedTopic && onUpdateTopic) {
            onUpdateTopic(draggedTopic.id, groupByField, columnId);
        }
        setDraggedTopic(null);
    };

    const handleDragEnd = () => {
        setDraggedTopic(null);
    };

    return (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
            {columns.map(column => {
                const columnTopics = getTopicsForColumn(column.id);

                return (
                    <div
                        key={column.id || 'null'}
                        className="flex-shrink-0 w-72 flex flex-col"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div
                            className="flex items-center justify-between p-3 rounded-t-lg"
                            style={{ backgroundColor: column.color + '20' }}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: column.color }}
                                />
                                <span className="font-semibold text-sm">{column.title}</span>
                                <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                                    {columnTopics.length}
                                </span>
                            </div>
                            <button className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                                <MoreHorizontal size={16} className="text-[var(--text-tertiary)]" />
                            </button>
                        </div>

                        {/* Column Content */}
                        <div
                            className="flex-1 bg-[var(--bg-secondary)]/50 rounded-b-lg p-2 space-y-2 min-h-[200px] overflow-y-auto"
                            style={{ maxHeight: 'calc(100vh - 300px)' }}
                        >
                            {columnTopics.map(topic => (
                                <div
                                    key={topic.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, topic)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => onTopicClick(topic)}
                                    className={`glass-card p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${draggedTopic?.id === topic.id ? 'opacity-50' : ''
                                        }`}
                                >
                                    <div className="font-medium text-sm mb-2 line-clamp-2">
                                        {topic.topic_name}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {topic.subject_category && (
                                            <span
                                                className="px-2 py-0.5 rounded text-xs font-medium"
                                                style={{
                                                    backgroundColor: Utils.getSubjectColor(topic.subject_category) + '30',
                                                    color: Utils.getSubjectColor(topic.subject_category)
                                                }}
                                            >
                                                {topic.subject_category}
                                            </span>
                                        )}
                                        {topic.priority && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${topic.priority === 'High RR' ? 'bg-red-500/20 text-red-400' :
                                                    topic.priority === 'Moderate RR' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {topic.priority.replace(' RR', '')}
                                            </span>
                                        )}
                                    </div>

                                    {topic.planned_date && (
                                        <div className="text-xs text-[var(--text-tertiary)] mt-2">
                                            📅 {new Date(topic.planned_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {columnTopics.length === 0 && (
                                <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">
                                    No topics
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BoardView;
