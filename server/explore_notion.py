"""
Notion API Explorer
Connects to Notion workspace and analyzes database structure
"""

import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Notion API credentials
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_VERSION = "2022-06-28"

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json"
}

def search_databases(query="neetpg pyts"):
    """Search for databases in the workspace"""
    url = "https://api.notion.com/v1/search"
    payload = {
        "query": query,
        "filter": {
            "property": "object",
            "value": "database"
        }
    }
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def get_database_info(database_id):
    """Get detailed information about a database"""
    url = f"https://api.notion.com/v1/databases/{database_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def query_database(database_id, page_size=10):
    """Query database entries"""
    url = f"https://api.notion.com/v1/databases/{database_id}/query"
    payload = {
        "page_size": page_size
    }
    
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def analyze_database_structure(db_info):
    """Analyze and print database structure"""
    print("\n" + "="*80)
    print("DATABASE ANALYSIS")
    print("="*80)
    
    # Basic info
    print(f"\n📊 Database Title: {db_info.get('title', [{}])[0].get('plain_text', 'Untitled')}")
    print(f"🆔 Database ID: {db_info.get('id', 'N/A')}")
    print(f"📅 Created: {db_info.get('created_time', 'N/A')}")
    print(f"🔄 Last Edited: {db_info.get('last_edited_time', 'N/A')}")
    
    # Properties (schema)
    print("\n" + "-"*80)
    print("PROPERTIES (Database Schema):")
    print("-"*80)
    
    properties = db_info.get('properties', {})
    for prop_name, prop_data in properties.items():
        prop_type = prop_data.get('type', 'unknown')
        print(f"\n• {prop_name}")
        print(f"  Type: {prop_type}")
        
        # Additional details for specific property types
        if prop_type == 'select':
            options = prop_data.get('select', {}).get('options', [])
            if options:
                print(f"  Options: {', '.join([opt.get('name', '') for opt in options])}")
        elif prop_type == 'multi_select':
            options = prop_data.get('multi_select', {}).get('options', [])
            if options:
                print(f"  Options: {', '.join([opt.get('name', '') for opt in options])}")
        elif prop_type == 'relation':
            print(f"  Relation Type: {prop_data.get('relation', {})}")
    
    return properties

def analyze_sample_entries(entries):
    """Analyze sample entries from the database"""
    print("\n" + "-"*80)
    print(f"SAMPLE ENTRIES (Showing {len(entries)} items):")
    print("-"*80)
    
    for i, entry in enumerate(entries, 1):
        print(f"\n[Entry {i}]")
        properties = entry.get('properties', {})
        
        for prop_name, prop_value in properties.items():
            prop_type = prop_value.get('type')
            
            # Extract value based on type
            value = "N/A"
            if prop_type == 'title':
                title_content = prop_value.get('title', [])
                value = title_content[0].get('plain_text', '') if title_content else ''
            elif prop_type == 'rich_text':
                rich_text = prop_value.get('rich_text', [])
                value = rich_text[0].get('plain_text', '') if rich_text else ''
            elif prop_type == 'select':
                select = prop_value.get('select')
                value = select.get('name', '') if select else ''
            elif prop_type == 'multi_select':
                multi = prop_value.get('multi_select', [])
                value = ', '.join([m.get('name', '') for m in multi])
            elif prop_type == 'number':
                value = prop_value.get('number', 'N/A')
            elif prop_type == 'checkbox':
                value = prop_value.get('checkbox', False)
            elif prop_type == 'date':
                date_obj = prop_value.get('date')
                value = date_obj.get('start', '') if date_obj else ''
            elif prop_type == 'relation':
                relations = prop_value.get('relation', [])
                value = f"{len(relations)} relation(s)"
            
            if value and value != "N/A":
                print(f"  {prop_name}: {value}")

def save_analysis(databases, db_info, entries):
    """Save analysis to JSON file"""
    analysis = {
        "timestamp": datetime.now().isoformat(),
        "databases_found": databases,
        "database_structure": db_info,
        "sample_entries": entries
    }
    
    with open('notion_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    
    print("\n✅ Analysis saved to 'notion_analysis.json'")

def main():
    print("🔍 Searching for 'neetpg pyts' database...")
    
    # Search for databases
    search_results = search_databases()
    
    if not search_results:
        print("❌ Could not search databases")
        return
    
    results = search_results.get('results', [])
    print(f"\n✅ Found {len(results)} database(s)")
    
    if not results:
        print("\n💡 Searching for all databases...")
        search_results = search_databases(query="")
        results = search_results.get('results', [])
        print(f"Found {len(results)} total database(s)")
    
    if not results:
        print("❌ No databases found. Make sure the integration has access to your databases.")
        return
    
    # Show all found databases
    print("\n" + "="*80)
    print("AVAILABLE DATABASES:")
    print("="*80)
    for i, db in enumerate(results, 1):
        title = db.get('title', [{}])[0].get('plain_text', 'Untitled')
        db_id = db.get('id', 'N/A')
        print(f"{i}. {title} (ID: {db_id})")
    
    # Analyze the first database (or the one matching our query)
    target_db = results[0]
    db_id = target_db['id']
    
    print(f"\n🔎 Analyzing database...")
    
    # Get detailed database info
    db_info = get_database_info(db_id)
    if not db_info:
        print("❌ Could not get database info")
        return
    
    # Analyze structure
    properties = analyze_database_structure(db_info)
    
    # Query sample entries
    print(f"\n📥 Fetching sample entries...")
    query_results = query_database(db_id, page_size=5)
    
    if query_results:
        entries = query_results.get('results', [])
        analyze_sample_entries(entries)
        
        # Save to file
        save_analysis(results, db_info, entries)
    else:
        print("❌ Could not query database entries")

if __name__ == "__main__":
    main()
