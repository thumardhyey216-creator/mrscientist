import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';
import { Filter, ChevronDown, Calendar as CalendarIcon, Plus, X, Table2, Table, LayoutGrid, Search } from 'lucide-react';
import { Utils } from '../utils';
import CalendarView from '../components/database/CalendarView';
import BoardView from '../components/database/BoardView';
import TagSelector from '../components/database/TagSelector';
import FilterPanel from '../components/database/FilterPanel';
import SearchBar from '../components/database/SearchBar';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Default saved views
const DEFAULT_VIEWS = [
    { id: 'all', name: 'All Topics', viewMode: 'table', filters: {} },
    { id: 'board', name: 'Board', viewMode: 'board', filters: {} },
    { id: 'calendar', name: 'Calendar', viewMode: 'calendar', filters: {} },
    { id: 'high-priority', name: 'High Priority', viewMode: 'table', filters: { priority: 'High RR' } },
    { id: 'pending', name: 'Pending', viewMode: 'table', filters: { completed: 'False' } },
    { id: 'completed', name: 'Completed', viewMode: 'table', filters: { completed: 'True' } }
];

const Database = () => {
    const navigate = useNavigate();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState('All');
    const [subjects, setSubjects] = useState([]);
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [showAddRowModal, setShowAddRowModal] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [currentView, setCurrentView] = useState(DEFAULT_VIEWS[0]);
    const [calendarColumn, setCalendarColumn] = useState('planned_date');
    const [boardGroupBy, setBoardGroupBy] = useState('completed');
    const [dateColumns, setDateColumns] = useState([]);
    const [customColumns, setCustomColumns] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState([]);
    const [newColumn, setNewColumn] = useState({ name: '', type: 'text' });
    const [newRow, setNewRow] = useState({
        topic_name: '',
        subject_category: '',
        priority: '',
        source: '',
        duration: '',
        planned_date: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load topics
            const { data: topicsData, error: topicsError } = await supabase
                .from('topics')
                .select('*')
                .order('no', { ascending: true });

            if (topicsError) throw topicsError;

            setTopics(topicsData || []);

            // Extract unique subjects
            const uniqueSubjects = [...new Set(topicsData?.map(t => t.subject_category).filter(Boolean))];
            setSubjects(uniqueSubjects.sort());

            // Detect date columns from first topic
            if (topicsData && topicsData.length > 0) {
                const firstTopic = topicsData[0];
                const detectedDateCols = [];

                // Check for built-in date columns
                const builtInDateCols = {
                    'planned_date': 'Planned Date',
                    'mcq_solving_date': 'MCQ Done'
                };

                Object.entries(builtInDateCols).forEach(([key, name]) => {
                    if (key in firstTopic) {
                        detectedDateCols.push({ id: key, name });
                    }
                });

                setDateColumns(detectedDateCols);

                // Set default calendar column to first available
                if (detectedDateCols.length > 0 && !detectedDateCols.find(c => c.id === calendarColumn)) {
                    setCalendarColumn(detectedDateCols[0].id);
                }
            }

            // Load custom column definitions
            const { data: columnsData, error: columnsError } = await supabase
                .from('custom_column_definitions')
                .select('*')
                .order('column_order');

            if (!columnsError && columnsData) {
                setCustomColumns(columnsData);

                // Add custom date columns
                const customDateCols = columnsData
                    .filter(c => c.column_type === 'date')
                    .map(c => ({ id: `custom_${c.column_name}`, name: c.column_name, isCustom: true }));

                if (customDateCols.length > 0) {
                    setDateColumns(prev => [...prev, ...customDateCols]);
                }
            }
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateTopic = async (id, field, value) => {
        try {
            const { error } = await supabase
                .from('topics')
                .update({ [field]: value })
                .eq('id', id);

            if (error) throw error;

            setTopics(prev => prev.map(t =>
                t.id === id ? { ...t, [field]: value } : t
            ));
        } catch (err) {
            console.error('Error updating topic:', err);
        }
    };

    const updateCustomData = async (id, columnName, value) => {
        try {
            // Get current custom_data
            const topic = topics.find(t => t.id === id);
            const customData = topic?.custom_data || {};

            // Update the specific field
            const updatedData = { ...customData, [columnName]: value };

            const { error } = await supabase
                .from('topics')
                .update({ custom_data: updatedData })
                .eq('id', id);

            if (error) throw error;

            setTopics(prev => prev.map(t =>
                t.id === id ? { ...t, custom_data: updatedData } : t
            ));
        } catch (err) {
            console.error('Error updating custom data:', err);
        }
    };

    const addNewRow = async () => {
        try {
            const { data, error } = await supabase
                .from('topics')
                .insert([{ ...newRow, custom_data: {} }])
                .select()
                .single();

            if (error) throw error;

            setTopics(prev => [...prev, data]);
            setShowAddRowModal(false);
            setNewRow({
                topic_name: '',
                subject_category: '',
                priority: '',
                source: '',
                duration: '',
                planned_date: ''
            });
        } catch (err) {
            console.error('Error adding row:', err);
            alert('Failed to add row: ' + err.message);
        }
    };

    const addNewColumn = async () => {
        if (!newColumn.name) {
            alert('Please enter a column name');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('custom_column_definitions')
                .insert([{
                    column_name: newColumn.name,
                    column_type: newColumn.type,
                    column_order: customColumns.length
                }])
                .select()
                .single();

            if (error) throw error;

            setCustomColumns(prev => [...prev, data]);
            setShowAddColumnModal(false);
            setNewColumn({ name: '', type: 'text' });
        } catch (err) {
            console.error('Error adding column:', err);
            alert('Failed to add column: ' + err.message);
        }
    };

    const renderCustomColumnInput = (topic, column) => {
        const value = topic.custom_data?.[column.column_name];

        switch (column.column_type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => updateCustomData(topic.id, column.column_name, e.target.value)}
                        className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)]"
                        placeholder="Enter text..."
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={value || ''}
                        onChange={(e) => updateCustomData(topic.id, column.column_name, e.target.value)}
                        className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)]"
                    />
                );
            case 'checkbox':
                return (
                    <label className="flex items-center gap-2 cursor-pointer justify-center">
                        <input
                            type="checkbox"
                            checked={value === true}
                            onChange={(e) => updateCustomData(topic.id, column.column_name, e.target.checked)}
                            className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-secondary)] checked:bg-[var(--primary)]"
                        />
                    </label>
                );
            case 'tags':
                return (
                    <TagSelector
                        value={value || []}
                        onChange={(tags) => updateCustomData(topic.id, column.column_name, tags)}
                        placeholder="Add tags..."
                    />
                );
            default:
                return <span className="text-xs text-[var(--text-secondary)]">-</span>;
        }
    };

    // Apply view filters and subject filter
    const getFilteredTopics = useCallback(() => {
        let filtered = [...topics];

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.topic_name?.toLowerCase().includes(query) ||
                t.subject_category?.toLowerCase().includes(query) ||
                t.source?.toLowerCase().includes(query) ||
                t.pyq_asked?.toLowerCase().includes(query)
            );
        }

        // Apply view-specific filters
        Object.keys(currentView.filters).forEach(key => {
            filtered = filtered.filter(t => t[key] === currentView.filters[key]);
        });

        // Apply subject filter
        if (filterSubject !== 'All') {
            filtered = filtered.filter(t => t.subject_category === filterSubject);
        }

        // Apply advanced filters
        advancedFilters.forEach((filter, index) => {
            if (!filter.column || !filter.condition) return;

            const applyFilter = (t) => {
                const value = t[filter.column];
                switch (filter.condition) {
                    case 'is':
                        return value === filter.value;
                    case 'is not':
                        return value !== filter.value;
                    case 'contains':
                        return value?.toString().toLowerCase().includes(filter.value?.toLowerCase());
                    case 'does not contain':
                        return !value?.toString().toLowerCase().includes(filter.value?.toLowerCase());
                    case 'is empty':
                        return !value;
                    case 'is not empty':
                        return !!value;
                    default:
                        return true;
                }
            };

            if (index === 0 || filter.connector === 'and') {
                filtered = filtered.filter(applyFilter);
            } else {
                // OR logic - add matching items
                const orMatches = topics.filter(applyFilter);
                filtered = [...new Set([...filtered, ...orMatches])];
            }
        });

        return filtered;
    }, [topics, searchQuery, currentView.filters, filterSubject, advancedFilters]);

    const filteredTopics = getFilteredTopics();

    // Handle search
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);


    const handleViewChange = (view) => {
        setCurrentView(view);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in h-[calc(100vh-150px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Database</h2>
                        <p className="text-sm text-[var(--text-secondary)]">{filteredTopics.length} topics</p>
                    </div>

                    {/* View Selector */}
                    <select
                        value={currentView.id}
                        onChange={(e) => handleViewChange(DEFAULT_VIEWS.find(v => v.id === e.target.value))}
                        className="px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] font-medium"
                    >
                        {DEFAULT_VIEWS.map(view => (
                            <option key={view.id} value={view.id}>{view.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <SearchBar onSearch={handleSearch} />

                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`btn btn-secondary btn-sm flex items-center gap-2 ${showFilterPanel || advancedFilters.length > 0 ? 'ring-2 ring-[var(--primary)]' : ''}`}
                    >
                        <Filter size={16} />
                        Filter
                        {advancedFilters.length > 0 && (
                            <span className="bg-[var(--primary)] text-white text-xs px-1.5 rounded-full">
                                {advancedFilters.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setShowAddColumnModal(true)}
                        className="btn btn-secondary btn-sm flex items-center gap-2"
                    >
                        <Table2 size={16} />
                        Add Column
                    </button>
                    <button
                        onClick={() => setShowAddRowModal(true)}
                        className="btn btn-primary btn-sm flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Row
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
                <FilterPanel
                    columns={[
                        { id: 'topic_name', name: 'Topic', type: 'text' },
                        { id: 'subject_category', name: 'Subject', type: 'text' },
                        { id: 'priority', name: 'Priority', type: 'text' },
                        { id: 'completed', name: 'Completed', type: 'text' },
                        { id: 'source', name: 'Source', type: 'text' },
                        { id: 'planned_date', name: 'Planned Date', type: 'date' },
                        ...customColumns.map(c => ({ id: c.column_name, name: c.column_name, type: c.column_type }))
                    ]}
                    filters={advancedFilters}
                    onFiltersChange={setAdvancedFilters}
                    onClose={() => setShowFilterPanel(false)}
                />
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-4 px-1">
                {/* Subject Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">Subject:</span>
                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                    >
                        <option value="All">All Subjects</option>
                        {subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>

                {/* Calendar Column Filter (only in calendar view) */}
                {currentView.viewMode === 'calendar' && dateColumns.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">Show by:</span>
                        <select
                            value={calendarColumn}
                            onChange={(e) => setCalendarColumn(e.target.value)}
                            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                        >
                            {dateColumns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Board Group By (only in board view) */}
                {currentView.viewMode === 'board' && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">Group by:</span>
                        <select
                            value={boardGroupBy}
                            onChange={(e) => setBoardGroupBy(e.target.value)}
                            className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                        >
                            <option value="completed">Status</option>
                            <option value="priority">Priority</option>
                            <option value="subject_category">Subject</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Content Area */}
            {currentView.viewMode === 'calendar' ? (
                <CalendarView
                    topics={filteredTopics}
                    dateField={calendarColumn}
                    onTopicClick={(topic) => navigate(`/topic/${topic.id}`)}
                />
            ) : currentView.viewMode === 'board' ? (
                <BoardView
                    topics={filteredTopics}
                    groupByField={boardGroupBy}
                    onTopicClick={(topic) => navigate(`/topic/${topic.id}`)}
                    onUpdateTopic={updateTopic}
                />
            ) : (
                <div className="flex-1 overflow-auto glass-card rounded-xl">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] z-10">
                            <tr>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-12">#</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase min-w-[300px]">Topic Name</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase min-w-[200px]">Subject Category</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-32">Priority</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-32">Source</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-28">Duration</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-40">Planned Date</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-40">MCQ Done</th>
                                <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-32">Completed</th>
                                {/* Custom Columns */}
                                {customColumns.map(col => (
                                    <th key={col.id} className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase min-w-[150px]">
                                        {col.column_name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTopics.map((topic, idx) => (
                                <tr
                                    key={topic.id}
                                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors"
                                >
                                    <td className="p-3 text-[var(--text-tertiary)]">{topic.no || idx + 1}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => navigate(`/topic/${topic.id}`)}
                                            className="text-left hover:text-[var(--primary)] transition-colors"
                                        >
                                            <div className="font-medium text-[var(--text-primary)]">{topic.topic_name}</div>
                                            {topic.pyq_asked && (
                                                <div className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-1">
                                                    PYQ: {topic.pyq_asked}
                                                </div>
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        {topic.subject_category && (
                                            <span
                                                className="px-2 py-1 rounded text-xs font-medium"
                                                style={{
                                                    backgroundColor: Utils.getSubjectColor(topic.subject_category) + '30',
                                                    color: Utils.getSubjectColor(topic.subject_category)
                                                }}
                                            >
                                                {topic.subject_category}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {topic.priority && (
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${topic.priority === 'High RR' ? 'bg-red-500/20 text-red-400' :
                                                topic.priority === 'Moderate RR' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {topic.priority}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {topic.source && (
                                            <span className="px-2 py-1 bg-[var(--bg-secondary)] rounded text-xs">
                                                {topic.source.split('➡️')[0].trim()}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-[var(--text-secondary)]">
                                        {topic.duration ? `${topic.duration}h` : '-'}
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="date"
                                            value={topic.planned_date?.split('T')[0] || ''}
                                            onChange={(e) => updateTopic(topic.id, 'planned_date', e.target.value)}
                                            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)] w-full"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="date"
                                            value={topic.mcq_solving_date?.split('T')[0] || ''}
                                            onChange={(e) => updateTopic(topic.id, 'mcq_solving_date', e.target.value)}
                                            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)] w-full"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={topic.completed === 'True'}
                                                onChange={(e) => updateTopic(topic.id, 'completed', e.target.checked ? 'True' : 'False')}
                                                className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-secondary)] checked:bg-[var(--primary)]"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {topic.completed === 'True' ? 'Done' : 'Pending'}
                                            </span>
                                        </label>
                                    </td>
                                    {/* Custom Column Cells */}
                                    {customColumns.map(col => (
                                        <td key={col.id} className="p-3">
                                            {renderCustomColumnInput(topic, col)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Column Modal */}
            {showAddColumnModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-6 max-w-md w-full mx-4 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Add New Column</h3>
                            <button
                                onClick={() => setShowAddColumnModal(false)}
                                className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Column Name</label>
                                <input
                                    type="text"
                                    value={newColumn.name}
                                    onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                                    placeholder="e.g., Notes, Tags, Status"
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Column Type</label>
                                <select
                                    value={newColumn.type}
                                    onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="text">Text</option>
                                    <option value="date">Calendar/Date</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="tags">Multiple Tags</option>
                                </select>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => setShowAddColumnModal(false)}
                                    className="flex-1 btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addNewColumn}
                                    className="flex-1 btn btn-primary"
                                >
                                    Add Column
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Row Modal */}
            {showAddRowModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Add New Topic</h3>
                            <button
                                onClick={() => setShowAddRowModal(false)}
                                className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Topic Name *</label>
                                <input
                                    type="text"
                                    value={newRow.topic_name}
                                    onChange={(e) => setNewRow({ ...newRow, topic_name: e.target.value })}
                                    placeholder="Enter topic name"
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Subject Category</label>
                                <select
                                    value={newRow.subject_category}
                                    onChange={(e) => setNewRow({ ...newRow, subject_category: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Priority</label>
                                <select
                                    value={newRow.priority}
                                    onChange={(e) => setNewRow({ ...newRow, priority: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                >
                                    <option value="">Select Priority</option>
                                    <option value="High RR">High RR</option>
                                    <option value="Moderate RR">Moderate RR</option>
                                    <option value="Low RR">Low RR</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Source</label>
                                <input
                                    type="text"
                                    value={newRow.source}
                                    onChange={(e) => setNewRow({ ...newRow, source: e.target.value })}
                                    placeholder="e.g., Marrow, PrepLadder"
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Duration (hours)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={newRow.duration}
                                    onChange={(e) => setNewRow({ ...newRow, duration: e.target.value })}
                                    placeholder="e.g., 2.5"
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Planned Date</label>
                                <input
                                    type="date"
                                    value={newRow.planned_date}
                                    onChange={(e) => setNewRow({ ...newRow, planned_date: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
                                />
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => setShowAddRowModal(false)}
                                    className="flex-1 btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addNewRow}
                                    disabled={!newRow.topic_name}
                                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Topic
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Database;
