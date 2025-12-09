import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Configuration ---
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize Services
// 1. Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

const SYSTEM_INSTRUCTION = `You are an expert medical tutor specializing in NEET-PG preparation. 
Your goal is to help students understand complex medical concepts, clinical cases, and potential exam questions.
- Provide high-yield, concise, and accurate medical format.
- Use bullet points, tables, and bold text for readability.
- If asked about a clinical scenario, explain the diagnosis and management steps clearly.
- Maintain a professional yet encouraging tone.`;

// 2. Supabase
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(`✅ Supabase connected: ${SUPABASE_URL.substring(0, 30)}...`);
} else {
    console.warn("⚠️ Supabase not configured. Check .env variables.");
}

// --- API Routes ---

// --- API Routes ---

// 1. Health Check
app.get('/', (req, res) => {
    res.send('MedTutor AI Backend is running 🚀');
});

// --- Auto Migrations ---
const runAutoMigrations = async () => {
    if (!supabase) return;
    console.log("🔄 Running auto-migrations...");
    try {
        const { error: revError } = await supabase.from('topics').select('second_revision_date').limit(1);
        if (revError && revError.message.includes('second_revision_date')) {
            console.log("  ⚠️ second_revision_date column missing - please update schema manually in Supabase SQL Editor");
        } else {
            console.log("  ✅ second_revision_date column exists");
        }

        const { error: customError } = await supabase.from('topics').select('custom_data').limit(1);
        if (customError && customError.message.includes('custom_data')) {
            console.log("  ⚠️ custom_data column missing - please update schema manually");
        } else {
            console.log("  ✅ custom_data column exists");
        }
    } catch (e) {
        console.error("Migration check failed:", e);
    }
    console.log("✅ Auto-migrations checks complete!");
};
runAutoMigrations();


// 2. AI Chat Endpoint
app.post('/api/ask-ai', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        console.log(`🤖 Processing AI Request: ${prompt.substring(0, 50)}...`);

        const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUser Query: ${prompt}`;
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to generate AI response' });
    }
});

// 3. Revision Insights Endpoint
app.post('/api/revision-insights', async (req, res) => {
    try {
        const { topics } = req.body;
        if (!topics || !Array.isArray(topics)) {
            return res.status(400).json({ error: 'Invalid topics data' });
        }

        console.log(`🧠 Analyzing ${topics.length} topics for insights...`);

        const prompt = `You are an expert NEET-PG medical exam tutor. Analyze these study topics and provide personalized revision recommendations.

TOPICS DATA (JSON):
${JSON.stringify(topics.slice(0, 30), null, 2)}

Based on this data, provide:
1. **Top 5 Priority Topics** to revise RIGHT NOW with reasons (consider: days since completion, priority level, subject importance)
2. **Study Pattern Insights** - brief observations about study habits
3. **Subject Recommendations** - which subjects need more attention

IMPORTANT: Respond in this exact JSON format:
{
    "priorityTopics": [
        {"name": "Topic Name", "reason": "Why this needs revision", "urgency": "high/medium/low"}
    ],
    "insights": "Brief observation about their study pattern",
    "subjectFocus": ["Subject 1 that needs work", "Subject 2 that needs work"],
    "motivationalTip": "A short motivational message"
}

Be specific and actionable. Focus on medical exam preparation strategy.`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // Canvas cleanup for JSON
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsedData = JSON.parse(responseText);
            res.json(parsedData);
        } catch (e) {
            res.json({ raw: responseText });
        }

    } catch (error) {
        console.error('Revision Insights Error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

// 4. Notion Proxy (Universal)
app.use('/api/notion', async (req, res) => {
    const notionPath = req.path;
    const targetUrl = `${NOTION_API_BASE}${notionPath}`;

    console.log(`📝 Proxying Notion request: ${req.method} ${targetUrl}`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Notion Proxy Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Notion API Request Failed' });
    }
});

// --- Supabase: Page Handlers ---

// Get all pages
app.get('/api/supabase/pages', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('pages').select('*').is('parent_id', null).order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get single page
app.get('/api/supabase/pages/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { data, error } = await supabase.from('pages').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: 'Page not found' });
    res.json(data);
});

// Get child pages
app.get('/api/supabase/pages/:id/children', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { data, error } = await supabase.from('pages').select('*').eq('parent_id', id).order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create page
app.post('/api/supabase/pages', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { title, content_html, parent_id, icon } = req.body;
    const pageData = {
        title: title || 'Untitled',
        content_html: content_html || '',
        parent_id: parent_id || null,
        icon: icon || '📝'
    };
    const { data, error } = await supabase.from('pages').insert(pageData).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Update page
app.patch('/api/supabase/pages/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { title, content_html, icon } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content_html !== undefined) updateData.content_html = content_html;
    if (icon !== undefined) updateData.icon = icon;

    const { data, error } = await supabase.from('pages').update(updateData).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Delete page
app.delete('/api/supabase/pages/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id });
});

// --- Supabase: Topic Handlers ---

// Get topics
app.get('/api/supabase/topics', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('topics').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create topic
app.post('/api/supabase/topics', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('topics').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Update topic
app.patch('/api/supabase/topics/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { data, error } = await supabase.from('topics').update(req.body).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Delete topic
app.delete('/api/supabase/topics/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id });
});

// --- Supabase: Content & Views ---

// Get content (blocks)
app.get('/api/supabase/content/:notion_id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { notion_id } = req.params;
    const { data, error } = await supabase.from('page_content').select('blocks').eq('notion_id', notion_id).single();

    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
    res.json({ results: data ? data.blocks : [] });
});

// Get views
app.get('/api/supabase/views', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('database_views').select('*').order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Save view
app.post('/api/supabase/views', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('database_views').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get Schema
app.get('/api/supabase/schema', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase.rpc('get_table_info', { t_name: 'topics' });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Manage Column
app.post('/api/supabase/schema/column', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { operation, col_name, col_type } = req.body;
    try {
        const { data, error } = await supabase.rpc('manage_schema', {
            operation,
            t_name: 'topics',
            col_name,
            col_type: col_type || 'TEXT'
        });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Notion Sync ---

app.post('/api/supabase/sync-from-notion', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    if (!process.env.DATABASE_ID) return res.status(400).json({ error: 'DATABASE_ID not set' });

    console.log("🔄 Starting sync from Notion...");

    try {
        const NOTION_ID = process.env.DATABASE_ID;
        let allResults = [];
        let hasMore = true;
        let startCursor = undefined;

        // 1. Fetch from Notion
        while (hasMore) {
            const response = await axios.post(
                `${NOTION_API_BASE}/databases/${NOTION_ID}/query`,
                { page_size: 100, start_cursor: startCursor },
                {
                    headers: {
                        'Authorization': `Bearer ${NOTION_TOKEN}`,
                        'Notion-Version': NOTION_VERSION,
                        'Content-Type': 'application/json'
                    }
                }
            );
            allResults = [...allResults, ...response.data.results];
            hasMore = response.data.has_more;
            startCursor = response.data.next_cursor;
        }

        console.log(`📥 Fetched ${allResults.length} topics from Notion`);

        // 2. Transform Data
        const topics = allResults.map(page => {
            const props = page.properties;
            const getText = (p) => p?.rich_text?.[0]?.plain_text || '';
            const getSelect = (p) => p?.select?.name || null;
            const getNumber = (p) => p?.number;
            const getDate = (p) => p?.date?.start;

            return {
                notion_id: page.id,
                topic_name: props['Topic Name']?.title?.[0]?.plain_text || 'Untitled',
                subject_category: getSelect(props['Subject Category']),
                no: getNumber(props['No.']),
                priority: getSelect(props['Priority']),
                source: getSelect(props['Source to be Studied']),
                duration: getNumber(props['Duration to be Studied']),
                planned_date: getDate(props['Planned Date']),
                mcq_solving_date: getDate(props['mcq solving date']),
                first_revision_date: getDate(props['1st revision date']),
                completed: getSelect(props['Completed']) || 'False',
                first_revision: getSelect(props['1st Revision']),
                second_revision: getSelect(props['2nd Revision']),
                times_repeated: getNumber(props['Times Repeated']),
                pyq_asked: getText(props['PYQ Asked'])
            };
        });

        // 3. Upsert to Supabase (Batching is better but simple loop for now)
        // Using upsert with notion_id as conflict target if possible, but here using insert
        // Ideally should clean table or upsert. Let's try upsert if unique constraint exists on notion_id
        // For safety, let's insert in chunks.

        let syncedCount = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < topics.length; i += BATCH_SIZE) {
            const batch = topics.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('topics').upsert(batch, { onConflict: 'notion_id' }); // Assuming notion_id is unique
            if (error) {
                console.error('Batch sync error:', error);
            } else {
                syncedCount += batch.length;
                console.log(`  ✅ Synced batch ${i / BATCH_SIZE + 1}`);
            }
        }

        res.json({ status: 'success', synced: syncedCount });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`   - Model: ${GEMINI_MODEL_NAME}`);
});
