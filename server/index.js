import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pg from 'pg';
const { Client } = pg;

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Configuration ---
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Razorpay Config
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// --- AI Model ---
let model;
if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
} else {
    console.warn("⚠️ GEMINI_API_KEY is missing. AI features will not work.");
}

// --- AI Prompt Generation Endpoint ---
app.post('/api/generate-prompt', async (req, res) => {
    if (!model) return res.status(503).json({ error: 'AI not configured' });
    
    try {
        const { stats, type = 'schedule' } = req.body;
        // stats: { pendingCount, overdueCount, topSubjects: { name: count }, recentVelocity }

        const context = `
            You are a study coach helping a medical student.
            
            Context:
            - Pending Topics: ${stats.pendingCount}
            - Overdue Topics: ${stats.overdueCount}
            - Top Subjects Remaining: ${JSON.stringify(stats.topSubjects)}
            - Current Pace: ${stats.recentVelocity || 'Unknown'} topics/day
            
            Task:
            Generate a concise, strategic, and actionable instruction for the study planner AI.
            The user wants a strategy to tackle their workload efficiently.
            
            ${type === 'schedule' 
                ? 'The goal is to create a new schedule. E.g., "Focus on high-yield Anatomy topics for the next 3 days, then switch to Physiology."' 
                : 'The goal is to RESCHEDULE existing tasks. E.g., "Push all overdue tasks to the weekend and lighten the load for tomorrow."'}
            
            Requirements:
            - Max 2 sentences.
            - Be specific to the subjects mentioned.
            - Use a motivating but realistic tone.
            - Return ONLY the text of the prompt.
        `;

        const result = await model.generateContent(context);
        const text = result.response.text();
        
        res.json({ prompt: text.trim() });
    } catch (error) {
        console.error("AI Prompt Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Payment Endpoints ---

// 1. Create Order
app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount = 50000, currency = 'INR' } = req.body; // Default 500 Rs
        
        const options = {
            amount: amount, 
            currency: currency,
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        // Handle Razorpay specific error structure
        const errorMessage = error.error?.description || error.message || "Failed to create order";
        res.status(500).json({ error: errorMessage, details: error });
    }
});

// 1.5 Start Free Trial
app.post('/api/payment/start-trial', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!supabase || !user_id) {
            return res.status(400).json({ error: 'Missing user_id or Supabase not configured' });
        }

        console.log(`Starting trial for user: ${user_id}`);

        // Check if user already used trial
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('trial_used, subscription_status')
            .eq('id', user_id)
            .single();

        if (fetchError) {
            console.error('Fetch profile error:', fetchError);
            // If profile doesn't exist, maybe create it? Or return error.
            // Usually profile is created on signup via trigger.
            return res.status(500).json({ error: 'Failed to fetch profile', details: fetchError.message });
        }

        if (profile.trial_used) {
            return res.status(403).json({ error: 'Free trial already used' });
        }

        if (profile.subscription_status === 'active') {
            return res.status(400).json({ error: 'Subscription already active' });
        }

        // Start Trial
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 Days

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                subscription_status: 'active',
                subscription_plan: 'free_trial',
                subscription_expiry: expiryDate.toISOString(),
                trial_used: true
            })
            .eq('id', user_id);

        if (updateError) {
            console.error('Update profile error:', updateError);
            return res.status(500).json({ error: 'Failed to activate trial', details: updateError.message });
        }

        console.log('Trial activated successfully');
        res.json({ success: true, message: 'Trial activated' });

    } catch (err) {
        console.error('Trial Endpoint Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 1.6 Initialize User Data (Default Database)
app.post('/api/supabase/initialize', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

        console.log(`Initializing data for user ${user_id}...`);

        // 1. Check/Create Database
        const { data: dbs, error: dbError } = await supabase
            .from('user_databases')
            .select('*')
            .eq('user_id', user_id);

        if (dbError) throw dbError;

        let databaseId;
        if (dbs && dbs.length > 0) {
            console.log('User already has a database.');
            databaseId = dbs[0].id;
        } else {
            console.log('Creating default database...');
            const { data: newDb, error: createError } = await supabase
                .from('user_databases')
                .insert([{
                    user_id: user_id,
                    name: 'Default Study Plan',
                    description: 'Auto-generated from Master Syllabus',
                    icon: '📚'
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            databaseId = newDb.id;
        }

        // 2. Check if topics exist
        const { count, error: countError } = await supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .eq('database_id', databaseId);
        
        if (countError) throw countError;

        if (count > 0) {
            console.log(`User already has ${count} topics.`);
            return res.json({ success: true, message: 'Data already initialized', database_id: databaseId });
        }

        // 3. Fetch Master Syllabus
        // Use raw query or select if table is exposed
        // Note: master_syllabus might not be exposed to PostgREST, so we use service role key in backend if needed.
        // But here supabase client uses what? index.js uses process.env.SUPABASE_KEY which is usually service role in backend.
        // Wait, in client/src/config.js it is ANON key. In server/index.js it is SUPABASE_KEY.
        // Assuming server has service_role key or at least full access.
        
        const { data: masterData, error: masterError } = await supabase
            .from('master_syllabus')
            .select('*');

        if (masterError) throw masterError;
        
        if (!masterData || masterData.length === 0) {
            return res.status(404).json({ error: 'Master syllabus not found' });
        }

        console.log(`Found ${masterData.length} master topics. copying...`);

        // 4. Copy Topics
        // Batch insert
        const newTopics = masterData.map(topic => {
            // Exclude id, timestamps, notion_id
            const { id, created_at, updated_at, notion_id, ...rest } = topic;
            return {
                ...rest,
                user_id: user_id,
                database_id: databaseId,
                completed: 'False',
                // Explicitly set notion_id to null or a unique value if unique constraint exists.
                // If unique constraint on notion_id, we must ensure it's null or unique.
                // If notion_id is unique, multiple nulls are allowed in Postgres? Yes.
                notion_id: null 
            };
        });

        const BATCH_SIZE = 100;
        for (let i = 0; i < newTopics.length; i += BATCH_SIZE) {
            const batch = newTopics.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase.from('topics').insert(batch);
            if (insertError) {
                console.error('Batch insert error:', insertError);
                throw insertError;
            }
        }

        console.log('Initialization complete.');
        res.json({ success: true, count: newTopics.length, database_id: databaseId });

    } catch (err) {
        console.error('Initialization Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// 2. Verify Payment
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id, amount } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update User Subscription in Supabase
            if (supabase && user_id) {
                // Determine plan based on amount (default to monthly_500 if not provided or different)
                const planName = amount === 25000 ? 'monthly_250_discount' : 'monthly_500';
                const paidAmount = amount || 50000;

                // 1. Log Payment
                await supabase.from('payments').insert({
                    user_id,
                    amount: paidAmount,
                    razorpay_order_id,
                    razorpay_payment_id,
                    status: 'paid'
                });

                // 2. Update Profile
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1); // +1 Month validity

                await supabase.from('profiles').upsert({
                    id: user_id,
                    subscription_status: 'active',
                    subscription_plan: planName,
                    subscription_expiry: expiryDate.toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, error: "Invalid signature" });
        }
    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize Services
// 1. Gemini (Initialized at top)

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
    
    // Check Key Role
    try {
        const tokenParts = SUPABASE_KEY.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            if (payload.role !== 'service_role') {
                console.warn("\n⚠️  WARNING: SUPABASE_KEY appears to be an ANON key (role: '" + payload.role + "').");
                console.warn("   The backend requires the SERVICE_ROLE_KEY to update subscription statuses and record payments.");
                console.warn("   Please update server/.env with the SERVICE_ROLE_KEY from Supabase Dashboard > Project Settings > API.\n");
            } else {
                console.log("✅ Service Role Key detected. Backend has full database access.");
            }
        }
    } catch (e) {
        console.warn("⚠️ Could not validate SUPABASE_KEY role:", e.message);
    }

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

        const { error: dbError } = await supabase.from('topics').select('database_id').limit(1);
        if (dbError && dbError.message.includes('database_id')) {
            console.log("  ⚠️ database_id column missing - please run setup_multi_db.sql in Supabase SQL Editor");
        } else {
            console.log("  ✅ database_id column exists");
        }
    } catch (e) {
        console.error("Migration check failed:", e);
    }
    console.log("✅ Auto-migrations checks complete!");
};
runAutoMigrations();


// 2. AI Chat Endpoint (Enhanced)
app.post('/api/ask-ai', async (req, res) => {
    try {
        const { prompt, user_id, database_id } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        console.log(`🤖 Processing AI Request: ${prompt.substring(0, 50)}...`);

        // 1. Context Retrieval (Basic RAG)
        let context = "No specific database records found.";
        
        if (supabase && user_id) {
            try {
                // Extract keywords (simplistic approach)
                const keywords = prompt.split(' ').filter(w => w.length > 4);
                
                let query = supabase
                    .from('topics')
                    .select('topic_name, subject_category, priority, completed, planned_date, notes')
                    .eq('user_id', user_id);

                if (database_id) {
                    query = query.eq('database_id', database_id);
                }

                if (keywords.length > 0) {
                    // specific search
                    const orConditions = keywords.map(k => `topic_name.ilike.%${k}%,subject_category.ilike.%${k}%`).join(',');
                    query = query.or(orConditions);
                } else {
                    // default context: high priority or incomplete
                    query = query.neq('completed', 'True').order('priority', { ascending: true });
                }

                const { data: topics, error } = await query.limit(15);

                if (!error && topics && topics.length > 0) {
                    context = JSON.stringify(topics, null, 2);
                }
            } catch (err) {
                console.error("Context retrieval error:", err);
            }
        }

        const fullPrompt = `
        ${SYSTEM_INSTRUCTION}

        You have access to the user's study database. Here is some relevant context based on their query:
        
        --- DATABASE CONTEXT ---
        ${context}
        ------------------------

        User Query: ${prompt}

        Instructions:
        1. Answer the user's question directly.
        2. If the database context is relevant, reference it (e.g., "I found 'Anatomy' in your high priority list...").
        3. If the user asks about their schedule or specific topics, use the provided context.
        4. If the context is empty/irrelevant, answer based on general medical knowledge.
        `;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error('Gemini API Error:', error);
        
        let errorDetails = error.message;
        if (error.message.includes('API key')) {
            errorDetails = "Gemini API Key Error: " + error.message;
        }

        res.status(500).json({ 
            error: 'Failed to generate AI response',
            details: errorDetails
        });
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

        const prompt = `You are an expert NEET-PG medical exam tutor. Analyze these study topics and provide personalized study and revision recommendations.

TOPICS DATA (JSON):
${JSON.stringify(topics.slice(0, 50), null, 2)}

Based on this data, provide:
1. **Top 5 Priority Topics** to study/revise RIGHT NOW.
   - If no topics are completed, suggest the best starting topics based on high-yield weightage.
   - If topics are completed, focus on revision due dates.
2. **Study Pattern Insights** - brief observations.
3. **Subject Recommendations** - which subjects need attention.

IMPORTANT: Respond in this exact JSON format:
{
    "priorityTopics": [
        {"name": "Topic Name", "reason": "Why this is priority (e.g., High Yield, Overdue, or Best to Start)", "urgency": "high/medium/low"}
    ],
    "insights": "Brief observation (e.g., 'Fresh start detected - recommending high yield foundation topics' or 'Good consistency...')",
    "subjectFocus": ["Subject 1", "Subject 2"],
    "motivationalTip": "A short motivational message"
}

Be specific and actionable. Focus on medical exam preparation strategy.`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        console.log('🤖 Raw AI Response:', responseText);

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
        console.error('Stack:', error.stack);
        
        let errorDetails = error.message;
        if (error.message.includes('API key')) {
            errorDetails = "Gemini API Key Error: " + error.message;
        }
        
        res.status(500).json({ 
            error: 'Failed to generate insights', 
            details: errorDetails 
        });
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

// Initialize user data
app.post('/api/supabase/initialize', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { user_id, database_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    try {
        // 1. Check if user already has data IN THIS DATABASE
        let checkQuery = supabase
            .from('topics')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id);
        
        if (database_id) {
            checkQuery = checkQuery.eq('database_id', database_id);
        }

        const { count, error: countError } = await checkQuery;
        
        if (countError) throw countError;
        
        if (count > 0) {
            return res.json({ message: 'User already initialized in this database', count });
        }

        // 2. Fetch master syllabus
        // Try master_syllabus first, fallback to topics where user_id is null (legacy data)
        let masterData = [];
        const { data: masterSyllabus, error: masterError } = await supabase
            .from('master_syllabus')
            .select('*');
        
        if (!masterError && masterSyllabus && masterSyllabus.length > 0) {
            masterData = masterSyllabus;
        } else {
             console.log("Master syllabus not found, falling back to legacy topics");
             // Fallback: copy from topics where user_id IS NULL
             const { data: legacyData, error: legacyError } = await supabase
                .from('topics')
                .select('*')
                .is('user_id', null);
            
             if (legacyError) throw legacyError;
             masterData = legacyData;
        }

        if (masterData.length === 0) {
             return res.status(404).json({ error: 'No master data found to copy' });
        }

        // 3. Prepare data for user
        const newTopics = masterData.map(topic => {
            const { id, created_at, updated_at, notion_id, ...rest } = topic; // Remove system fields AND notion_id
            return {
                ...rest,
                user_id: user_id,
                database_id: database_id || null, // Assign to specific database
                notion_id: null, // Ensure notion_id is null to avoid unique constraint violations
                completed: 'False', // Reset completion
                first_revision: null,
                second_revision: null,
                first_revision_date: null,
                second_revision_date: null,
                mcq_solving_date: null,
                planned_date: null 
            };
        });

        // 4. Insert in batches
        const BATCH_SIZE = 100;
        let insertedCount = 0;
        for (let i = 0; i < newTopics.length; i += BATCH_SIZE) {
            const batch = newTopics.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase.from('topics').insert(batch);
            if (insertError) throw insertError;
            insertedCount += batch.length;
        }

        res.json({ success: true, count: insertedCount });

    } catch (error) {
        console.error('Initialization Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get topics
app.get('/api/supabase/topics', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { user_id, database_id } = req.query;
    
    let query = supabase.from('topics').select('*');
    
    if (user_id) {
        query = query.eq('user_id', user_id);
    } else {
        // Legacy support: fetch topics with null user_id (global/legacy data)
        // OR return all? For safety in multi-tenant, better to restrict.
        // But for transition, let's fetch where user_id is null.
        query = query.is('user_id', null);
    }

    if (database_id) {
        query = query.eq('database_id', database_id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get single topic
app.get('/api/supabase/topics/:id', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { data, error } = await supabase.from('topics').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: 'Topic not found' });
    res.json(data);
});

// Get custom columns (Mock/Placeholder)
app.get('/api/supabase/custom-columns', async (req, res) => {
    // Return empty array or mock data for now
    res.json([]);
});

// Get topic children (sub-pages)
app.get('/api/supabase/topics/:id/children', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { data, error } = await supabase.from('topics').select('*').eq('parent_id', id);
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

// --- Scheduling Endpoint ---
app.post('/api/generate-schedule', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    
    try {
        const { user_id, database_id, startDate, topicsPerDay = 5, dailyHours, preference, strategy = 'priority', prompt = '', offDays = [] } = req.body;
        
        if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
        
        console.log(`📅 Generating schedule for user ${user_id} starting ${startDate}`);

        // 1. Fetch incomplete topics
        let query = supabase
            .from('topics')
            .select('*')
            .eq('user_id', user_id)
            .or('completed.eq.False,completed.is.null');

        if (database_id) {
            query = query.eq('database_id', database_id);
        }

        const { data: topics, error } = await query;

        if (error) {
            console.error("Error fetching topics:", error);
            throw error;
        }
        
        console.log(`Found ${topics?.length || 0} incomplete topics for user ${user_id}`);

        if (!topics || topics.length === 0) {
            return res.json({ message: 'No topics to schedule!' });
        }

        // 2. Sort Topics
        const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3, null: 4 };
        
        if (strategy === 'custom' && prompt) {
            console.log("🤖 AI Custom Strategy Requested...");
            try {
                // Prepare a simplified list for the AI to save tokens
                // Only send ID, Topic Name, Subject, Priority
                const simplifiedTopics = topics.map(t => ({
                    id: t.id,
                    name: t.topic_name,
                    subject: t.subject_category,
                    priority: t.priority
                }));

                const aiPrompt = `
                    You are a smart study scheduler. The user wants to organize their study topics based on a specific strategy.
                    
                    User Strategy: "${prompt}"
                    
                    Here is the list of topics (JSON):
                    ${JSON.stringify(simplifiedTopics)}
                    
                    Task: Reorder these topics to best match the user's strategy.
                    
                    CRITICAL INSTRUCTIONS:
                    1. **Priority Sorting**: If the user mentions "High Yield", "Priority", or "RR", you MUST place "High" priority topics first, then "Moderate"/"Medium", then "Low".
                    2. **Subject Clustering**: If the user mentions "grouping subjects", "topics together", "associated topics", or similar, you MUST keep topics with the same 'subject' value together *within* their priority group.
                       - CORRECT: [High-SubjectA, High-SubjectA, High-SubjectB, High-SubjectB, Med-SubjectA...]
                       - WRONG: [High-SubjectA, High-SubjectB, High-SubjectA...] (Don't mix subjects within the same priority tier)
                    3. **Interpretation**: "High Yield" = "High Priority" or "High RR".
                    
                    Output Format:
                    - Return ONLY a valid JSON array of strings (the topic IDs).
                    - Example: ["id_1", "id_2", "id_3"]
                    - NO markdown, NO code blocks, NO explanations. Just the raw JSON array.
                `;

                const result = await model.generateContent(aiPrompt);
                const response = result.response;
                let text = response.text();
                
                console.log("🤖 Raw AI Sorting Response:", text.substring(0, 200) + "...");

                // Enhanced JSON Extraction
                // Find the first '[' and the last ']'
                const firstBracket = text.indexOf('[');
                const lastBracket = text.lastIndexOf(']');
                
                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    text = text.substring(firstBracket, lastBracket + 1);
                } else {
                    console.error("❌ AI Response did not contain a JSON array:", text);
                    throw new Error("No JSON array found in response");
                }
                
                let sortedIds;
                try {
                    sortedIds = JSON.parse(text);
                } catch (parseError) {
                    console.error("❌ JSON Parse Failed:", parseError);
                    // Try to fix common JSON errors (like trailing commas)
                    text = text.replace(/,\s*]/, ']');
                    sortedIds = JSON.parse(text);
                }

                if (Array.isArray(sortedIds)) {
                    // Create a map for O(1) lookup of index
                    const idMap = new Map(sortedIds.map((id, index) => [id, index]));
                    
                    topics.sort((a, b) => {
                        const indexA = idMap.has(a.id) ? idMap.get(a.id) : 9999;
                        const indexB = idMap.has(b.id) ? idMap.get(b.id) : 9999;
                        return indexA - indexB;
                    });
                    console.log("✅ AI Sorting applied successfully");
                }
            } catch (aiError) {
                console.error("⚠️ AI Sorting failed, falling back to Smart Sort (Priority + Subject):", aiError);
                // Fallback to Priority THEN Subject
                topics.sort((a, b) => {
                    const pA = priorityOrder[a.priority] || 4;
                    const pB = priorityOrder[b.priority] || 4;
                    if (pA !== pB) return pA - pB;
                    
                    // Secondary sort: Subject
                    const sA = a.subject_category || '';
                    const sB = b.subject_category || '';
                    return sA.localeCompare(sB);
                });
            }
        } else {
            topics.sort((a, b) => {
                if (strategy === 'priority') {
                    return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
                } else {
                    return a.topic_name.localeCompare(b.topic_name);
                }
            });
        }

        // 3. Assign Dates
        let currentDate = new Date(startDate);
        let countToday = 0;
        let hoursToday = 0;
        let scheduledCount = 0;
        const updates = [];

        // Helper to skip off days (0 = Sunday, 6 = Saturday)
        const isOffDay = (date) => {
            const day = date.getDay();
            // Simple: if offDays includes day number. For now assume Sundays (0) if offDays has 0
            return offDays.includes(day);
        };

        for (const topic of topics) {
            const duration = parseFloat(topic.duration) || 1.0; // Default 1 hour
            let fitsInDay = false;

            // Find next available slot
            while (!fitsInDay) {
                if (isOffDay(currentDate)) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    countToday = 0;
                    hoursToday = 0;
                    continue;
                }

                if (dailyHours && dailyHours > 0) {
                    // Hour-based scheduling
                    if (hoursToday === 0) {
                        // Empty day always accepts at least one topic (even if > dailyHours)
                        fitsInDay = true;
                    } else if (hoursToday + duration <= dailyHours) {
                        fitsInDay = true;
                    } else {
                        // Day full, move to next
                        currentDate.setDate(currentDate.getDate() + 1);
                        countToday = 0;
                        hoursToday = 0;
                    }
                } else {
                    // Count-based scheduling (Legacy)
                    if (countToday < topicsPerDay) {
                        fitsInDay = true;
                    } else {
                        currentDate.setDate(currentDate.getDate() + 1);
                        countToday = 0;
                        hoursToday = 0;
                    }
                }
            }

            // Calculate Dates (Day 1 = planned)
            const planned = new Date(currentDate);
            
            // Day 3 (MCQ) -> planned + 2 days
            const mcq = new Date(planned);
            mcq.setDate(mcq.getDate() + 2);

            // Day 7 (Revision) -> planned + 6 days
            const rev1 = new Date(planned);
            rev1.setDate(rev1.getDate() + 6);

            // Day 21 (2nd Revision) -> planned + 20 days
            const rev2 = new Date(planned);
            rev2.setDate(rev2.getDate() + 20);

            // Update Custom Data with Preference
            const newCustomData = {
                ...(topic.custom_data || {}),
                time_preference: preference || 'Any'
            };

            updates.push({
                ...topic, // INCLUDE ALL ORIGINAL FIELDS
                planned_date: planned.toISOString(),
                mcq_solving_date: mcq.toISOString(),
                first_revision_date: rev1.toISOString(),
                second_revision_date: rev2.toISOString(),
                custom_data: newCustomData
            });

            countToday++;
            hoursToday += duration;
            scheduledCount++;
        }

        // 4. Batch Update
        console.log(`📝 Prepared ${updates.length} updates. Starting batch update...`);
        
        const BATCH_SIZE = 50;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);
            const { error: updateError } = await supabase
                .from('topics')
                .upsert(batch); 
            
            if (updateError) {
                console.error('Batch update error:', updateError);
            } else {
                console.log(`Batch ${i/BATCH_SIZE + 1} updated successfully.`);
            }
        }

        console.log(`Schedule generation completed. Scheduled ${scheduledCount} topics.`);
        res.json({ success: true, count: scheduledCount });

    } catch (err) {
        console.error('Scheduling Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- AI Rescheduling Endpoint ---
app.post('/api/reschedule', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    try {
        const { user_id, database_id, prompt } = req.body;
        if (!user_id || !prompt) return res.status(400).json({ error: 'Missing user_id or prompt' });

        console.log(`🔄 AI Rescheduling for user ${user_id} with prompt: "${prompt}"`);

        // 1. Fetch Future Topics
        const today = new Date().toISOString().split('T')[0];
        let query = supabase
            .from('topics')
            .select('id, topic_name, subject_category, priority, planned_date, duration')
            .eq('user_id', user_id)
            .gte('planned_date', today)
            .order('planned_date', { ascending: true });

        if (database_id) query = query.eq('database_id', database_id);

        const { data: topics, error } = await query;
        if (error) throw error;

        if (!topics || topics.length === 0) {
            return res.json({ message: 'No future topics found to reschedule.' });
        }

        // 2. Prepare Data for AI
        const simplifiedTopics = topics.map(t => ({
            id: t.id,
            name: t.topic_name,
            subject: t.subject_category,
            current_date: t.planned_date,
            priority: t.priority
        }));

        // 3. Ask AI
        const aiPrompt = `
            You are an intelligent study scheduler. The user wants to reschedule their existing plan.
            
            User Request: "${prompt}"
            
            Current Schedule (JSON):
            ${JSON.stringify(simplifiedTopics)}
            
            Task:
            1. Analyze the user's request (e.g., "Push everything by 1 day", "Move Biology to next week", "Free up this weekend").
            2. Return a JSON array of objects with the updated "planned_date" for the topics that need changing.
            3. You MUST keep the "id" exactly as provided.
            4. Format dates as "YYYY-MM-DD".
            5. If a topic's date doesn't change, you can omit it or include it with the same date.
            
            Output Format:
            [
                { "id": "uuid1", "planned_date": "2024-12-01" },
                { "id": "uuid2", "planned_date": "2024-12-02" }
            ]
            
            RETURN ONLY THE JSON ARRAY. NO MARKDOWN.
        `;

        const result = await model.generateContent(aiPrompt);
        let responseText = result.response.text();
        
        console.log("🤖 AI Reschedule Response:", responseText.substring(0, 200) + "...");

        // Clean JSON
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBracket = responseText.indexOf('[');
        const lastBracket = responseText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            responseText = responseText.substring(firstBracket, lastBracket + 1);
        }

        let updates;
        try {
            updates = JSON.parse(responseText);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return res.status(500).json({ error: "AI response was not valid JSON" });
        }

        if (!Array.isArray(updates)) {
            return res.status(500).json({ error: "AI did not return an array" });
        }

        // 4. Update Database
        const batchUpdates = [];
        
        // Helper to recalculate revision dates
        const calculateRevisions = (plannedDateStr) => {
             const planned = new Date(plannedDateStr);
             const mcq = new Date(planned); mcq.setDate(mcq.getDate() + 2);
             const rev1 = new Date(planned); rev1.setDate(rev1.getDate() + 6);
             const rev2 = new Date(planned); rev2.setDate(rev2.getDate() + 20);
             return {
                 mcq_solving_date: mcq.toISOString().split('T')[0],
                 first_revision_date: rev1.toISOString().split('T')[0],
                 second_revision_date: rev2.toISOString().split('T')[0]
             };
        };

        for (const update of updates) {
            if (update.id && update.planned_date) {
                const revisions = calculateRevisions(update.planned_date);
                batchUpdates.push({
                    id: update.id,
                    planned_date: update.planned_date,
                    ...revisions,
                    updated_at: new Date().toISOString()
                });
            }
        }

        console.log(`📝 Applying ${batchUpdates.length} updates...`);
        
        const BATCH_SIZE = 50;
        for (let i = 0; i < batchUpdates.length; i += BATCH_SIZE) {
            const batch = batchUpdates.slice(i, i + BATCH_SIZE);
            const { error: updateError } = await supabase
                .from('topics')
                .upsert(batch); 
            
            if (updateError) {
                console.error('Batch update error:', updateError);
                throw updateError;
            }
        }

        res.json({ success: true, count: batchUpdates.length, message: `Rescheduled ${batchUpdates.length} topics.` });

    } catch (error) {
        console.error("Reschedule Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/clear-schedule', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    
    try {
        const { user_id, database_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

        console.log(`🧹 Clearing schedule for user ${user_id} ${database_id ? `in db ${database_id}` : ''}`);

        let query = supabase
            .from('topics')
            .update({ 
                planned_date: null,
                mcq_solving_date: null,
                first_revision_date: null,
                second_revision_date: null
            })
            .eq('user_id', user_id);

        if (database_id) {
            query = query.eq('database_id', database_id);
        }

        const { data, error, count } = await query.select('id', { count: 'exact' });

        if (error) {
            console.error("Supabase Error:", error);
            throw error;
        }

        console.log(`✅ Cleared schedule for ${count} topics`);
        res.json({ success: true, message: 'Schedule cleared successfully', count });
    } catch (err) {
        console.error('Clear Schedule Error:', err);
        res.status(500).json({ error: err.message });
    }
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

// Get custom columns (from definition table)
app.get('/api/supabase/custom-columns', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('custom_column_definitions').select('*').order('column_order');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Add custom column (definition)
app.post('/api/supabase/custom-columns', async (req, res) => {
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('custom_column_definitions').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
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
