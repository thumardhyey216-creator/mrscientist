import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
import sys
import re
import google.generativeai as genai

# Optional: Supabase support
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("⚠️ Supabase not installed. Run: pip install supabase")

PORT = 8000
NOTION_API_BASE = "https://api.notion.com/v1"

# Configuration
from dotenv import load_dotenv
load_dotenv()

NOTION_TOKEN = os.getenv('NOTION_TOKEN')
NOTION_VERSION = os.getenv('NOTION_VERSION', '2022-06-28')
DATABASE_ID = os.getenv('DATABASE_ID')

# Gemini Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL_NAME = os.getenv('GEMINI_MODEL_NAME', 'gemini-2.0-flash-exp')

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(GEMINI_MODEL_NAME)

# Supabase Configuration
# Get your anon key from: https://app.supabase.com/project/nqpfjsduwxyrwclpssig/settings/api
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

supabase = None
if SUPABASE_AVAILABLE and SUPABASE_URL:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"✅ Supabase connected: {SUPABASE_URL[:30]}...")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")

def run_auto_migrations():
    """Run database migrations automatically on startup"""
    if not supabase:
        return
    
    print("🔄 Running auto-migrations...")
    
    try:
        # Check if second_revision_date column exists by trying to query
        result = supabase.table('topics').select('id, second_revision_date').limit(1).execute()
        print("  ✅ second_revision_date column exists")
    except Exception as e:
        if 'second_revision_date' in str(e):
            print("  ⚠️ second_revision_date column missing - adding via Supabase...")
            # Note: Direct SQL ALTER isn't available via Supabase client
            # User needs to run migration manually once
            print("  ℹ️ Run this SQL in Supabase: ALTER TABLE topics ADD COLUMN IF NOT EXISTS second_revision_date DATE;")
        else:
            print(f"  ⚠️ Migration check error: {e}")
    
    try:
        # Check custom_column_definitions table
        result = supabase.table('custom_column_definitions').select('id').limit(1).execute()
        print("  ✅ custom_column_definitions table exists")
    except Exception as e:
        print(f"  ⚠️ custom_column_definitions table missing - run add_custom_columns_support.sql")
    
    try:
        # Check custom_data column in topics  
        result = supabase.table('topics').select('id, custom_data').limit(1).execute()
        print("  ✅ custom_data column exists")  
    except Exception as e:
        if 'custom_data' in str(e):
            print("  ⚠️ custom_data column missing - run add_custom_columns_support.sql")
    
    print("✅ Auto-migrations complete!")

# Run migrations on startup
run_auto_migrations()

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/notion'):
            self.handle_proxy('GET')
        elif self.path == '/api/supabase/topics':
            self.handle_supabase_get_topics()
        elif self.path.startswith('/api/supabase/content/'):
            self.handle_supabase_get_content()
        elif self.path == '/api/supabase/pages':
            self.handle_get_pages()
        elif self.path.startswith('/api/supabase/pages/') and '/children' in self.path:
            self.handle_get_child_pages()
        elif self.path.startswith('/api/supabase/pages/'):
            self.handle_get_page()
        elif self.path == '/api/supabase/schema':
            self.handle_get_schema()
        elif self.path == '/api/supabase/views':
            self.handle_get_views()
        else:
            # Disable static file serving for security, only API allowed
            self.send_error(404, "Not Found (API Only)")

    def do_POST(self):
        if self.path.startswith('/api/notion'):
            self.handle_proxy('POST')
        elif self.path == '/api/supabase/topics':
            self.handle_supabase_create_topic()
        elif self.path == '/api/supabase/pages':
            self.handle_create_page()
        elif self.path == '/api/supabase/sync-from-notion':
            self.handle_supabase_sync_from_notion()
        elif self.path == '/api/ask-ai':
            self.handle_gemini_request()
        elif self.path == '/api/revision-insights':
            self.handle_revision_insights()
        elif self.path == '/api/supabase/schema/column':
            self.handle_manage_column()
        elif self.path == '/api/supabase/views':
            self.handle_save_view()
        else:
            self.send_error(404, "Not Found")
    
    def handle_revision_insights(self):
        """Generate AI-powered revision recommendations based on study data"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            topics = data.get('topics', [])
            if not topics:
                self.send_error(400, "No topics provided")
                return

            print(f"Analyzing {len(topics)} topics for revision insights...")
            
            # Build a structured prompt for Gemini
            prompt = f"""You are an expert NEET-PG medical exam tutor. Analyze these study topics and provide personalized revision recommendations.

TOPICS DATA (JSON):
{json.dumps(topics[:30], indent=2)}

Based on this data, provide:
1. **Top 5 Priority Topics** to revise RIGHT NOW with reasons (consider: days since completion, priority level, subject importance)
2. **Study Pattern Insights** - brief observations about study habits
3. **Subject Recommendations** - which subjects need more attention

IMPORTANT: Respond in this exact JSON format:
{{
    "priorityTopics": [
        {{"name": "Topic Name", "reason": "Why this needs revision", "urgency": "high/medium/low"}}
    ],
    "insights": "Brief observation about their study pattern",
    "subjectFocus": ["Subject 1 that needs work", "Subject 2 that needs work"],
    "motivationalTip": "A short motivational message"
}}

Be specific and actionable. Focus on medical exam preparation strategy."""

            response = model.generate_content(prompt)
            response_text = response.text
            
            # Try to extract JSON from response
            try:
                # Clean up the response (remove markdown code blocks if present)
                cleaned = response_text.strip()
                if cleaned.startswith('```json'):
                    cleaned = cleaned[7:]
                if cleaned.startswith('```'):
                    cleaned = cleaned[3:]
                if cleaned.endswith('```'):
                    cleaned = cleaned[:-3]
                parsed_response = json.loads(cleaned.strip())
            except json.JSONDecodeError:
                # If parsing fails, return raw text
                parsed_response = {"raw": response_text}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(parsed_response).encode('utf-8'))

        except Exception as e:
            print(f"Revision Insights Error: {str(e)}")
            self.send_error(500, str(e))

    def handle_get_schema(self):
        """Fetch table schema using the get_table_info RPC"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            print("📊 [Supabase] Fetching table schema for 'topics'...")
            response = supabase.rpc('get_table_info', {'t_name': 'topics'}).execute()
            self.send_json_response(response.data)
        except Exception as e:
            print(f"❌ [Supabase] Schema Error: {e}")
            self.send_json_error(500, str(e))

    def handle_manage_column(self):
        """Add or delete a column via RPC"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            operation = data.get('operation')
            col_name = data.get('col_name')
            col_type = data.get('col_type', 'TEXT') 
            
            if not operation or not col_name:
                self.send_json_error(400, "Missing operation or col_name")
                return

            print(f"🔧 [Supabase] Schema Change: {operation} column '{col_name}' ({col_type})")
            
            params = {
                'operation': operation,
                't_name': 'topics',
                'col_name': col_name,
                'col_type': col_type
            }
            
            response = supabase.rpc('manage_schema', params).execute()
            self.send_json_response(response.data)
            
        except Exception as e:
            print(f"❌ [Supabase] Schema Manage Error: {e}")
            self.send_json_error(500, str(e))

    def handle_get_views(self):
        """Fetch saved views"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            print("👀 [Supabase] Fetching saved views...")
            response = supabase.table('database_views').select('*').order('created_at').execute()
            self.send_json_response(response.data)
        except Exception as e:
            print(f"❌ [Supabase] Views Error: {e}")
            self.send_json_error(500, str(e))

    def handle_save_view(self):
        """Save a new view"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            print(f"💾 [Supabase] Saving view: {data.get('view_name')}")
            
            response = supabase.table('database_views').insert(data).execute()
            self.send_json_response(response.data[0] if response.data else {})
            
        except Exception as e:
            print(f"❌ [Supabase] Save View Error: {e}")
            self.send_json_error(500, str(e))

    def do_PATCH(self):
        if self.path.startswith('/api/notion'):
            self.handle_proxy('PATCH')
        elif self.path.startswith('/api/supabase/topics/'):
            self.handle_supabase_update_topic()
        elif self.path.startswith('/api/supabase/pages/'):
            self.handle_update_page()
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        if self.path.startswith('/api/supabase/topics/'):
            self.handle_supabase_delete_topic()
        elif self.path.startswith('/api/supabase/pages/'):
            self.handle_delete_page()
        else:
            self.send_error(404, "Not Found")

    # ==================== SUPABASE HANDLERS ====================

    def handle_supabase_get_topics(self):
        """Fetch all topics from Supabase"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            print("📦 [Supabase] Fetching topics...")
            response = supabase.table('topics').select('*').execute()
            self.send_json_response(response.data)
            print(f"✅ [Supabase] Returned {len(response.data)} topics")
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_supabase_get_content(self):
        """Fetch page content (blocks) from Supabase"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            # Extract notion_id from path: /api/supabase/content/{id}
            notion_id = self.path.split('/')[-1]
            print(f"📦 [Supabase] Fetching content for: {notion_id}")
            
            response = supabase.table('page_content').select('blocks').eq('notion_id', notion_id).execute()
            
            if response.data:
                blocks = response.data[0].get('blocks', [])
                self.send_json_response({"results": blocks})
                print(f"✅ [Supabase] Returned content ({len(blocks)} blocks)")
            else:
                self.send_json_response({"results": []})
                print(f"⚠️ [Supabase] No content found for {notion_id}")
                
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    # ==================== PAGES HANDLERS ====================

    def handle_get_pages(self):
        """Get all pages (root level)"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            print("📦 [Supabase] Fetching all pages...")
            response = supabase.table('pages').select('*').is_('parent_id', 'null').order('created_at', desc=True).execute()
            self.send_json_response(response.data)
            print(f"✅ [Supabase] Returned {len(response.data)} pages")
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_get_page(self):
        """Get a single page by ID"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            page_id = self.path.split('/')[-1]
            print(f"📦 [Supabase] Fetching page: {page_id}")
            response = supabase.table('pages').select('*').eq('id', page_id).execute()
            if response.data:
                self.send_json_response(response.data[0])
            else:
                self.send_json_error(404, "Page not found")
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_get_child_pages(self):
        """Get child pages of a parent"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            # Path: /api/supabase/pages/{id}/children
            parts = self.path.split('/')
            parent_id = parts[-2]
            print(f"📦 [Supabase] Fetching children of: {parent_id}")
            response = supabase.table('pages').select('*').eq('parent_id', parent_id).order('created_at').execute()
            self.send_json_response(response.data)
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_create_page(self):
        """Create a new page"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            page_data = {
                'title': data.get('title', 'Untitled'),
                'content_html': data.get('content_html', ''),
                'parent_id': data.get('parent_id'),
                'icon': data.get('icon', '📝')
            }
            
            print(f"➕ [Supabase] Creating page: {page_data['title']}")
            response = supabase.table('pages').insert(page_data).execute()
            self.send_json_response(response.data[0] if response.data else {})
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_update_page(self):
        """Update a page"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            page_id = self.path.split('/')[-1]
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            update_data = {}
            if 'title' in data: update_data['title'] = data['title']
            if 'content_html' in data: update_data['content_html'] = data['content_html']
            if 'icon' in data: update_data['icon'] = data['icon']
            
            print(f"✏️ [Supabase] Updating page: {page_id}")
            response = supabase.table('pages').update(update_data).eq('id', page_id).execute()
            self.send_json_response(response.data[0] if response.data else {})
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_delete_page(self):
        """Delete a page"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            page_id = self.path.split('/')[-1]
            print(f"🗑️ [Supabase] Deleting page: {page_id}")
            response = supabase.table('pages').delete().eq('id', page_id).execute()
            self.send_json_response({"deleted": True, "id": page_id})
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_supabase_create_topic(self):
        """Create a new topic in Supabase"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            print(f"➕ [Supabase] Creating topic: {data.get('topic_name', 'Unknown')}")
            response = supabase.table('topics').insert(data).execute()
            self.send_json_response(response.data[0] if response.data else {})
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_supabase_update_topic(self):
        """Update a topic in Supabase"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            # Extract topic ID from path: /api/supabase/topics/{id}
            topic_id = self.path.split('/')[-1]
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            print(f"✏️ [Supabase] Updating topic: {topic_id}")
            response = supabase.table('topics').update(data).eq('id', topic_id).execute()
            self.send_json_response(response.data[0] if response.data else {})
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_supabase_delete_topic(self):
        """Delete a topic from Supabase"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            topic_id = self.path.split('/')[-1]
            print(f"🗑️ [Supabase] Deleting topic: {topic_id}")
            response = supabase.table('topics').delete().eq('id', topic_id).execute()
            self.send_json_response({"deleted": True, "id": topic_id})
        except Exception as e:
            print(f"❌ [Supabase] Error: {e}")
            self.send_json_error(500, str(e))

    def handle_supabase_sync_from_notion(self):
        """Sync data from Notion to Supabase"""
        if not supabase:
            self.send_json_error(503, "Supabase not configured")
            return
        try:
            print("🔄 [Supabase] Starting sync from Notion...")
            
            # Fetch all topics from Notion
            notion_url = f"{NOTION_API_BASE}/databases/{DATABASE_ID}/query"
            req = urllib.request.Request(notion_url, data=b'{}', method='POST')
            req.add_header('Authorization', f'Bearer {NOTION_TOKEN}')
            req.add_header('Notion-Version', NOTION_VERSION)
            req.add_header('Content-Type', 'application/json')
            
            all_results = []
            has_more = True
            start_cursor = None
            
            while has_more:
                payload = {'page_size': 100}
                if start_cursor:
                    payload['start_cursor'] = start_cursor
                
                req = urllib.request.Request(notion_url, data=json.dumps(payload).encode(), method='POST')
                req.add_header('Authorization', f'Bearer {NOTION_TOKEN}')
                req.add_header('Notion-Version', NOTION_VERSION)
                req.add_header('Content-Type', 'application/json')
                
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                    all_results.extend(data.get('results', []))
                    has_more = data.get('has_more', False)
                    start_cursor = data.get('next_cursor')
            
            print(f"📥 [Supabase] Fetched {len(all_results)} topics from Notion")
            
            # Transform and insert to Supabase in batches
            synced_count = 0
            batch_size = 50
            topics_to_insert = []
            
            for page in all_results:
                props = page.get('properties', {})
                topic_data = {
                    'notion_id': page.get('id'),
                    'topic_name': self._extract_title(props.get('Topic Name')) or 'Untitled',
                    'subject_category': self._extract_select(props.get('Subject Category')),
                    'no': self._extract_number(props.get('No.')),
                    'priority': self._extract_select(props.get('Priority')),
                    'source': self._extract_select(props.get('Source to be Studied')),
                    'duration': self._extract_number(props.get('Duration to be Studied')),
                    'planned_date': self._extract_date(props.get('Planned Date')),
                    'mcq_solving_date': self._extract_date(props.get('mcq solving date')),
                    'first_revision_date': self._extract_date(props.get('1st revision date')),
                    'completed': self._extract_select(props.get('Completed')) or 'False',
                    'first_revision': self._extract_select(props.get('1st Revision')),
                    'second_revision': self._extract_select(props.get('2nd Revision')),
                    'times_repeated': self._extract_number(props.get('Times Repeated')),
                    'pyq_asked': self._extract_rich_text(props.get('PYQ Asked'))
                }
                topics_to_insert.append(topic_data)
                
                # Insert in batches
                if len(topics_to_insert) >= batch_size:
                    try:
                        supabase.table('topics').insert(topics_to_insert).execute()
                        synced_count += len(topics_to_insert)
                        print(f"  ✅ Inserted batch: {synced_count}/{len(all_results)}")
                    except Exception as batch_error:
                        print(f"  ⚠️ Batch error (continuing): {batch_error}")
                    topics_to_insert = []
            
            # Insert remaining topics
            if topics_to_insert:
                try:
                    supabase.table('topics').insert(topics_to_insert).execute()
                    synced_count += len(topics_to_insert)
                except Exception as batch_error:
                    print(f"  ⚠️ Final batch error: {batch_error}")
            
            print(f"✅ [Supabase] Synced {synced_count} topics from Notion")
            self.send_json_response({"synced": synced_count, "status": "success"})
            
        except Exception as e:
            print(f"❌ [Supabase] Sync error: {e}")
            import traceback
            traceback.print_exc()
            self.send_json_error(500, str(e))

    # Helper methods for extracting Notion properties
    def _extract_title(self, prop):
        if not prop or not prop.get('title'):
            return ''
        return prop['title'][0].get('plain_text', '') if prop['title'] else ''

    def _extract_select(self, prop):
        if not prop or not prop.get('select'):
            return None
        return prop['select'].get('name')

    def _extract_number(self, prop):
        if not prop:
            return None
        return prop.get('number')

    def _extract_date(self, prop):
        if not prop or not prop.get('date'):
            return None
        return prop['date'].get('start')

    def _extract_rich_text(self, prop):
        if not prop or not prop.get('rich_text'):
            return ''
        return ''.join([t.get('plain_text', '') for t in prop['rich_text']])

    def send_json_response(self, data, status=200):
        """Send JSON response with CORS headers"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_json_error(self, status, message):
        """Send JSON error response"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))

    def handle_gemini_request(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            prompt = data.get('prompt', '')
            if not prompt:
                self.send_error(400, "Missing prompt")
                return

            print(f"Processing Gemini request: {prompt[:50]}...")
            
            response = model.generate_content(prompt)
            response_text = response.text

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {'response': response_text}
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            print(f"Gemini API Error: {str(e)}")
            self.send_error(500, str(e))

    def handle_proxy(self, method):
        # Strip /api/notion prefix to get the real endpoint
        target_path = self.path.replace('/api/notion', '', 1)
        target_url = f"{NOTION_API_BASE}{target_path}"
        
        print(f"Proxying {method} request to: {target_url}")

        # Read body if present
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        # Prepare request to Notion
        req = urllib.request.Request(target_url, data=body, method=method)
        
        # Add headers
        req.add_header('Authorization', f'Bearer {NOTION_TOKEN}')
        req.add_header('Notion-Version', NOTION_VERSION)
        req.add_header('Content-Type', 'application/json')

        try:
            with urllib.request.urlopen(req) as response:
                # Send response back to client
                self.send_response(response.status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*') # Allow CORS for local dev
                self.end_headers()
                self.wfile.write(response.read())
                
        except urllib.error.HTTPError as e:
            print(f"Notion API Error: {e.code} - {e.reason}")
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(e.read())
            
        except Exception as e:
            print(f"Proxy Error: {str(e)}")
            self.send_error(500, str(e))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version')
        self.end_headers()

print(f"Starting Notion Proxy Server on port {PORT}...")
print(f"Open http://localhost:{PORT} in your browser")

with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
