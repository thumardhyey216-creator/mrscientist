import axios from 'axios';
import { CONFIG } from '../config';

// Base axios instance
const api = axios.create({
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

                case 'to_do':
                    const checked = content.checked ? 'checked' : '';
                    return `<div ${blockIdAttr} class="notion-block todo-block" style="margin-bottom: 0.5rem;"><input type="checkbox" ${checked} disabled style="margin-right: 0.5rem;">${getText(content.rich_text)}</div>`;

                case 'toggle':
                    return `<details ${blockIdAttr} class="notion-block toggle-block" style="margin-bottom: 0.75rem; padding: 0.5rem; background: var(--bg-card); border-radius: var(--radius-md);"><summary style="cursor: pointer; font-weight: 500;">${getText(content.rich_text)}</summary></details>`;

                case 'code':
                    return `<pre ${blockIdAttr} class="notion-block code-block" style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); overflow-x: auto; margin-bottom: 1rem;"><code>${getText(content.rich_text)}</code></pre>`;

                case 'quote':
                    return `<blockquote ${blockIdAttr} class="notion-block quote-block" style="border-left: 3px solid var(--primary); padding-left: 1rem; margin: 1rem 0; font-style: italic; color: var(--text-secondary);">${getText(content.rich_text)}</blockquote>`;

                case 'divider':
                    return `<hr ${blockIdAttr} class="notion-block divider-block" style="border: none; border-top: 1px solid var(--border-primary); margin: 1.5rem 0;">`;

                case 'callout':
                    const icon = content.icon?.emoji || '💡';
                    return `<div ${blockIdAttr} class="notion-block callout-block" style="background: var(--bg-card); border-left: 3px solid var(--primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; display: flex; gap: 0.75rem;"><span style="font-size: 1.25rem;">${icon}</span><div class="callout-content">${getText(content.rich_text)}</div></div>`;

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
            const extract = (p, path) => {
                if (!p) return null;
                if (!path) return p;
                return path.split('.').reduce((o, i) => o ? o[i] : null, p);
            };

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
        const response = await api.post('/revision-insights', { topics });
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

    async queryDatabase(useCache = true) {
        if (useCache && this.isCacheValid()) return this.cache.data;

        try {
            const response = await api.get(`${this.baseUrl}/topics`);
            const transformed = this.transformTopics(response.data);
            this.cache = { data: transformed, timestamp: Date.now() };
            return transformed;
        } catch (error) {
            console.error('Supabase API Error:', error);
            throw error;
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
            completed: row.completed,
            firstRevision: row.first_revision,
            secondRevision: row.second_revision,
            timesRepeated: row.times_repeated,
            pyqAsked: row.pyq_asked
        }));
    }

    async markComplete(id) { // Uses our custom ID, not Notion ID unless mapped
        return this.updateTopic(id, { completed: 'True' });
    }

    async updateTopic(id, data) {
        // Need payload builder
        const payload = this.buildPayload(data);
        const response = await api.patch(`${this.baseUrl}/topics/${id}`, payload);
        this.cache.timestamp = null;
        return response.data;
    }

    buildPayload(data) {
        const payload = {};
        // Mapping... simplified for brevity, assume similar to legacy
        if (data.completed) payload.completed = data.completed;
        if (data.firstRevision) payload.first_revision = data.firstRevision; // Map to DB column
        if (data.firstRevisionDate) payload.first_revision_date = data.firstRevisionDate;
        if (data.secondRevision) payload.second_revision = data.secondRevision;
        return payload;
    }

    async getPageBlocks(pageId) {
        const response = await api.get(`${this.baseUrl}/content/${pageId}`);
        return response.data.results || [];
    }

    async updateBlock(blockId, blockType, newContent) {
        // Construct payload. Note: Supabase backend proxy expects Notion format usually if it forwards to Notion
        // Or if it updates local JSON, it needs to match.
        // Assuming parity with NotionAPI for the proxy.
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

    async getRevisionInsights(topics) {
        const response = await api.post('/revision-insights', { topics });
        return response.data;
    }

    async markRevisionComplete(id, revisionNumber) {
        const today = new Date().toISOString().split('T')[0];
        const data = {};
        if (revisionNumber === 1) {
            data.firstRevision = 'Done';
            data.firstRevisionDate = today;
        } else if (revisionNumber === 2) {
            data.secondRevision = 'Done';
        }
        return this.updateTopic(id, data);
    }
}

// Select API based on config
const backendAPI = (CONFIG.DATA_SOURCE === 'supabase' || CONFIG.DATA_SOURCE === 'hybrid')
    ? new SupabaseAPI()
    : new NotionAPI();

// Export accessors
export const getTopics = (useCache) => backendAPI.queryDatabase(useCache);
export const markComplete = (id) => backendAPI.markComplete(id);
export const getPageBlocks = (pageId) => backendAPI.getPageBlocks(pageId);
export const updateBlock = (blockId, blockType, content) => backendAPI.updateBlock(blockId, blockType, content);
export const markRevisionComplete = (id, revNum) => backendAPI.markRevisionComplete(id, revNum);
export const getRevisionInsights = (topics) => backendAPI.getRevisionInsights(topics);
export const blocksToHtml = (blocks) => backendAPI.blocksToHtml(blocks);


export const askAI = async (prompt) => {
    const response = await api.post('/ask-ai', { prompt });
    return response.data;
};

export const syncFromNotion = async () => {
    const response = await api.post('/api/supabase/sync-from-notion');
    return response.data;
};

export default backendAPI;

