import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """Initialize and return a Supabase client using environment variables."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
        )
    return create_client(url, key)

def get_active_members(client: Client) -> list:
    """Fetch all active members from Supabase."""
    response = client.table("members").select("*").eq("is_active", True).execute()
    return response.data or []

def upsert_snapshot(client: Client, snapshot: dict) -> None:
    """Upsert a single activity snapshot to Supabase."""
    client.table("activity_snapshots").upsert(
        snapshot,
        on_conflict="member_id,snapshot_date",
    ).execute()
