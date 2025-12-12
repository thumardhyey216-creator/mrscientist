import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { getTopics, markComplete } from '../services/api';
import { Utils } from '../utils';
import StatCard from '../components/dashboard/StatCard';
import TopicList from '../components/dashboard/TopicList';
import TopicDetailsModal from '../components/dashboard/TopicDetailsModal';
import { BookOpen, CheckCircle, Clock, Calendar } from 'lucide-react';

const Dashboard = () => {
    const { lastUpdated } = useOutletContext();
    const { user } = useAuth();
    const { currentDatabase } = useDatabase();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTopic, setSelectedTopic] = useState(null);

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
            setTopics(prev => prev.map(t => t.id === id ? { ...t, completed: 'True', lastEditedTime: new Date().toISOString() } : t));
        } catch (error) {
            console.error("Failed to mark complete:", error);
        }
    };

    if (loading && topics.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="spinner"></div>
            </div>
        );
    }

    // Calculate Stats
    const stats = Utils.calculateStats(topics);

    // Filter Lists
    const dueToday = Utils.filterTopics(topics, { completed: false })
        .filter(t => Utils.isToday(t.plannedDate));

    const recentCompleted = Utils.filterTopics(topics, { completed: true })
        .sort((a, b) => new Date(b.lastEditedTime) - new Date(a.lastEditedTime))
        .slice(0, 5);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-8">
            {/* Greeting Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Welcome Back, Dr. {user?.email?.split('@')[0]}! 👋
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-1">Here's what's happening with your study goals today.</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-2xl font-bold text-[var(--accent-cyan)]">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div className="text-[var(--text-tertiary)]">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Topics"
                    value={stats.total}
                    subtext="Across all subjects"
                    icon={<BookOpen size={24} />}
                    gradient="linear-gradient(135deg, #8b5cf6, #c084fc)"
                />
                <StatCard
                    label="Completed"
                    value={stats.completed}
                    subtext={`${stats.percentage}% complete`}
                    icon={<CheckCircle size={24} />}
                    gradient="linear-gradient(135deg, #10b981, #34d399)"
                    trend={stats.percentage}
                />
                <StatCard
                    label="Remaining"
                    value={stats.remaining}
                    subtext={`${Utils.formatDuration(stats.totalHours - stats.completedHours)} left`}
                    icon={<Clock size={24} />}
                    gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
                />
                <StatCard
                    label="Due Today"
                    value={stats.dueToday}
                    subtext={`${stats.overdue} overdue`}
                    icon={<Calendar size={24} />}
                    gradient="linear-gradient(135deg, #ec4899, #f472b6)"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <div className="xl:col-span-2">
                    <TopicList
                        title="Today's Focus"
                        topics={dueToday}
                        emptyMessage="All caught up! No topics due today."
                        emptyIcon="🎉"
                        onMarkComplete={handleMarkComplete}
                        onViewDetails={setSelectedTopic}
                        type="focus"
                    />
                </div>

                <div className="space-y-8">
                    <TopicList
                        title="Recent Activity"
                        topics={recentCompleted}
                        emptyMessage="No recent activity recorded."
                        emptyIcon="📜"
                        onViewDetails={setSelectedTopic}
                        type="recent"
                    />
                </div>
            </div>

            {/* Details Modal */}
            {selectedTopic && (
                <TopicDetailsModal
                    topic={selectedTopic}
                    onClose={() => setSelectedTopic(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;

