import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Utils } from '../../utils';

const CalendarView = ({ topics, onTopicClick, dateField = 'planned_date' }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const getTopicsForDate = (date) => {
        if (!date) return [];
        const dateStr = date.toISOString().split('T')[0];
        const matched = topics.filter(t => {
            const topicDate = t[dateField];
            if (!topicDate) return false;
            // Handle both date string formats
            const topicDateStr = typeof topicDate === 'string'
                ? topicDate.split('T')[0]
                : topicDate;
            return topicDateStr === dateStr;
        });
        return matched;
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date) => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const openDateModal = (date, dayTopics) => {
        if (date && dayTopics.length > 0) {
            setSelectedDate(date);
            setShowModal(true);
        }
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const selectedTopics = selectedDate ? getTopicsForDate(selectedDate) : [];

    return (
        <div className="flex-1 flex flex-col space-y-4 glass-card rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigateMonth(-1)} className="btn btn-secondary btn-sm">
                        <ChevronLeft size={16} />
                    </button>
                    <h3 className="text-xl font-bold min-w-[200px] text-center">{monthName}</h3>
                    <button onClick={() => navigateMonth(1)} className="btn btn-secondary btn-sm">
                        <ChevronRight size={16} />
                    </button>
                </div>
                <button onClick={goToToday} className="btn btn-primary btn-sm">
                    Today
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 gap-2 auto-rows-fr">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-xs text-[var(--text-secondary)] uppercase py-2">
                        {day}
                    </div>
                ))}

                {/* Calendar Days */}
                {days.map((date, idx) => {
                    const dayTopics = date ? getTopicsForDate(date) : [];
                    const today = isToday(date);

                    return (
                        <div
                            key={idx}
                            onClick={() => openDateModal(date, dayTopics)}
                            className={`min-h-[100px] p-2 rounded-lg transition-all overflow-hidden cursor-pointer ${!date
                                ? 'bg-transparent cursor-default'
                                : today
                                    ? 'bg-[var(--primary)]/20 border-2 border-[var(--primary)]'
                                    : dayTopics.length > 0
                                        ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                                        : 'bg-[var(--bg-secondary)]/50'
                                }`}
                        >
                            {date && (
                                <>
                                    <div className={`text-sm font-semibold mb-2 ${today ? 'text-[var(--primary)]' : ''}`}>
                                        {date.getDate()}
                                    </div>
                                    <div className="space-y-1">
                                        {dayTopics.slice(0, 3).map(topic => (
                                            <div
                                                key={topic.id}
                                                className="w-full text-left p-1.5 rounded text-xs truncate"
                                                style={{
                                                    backgroundColor: Utils.getSubjectColor(topic.subject_category) + '30',
                                                    color: Utils.getSubjectColor(topic.subject_category)
                                                }}
                                                title={topic.topic_name}
                                            >
                                                {topic.topic_name}
                                            </div>
                                        ))}
                                        {dayTopics.length > 3 && (
                                            <div className="text-xs text-[var(--text-tertiary)] text-center py-1 font-medium">
                                                +{dayTopics.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[var(--primary)]/20 border-2 border-[var(--primary)]"></div>
                    <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[var(--bg-secondary)]"></div>
                    <span>Has Topics</span>
                </div>
            </div>

            {/* Topics Modal */}
            {showModal && selectedDate && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="glass-card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-[var(--text-secondary)] mb-4">
                            {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} scheduled
                        </p>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {selectedTopics.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => {
                                        setShowModal(false);
                                        onTopicClick(topic);
                                    }}
                                    className="w-full text-left p-3 rounded-lg transition-all hover:scale-[1.02] flex items-center justify-between gap-3"
                                    style={{
                                        backgroundColor: Utils.getSubjectColor(topic.subject_category) + '20',
                                        borderLeft: `4px solid ${Utils.getSubjectColor(topic.subject_category)}`
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[var(--text-primary)] truncate">
                                            {topic.topic_name}
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                                            {topic.subject_category}
                                        </div>
                                    </div>
                                    {topic.priority && (
                                        <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${topic.priority === 'High RR' ? 'bg-red-500/20 text-red-400' :
                                            topic.priority === 'Moderate RR' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {topic.priority}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
