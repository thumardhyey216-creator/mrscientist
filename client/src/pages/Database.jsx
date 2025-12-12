import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
// import { createClient } from '@supabase/supabase-js'; // Removed
import { CONFIG } from '../config';
import { Filter, ChevronDown, Calendar as CalendarIcon, Plus, X, Table2, Table, LayoutGrid, Search, Trash2, Edit2 } from 'lucide-react';
import { Utils } from '../utils';
import CalendarView from '../components/database/CalendarView';
import BoardView from '../components/database/BoardView';
import TagSelector from '../components/database/TagSelector';
import FilterPanel from '../components/database/FilterPanel';
import SearchBar from '../components/database/SearchBar';
import {
    getTopics,
    updateTopic as apiUpdateTopic,
    createTopic as apiCreateTopic,
    deleteTopic as apiDeleteTopic,
    getCustomColumns,
    addCustomColumn
} from '../services/api';

// const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY); // Removed

// Default saved views
const DEFAULT_VIEWS = [
    { id: 'all', name: 'All Topics', viewMode: 'table', filters: {} },
    { id: 'board', name: 'Board', viewMode: 'board', filters: {} },
    { id: 'calendar', name: 'Calendar', viewMode: 'calendar', filters: {} },
    { id: 'high-priority', name: 'High Priority', viewMode: 'table', filters: { priority: 'High RR' } },
    { id: 'pending', name: 'Pending', viewMode: 'table', filters: { completed: 'False' } },
    { id: 'completed', name: 'Completed', viewMode: 'table', filters: { completed: 'True' } }
];

const DEFAULT_SUBJECTS = [
    'Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 
    'Microbiology', 'Forensic Medicine', 'PSM', 'ENT', 'Ophthalmology', 
    'Medicine', 'Surgery', 'OBGYN', 'Pediatrics', 'Orthopedics', 
    'Dermatology', 'Psychiatry', 'Radiology', 'Anesthesia'
];

const Database = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentDatabase } = useDatabase();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSubject, setFilterSubject] = useState('All');
    // const [subjects, setSubjects] = useState([]); // Removed state
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [showAddRowModal, setShowAddRowModal] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [currentView, setCurrentView] = useState(DEFAULT_VIEWS[0]);
    const [calendarColumn, setCalendarColumn] = useState('plannedDate');
    const [boardGroupBy, setBoardGroupBy] = useState('completed');
    const [dateColumns, setDateColumns] = useState([]);
    const [customColumns, setCustomColumns] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState([]);
    const [newColumn, setNewColumn] = useState({ name: '', type: 'text' });
    const [isEditingId, setIsEditingId] = useState(null);
    const [newRow, setNewRow] = useState({
        topic_name: '',
        subject_category: '',
        priority: '',
        source: '',
        duration: '',
        planned_date: ''
    });

    const subjects = React.useMemo(() => {
        const topicSubjects = topics.map(t => t.subjectCategory).filter(Boolean);
        return [...new Set([...DEFAULT_SUBJECTS, ...topicSubjects])].sort();
    }, [topics]);

    const loadData = useCallback(async () => {
        if (!currentDatabase) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Load topics via API
            const topicsData = await getTopics(false, user?.id, currentDatabase?.id);
            setTopics(topicsData || []);

            // Detect date columns from first topic
            if (topicsData && topicsData.length > 0) {
                const detectedDateCols = [
                    { key: 'plannedDate', name: 'Planned Date' },
                    { key: 'mcqSolvingDate', name: 'MCQ Done' },
                    { key: 'firstRevisionDate', name: '1st Rev Date' },
                    { key: 'secondRevisionDate', name: '2nd Rev Date' }
                ];
                setDateColumns(detectedDateCols);
            }

            // Load custom columns
            try {
                const customColsData = await getCustomColumns();
                setCustomColumns(customColsData || []);
            } catch (colsErr) {
                console.log('Custom columns not available:', colsErr);
                setCustomColumns([]);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, [user, currentDatabase]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, currentDatabase, loadData]);

    // Update topic via API
    const updateTopic = async (id, field, value) => {
        try {
            // Map camelCase field to snake_case for API
            const fieldMap = {
                topicName: 'topic_name',
                subjectCategory: 'subject_category',
                plannedDate: 'planned_date',
                mcqSolvingDate: 'mcq_solving_date',
                firstRevisionDate: 'first_revision_date',
                secondRevisionDate: 'second_revision_date',
                pyqAsked: 'pyq_asked'
            };
            const apiField = fieldMap[field] || field;

            await apiUpdateTopic(id, { [apiField]: value });

            // Update local state
            setTopics(prev => prev.map(t =>
                t.id === id ? { ...t, [field]: value } : t
            ));
        } catch (err) {
            console.error('Error updating topic:', err);
            alert('Failed to update topic');
        }
    };

    // Update custom data
    const updateCustomData = async (id, columnName, value) => {
        const topic = topics.find(t => t.id === id);
        const currentCustomData = topic?.customData || {};
        const updatedData = { ...currentCustomData, [columnName]: value };

        try {
            await apiUpdateTopic(id, { custom_data: updatedData });

            setTopics(prev => prev.map(t =>
                t.id === id ? { ...t, customData: updatedData } : t
            ));
        } catch (err) {
            console.error('Error updating custom data:', err);
        }
    };

    // Add or Update row
    const handleSaveRow = async () => {
        try {
            if (isEditingId) {
                // Update existing
                await updateTopic(isEditingId, 'topicName', newRow.topic_name);
                await updateTopic(isEditingId, 'subjectCategory', newRow.subject_category);
                await updateTopic(isEditingId, 'priority', newRow.priority);
                await updateTopic(isEditingId, 'source', newRow.source);
                await updateTopic(isEditingId, 'duration', newRow.duration);
                await updateTopic(isEditingId, 'plannedDate', newRow.planned_date);
                
                // Reset
                setIsEditingId(null);
                setShowAddRowModal(false);
                setNewRow({ topic_name: '', subject_category: '', priority: '', source: '', duration: '', planned_date: '' });
                return;
            }

            // Create New
            const newTopicData = await apiCreateTopic({
                topic_name: newRow.topic_name,
                subject_category: newRow.subject_category,
                priority: newRow.priority,
                source: newRow.source,
                duration: newRow.duration,
                planned_date: newRow.planned_date,
                user_id: user?.id,
                database_id: currentDatabase?.id
            });

            // Transform to camelCase for local state
            const transformedTopic = {
                id: newTopicData.id,
                topicName: newTopicData.topic_name,
                subjectCategory: newTopicData.subject_category,
                priority: newTopicData.priority,
                source: newTopicData.source,
                duration: newTopicData.duration,
                plannedDate: newTopicData.planned_date,
                completed: newTopicData.completed,
                customData: newTopicData.custom_data
            };

            setTopics(prev => [...prev, transformedTopic]);
            setShowAddRowModal(false);
            setNewRow({ topic_name: '', subject_category: '', priority: '', source: '', duration: '', planned_date: '' });
        } catch (err) {
            console.error('Error saving row:', err);
            alert('Failed to save row');
        }
    };

    const handleDeleteTopic = async (id) => {
        if (!window.confirm('Are you sure you want to delete this topic?')) return;
        try {
            await apiDeleteTopic(id);
            setTopics(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error('Error deleting topic:', err);
            alert('Failed to delete topic');
        }
    };

    const handleEditClick = (topic) => {
        setIsEditingId(topic.id);
        setNewRow({
            topic_name: topic.topicName || '',
            subject_category: topic.subjectCategory || '',
            priority: topic.priority || '',
            source: topic.source || '',
            duration: topic.duration || '',
            planned_date: topic.plannedDate ? topic.plannedDate.split('T')[0] : ''
        });
        setShowAddRowModal(true);
    };

    // Add new column
    const addNewColumn = async () => {
        try {
            await addCustomColumn({
                column_name: newColumn.name.toLowerCase().replace(/\s+/g, '_'),
                column_type: newColumn.type,
                column_order: customColumns.length
            });

            // Reload custom columns
            const customColsData = await getCustomColumns();
            setCustomColumns(customColsData || []);

            setShowAddColumnModal(false);
            setNewColumn({ name: '', type: 'text' });
        } catch (err) {
            console.error('Error adding column:', err);
            alert('Failed to add column');
        }
    };


    const renderCustomColumnInput = (topic, column) => {
        const value = topic.customData?.[column.column_name];

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
    const filteredTopics = React.useMemo(() => {
        if (!topics) return [];
        let filtered = [...topics];

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.topicName?.toLowerCase().includes(query) ||
                t.subjectCategory?.toLowerCase().includes(query) ||
                t.source?.toLowerCase().includes(query) ||
                t.pyqAsked?.toLowerCase().includes(query)
            );
        }

        // Apply view-specific filters
        Object.keys(currentView.filters).forEach(key => {
            // Filter keys might still be snake_case in DEFAULT_VIEWS if not updated?
            // default views use 'priority', 'completed'. keys are fine.
            filtered = filtered.filter(t => t[key] === currentView.filters[key]);
        });

        // Apply subject filter
        if (filterSubject !== 'All') {
            filtered = filtered.filter(t => t.subjectCategory === filterSubject);
        }

        // Apply advanced filters
        advancedFilters.forEach((filter, index) => {
            if (!filter.column || !filter.condition) return;

            // Map column names to camelCase if they are built-in
            let columnKey = filter.column;
            if (columnKey === 'topic_name') columnKey = 'topicName';
            if (columnKey === 'subject_category') columnKey = 'subjectCategory';
            if (columnKey === 'planned_date') columnKey = 'plannedDate';

            const applyFilter = (t) => {
                const value = t[columnKey];
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, currentView, filterSubject, advancedFilters]);
    
    // Get current items
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = filteredTopics.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Scroll to top of table
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.scrollTop = 0;
    };

    // Handle search
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
    }, []);


    const handleViewChange = (view) => {
        setCurrentView(view);
    };

    // Mobile Card View Renderer
    const renderMobileCardView = () => (
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 p-2 pb-20">
                {currentItems.map(topic => (
                    <div key={topic.id} className="glass-card p-4 rounded-xl space-y-3 border border-[var(--border-subtle)] active:scale-[0.99] transition-transform">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-[var(--text-primary)] leading-tight mb-1">
                                    {topic.topicName || 'Untitled Topic'}
                                </h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {topic.subjectCategory && (
                                        <span 
                                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                            style={{
                                                backgroundColor: `${Utils.getSubjectColor(topic.subjectCategory)}20`,
                                                color: Utils.getSubjectColor(topic.subjectCategory)
                                            }}
                                        >
                                            {topic.subjectCategory}
                                        </span>
                                    )}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                        topic.priority === 'High RR' ? 'border-red-500/30 text-red-400' :
                                        topic.priority === 'Moderate RR' ? 'border-yellow-500/30 text-yellow-400' :
                                        'border-blue-500/30 text-blue-400'
                                    }`}>
                                        {topic.priority || 'No Priority'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/topic/${topic.id}`)}
                                className="p-2 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--primary)]"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase text-[var(--text-tertiary)] font-semibold">Planned</label>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <CalendarIcon size={12} className="text-[var(--text-secondary)]" />
                                    <span>{topic.plannedDate ? new Date(topic.plannedDate).toLocaleDateString() : '-'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase text-[var(--text-tertiary)] font-semibold">Status</label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={topic.completed === 'True'}
                                        onChange={(e) => updateTopic(topic.id, 'completed', e.target.checked ? 'True' : 'False')}
                                        className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-secondary)] checked:bg-[var(--primary)]"
                                    />
                                    <span className={`text-xs ${topic.completed === 'True' ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>
                                        {topic.completed === 'True' ? 'Completed' : 'Pending'}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
                {currentItems.length === 0 && (
                    <div className="text-center py-10 text-[var(--text-secondary)]">
                        <p>No topics found</p>
                    </div>
                )}
            </div>
            
            {/* Mobile Pagination */}
            <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between sticky bottom-0 z-10">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] disabled:opacity-50"
                >
                    <ChevronDown size={16} className="rotate-90" />
                </button>
                <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] disabled:opacity-50"
                >
                    <ChevronDown size={16} className="-rotate-90" />
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!currentDatabase) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center animate-fade-in">
                <div className="text-6xl mb-6">📚</div>
                <h3 className="text-2xl font-bold mb-3">No Database Selected</h3>
                <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                    Please select a database from the sidebar or create a new one to start tracking your topics.
                </p>
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
            <div className="flex flex-wrap items-center gap-4 px-1">
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
                                <option key={col.key} value={col.key}>{col.name}</option>
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
                            <option value="subjectCategory">Subject</option>
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
                <>
                    <div className="hidden md:flex flex-1 flex-col glass-card rounded-xl overflow-hidden">
                        <div className="flex-1 overflow-auto table-container">
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
                                    <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-32">1st Rev Status</th>
                                    <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-40">1st Rev Date</th>
                                    <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-32">2nd Rev Status</th>
                                    <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-40">2nd Rev Date</th>
                                    <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-32">Completed</th>
                                    <th className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase w-20">Actions</th>
                                    {/* Custom Columns */}
                                    {customColumns.map(col => (
                                        <th key={col.id} className="text-left p-3 font-semibold text-[var(--text-secondary)] text-xs uppercase min-w-[150px]">
                                            {col.column_name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((topic, idx) => (
                                    <tr
                                        key={topic.id}
                                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors"
                                    >
                                        <td className="p-3 text-[var(--text-tertiary)]">{topic.no || indexOfFirstItem + idx + 1}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={topic.topicName || ''}
                                                    onChange={(e) => updateTopic(topic.id, 'topicName', e.target.value)}
                                                    className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-sm focus:outline-none focus:border-[var(--primary)] font-medium text-[var(--text-primary)]"
                                                />
                                                {topic.pyqAsked && (
                                                    <div className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-1 px-1">
                                                        PYQ: {topic.pyqAsked}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => navigate(`/topic/${topic.id}`)}
                                                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:bg-[var(--bg-card-hover)] rounded transition-colors"
                                                title="Open Details"
                                            >
                                                <LayoutGrid size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                list={`subject-list-${topic.id}`}
                                                value={topic.subjectCategory || ''}
                                                onChange={(e) => updateTopic(topic.id, 'subjectCategory', e.target.value)}
                                                className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs font-medium focus:outline-none focus:border-[var(--primary)] pr-6"
                                                style={{
                                                    color: topic.subjectCategory ? Utils.getSubjectColor(topic.subjectCategory) : 'inherit'
                                                }}
                                                placeholder="Select or type..."
                                            />
                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                                            <datalist id={`subject-list-${topic.id}`}>
                                                {subjects.map(subject => (
                                                    <option key={subject} value={subject} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <select
                                            value={topic.priority || ''}
                                            onChange={(e) => updateTopic(topic.id, 'priority', e.target.value)}
                                            className={`w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs font-medium focus:outline-none focus:border-[var(--primary)] ${
                                                topic.priority === 'High RR' ? 'text-red-400' :
                                                topic.priority === 'Moderate RR' ? 'text-yellow-400' :
                                                topic.priority === 'Low RR' ? 'text-blue-400' : ''
                                            }`}
                                        >
                                            <option value="">Select Priority</option>
                                            <option value="High RR">High RR</option>
                                            <option value="Moderate RR">Moderate RR</option>
                                            <option value="Low RR">Low RR</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="text"
                                            value={topic.source || ''}
                                            onChange={(e) => updateTopic(topic.id, 'source', e.target.value)}
                                            className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="Source"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={topic.duration || ''}
                                                onChange={(e) => updateTopic(topic.id, 'duration', e.target.value)}
                                                className="w-16 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)]"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)]">h</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="date"
                                            value={topic.plannedDate?.split('T')[0] || ''}
                                            onChange={(e) => updateTopic(topic.id, 'plannedDate', e.target.value)}
                                            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)] w-full"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="date"
                                            value={topic.mcqSolvingDate?.split('T')[0] || ''}
                                            onChange={(e) => updateTopic(topic.id, 'mcqSolvingDate', e.target.value)}
                                            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)] w-full"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={topic.firstRevision === 'TRUE' || topic.firstRevision === 'True'}
                                                onChange={(e) => updateTopic(topic.id, 'firstRevision', e.target.checked ? 'TRUE' : 'FALSE')}
                                                className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-secondary)] checked:bg-[var(--primary)]"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {(topic.firstRevision === 'TRUE' || topic.firstRevision === 'True') ? 'Done' : 'Pending'}
                                            </span>
                                        </label>
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="date"
                                            value={topic.firstRevisionDate?.split('T')[0] || ''}
                                            onChange={(e) => updateTopic(topic.id, 'firstRevisionDate', e.target.value)}
                                            className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded text-xs focus:outline-none focus:border-[var(--primary)] w-full"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={topic.secondRevision === 'TRUE' || topic.secondRevision === 'True'}
                                                onChange={(e) => updateTopic(topic.id, 'secondRevision', e.target.checked ? 'TRUE' : 'FALSE')}
                                                className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-secondary)] checked:bg-[var(--primary)]"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {(topic.secondRevision === 'TRUE' || topic.secondRevision === 'True') ? 'Done' : 'Pending'}
                                            </span>
                                        </label>
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="date"
                                            value={topic.secondRevisionDate?.split('T')[0] || ''}
                                            onChange={(e) => updateTopic(topic.id, 'secondRevisionDate', e.target.value)}
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
                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditClick(topic)}
                                                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--primary)] hover:bg-[var(--bg-card-hover)] rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTopic(topic.id)}
                                                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--bg-card-hover)] rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
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
                {/* Pagination Controls */}
                <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
                    <div className="text-sm text-[var(--text-secondary)]">
                        Showing {filteredTopics.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredTopics.length)} of {filteredTopics.length} topics
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
                                        currentPage === pageNum
                                            ? 'bg-[var(--primary)] text-white'
                                            : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
            {renderMobileCardView()}
            </>
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

            {/* Add/Edit Row Modal */}
            {showAddRowModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">{isEditingId ? 'Edit Topic' : 'Add New Topic'}</h3>
                            <button
                                onClick={() => {
                                    setShowAddRowModal(false);
                                    setIsEditingId(null);
                                    setNewRow({ topic_name: '', subject_category: '', priority: '', source: '', duration: '', planned_date: '' });
                                }}
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
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="subject-options"
                                        value={newRow.subject_category}
                                        onChange={(e) => setNewRow({ ...newRow, subject_category: e.target.value })}
                                        placeholder="Select or type new subject..."
                                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--primary)] pr-8"
                                    />
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                                    <datalist id="subject-options">
                                        {subjects.map(subject => (
                                            <option key={subject} value={subject} />
                                        ))}
                                    </datalist>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                    Type a new subject to create it, or select from existing.
                                </p>
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
                                    onClick={() => {
                                        setShowAddRowModal(false);
                                        setIsEditingId(null);
                                        setNewRow({ topic_name: '', subject_category: '', priority: '', source: '', duration: '', planned_date: '' });
                                    }}
                                    className="flex-1 btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveRow}
                                    disabled={!newRow.topic_name}
                                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isEditingId ? 'Save Changes' : 'Add Topic'}
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
