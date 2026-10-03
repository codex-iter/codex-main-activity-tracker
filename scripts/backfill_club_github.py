import os
import requests
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta

# Load environment variables (from .env or .env.local if present)
load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials missing in env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def backfill():
    # 1. Fetch active members with github handles
    response = supabase.table("members").select("github_handle").eq("is_active", True).execute()
    members = response.data
    
    handles = [m["github_handle"] for m in members if m.get("github_handle")]
    print(f"Found {len(handles)} active members with GitHub handles.")
    
    # 2. Setup dictionary to aggregate counts
    # Pre-fill last 365 days with 0
    today = datetime.utcnow().date()
    date_map = {}
    for i in range(365):
        d = today - timedelta(days=i)
        date_map[d.isoformat()] = 0
        
    # 3. Fetch from github contributions proxy
    for handle in handles:
        try:
            res = requests.get(f"https://github-contributions.vercel.app/api/v1/{handle}", timeout=10)
            if res.status_code == 200:
                data = res.json()
                # The proxy returns {'contributions': [{'date': 'YYYY-MM-DD', 'count': N}, ...]}
                contributions = data.get("contributions", [])
                for c in contributions:
                    c_date = c.get("date")
                    c_count = c.get("count", 0)
                    if c_date in date_map:
                        date_map[c_date] += c_count
            else:
                print(f"Failed to fetch for {handle}: {res.status_code}")
        except Exception as e:
            print(f"Error fetching for {handle}: {e}")
            
    # 4. Prepare bulk upsert
    upsert_data = [{"date": d, "commits": c} for d, c in date_map.items()]
    
    # 5. Push to Supabase
    try:
        res = supabase.table("club_github_history").upsert(upsert_data).execute()
        print(f"Successfully upserted {len(upsert_data)} rows into club_github_history.")
    except Exception as e:
        print(f"Error inserting into Supabase: {e}")

if __name__ == "__main__":
    backfill()
