import axios from 'axios';
import { supabase } from '../lib/supabase'; // Import Supabase client
import { CONFIG } from '../config';

// Base axios instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', // Use env var in prod, relative path (proxy) in dev
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Base API Class with shared methods
 */
class BaseAPI {
    constructor() {
        this.cache = {
            data: null,
            timestamp: null
        };
    }

    isCacheValid() {
        if (!this.cache.data || !this.cache.timestamp) return false;
        return (Date.now() - this.cache.timestamp) < CONFIG.CACHE_DURATION;
    }

    async initializeUser(userId) {
        throw new Error(`initializeUser not supported for this API: ${userId}`);
    }

    async generatePrompt(stats, type) {
        const response = await api.post('/api/generate-prompt', { stats, type });
        return response.data;
    }

    /**
     * Convert blocks to HTML
     * Reused from legacy code for compatibility
     */
    blocksToHtml(blocks) {
        if (!blocks || blocks.length === 0) {
            return '<p style="color: var(--text-tertiary); font-style: italic;">This page has no content yet.</p>';
        }

        return blocks.map(block => {
            const type = block.type;
            const content = block[type];
            if (!content) return '';

            // Extract text from rich text array
            const getText = (richTextArray) => {
                if (!richTextArray || richTextArray.length === 0) return '';
                return richTextArray.map(rt => {
                    let text = rt.plain_text || '';
                    if (rt.annotations) {
                        if (rt.annotations.bold) text = `<strong>${text}</strong>`;
                        if (rt.annotations.italic) text = `<em>${text}</em>`;
                        if (rt.annotations.code) text = `<code style="background: var(--bg-card); padding: 0.2rem 0.4rem; border-radius: 3px;">${text}</code>`;
                        if (rt.annotations.strikethrough) text = `<del>${text}</del>`;
                        if (rt.annotations.underline) text = `<u>${text}</u>`;
                    }
                    return text;
                }).join('');
            };

            const blockIdAttr = `data-block-id="${block.id}"`;

            switch (type) {
                case 'paragraph':
                    return `<p ${blockIdAttr} class="notion-block paragraph-block" style="margin-bottom: 0.75rem;">${getText(content.rich_text)}</p>`;

                case 'heading_1':
                    return `<h1 ${blockIdAttr} class="notion-block heading-block" style="font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem;">${getText(content.rich_text)}</h1>`;

                case 'heading_2':
                    return `<h2 ${blockIdAttr} class="notion-block heading-block" style="font-size: 1.5rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.75rem;">${getText(content.rich_text)}</h2>`;

                case 'heading_3':
                    return `<h3 ${blockIdAttr} class="notion-block heading-block" style="font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">${getText(content.rich_text)}</h3>`;

                case 'bulleted_list_item':
                    return `<li ${blockIdAttr} class="notion-block list-item-block" style="margin-left: 1.5rem; margin-bottom: 0.25rem; list-style: disc;">${getText(content.rich_text)}</li>`;

                case 'numbered_list_item':
                    return `<li ${blockIdAttr} class="notion-block list-item-block" style="margin-left: 1.5rem; margin-bottom: 0.25rem; list-style: decimal;">${getText(content.rich_text)}</li>`;

                case 'to_do': {
                    const checked = content.checked ? 'checked' : '';
                    return `<div ${blockIdAttr} class="notion-block todo-block" style="margin-bottom: 0.5rem;"><input type="checkbox" ${checked} disabled style="margin-right: 0.5rem;">${getText(content.rich_text)}</div>`;
                }

                case 'toggle':
                    return `<details ${blockIdAttr} class="notion-block toggle-block" style="margin-bottom: 0.75rem; padding: 0.5rem; background: var(--bg-card); border-radius: var(--radius-md);"><summary style="cursor: pointer; font-weight: 500;">${getText(content.rich_text)}</summary></details>`;

                case 'code':
                    return `<pre ${blockIdAttr} class="notion-block code-block" style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); overflow-x: auto; margin-bottom: 1rem;"><code>${getText(content.rich_text)}</code></pre>`;

                case 'quote':
                    return `<blockquote ${blockIdAttr} class="notion-block quote-block" style="border-left: 3px solid var(--primary); padding-left: 1rem; margin: 1rem 0; font-style: italic; color: var(--text-secondary);">${getText(content.rich_text)}</blockquote>`;

                case 'divider':
                    return `<hr ${blockIdAttr} class="notion-block divider-block" style="border: none; border-top: 1px solid var(--border-primary); margin: 1.5rem 0;">`;

                case 'callout': {
                    const icon = content.icon?.emoji || '💡';
                    return `<div ${blockIdAttr} class="notion-block callout-block" style="background: var(--bg-card); border-left: 3px solid var(--primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; display: flex; gap: 0.75rem;"><span style="font-size: 1.25rem;">${icon}</span><div class="callout-content">${getText(content.rich_text)}</div></div>`;
                }

                default:
                    if (type === 'child_page') {
                        const pageTitle = content?.title || 'Untitled Page';
                        const pageId = block.id;
                        return `
                                 <div class="child-page-block" style="margin-bottom: 1rem; border: 1px solid var(--border-primary); border-radius: var(--radius-md); overflow: hidden;">
                                     <div class="child-page-header" onclick="window.toggleChildPage('${pageId}')" style="padding: 1rem; background: var(--bg-card); cursor: pointer; display: flex; align-items: center; gap: 0.5rem; user-select: none; transition: background 0.2s;">
                                         <span class="toggle-icon" id="toggle-${pageId}" style="transition: transform 0.2s; display: inline-block; width: 1rem;">▶</span>
                                         <span style="font-weight: 600;">📄 ${pageTitle}</span>
                                         <span style="margin-left: auto; font-size: 0.75rem; color: var(--text-tertiary);">Click to view content</span>
                                     </div>
                                     <div class="child-page-content" id="content-${pageId}" style="display: none; padding: 1.5rem; border-top: 1px solid var(--border-primary); background: var(--bg-primary);">
                                         <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                                             <div class="spinner" style="width: 24px; height: 24px; border-width: 3px; margin: 0 auto;"></div>
                                             <div style="margin-top: 1rem; font-size: 0.875rem;">Loading child page content...</div>
                                         </div>
                                     </div>
                                 </div>
                             `;
                    }
                    return `<div style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.5rem;">[${type}]</div>`;
            }
        }).join('');
    }
}

/**
 * Notion API Implementation
 */
class NotionAPI extends BaseAPI {
    constructor() {
        super();
        this.baseUrl = '/api/notion';
        this.headers = {
            'Authorization': `Bearer ${CONFIG.NOTION_TOKEN}`,
            'Notion-Version': CONFIG.NOTION_VERSION,
            'Content-Type': 'application/json'
        };
    }

    async queryDatabase(useCache = true) {
        if (useCache && this.isCacheValid()) return this.cache.data;

        try {
            let allResults = [];
            let hasMore = true;
            let startCursor = undefined;

            while (hasMore) {
                const response = await api.post(`${this.baseUrl}/databases/${CONFIG.DATABASE_ID}/query`, {
                    page_size: CONFIG.PAGE_SIZE,
                    start_cursor: startCursor
                }, { headers: this.headers });

                allResults = allResults.concat(response.data.results);
                hasMore = response.data.has_more;
                startCursor = response.data.next_cursor;
            }

            const transformed = this.transformTopics(allResults);
            this.cache = { data: transformed, timestamp: Date.now() };
            return transformed;
        } catch (error) {
            console.error('Notion API Error:', error);
            throw error;
        }
    }

    transformTopics(rawData) {
        return rawData.map(page => {
            const props = page.properties;

            const getTitle = (p) => p?.title?.[0]?.plain_text || '';
            const getSelect = (p) => p?.select?.name || null;
            const getNumber = (p) => p?.number;
            const getDate = (p) => p?.date?.start || null;
            const getRichText = (p) => p?.rich_text?.map(t => t.plain_text).join('') || '';

            return {
                id: page.id,
                url: page.url,
                createdTime: page.created_time,
                lastEditedTime: page.last_edited_time,
                topicName: getTitle(props['Topic Name']),
                subjectCategory: getSelect(props['Subject Category']),
                no: getNumber(props['No.']),
                priority: getSelect(props['Priority']),
                source: getSelect(props['Source to be Studied']),
                duration: getNumber(props['Duration to be Studied']),
                plannedDate: getDate(props['Planned Date']),
                mcqSolvingDate: getDate(props['mcq solving date']),
                firstRevisionDate: getDate(props['1st revision date']),
                completed: getSelect(props['Completed']),
                firstRevision: getSelect(props['1st Revision']),
                secondRevision: getSelect(props['2nd Revision']),
                timesRepeated: getNumber(props['Times Repeated']),
                pyqAsked: getRichText(props['PYQ Asked'])
            };
        });
    }

    // ... Implement other methods (updateTopic, etc.) if needed in full migration.
    // For now, focus on reading.

    async markComplete(pageId) {
        return this.updateTopic(pageId, {
            'Completed': { select: { name: 'True' } }
        });
    }

    async updateTopic(pageId, properties) {
        const response = await api.patch(`${this.baseUrl}/pages/${pageId}`, { properties }, { headers: this.headers });
        this.cache.timestamp = null; // Invalidate cache
        return response.data;
    }

    async getPageBlocks(pageId) {
        try {
            let allBlocks = [];
            let hasMore = true;
            let startCursor = undefined;

            while (hasMore) {
                const url = `${this.baseUrl}/blocks/${pageId}/children${startCursor ? `?start_cursor=${startCursor}` : ''}`;
                const response = await api.get(url, { headers: this.headers });

                allBlocks = allBlocks.concat(response.data.results);
                hasMore = response.data.has_more;
                startCursor = response.data.next_cursor;
            }
            return allBlocks;
        } catch (error) {
            console.error('Error fetching page blocks:', error);
            throw error;
        }
    }
    async updateBlock(blockId, blockType, newContent) {
        // Construct Notion-compatible payload
        const payload = {
            [blockType]: {
                rich_text: [{
                    text: { content: newContent }
                }]
            }
        };
        const response = await api.patch(`${this.baseUrl}/blocks/${blockId}`, payload, { headers: this.headers });
        return response.data;
    }

    async getRevisionInsights(topics) {
        console.log('📡 NotionAPI: Requesting insights for', topics?.length, 'topics');
        const response = await api.post('/api/revision-insights', { topics });
        return response.data;
    }

    async markRevisionComplete(id, revisionNumber) {
        const today = new Date().toISOString().split('T')[0];
        const properties = {};
        if (revisionNumber === 1) {
            properties['1st Revision'] = { select: { name: 'Done' } }; // Adjust value based on Notion Select options
            properties['1st revision date'] = { date: { start: today } };
        } else if (revisionNumber === 2) {
            properties['2nd Revision'] = { select: { name: 'Done' } };
            // properties['2nd revision date'] = { date: { start: today } }; // If exists in Notion
        }
        return this.updateTopic(id, properties);
    }
}

/**
 * Supabase API Implementation
 */
class SupabaseAPI extends BaseAPI {
    constructor() {
        super();
        this.baseUrl = '/api/supabase';
        this.headers = { 'Content-Type': 'application/json' }; // Auth handled by backend via custom endpoints usually, or we pass headers? 
        // Legacy supabase_api.js calls '/api/supabase/...' which are proxied to Python backend.
        // Python backend likely uses the SUPABASE_URL/KEY from env or config.
    }

    async queryDatabase(useCache = true, userId = null, databaseId = null) {
        // Cache key should probably include userId, but for now assuming single user session per load
        if (useCache && this.isCacheValid()) return this.cache.data;

        try {
            const params = { user_id: userId };
            if (databaseId) params.database_id = databaseId;
            
            const response = await api.get(`${this.baseUrl}/topics`, { params });
            const transformed = this.transformTopics(response.data);
            this.cache = { data: transformed, timestamp: Date.now() };
            return transformed;
        } catch (error) {
            console.error('Supabase API Error:', error);
            throw error;
        }
    }

    async initializeUser(userId, databaseId) {
        try {
            const payload = { user_id: userId };
            if (databaseId) payload.database_id = databaseId;
            const response = await api.post(`${this.baseUrl}/initialize`, payload);
            this.cache.timestamp = null; 
            return response.data;
        } catch (error) {
            console.warn("Backend initialization failed, trying client-side fallback...", error);
            
            // Client-Side Fallback (Vercel Support)
            try {
                // 1. Check if DB exists
                const { data: dbs } = await supabase
                    .from('user_databases')
                    .select('*')
                    .eq('user_id', userId);

                let targetDbId = databaseId;
                
                if (!dbs || dbs.length === 0) {
                     // Create default DB
                     const { data: newDb, error: dbError } = await supabase
                        .from('user_databases')
                        .insert([{
                            user_id: userId,
                            name: 'Default Study Plan',
                            is_default: true
                        }])
                        .select()
                        .single();
                    
                    if (dbError) throw dbError;
                    targetDbId = newDb.id;
                    console.log("Created default database locally:", targetDbId);
                } else if (!targetDbId) {
                    targetDbId = dbs[0].id;
                }

                // 2. Check if topics exist
                const { count } = await supabase
                    .from('topics')
                    .select('*', { count: 'exact', head: true })
                    .eq('database_id', targetDbId);

                if (count === 0) {
                    console.log("Initializing default topics locally...");
                    // Insert minimal default topics to get started
                    const defaultTopics = [
                        { topic_name: 'General Anatomy', subject_category: 'Anatomy', priority: 'High', duration: 120 },
                        { topic_name: 'Upper Limb', subject_category: 'Anatomy', priority: 'Medium', duration: 90 },
                        { topic_name: 'General Physiology', subject_category: 'Physiology', priority: 'High', duration: 120 },
                        { topic_name: 'Nerve Muscle Physiology', subject_category: 'Physiology', priority: 'Medium', duration: 60 },
                        { topic_name: 'General Pathology', subject_category: 'Pathology', priority: 'High', duration: 120 },
                        { topic_name: 'General Pharmacology', subject_category: 'Pharmacology', priority: 'High', duration: 120 }
                    ].map(t => ({
                        ...t,
                        user_id: userId,
                        database_id: targetDbId,
                        completed: 'False',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }));

                    const { error: insertError } = await supabase.from('topics').insert(defaultTopics);
                    if (insertError) throw insertError;
                    console.log("Initialized default topics.");
                }

                return { success: true, message: "Initialized locally" };

            } catch (fallbackError) {
                console.error("Client-side initialization failed:", fallbackError);
                throw fallbackError; // Rethrow if fallback also fails
            }
        }
    }

    transformTopics(rawData) {
        return rawData.map(row => ({
            id: row.id,
            notionId: row.notion_id,
            url: row.notion_id ? `https://notion.so/${row.notion_id.replace(/-/g, '')}` : null,
            createdTime: row.created_at,
            lastEditedTime: row.updated_at,
            topicName: row.topic_name,
            subjectCategory: row.subject_category,
            no: row.no,
            priority: row.priority,
            source: row.source,
            duration: row.duration,
            plannedDate: row.planned_date,
            mcqSolvingDate: row.mcq_solving_date,
            firstRevisionDate: row.first_revision_date,
            secondRevisionDate: row.second_revision_date,
            completed: row.completed,
            firstRevision: row.first_revision,
            secondRevision: row.second_revision,
            timesRepeated: row.times_repeated,
            pyqAsked: row.pyq_asked,
            customData: row.custom_data
        }));
    }

    async createTopic(data) {
        // Build payload matching DB schema
        const payload = this.buildPayload(data);
        // Add non-mapped fields if present in data but not handled by buildPayload for creation
        if (data.topic_name) payload.topic_name = data.topic_name;
        if (data.topicName) payload.topic_name = data.topicName; // Support camelCase

        if (data.subject_category) payload.subject_category = data.subject_category;
        if (data.subjectCategory) payload.subject_category = data.subjectCategory;

        if (data.priority) payload.priority = data.priority;

        if (data.source) payload.source = data.source;

        if (data.duration) payload.duration = data.duration;

        if (data.planned_date) payload.planned_date = data.planned_date;
        if (data.plannedDate) payload.planned_date = data.plannedDate;

        if (data.custom_data) payload.custom_data = data.custom_data;
        if (data.customData) payload.custom_data = data.customData;

        if (data.parentId) payload.parent_id = data.parentId;
        if (data.parent_id) payload.parent_id = data.parent_id;

        if (data.user_id) payload.user_id = data.user_id;
        if (data.userId) payload.user_id = data.userId;

        if (data.database_id) payload.database_id = data.database_id;
        if (data.databaseId) payload.database_id = data.databaseId;

        const response = await api.post(`${this.baseUrl}/topics`, payload);
        this.cache.timestamp = null;
        return response.data;
    }

    async updateTopic(id, data) {
        // Build payload matching DB schema
        const payload = this.buildPayload(data);

        // Add non-mapped fields or override if provided
        if (data.topic_name) payload.topic_name = data.topic_name;
        if (data.topicName) payload.topic_name = data.topicName;

        if (data.subject_category) payload.subject_category = data.subject_category;
        if (data.subjectCategory) payload.subject_category = data.subjectCategory;

        if (data.priority) payload.priority = data.priority;

        if (data.source) payload.source = data.source;

        if (data.duration) payload.duration = data.duration;

        if (data.planned_date) payload.planned_date = data.planned_date;
        if (data.plannedDate) payload.planned_date = data.plannedDate;

        if (data.mcq_solving_date) payload.mcq_solving_date = data.mcq_solving_date;
        if (data.mcqSolvingDate) payload.mcq_solving_date = data.mcqSolvingDate;

        if (data.first_revision_date) payload.first_revision_date = data.first_revision_date;
        if (data.firstRevisionDate) payload.first_revision_date = data.firstRevisionDate;

        if (data.pyq_asked) payload.pyq_asked = data.pyq_asked;
        if (data.pyqAsked) payload.pyq_asked = data.pyqAsked;

        if (data.notes) payload.notes = data.notes;

        if (data.custom_data) payload.custom_data = data.custom_data;
        if (data.customData) payload.custom_data = data.customData;

        // If data contains keys that are likely snake_case already and not covered above, pass them?
        // buildPayload covers completed, revisions.

        const response = await api.patch(`${this.baseUrl}/topics/${id}`, payload);
        this.cache.timestamp = null;
        return response.data;
    }

    async deleteTopic(id) {
        const response = await api.delete(`${this.baseUrl}/topics/${id}`);
        this.cache.timestamp = null;
        return response.data;
    }

    buildPayload(data) {
        // Helper to convert internal camelCase model to snake_case DB columns if needed
        // For now, most inputs from Database.jsx are already snake_case or handled directly.
        // This is kept for compatibility with markComplete/markRevisionComplete which pass camelCase wrappers.
        const payload = {};
        if (data.completed !== undefined) payload.completed = data.completed;
        if (data.firstRevision) payload.first_revision = data.firstRevision;
        if (data.firstRevisionDate) payload.first_revision_date = data.firstRevisionDate;
        if (data.secondRevision) payload.second_revision = data.secondRevision;
        if (data.secondRevisionDate) payload.second_revision_date = data.secondRevisionDate;
        return payload;
    }

    async getPageBlocks(pageId) {
        const response = await api.get(`${this.baseUrl}/content/${pageId}`);
        return response.data.results || [];
    }

    async updateBlock(blockId, blockType, newContent) {
        const payload = {
            [blockType]: {
                rich_text: [{
                    text: { content: newContent }
                }]
            }
        };
        const response = await api.patch(`${this.baseUrl}/blocks/${blockId}`, payload);
        return response.data;
    }

    async getTopic(id) {
        const response = await api.get(`${this.baseUrl}/topics/${id}`);
        // Transform snake_case to camelCase
        const row = response.data;
        if (!row) return null;
        return {
            id: row.id,
            parentId: row.parent_id,
            notionId: row.notion_id,
            topicName: row.topic_name,
            subjectCategory: row.subject_category,
            priority: row.priority,
            source: row.source,
            duration: row.duration,
            plannedDate: row.planned_date,
            mcqSolvingDate: row.mcq_solving_date,
            firstRevisionDate: row.first_revision_date,
            completed: row.completed,
            firstRevision: row.first_revision,
            secondRevision: row.second_revision,
            notes: row.notes,
            pyqAsked: row.pyq_asked,
            customData: row.custom_data
        };
    }

    async getTopicChildren(id) {
        const response = await api.get(`${this.baseUrl}/topics/${id}/children`);
        return response.data.map(row => ({
            id: row.id,
            topicName: row.topic_name,
            subjectCategory: row.subject_category,
            // Add other fields if needed for list view
        }));
    }

    async getRevisionInsights(topics) {
        console.log('📡 SupabaseAPI: Requesting insights for', topics?.length, 'topics');
        const response = await api.post('/api/revision-insights', { topics });
        console.log('📡 SupabaseAPI: Received insights:', response.data);
        return response.data;
    }

    async markRevisionComplete(id, revisionNumber) {
        const today = new Date().toISOString().split('T')[0];
        const data = {};
        if (revisionNumber === 1) {
            data.first_revision = 'TRUE';
            data.first_revision_date = today;
        } else if (revisionNumber === 2) {
            data.second_revision = 'TRUE';
            data.second_revision_date = today;
        }
        return this.updateTopic(id, data);
    }

    // Schema & Views
    async getCustomColumns() {
        // In python backend this was getting schema via RPC or just returning formatted list.
        // Our node backend has /api/supabase/schema which calls get_table_info.
        // Wait, Database.jsx expects "custom_column_definitions" table rows.
        // The Node backend didn't implement a direct "get custom definitions" route, 
        // but let's check index.js.
        // Node index.js doesn't have a route for 'custom_column_definitions' table select.
        // We should add it to index.js or mock it. 
        // Actually, let's implement a generic query or specific route in Node.
        // For now, let's assume we will add /api/supabase/custom-columns to Node.js.
        // Or re-use /api/supabase/schema/column for management.

        // Let's try to fetch from a new endpoint we will create.
        const response = await api.get(`${this.baseUrl}/custom-columns`);
        return response.data;
    }

    async addCustomColumn(columnData) {
        const response = await api.post(`${this.baseUrl}/custom-columns`, columnData);
        return response.data;
    }

    async getDatabaseViews() {
        const response = await api.get(`${this.baseUrl}/views`);
        return response.data;
    }

    async saveDatabaseView(viewData) {
        const response = await api.post(`${this.baseUrl}/views`, viewData);
        return response.data;
    }

    async generateSchedule(params) {
        // params: { user_id, startDate, topicsPerDay, strategy }
        const response = await api.post('/api/generate-schedule', params);
        this.cache.timestamp = null; // Invalidate cache
        return response.data;
    }

    async reschedule(params) {
        // params: { user_id, database_id, prompt }
        const response = await api.post('/api/reschedule', params);
        this.cache.timestamp = null; // Invalidate cache
        return response.data;
    }

    async clearSchedule(userId, databaseId) {
        const response = await api.post('/api/clear-schedule', { user_id: userId, database_id: databaseId });
        this.cache.timestamp = null; // Invalidate cache
        return response.data;
    }

}

// Select API based on config
const backendAPI = (CONFIG.DATA_SOURCE === 'supabase' || CONFIG.DATA_SOURCE === 'hybrid')
    ? new SupabaseAPI()
    : new NotionAPI();

// Export accessors
export const getTopics = (useCache, userId, databaseId) => backendAPI.queryDatabase(useCache, userId, databaseId);
export const initializeUser = async (userId, databaseId = null) => {
    try {
        if (!databaseId) {
            // ...
        }
        // ...
    } catch (error) {
        console.error('Initialize user error:', error);
        throw error;
    }
};
export const markComplete = (id) => backendAPI.markComplete(id);
export const getPageBlocks = (pageId) => backendAPI.getPageBlocks(pageId);
export const updateBlock = (blockId, blockType, content) => backendAPI.updateBlock(blockId, blockType, content);
export const markRevisionComplete = (id, revNum) => backendAPI.markRevisionComplete(id, revNum);
export const getRevisionInsights = (topics) => backendAPI.getRevisionInsights(topics);
export const blocksToHtml = (blocks) => backendAPI.blocksToHtml(blocks);

export const createTopic = (data) => backendAPI.createTopic(data);
export const updateTopic = (id, data) => backendAPI.updateTopic(id, data);
export const deleteTopic = (id) => backendAPI.deleteTopic(id);
export const getTopic = (id) => backendAPI.getTopic(id);
export const getTopicChildren = (id) => backendAPI.getTopicChildren(id);

export const getCustomColumns = () => backendAPI.getCustomColumns();
export const addCustomColumn = (data) => backendAPI.addCustomColumn(data);
export const getDatabaseViews = () => backendAPI.getDatabaseViews();
export const saveDatabaseView = (data) => backendAPI.saveDatabaseView(data);
export const generateSchedule = (params) => backendAPI.generateSchedule(params);
export const reschedule = (params) => backendAPI.reschedule(params);
export const clearSchedule = (userId, databaseId) => backendAPI.clearSchedule(userId, databaseId);
export const generatePrompt = (stats, type) => backendAPI.generatePrompt(stats, type);

export const askAI = async (prompt, userId, databaseId) => {
    const response = await api.post('/api/ask-ai', { prompt, user_id: userId, database_id: databaseId });
    return response.data;
};

export const syncFromNotion = async () => {
    const response = await api.post('/api/supabase/sync-from-notion');
    return response.data;
};

// Payment & Subscription
export const startTrial = async (userId) => {
    const response = await api.post('/api/payment/start-trial', { user_id: userId });
    return response.data;
};

export const getPaymentKey = async () => {
    const response = await api.get('/api/payment/get-key');
    return response.data;
};

export const createPaymentOrder = async (amount) => {
    const response = await api.post('/api/payment/create-order', { amount });
    return response.data;
};

export const verifyPayment = async (paymentData) => {
    const response = await api.post('/api/payment/verify', paymentData);
    return response.data;
};

export default backendAPI;
