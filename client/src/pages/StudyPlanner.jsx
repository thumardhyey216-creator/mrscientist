
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { getTopics, generateSchedule, clearSchedule, reschedule, generatePrompt } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
    format, startOfMonth, endOfMonth, eachDayOfInterval, 
    isSameDay, addMonths, subMonths, isSameMonth, 
    startOfWeek, endOfWeek 
} from 'date-fns';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
    Wand2, Settings, BookOpen, CheckCircle2, RotateCcw, Target, Loader2, X, Trash2, MessageSquare, Sparkles 
} from 'lucide-react';
import ChatInterface from '../components/chat/ChatInterface';

const StudyPlanner = () => {
    const navigate = useNavigate();
    const { lastUpdated } = useOutletContext();
    const { user } = useAuth();
    const { currentDatabase } = useDatabase();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showGenerator, setShowGenerator] = useState(false);
    
    // Generator State
    const [genConfig, setGenConfig] = useState({
        startDate: new Date().toISOString().split('T')[0],
        topicsPerDay: 5,
        dailyHours: 4,
        preference: 'Morning', // Morning, Night
        strategy: 'priority', // priority, alphabetical, custom
        prompt: ''
    });
    const [generating, setGenerating] = useState(false);
    
    // Rescheduler State
    const [showRescheduler, setShowRescheduler] = useState(false);
    const [reschedulePrompt, setReschedulePrompt] = useState('');
    const [rescheduling, setRescheduling] = useState(false);
    const [draftingPrompt, setDraftingPrompt] = useState(false);

    useEffect(() => {
        if (user && currentDatabase) loadData(false);
    }, [user, lastUpdated, currentDatabase]);

    const handleReschedule = async () => {
        if (!reschedulePrompt.trim()) return;
        setRescheduling(true);
        try {
            await reschedule({
                user_id: user.id,
                database_id: currentDatabase?.id,
                prompt: reschedulePrompt
            });
            setShowRescheduler(false);
            setReschedulePrompt('');
            await loadData(true);
            alert('Schedule updated successfully!');
        } catch (error) {
            console.error("Reschedule Error:", error);
            alert("Failed to reschedule: " + error.message);
        } finally {
            setRescheduling(false);
        }
    };

    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            console.log("Fetching topics for user:", user?.id, "Force refresh:", forceRefresh);
            // If forceRefresh is true, useCache should be false
            const data = await getTopics(!forceRefresh, user?.id, currentDatabase?.id);
            console.log("Loaded topics data:", data);
            setTopics(data);
        } catch (error) {
            console.error("Failed to load topics:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generateSchedule({
                user_id: user.id,
                database_id: currentDatabase?.id,
                startDate: genConfig.startDate,
                topicsPerDay: parseInt(genConfig.topicsPerDay),
                dailyHours: parseFloat(genConfig.dailyHours),
                preference: genConfig.preference,
                strategy: genConfig.strategy,
                prompt: genConfig.prompt
            });
            setShowGenerator(false);
            await loadData(true); // Force reload to see new dates
        } catch (error) {
            console.error("Failed to generate schedule:", error);
            alert("Failed to generate schedule: " + error.message);
        } finally {
            setGenerating(false);
        }
    };

    // Calendar Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showDayModal, setShowDayModal] = useState(false);
    const [showChat, setShowChat] = useState(false);

    const handleDayClick = (date, events) => {
        setSelectedDate(date);
        setSelectedEvents(events);
        setShowDayModal(true);
    };

    const getEventsForDay = (date) => {
        const dayStr = format(date, 'yyyy-MM-dd');
        const events = [];

        topics.forEach(t => {
            // Planned Study
            if (t.plannedDate && t.plannedDate.startsWith(dayStr)) {
                events.push({ type: 'study', topic: t });
            }
            // MCQ
            if (t.mcqSolvingDate && t.mcqSolvingDate.startsWith(dayStr)) {
                events.push({ type: 'mcq', topic: t });
            }
            // Rev 1
            if (t.firstRevisionDate && t.firstRevisionDate.startsWith(dayStr)) {
                events.push({ type: 'rev1', topic: t });
            }
            // Rev 2
            if (t.secondRevisionDate && t.secondRevisionDate.startsWith(dayStr)) {
                events.push({ type: 'rev2', topic: t });
            }
        });
        return events;
    };

    const getSmartPrompts = (type) => {
        const pending = topics.filter(t => t.completed !== 'True');
        const overdue = pending.filter(t => t.plannedDate && new Date(t.plannedDate) < new Date());
        
        // Count by subject
        const subjects = {};
        pending.forEach(t => {
            const s = t.subjectCategory || 'Uncategorized';
            subjects[s] = (subjects[s] || 0) + 1;
        });
        const topSubject = Object.entries(subjects).sort((a,b) => b[1] - a[1])[0];

        if (type === 'generator') {
            const prompts = [
                "Lighter schedule on weekends.",
                "Mix difficult and easy subjects daily."
            ];
            if (topSubject) prompts.unshift(`Focus heavily on ${topSubject[0]}.`);
            if (overdue.length > 0) prompts.unshift(`Prioritize clearing ${overdue.length} overdue topics.`);
            return prompts.slice(0, 4);
        } else {
            // Rescheduler
            const prompts = [
                "Push entire schedule by 1 day.",
                "Push entire schedule by 3 days.",
            ];
            if (overdue.length > 0) prompts.unshift(`Move ${overdue.length} overdue topics to next week.`);
            if (topSubject) prompts.unshift(`Move all ${topSubject[0]} topics to next month.`);
            return prompts.slice(0, 4);
        }
    };

    const handleAutoDraft = async (type) => {
        setDraftingPrompt(true);
        try {
            const pending = topics.filter(t => t.completed !== 'True');
            const overdue = pending.filter(t => t.plannedDate && new Date(t.plannedDate) < new Date());
            const subjects = {};
            pending.forEach(t => {
                const s = t.subjectCategory || 'Uncategorized';
                subjects[s] = (subjects[s] || 0) + 1;
            });
            const topSubjects = Object.fromEntries(
                Object.entries(subjects).sort((a,b) => b[1] - a[1]).slice(0, 3)
            );

            const stats = {
                pendingCount: pending.length,
                overdueCount: overdue.length,
                topSubjects,
                recentVelocity: 0 
            };

            const data = await generatePrompt(stats, type);
            if (data.prompt) {
                if (type === 'schedule') {
                    setGenConfig(prev => ({ ...prev, prompt: data.prompt }));
                } else {
                    setReschedulePrompt(data.prompt);
                }
            }
        } catch (err) {
            console.error("Failed to draft prompt:", err);
            // Fallback
            if (type === 'schedule') setGenConfig(prev => ({ ...prev, prompt: "Focus on high yield topics first." }));
            else setReschedulePrompt("Push overdue tasks to next week.");
        } finally {
            setDraftingPrompt(false);
        }
    };

    const handleClearSchedule = async () => {
        if (!user || !user.id) {
            alert("User not authenticated");
            return;
        }
        if (!window.confirm("Are you sure you want to clear your entire schedule? This cannot be undone.")) {
            return;
        }
        setLoading(true);
        try {
            await clearSchedule(user.id, currentDatabase?.id);
            await loadData(true);
        } catch (error) {
            console.error("Failed to clear schedule:", error);
            const errMsg = error.response?.data?.error || error.message;
            alert(`Failed to clear schedule: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const resetToday = () => setCurrentDate(new Date());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Study Planner
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        AI-powered scheduling and calendar view
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`btn flex items-center gap-2 ${showChat ? 'btn-primary' : 'btn-secondary'}`}
                        title="AI Assistant"
                    >
                        <MessageSquare size={18} />
                        <span className="hidden md:inline">AI Assistant</span>
                    </button>
                    
                    <button 
                        onClick={handleClearSchedule}
                        className="btn btn-danger flex items-center gap-2 text-red-400 hover:bg-red-500/10 border border-red-500/30"
                        title="Clear Schedule"
                    >
                        <Trash2 size={18} />
                    </button>

                    <button 
                        onClick={() => setShowRescheduler(true)}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <RotateCcw size={18} />
                        <span>Reschedule</span>
                    </button>

                    <button 
                        onClick={() => setShowGenerator(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Wand2 size={18} />
                        <span>Generate Schedule</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-6 h-[calc(100vh-180px)]">
                {/* Calendar Section */}
                <div className={`flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar transition-all duration-300 ${showChat ? 'w-2/3' : 'w-full'}`}>
                    {/* Calendar Controls */}
                    <div className="glass-panel p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={prevMonth} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <h2 className="text-xl font-bold min-w-[150px] text-center">
                                {format(currentDate, 'MMMM yyyy')}
                            </h2>
                            <button onClick={nextMonth} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <button onClick={resetToday} className="text-sm text-[var(--primary)] hover:underline">
                            Today
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="glass-panel p-6 flex-1 overflow-y-auto">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 mb-4">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-[var(--text-tertiary)] text-sm font-medium py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((day, idx) => {
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isToday = isSameDay(day, new Date());
                                const events = getEventsForDay(day);
                                
                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        onClick={() => handleDayClick(day, events)}
                                        className={`
                                            min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer hover:bg-[var(--bg-hover)]
                                            ${isCurrentMonth ? 'bg-[var(--bg-secondary)]/50 border-[var(--border-primary)]' : 'bg-[var(--bg-secondary)]/10 border-transparent opacity-50'}
                                            ${isToday ? 'ring-2 ring-[var(--primary)]' : ''}
                                        `}
                                    >
                                        <div className="text-right text-xs mb-2 text-[var(--text-tertiary)]">
                                            {format(day, 'd')}
                                        </div>
                                        
                                        <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                            {events.slice(0, 3).map((evt, i) => (
                                                <div key={i} className={`
                                                    text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1
                                                    ${evt.type === 'study' ? 'bg-blue-500/20 text-blue-300' : 
                                                      evt.type === 'mcq' ? 'bg-orange-500/20 text-orange-300' : 
                                                      evt.type === 'rev1' ? 'bg-purple-500/20 text-purple-300' :
                                                      'bg-green-500/20 text-green-300'}
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0
                                                        ${evt.type === 'study' ? 'bg-blue-400' : 
                                                          evt.type === 'mcq' ? 'bg-orange-400' :
                                                          evt.type === 'rev1' ? 'bg-purple-400' :
                                                          'bg-green-400'}
                                                    `} />
                                                    {evt.topic.topicName}
                                                </div>
                                            ))}
                                            {events.length > 3 && (
                                                <div className="text-[10px] text-center text-[var(--text-tertiary)]">
                                                    +{events.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* AI Chat Sidebar */}
                {showChat && (
                    <div className="w-[350px] flex-shrink-0 animate-slide-in-right h-full">
                        <div className="h-full flex flex-col glass-panel overflow-hidden">
                            <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={18} className="text-[var(--primary)]" />
                                    <h3 className="font-bold">AI Assistant</h3>
                                </div>
                                <button onClick={() => setShowChat(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden p-0">
                                <ChatInterface />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Generator Modal */}
            {showGenerator && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-card w-full max-w-md p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Generate Schedule</h3>
                            <button onClick={() => setShowGenerator(false)} className="text-[var(--text-tertiary)] hover:text-white">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Start Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[var(--text-primary)]"
                                    value={genConfig.startDate}
                                    onChange={(e) => setGenConfig({...genConfig, startDate: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Daily Hours</label>
                                    <input 
                                        type="number" 
                                        min="1" max="24"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[var(--text-primary)]"
                                        value={genConfig.dailyHours}
                                        onChange={(e) => setGenConfig({...genConfig, dailyHours: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Preference</label>
                                    <select 
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[var(--text-primary)]"
                                        value={genConfig.preference}
                                        onChange={(e) => setGenConfig({...genConfig, preference: e.target.value})}
                                    >
                                        <option value="Morning">Morning</option>
                                        <option value="Night">Night</option>
                                        <option value="Any">Any Time</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Max Topics Per Day (Cap)</label>
                                <input 
                                    type="number" 
                                    min="1" max="20"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[var(--text-primary)]"
                                    value={genConfig.topicsPerDay}
                                    onChange={(e) => setGenConfig({...genConfig, topicsPerDay: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Strategy</label>
                                <select 
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[var(--text-primary)]"
                                    value={genConfig.strategy}
                                    onChange={(e) => setGenConfig({...genConfig, strategy: e.target.value})}
                                >
                                    <option value="priority">High Yield First (Recommended)</option>
                                    <option value="alphabetical">Alphabetical / Subject Wise</option>
                                    <option value="custom">AI Custom Strategy</option>
                                </select>
                            </div>

                            {genConfig.strategy === 'custom' && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                            Custom Instructions
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleAutoDraft('schedule')}
                                                disabled={draftingPrompt}
                                                className="text-xs flex items-center gap-1 text-[var(--primary)] hover:underline disabled:opacity-50"
                                            >
                                                {draftingPrompt ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10} />}
                                                Draft with AI
                                            </button>
                                            <div className="flex items-center gap-1 text-xs text-[var(--primary)]">
                                                <Sparkles size={12} />
                                                <span>Suggestions</span>
                                            </div>
                                        </div>
                                    </div>
                                    <textarea
                                        value={genConfig.prompt}
                                        onChange={(e) => setGenConfig({ ...genConfig, prompt: e.target.value })}
                                        placeholder="E.g., 'Focus on Anatomy first, then Physiology. Prioritize High yield topics.'"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] h-24 resize-none mb-2"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {getSmartPrompts('generator').map((p, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setGenConfig({ ...genConfig, prompt: p })}
                                                className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowGenerator(false)}
                                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleGenerate}
                                disabled={generating}
                                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                            >
                                {generating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                <span>Generate</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Details Modal */}
            {showDayModal && selectedDate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">{format(selectedDate, 'EEEE, MMMM do')}</h3>
                                <p className="text-[var(--text-secondary)] text-sm">{selectedEvents.length} Tasks Scheduled</p>
                            </div>
                            <button 
                                onClick={() => setShowDayModal(false)}
                                className="p-2 hover:bg-[var(--bg-hover)] rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto custom-scrollbar space-y-3">
                            {selectedEvents.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-tertiary)]">
                                    <div className="flex justify-center mb-2">
                                        <CalendarIcon size={40} className="opacity-20" />
                                    </div>
                                    <p>No tasks scheduled for this day.</p>
                                </div>
                            ) : (
                                selectedEvents.map((evt, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => navigate(`/topic/${evt.topic.id}`)}
                                        className={`
                                            p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]
                                            ${evt.type === 'study' ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 
                                              evt.type === 'mcq' ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' :
                                              evt.type === 'rev1' ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20' :
                                              'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-inner
                                                ${evt.type === 'study' ? 'bg-blue-500/20 text-blue-400' : 
                                                  evt.type === 'mcq' ? 'bg-orange-500/20 text-orange-400' :
                                                  evt.type === 'rev1' ? 'bg-purple-500/20 text-purple-400' :
                                                  'bg-green-500/20 text-green-400'}
                                            `}>
                                                {evt.type === 'study' ? <BookOpen size={20} /> :
                                                 evt.type === 'mcq' ? <Target size={20} /> :
                                                 evt.type === 'rev1' ? <RotateCcw size={20} /> :
                                                 <CheckCircle2 size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-xs font-bold uppercase tracking-wider
                                                        ${evt.type === 'study' ? 'text-blue-400' : 
                                                          evt.type === 'mcq' ? 'text-orange-400' :
                                                          evt.type === 'rev1' ? 'text-purple-400' :
                                                          'text-green-400'}
                                                    `}>
                                                        {evt.type === 'study' ? 'New Topic' :
                                                         evt.type === 'mcq' ? 'Solve MCQs' :
                                                         evt.type === 'rev1' ? '1st Revision' :
                                                         '2nd Revision'}
                                                    </span>
                                                    <span className="text-[10px] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full text-[var(--text-secondary)] border border-[var(--border-secondary)]">
                                                        {evt.topic.subjectCategory || 'General'}
                                                    </span>
                                                    {evt.topic.customData?.time_preference && evt.topic.customData.time_preference !== 'Any' && (
                                                        <span className={`text-[10px] ml-1 px-2 py-0.5 rounded-full border ${
                                                            evt.topic.customData.time_preference === 'Morning' 
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                        }`}>
                                                            {evt.topic.customData.time_preference === 'Morning' ? '☀️ Morning' : '🌙 Night'}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-medium text-[var(--text-primary)]">
                                                    {evt.topic.topicName}
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {showRescheduler && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <RotateCcw className="text-[var(--primary)]" size={24} />
                                Reschedule with AI
                            </h3>
                            <button onClick={() => setShowRescheduler(false)} className="p-1 hover:bg-[var(--bg-hover)] rounded">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <p className="text-[var(--text-secondary)] text-sm mb-4">
                            Tell the AI how you want to adjust your schedule. It will intelligently move your future tasks.
                        </p>

                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">Instructions</label>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleAutoDraft('reschedule')}
                                        disabled={draftingPrompt}
                                        className="text-xs flex items-center gap-1 text-[var(--primary)] hover:underline disabled:opacity-50"
                                    >
                                        {draftingPrompt ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10} />}
                                        Draft with AI
                                    </button>
                                    <div className="flex items-center gap-1 text-xs text-[var(--primary)]">
                                        <Sparkles size={12} />
                                        <span>Suggestions</span>
                                    </div>
                                </div>
                            </div>
                            <textarea
                                value={reschedulePrompt}
                                onChange={(e) => setReschedulePrompt(e.target.value)}
                                placeholder="e.g., 'I was sick yesterday, push everything by 1 day' or 'Move all Physiology topics to next week'"
                                className="w-full h-32 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none mb-2"
                            />
                            <div className="flex flex-wrap gap-2">
                                {getSmartPrompts('rescheduler').map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setReschedulePrompt(p)}
                                        className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-colors text-left"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowRescheduler(false)}
                                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReschedule}
                                disabled={rescheduling || !reschedulePrompt.trim()}
                                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                            >
                                {rescheduling ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                <span>Update Plan</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyPlanner;
