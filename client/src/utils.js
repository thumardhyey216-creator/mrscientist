/**
 * Utility Functions
 * Helper functions used throughout the application
 */
import { CONFIG } from './config';

export const Utils = {
    /**
     * Format date to readable string
     */
    formatDate(dateString) {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Get relative time (e.g., "2 days ago")
     */
    getRelativeTime(dateString) {
        if (!dateString) return 'Never';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    },

    /**
     * Check if date is today
     */
    isToday(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    /**
     * Check if date is overdue
     */
    isOverdue(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    },

    /**
     * Calculate days between dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Format duration (hours to readable string)
     */
    formatDuration(hours) {
        if (!hours) return 'Not set';
        if (hours < 1) {
            const minutes = Math.round(hours * 60);
            return `${minutes} min`;
        }
        return `${hours}h`;
    },

    /**
     * Get color for subject category
     */
    getSubjectColor(category) {
        if (!category) return CONFIG.SUBJECT_COLORS.default;
        return CONFIG.SUBJECT_COLORS[category] || CONFIG.SUBJECT_COLORS.default;
    },

    /**
     * Get color for priority
     */
    getPriorityColor(priority) {
        if (!priority) return CONFIG.PRIORITY_COLORS['Low RR'];
        return CONFIG.PRIORITY_COLORS[priority] || CONFIG.PRIORITY_COLORS['Low RR'];
    },

    /**
     * Calculate completion percentage
     */
    calculatePercentage(completed, total) {
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    },

    /**
     * Group array by key
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'Uncategorized';
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },

    /**
     * Filter topics by criteria
     */
    filterTopics(topics, criteria) {
        return topics.filter(topic => {
            // Filter by completion status
            if (criteria.completed !== undefined) {
                const isCompleted = topic.completed === 'True';
                if (criteria.completed !== isCompleted) return false;
            }

            // Filter by subject
            if (criteria.subject && topic.subjectCategory !== criteria.subject) {
                return false;
            }

            // Filter by priority
            if (criteria.priority && topic.priority !== criteria.priority) {
                return false;
            }

            // Filter by date range
            if (criteria.startDate && topic.plannedDate) {
                if (new Date(topic.plannedDate) < new Date(criteria.startDate)) {
                    return false;
                }
            }
            if (criteria.endDate && topic.plannedDate) {
                if (new Date(topic.plannedDate) > new Date(criteria.endDate)) {
                    return false;
                }
            }

            // Filter by search query
            if (criteria.search) {
                const query = criteria.search.toLowerCase();
                return topic.topicName.toLowerCase().includes(query) ||
                    (topic.subjectCategory && topic.subjectCategory.toLowerCase().includes(query)) ||
                    (topic.pyqAsked && topic.pyqAsked.toLowerCase().includes(query));
            }

            return true;
        });
    },

    /**
     * Sort topics
     */
    sortTopics(topics, sortBy = 'topicName', order = 'asc') {
        const sorted = [...topics].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Handle null/undefined
            if (aVal === null || aVal === undefined) return order === 'asc' ? 1 : -1;
            if (bVal === null || bVal === undefined) return order === 'asc' ? -1 : 1;

            // String comparison
            if (typeof aVal === 'string') {
                return order === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            // Number/Date comparison
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return sorted;
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Calculate statistics from topics
     */
    calculateStats(topics) {
        const total = topics.length;
        const completed = topics.filter(t => t.completed === 'True').length;
        const remaining = total - completed;
        const percentage = this.calculatePercentage(completed, total);

        // Calculate total hours
        const totalHours = topics.reduce((sum, t) => sum + (t.duration || 0), 0);
        const completedHours = topics
            .filter(t => t.completed === 'True')
            .reduce((sum, t) => sum + (t.duration || 0), 0);

        // Priority breakdown
        const highPriority = topics.filter(t =>
            t.priority === 'High RR' && t.completed !== 'True'
        ).length;

        // Revision needed
        const needsFirstRevision = topics.filter(t =>
            t.completed === 'True' && !t.firstRevisionDate
        ).length;
        const needsSecondRevision = topics.filter(t =>
            t.firstRevisionDate && t.secondRevision !== 'TRUE'
        ).length;

        // Topics due today
        const dueToday = topics.filter(t =>
            this.isToday(t.plannedDate) && t.completed !== 'True'
        ).length;

        // Overdue topics
        const overdue = topics.filter(t =>
            this.isOverdue(t.plannedDate) && t.completed !== 'True'
        ).length;

        return {
            total,
            completed,
            remaining,
            percentage,
            totalHours,
            completedHours,
            highPriority,
            needsFirstRevision,
            needsSecondRevision,
            dueToday,
            overdue
        };
    },

    /**
     * Generate random ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Truncate text
     */
    truncate(text, length = 50) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substr(0, length) + '...';
    }
};
