"""
Sync Notion Database to Supabase
Run this script directly: python sync_to_supabase.py
"""

import json
import urllib.request
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Configuration
NOTION_TOKEN = os.getenv('NOTION_TOKEN')
NOTION_VERSION = '2022-06-28'
DATABASE_ID = os.getenv('DATABASE_ID')
NOTION_API_BASE = "https://api.notion.com/v1"

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Helper functions
def extract_title(prop):
    if not prop or not prop.get('title'):
        return ''
    return prop['title'][0].get('plain_text', '') if prop['title'] else ''

def extract_select(prop):
    if not prop or not prop.get('select'):
        return None
    return prop['select'].get('name')

def extract_number(prop):
    if not prop:
        return None
    return prop.get('number')

def extract_date(prop):
    if not prop or not prop.get('date'):
        return None
    return prop['date'].get('start')

def extract_rich_text(prop):
    if not prop or not prop.get('rich_text'):
        return ''
    return ''.join([t.get('plain_text', '') for t in prop['rich_text']])

def main():
    print("🔄 Starting Notion → Supabase sync...")
    
    # Connect to Supabase
    print("📦 Connecting to Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase connected!")
    
    # Fetch all topics from Notion
    print("📥 Fetching topics from Notion...")
    notion_url = f"{NOTION_API_BASE}/databases/{DATABASE_ID}/query"
    
    all_results = []
    has_more = True
    start_cursor = None
    page_count = 0
    
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
            page_count += 1
            print(f"  📄 Fetched page {page_count}: {len(all_results)} topics so far...")
    
    print(f"✅ Fetched {len(all_results)} topics from Notion!")
    
    # -------------------------------------------------------------
    # 1. Sync Topics Data
    # -------------------------------------------------------------
    print("📤 [1/2] Syncing TOPICS to Supabase...")
    
    synced_count = 0
    error_count = 0
    batch_size = 25  # Smaller batches for reliability
    topics_to_insert = []
    
    for i, page in enumerate(all_results):
        props = page.get('properties', {})
        topic_data = {
            'notion_id': page.get('id'),
            'topic_name': extract_title(props.get('Topic Name')) or 'Untitled',
            'subject_category': extract_select(props.get('Subject Category')),
            'no': extract_number(props.get('No.')),
            'priority': extract_select(props.get('Priority')),
            'source': extract_select(props.get('Source to be Studied')),
            'duration': extract_number(props.get('Duration to be Studied')),
            'planned_date': extract_date(props.get('Planned Date')),
            'mcq_solving_date': extract_date(props.get('mcq solving date')),
            'first_revision_date': extract_date(props.get('1st revision date')),
            'completed': extract_select(props.get('Completed')) or 'False',
            'first_revision': extract_select(props.get('1st Revision')),
            'second_revision': extract_select(props.get('2nd Revision')),
            'times_repeated': extract_number(props.get('Times Repeated')),
            'pyq_asked': extract_rich_text(props.get('PYQ Asked'))
        }
        topics_to_insert.append(topic_data)
        
        # Insert in batches
        if len(topics_to_insert) >= batch_size:
            try:
                supabase.table('topics').insert(topics_to_insert).execute()
                synced_count += len(topics_to_insert)
            except Exception as e:
                error_count += len(topics_to_insert)
                print(f"  ⚠️ Topic Batch Error: {str(e)[:50]}...")
            topics_to_insert = []
    
    # Insert remaining topics
    if topics_to_insert:
        try:
            supabase.table('topics').insert(topics_to_insert).execute()
            synced_count += len(topics_to_insert)
        except Exception as e:
            error_count += len(topics_to_insert)
            print(f"  ⚠️ Final Topic Batch Error: {str(e)[:50]}...")
            
    print(f"✅ Topics Sync Complete: {synced_count} topics synced.")

    # -------------------------------------------------------------
    # 2. Sync Page Content
    # -------------------------------------------------------------
    print("\n📤 [2/2] Syncing PAGE CONTENT (Blocks)...")
    print("   Typically takes ~1-2 sec per page. This might take a while.")
    
    content_synced = 0
    content_errors = 0
    
    for i, page in enumerate(all_results):
        page_id = page.get('id')
        topic_name = extract_title(page.get('properties', {}).get('Topic Name'))
        
        # Progress indicator
        print(f"   Using API to fetch content for [{i+1}/{len(all_results)}] {topic_name[:30]}...", end='\r')
        
        try:
            # Fetch blocks from Notion
            blocks = []
            has_more_blocks = True
            block_cursor = None
            
            while has_more_blocks:
                blocks_url = f"{NOTION_API_BASE}/blocks/{page_id}/children"
                if block_cursor:
                    blocks_url += f"?start_cursor={block_cursor}"
                
                req = urllib.request.Request(blocks_url, method='GET')
                req.add_header('Authorization', f'Bearer {NOTION_TOKEN}')
                req.add_header('Notion-Version', NOTION_VERSION)
                
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                    blocks.extend(data.get('results', []))
                    has_more_blocks = data.get('has_more', False)
                    block_cursor = data.get('next_cursor')
            
            # Upsert blocks to Supabase
            content_data = {
                'notion_id': page_id,
                'blocks': json.loads(json.dumps(blocks)), # Ensure generic JSON serializability
                'plain_text': '' # Placeholder for future search indexing
            }
            
            # Use upsert based on notion_id
            supabase.table('page_content').upsert(content_data, on_conflict='notion_id').execute()
            content_synced += 1
            
        except Exception as e:
            content_errors += 1
            print(f"\n  ⚠️ Error syncing content for {topic_name}: {str(e)[:50]}")
    
    print("\n")
    print("=" * 50)
    print(f"✅ FULL SYNC COMPLETE!")
    print(f"   📊 Total Topics: {len(all_results)}")
    print(f"   ✅ Topics Synced: {synced_count}")
    print(f"   ✅ Content Pages Synced: {content_synced}")
    if error_count > 0 or content_errors > 0:
        print(f"   ⚠️ Errors: {error_count} topics, {content_errors} pages")
    print("=" * 50)
    print()
    print("🎉 You can now open http://localhost:8000 to see your data!")

if __name__ == '__main__':
    main()
