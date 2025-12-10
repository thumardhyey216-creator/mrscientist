import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTopics } from '../services/api';
// import { createClient } from '@supabase/supabase-js'; // Removed
// import { CONFIG } from '../config';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
    RadialBarChart, RadialBar
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, BookOpen, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { Utils } from '../utils';
import { startOfYear, endOfYear, eachDayOfInterval, format, isSameDay, parseISO, isPast, isFuture, addDays } from 'date-fns';

// const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY); // Removed

const COLORS = {
    primary: '#6366f1', // Indigo 500
    secondary: '#ec4899', // Pink 500
    success: '#22c55e', // Green 500
    warning: '#eab308', // Yellow 500
    danger: '#ef4444', // Red 500
    info: '#3b82f6', // Blue 500
    neutral: '#6b7280', // Gray 500
    background: '#1f2937', // Gray 800
};

const CHART_THEME = {
    background: 'transparent',
    text: '#9ca3af', // Gray 400
    grid: '#374151', // Gray 700
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 border border-[var(--border-subtle)] !bg-[var(--bg-card)]/90 backdrop-blur-md shadow-xl rounded-lg">
                <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: <span className="font-semibold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Analytics = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const data = await getTopics(true, user?.id);
            setTopics(data || []);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Derived Metrics ---

    const stats = useMemo(() => {
        const total = topics.length;
        const completed = topics.filter(t => t.completed === 'True').length;
        const pending = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const totalDuration = topics.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0);

        // Backlog: Past planned date AND not completed
        const backlog = topics.filter(t =>
            t.plannedDate &&
            isPast(parseISO(t.plannedDate)) &&
            t.completed !== 'True'
        ).length;

        return { total, completed, pending, completionRate, totalDuration, backlog };
    }, [topics]);

    // Data for Subject Progress (Stacked Bar)
    const subjectProgressData = useMemo(() => {
        const data = {};
        topics.forEach(t => {
            const subject = t.subjectCategory || 'Uncategorized';
            if (!data[subject]) data[subject] = { subject, Completed: 0, Pending: 0 };
            if (t.completed === 'True') data[subject].Completed++;
            else data[subject].Pending++;
        });
        return Object.values(data).sort((a, b) => (b.Completed + b.Pending) - (a.Completed + a.Pending));
    }, [topics]);

    // Data for Priority Breakdown
    const priorityData = useMemo(() => {
        const counts = { 'High RR': 0, 'Moderate RR': 0, 'Low RR': 0 };
        topics.forEach(t => {
            if (counts[t.priority] !== undefined) counts[t.priority]++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [topics]);

    // Data for Weekly Workload Projection
    const workloadData = useMemo(() => {
        const today = new Date();
        const next7Days = eachDayOfInterval({ start: today, end: addDays(today, 6) });

        return next7Days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayTopics = topics.filter(t => t.plannedDate && t.plannedDate.startsWith(dateStr));
            const hours = dayTopics.reduce((acc, t) => acc + (parseFloat(t.duration) || 0), 0);
            return {
                day: format(date, 'EEE'), // Mon, Tue
                fullDate: dateStr,
                hours: Number(hours.toFixed(1)),
                count: dayTopics.length
            };
        });
    }, [topics]);

    // Heatmap Data (Simplified for grid)
    const heatmapData = useMemo(() => {
        const today = new Date();
        const yearStart = startOfYear(today);
        const yearEnd = endOfYear(today);
        const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

        const activityMap = {};
        topics.forEach(t => {
            if (t.completed === 'True' && t.lastEditedTime) { // Assuming updated_at approximates completion time for now, or use a completed_at if available
                // If we don't have a completed_at, we might use planned_date for 'planned' activity density
                // Let's use planned_date to show schedule density for now
            }
            if (t.plannedDate) {
                const dateStr = t.plannedDate.split('T')[0];
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
        });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return {
                date: day,
                count: activityMap[dateStr] || 0
            };
        });
    }, [topics]);

    // Data for Source Usage (Bar Chart)
    const sourceData = useMemo(() => {
        const counts = {};
        topics.forEach(t => {
            const source = t.source ? t.source.split('➡️')[0].trim() : 'Unknown';
            counts[source] = (counts[source] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 sources
    }, [topics]);

    // Data for Revision Progress (Grouped Bar)
    const revisionData = useMemo(() => {
        const data = {
            'Theory Done': 0,
            '1st Rev Done': 0,
            '2nd Rev Done': 0
        };
        topics.forEach(t => {
            if (t.completed === 'True') data['Theory Done']++;
            if (t.firstRevision === 'TRUE') data['1st Rev Done']++;
            if (t.secondRevision === 'TRUE') data['2nd Rev Done']++;
        });
        return [
            { name: 'Theory', value: data['Theory Done'], fill: COLORS.primary },
            { name: '1st Revision', value: data['1st Rev Done'], fill: COLORS.secondary },
            { name: '2nd Revision', value: data['2nd Rev Done'], fill: COLORS.success }
        ];
    }, [topics]);

    // Exam Focus Stats
    const examStats = useMemo(() => {
        const mcqDone = topics.filter(t => t.mcqSolvingDate).length;
        const pyqMarked = topics.filter(t => t.pyqAsked).length;
        return [
            { name: 'MCQ Solved', value: mcqDone, fill: COLORS.info },
            { name: 'PYQ Marked', value: pyqMarked, fill: COLORS.warning }
        ];
    }, [topics]);

    // Forgotten Topics (Completed but no 1st Revision, sorted by planned_date ascending)
    const forgottenTopics = useMemo(() => {
        return topics
            .filter(t => t.completed === 'True' && t.firstRevision !== 'TRUE')
            .sort((a, b) => new Date(a.plannedDate || 0) - new Date(b.plannedDate || 0))
            .slice(0, 5);
    }, [topics]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 animate-fade-in w-full overflow-x-hidden">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Analytics Dashboard</h1>
                <p className="text-[var(--text-secondary)]">Insights into your study progress and habits</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Completion Rate"
                    value={`${stats.completionRate}%`}
                    subtitle={`${stats.completed}/${stats.total} Topics`}
                    icon={CheckCircle2}
                    color="text-green-400"
                    bg="bg-green-400/10"
                />
                <KpiCard
                    title="Total Study Hours"
                    value={`${stats.totalDuration.toFixed(1)}h`}
                    subtitle="Estimated Duration"
                    icon={Clock}
                    color="text-blue-400"
                    bg="bg-blue-400/10"
                />
                <KpiCard
                    title="Backlog"
                    value={stats.backlog}
                    subtitle="Overdue Topics"
                    icon={AlertTriangle}
                    color="text-red-400"
                    bg="bg-red-400/10"
                />
                <KpiCard
                    title="Subjects"
                    value={Object.keys(subjectProgressData).length}
                    subtitle="Active Categories"
                    icon={BookOpen}
                    color="text-purple-400"
                    bg="bg-purple-400/10"
                />
            </div>

            {/* Main Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subject Progress */}
                <div className="glass-card p-6 lg:col-span-2 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-[var(--primary)]" />
                        Subject Mastery
                    </h3>
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                        <div style={{ width: Math.max(1000, subjectProgressData.length * 50), height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                                    <XAxis dataKey="subject" stroke={CHART_THEME.text} tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                                    <YAxis stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="Completed" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Pending" stackId="a" fill={COLORS.background} stroke={COLORS.neutral} strokeWidth={1} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Priority Breakdown */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6">Priority Distribution</h3>
                    <div className="h-[300px] w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {priorityData.map((entry, index) => {
                                        let fill = COLORS.neutral;
                                        if (entry.name === 'High RR') fill = COLORS.danger;
                                        if (entry.name === 'Moderate RR') fill = COLORS.warning;
                                        if (entry.name === 'Low RR') fill = COLORS.info;
                                        return <Cell key={`cell-${index}`} fill={fill} stroke="none" />;
                                    })}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center mt-[-10px]">
                            <p className="text-xs text-[var(--text-secondary)]">Based on topic counts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Workload */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <CalendarIcon size={20} className="text-[var(--primary)]" />
                        Upcoming Workload (Next 7 Days)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={workloadData}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                                <XAxis dataKey="day" stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                <YAxis stroke={CHART_THEME.text} tick={{ fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: CHART_THEME.text }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="hours" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorHours)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Heatmap Placeholder (Visual only for now since we need more complex logic for calendar map) */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)] flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        Activity Density
                        <span className="text-xs font-normal text-[var(--text-tertiary)] ml-auto">Annual View</span>
                    </h3>
                    <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <div className="flex gap-1 h-[140px] min-w-max">
                            {/* Simple Grid Simulation of Heatmap */}
                            {Array.from({ length: 53 }).map((_, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1">
                                    {Array.from({ length: 7 }).map((_, DayIndex) => {
                                        // Randomize opacity for demo effect if no real data (map this to heatmapData later)
                                        const weekData = heatmapData.slice(weekIndex * 7, (weekIndex * 7) + 7);
                                        const dayData = weekData[DayIndex];
                                        const count = dayData?.count || 0;

                                        // Determine color based on count
                                        let bgClass = "bg-[#2d3342]"; // Empty state
                                        if (count > 0) bgClass = "bg-green-900/40";
                                        if (count > 2) bgClass = "bg-green-600/60";
                                        if (count > 4) bgClass = "bg-green-500";

                                        return (
                                            <div
                                                key={DayIndex}
                                                className={`w-3 h-3 rounded-sm ${bgClass}`}
                                                title={`${dayData ? format(dayData.date, 'PP') : ''}: ${count} topics`}
                                            />
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 text-xs text-[var(--text-secondary)]">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-[#2d3342]"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-900/40"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-600/60"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </div>

            {/* Main Charts Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source Usage */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6">Top Study Sources</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} horizontal={false} />
                                <XAxis type="number" stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={100} stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revision Progress */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6">Revision Funnel</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revisionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                                <XAxis dataKey="name" stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                <YAxis stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Topics" radius={[4, 4, 0, 0]}>
                                    {revisionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: COLORS.primary }}></div>Theory</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: COLORS.secondary }}></div>1st Rev</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: COLORS.success }}></div>2nd Rev</div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Main Charts Row 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Exam Focus */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6">Exam Practice</h3>
                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={20} data={examStats}>
                                <RadialBar
                                    minAngle={15}
                                    label={{ position: 'insideStart', fill: '#fff' }}
                                    background
                                    clockWise
                                    dataKey="value"
                                />
                                <Legend iconSize={10} verticalAlign="bottom" height={36} />
                                <RechartsTooltip content={<CustomTooltip />} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Forgotten Topics List */}
                <div className="glass-card p-6 lg:col-span-2 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={20} className="text-orange-400" />
                            Needs Revision (Forbidden Topics)
                        </div>
                        <span className="text-xs text-[var(--text-tertiary)] font-normal">Completed but not Revised</span>
                    </h3>

                    <div className="space-y-3">
                        {forgottenTopics.length === 0 ? (
                            <div className="text-center py-10 text-[var(--text-secondary)]">
                                🎉 All completed topics have been revised!
                            </div>
                        ) : (
                            forgottenTopics.map((topic, i) => (
                                <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors">
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">{topic.topicName}</div>
                                        <div className="text-xs text-[var(--text-secondary)] flex gap-2 mt-1">
                                            <span style={{ color: Utils.getSubjectColor(topic.subjectCategory) }}>{topic.subjectCategory}</span>
                                            <span>•</span>
                                            <span>Completed: {topic.plannedDate ? format(parseISO(topic.plannedDate), 'MMM d, yyyy') : 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <span className="badge badge-warning text-xs">Due for Rev</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

const KpiCard = ({ title, value, subtitle, icon: Icon, color, bg }) => (
    <div className="glass-card p-5 rounded-xl border border-[var(--border-subtle)] hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-[var(--text-secondary)] text-sm font-medium">{title}</p>
                <h4 className="text-2xl font-bold mt-2">{value}</h4>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>
            </div>
            <div className={`p-3 rounded-lg ${bg} ${color}`}>
                <Icon size={20} />
            </div>
        </div>
    </div>
);

export default Analytics;
