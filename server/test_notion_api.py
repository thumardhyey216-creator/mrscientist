"""
Test Notion API Connection
Run this to verify your Notion API credentials are working
"""

import urllib.request
import urllib.error
import json
import os
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv('NOTION_TOKEN')
DATABASE_ID = os.getenv('DATABASE_ID')
NOTION_VERSION = '2022-06-28'

def test_connection():
    print("🔍 Testing Notion API Connection...")
    print("=" * 50)
    
    # Test 1: Query Database
    print("\n1️⃣ Testing database query...")
    try:
        url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
        
        req = urllib.request.Request(
            url,
            data=json.dumps({"page_size": 1}).encode('utf-8'),
            method='POST'
        )
        
        req.add_header('Authorization', f'Bearer {NOTION_TOKEN}')
        req.add_header('Notion-Version', NOTION_VERSION)
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"✅ SUCCESS! Found {len(data.get('results', []))} results")
            print(f"   Has more: {data.get('has_more', False)}")
            
            if data.get('results'):
                page = data['results'][0]
                print(f"   First page ID: {page['id']}")
                print(f"   First page URL: {page.get('url', 'N/A')}")
                
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code} - {e.reason}")
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            print(f"   Message: {error_data.get('message', 'Unknown error')}")
        except:
            print(f"   Raw error: {error_body}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    # Test 2: Get Database Info
    print("\n2️⃣ Testing database info retrieval...")
    try:
        url = f"https://api.notion.com/v1/databases/{DATABASE_ID}"
        
        req = urllib.request.Request(url, method='GET')
        req.add_header('Authorization', f'Bearer {NOTION_TOKEN}')
        req.add_header('Notion-Version', NOTION_VERSION)
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"✅ SUCCESS!")
            print(f"   Database title: {data.get('title', [{}])[0].get('plain_text', 'N/A')}")
            print(f"   Properties count: {len(data.get('properties', {}))}")
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code} - {e.reason}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All tests passed! Your Notion API is working.")
    print("\nIf the web app still won't sync, check:")
    print("  1. Browser console for errors (F12)")
    print("  2. Server terminal for proxy errors")
    print("  3. Make sure server.py is running")
    return True

if __name__ == "__main__":
    success = test_connection()
    if not success:
        print("\n⚠️  Connection failed! Check your:")
        print("  - API Token")
        print("  - Database ID")
        print("  - Internet connection")
        print("  - Notion workspace permissions")
