import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { getTopics } from '../services/api';
// import { createClient } from '@supabase/supabase-js'; // Removed
// import { CONFIG } from '../config';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area,
    RadialBarChart, RadialBar, LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, BookOpen, TrendingUp, Calendar as CalendarIcon, Zap, Brain, Target } from 'lucide-react';
import { Utils } from '../utils';
import { startOfYear, endOfYear, eachDayOfInterval, format, isSameDay, parseISO, isPast, isFuture, addDays, subDays, differenceInDays, compareAsc, startOfDay } from 'date-fns';

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
    const { currentDatabase } = useDatabase();
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        if (user && currentDatabase) {
            fetchData();
        }
    }, [user, currentDatabase]);

    const fetchData = async () => {
        try {
            const data = await getTopics(true, user?.id, currentDatabase?.id);
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

    // 1. Prediction & Burnup Data
    const predictionStats = useMemo(() => {
        const completedTopics = topics.filter(t => t.completed === 'True');
        
        // Calculate Velocity (Last 14 days)
        const today = new Date();
        const twoWeeksAgo = subDays(today, 14);
        const recentCompleted = completedTopics.filter(t => 
            t.lastEditedTime && new Date(t.lastEditedTime) >= twoWeeksAgo
        ).length;
        
        const velocity = recentCompleted / 14; // topics per day
        const remaining = topics.length - completedTopics.length;
        const daysToFinish = velocity > 0 ? Math.ceil(remaining / velocity) : 0;
        const projectedDate = velocity > 0 ? addDays(today, daysToFinish) : null;

        // Generate Burnup Chart Data
        // Get all unique dates from planned and actual
        const dates = new Set();
        topics.forEach(t => {
            if (t.plannedDate) dates.add(t.plannedDate.split('T')[0]);
            if (t.completed === 'True' && t.lastEditedTime) dates.add(t.lastEditedTime.split('T')[0]);
        });
        
        const sortedDates = Array.from(dates).sort();
        if (sortedDates.length === 0) return { velocity, daysToFinish, projectedDate, burnupData: [] };

        const startDate = parseISO(sortedDates[0]);
        const endDate = projectedDate && daysToFinish < 365 ? projectedDate : addDays(today, 30); // Cap projection for chart
        
        const chartDates = eachDayOfInterval({ start: startDate, end: endDate });
        
        let cumulativePlanned = 0;
        let cumulativeActual = 0;
        
        const burnupData = chartDates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            
            // Planned Cumulative
            const dayPlanned = topics.filter(t => t.plannedDate && t.plannedDate.startsWith(dateStr)).length;
            cumulativePlanned += dayPlanned;
            
            // Actual Cumulative (only up to today)
            let actualValue = null;
            if (date <= today) {
                const dayCompleted = topics.filter(t => 
                    t.completed === 'True' && 
                    t.lastEditedTime && 
                    t.lastEditedTime.startsWith(dateStr)
                ).length;
                cumulativeActual += dayCompleted;
                actualValue = cumulativeActual;
            } else if (velocity > 0) {
                // Projected
                actualValue = cumulativeActual + (velocity * differenceInDays(date, today));
            }

            return {
                date: format(date, 'MMM dd'),
                Planned: cumulativePlanned,
                Actual: actualValue,
                isProjected: date > today
            };
        });

        return { velocity, daysToFinish, projectedDate, burnupData };
    }, [topics]);

    // 2. Subject Mastery (Radar)
    const subjectRadarData = useMemo(() => {
        const data = {};
        topics.forEach(t => {
            const subject = t.subjectCategory || 'Uncategorized';
            if (!data[subject]) data[subject] = { subject, total: 0, completed: 0, revised: 0, practiced: 0 };
            
            data[subject].total++;
            if (t.completed === 'True') data[subject].completed++;
            if (t.firstRevision === 'TRUE') data[subject].revised++;
            if (t.mcqSolvingDate) data[subject].practiced++;
        });

        return Object.values(data).map(d => ({
            subject: d.subject,
            Completion: Math.round((d.completed / d.total) * 100) || 0,
            Revision: d.completed > 0 ? Math.round((d.revised / d.completed) * 100) : 0,
            Practice: Math.round((d.practiced / d.total) * 100) || 0,
            fullMark: 100
        })).slice(0, 6); // Limit to top 6 for clean radar, or handle all
    }, [topics]);

    // 3. Retention Health Score
    const retentionStats = useMemo(() => {
        const completedTopics = topics.filter(t => t.completed === 'True');
        if (completedTopics.length === 0) return { score: 100, atRisk: 0 };

        const today = new Date();
        const atRisk = completedTopics.filter(t => {
            // Considered "At Risk" if completed > 7 days ago AND 1st Revision not done
            // Using lastEditedTime as proxy for completion date if needed, or plannedDate
            const dateRef = t.lastEditedTime ? parseISO(t.lastEditedTime) : (t.plannedDate ? parseISO(t.plannedDate) : null);
            if (!dateRef) return false;
            
            return differenceInDays(today, dateRef) > 7 && t.firstRevision !== 'TRUE';
        }).length;

        const score = Math.max(0, Math.round(100 - ((atRisk / completedTopics.length) * 100)));
        return { score, atRisk };
    }, [topics]);

    // 4. Streak & Activity
    const streakStats = useMemo(() => {
        // Calculate current streak based on lastEditedTime of ANY topic (showing activity)
        const today = new Date();
        const activityDates = new Set();
        
        topics.forEach(t => {
            if (t.lastEditedTime) activityDates.add(t.lastEditedTime.split('T')[0]);
        });
        
        let streak = 0;
        let checkDate = today;
        
        // Simple check for last 365 days
        while (streak < 365) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            if (activityDates.has(dateStr)) {
                streak++;
                checkDate = subDays(checkDate, 1);
            } else {
                // Allow 1 day gap? No, strict streak for now.
                // Check if today has no activity yet, maybe check yesterday to start streak
                if (streak === 0 && isSameDay(checkDate, today)) {
                    checkDate = subDays(checkDate, 1);
                    continue;
                }
                break;
            }
        }
        return streak;
    }, [topics]);

    // Data for Subject Progress (Stacked Bar) - KEEPING for backward compat or alternative view
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

    // Data for Priority Breakdown (High Yield Analysis)
    const priorityData = useMemo(() => {
        const data = [
            { name: 'High RR', value: 0, completed: 0 },
            { name: 'Moderate RR', value: 0, completed: 0 },
            { name: 'Low RR', value: 0, completed: 0 }
        ];
        
        topics.forEach(t => {
            const idx = data.findIndex(d => d.name === t.priority);
            if (idx !== -1) {
                data[idx].value++;
                if (t.completed === 'True') data[idx].completed++;
            }
        });
        return data;
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

    // Heatmap Data (Activity Density)
    const heatmapData = useMemo(() => {
        const today = new Date();
        const yearStart = startOfYear(today);
        const yearEnd = endOfYear(today);
        const days = eachDayOfInterval({ start: yearStart, end: yearEnd });

        const activityMap = {};
        topics.forEach(t => {
            // Count actual activity (edits or completion)
            if (t.lastEditedTime) {
                const dateStr = t.lastEditedTime.split('T')[0];
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
            // Also count completion if distinct from edit (usually same, but just in case)
            // If we want to show 'Planned' density, we could add that, but 'Consistency' usually means 'Done'
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

            {/* Smart Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Predictive Completion */}
                <div className="glass-card p-6 lg:col-span-2 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Target size={20} className="text-[var(--primary)]" />
                        Predictive Syllabus Completion
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        At your current pace of <span className="text-[var(--primary)] font-bold">{predictionStats.velocity.toFixed(1)} topics/day</span>, 
                        you are projected to finish by <span className="text-[var(--primary)] font-bold">{predictionStats.projectedDate ? format(predictionStats.projectedDate, 'MMM dd, yyyy') : '...'}</span>.
                    </p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={predictionStats.burnupData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                                <XAxis dataKey="date" stroke={CHART_THEME.text} tick={{ fontSize: 12 }} minTickGap={30} />
                                <YAxis stroke={CHART_THEME.text} tick={{ fontSize: 12 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="Planned" stroke={COLORS.neutral} strokeDasharray="5 5" dot={false} strokeWidth={2} />
                                <Line type="monotone" dataKey="Actual" stroke={COLORS.success} strokeWidth={3} dot={false} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Health & Streak Column */}
                <div className="flex flex-col gap-6">
                    {/* Retention Health */}
                    <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)] flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-10 ${retentionStats.score > 80 ? 'bg-green-500' : retentionStats.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 z-10">
                            <Brain size={20} className="text-[var(--primary)]" />
                            Retention Health
                        </h3>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`text-5xl font-bold mb-2 ${retentionStats.score > 80 ? 'text-green-400' : retentionStats.score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {retentionStats.score}%
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] text-center">
                                {retentionStats.atRisk} topics entering<br/>"Forgetting Zone"
                            </p>
                        </div>
                    </div>

                    {/* Streak */}
                    <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)] flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                         <div className="absolute inset-0 bg-orange-500/5"></div>
                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 z-10">
                            <Zap size={20} className="text-orange-500" />
                            Consistency Streak
                        </h3>
                        <div className="relative z-10 flex flex-col items-center">
                             <div className="text-5xl font-bold mb-2 text-orange-400">
                                {streakStats} <span className="text-xl text-[var(--text-secondary)]">Days</span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">Keep it burning!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Charts Row 2 (Radar & Priority) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subject Mastery Radar */}
                <div className="glass-card p-6 lg:col-span-2 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-[var(--primary)]" />
                        Subject Mastery Radar
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectRadarData}>
                                <PolarGrid stroke={CHART_THEME.grid} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: CHART_THEME.text, fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
                                <Radar name="Completion %" dataKey="Completion" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                                <Radar name="Revision %" dataKey="Revision" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.3} />
                                <Legend />
                                <RechartsTooltip content={<CustomTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* High Yield Focus Analysis */}
                <div className="glass-card p-6 rounded-2xl border border-[var(--border-subtle)]">
                    <h3 className="text-lg font-semibold mb-6">High-Yield Focus</h3>
                    <div className="h-[300px] w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {/* Inner Pie: Completed vs Pending (Simulated by Priority Completion) */}
                                <Pie
                                    data={priorityData}
                                    dataKey="completed"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    fill={COLORS.success}
                                    stroke="none"
                                >
                                     {priorityData.map((entry, index) => (
                                        <Cell key={`cell-inner-${index}`} fill={entry.name === 'High RR' ? '#ef4444' : entry.name === 'Moderate RR' ? '#eab308' : '#3b82f6'} fillOpacity={0.8} />
                                    ))}
                                </Pie>
                                {/* Outer Pie: Total Distribution */}
                                <Pie
                                    data={priorityData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    fill={COLORS.neutral}
                                    stroke="none"
                                    opacity={0.3}
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-outer-${index}`} fill={entry.name === 'High RR' ? '#ef4444' : entry.name === 'Moderate RR' ? '#eab308' : '#3b82f6'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center mt-[-10px]">
                            <p className="text-xs text-[var(--text-secondary)]">Inner: Completed | Outer: Total</p>
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
