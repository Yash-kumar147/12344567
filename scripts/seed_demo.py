"""
Seeds CIT Campus Scheduling Platform with initial demo data.
"""

import os
import sys
import json
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.db.mongo import db_manager
from app.main import DEMO_USERS

async def seed():
    print("Connecting to database...")
    await db_manager.connect()
    await db_manager.create_indexes()

    users_col = db_manager.get_collection("users")
    for u in DEMO_USERS:
        await users_col.update_one({"email": u["email"]}, {"$set": u}, upsert=True)
        print(f"Seeded user: {u['email']} [{u['role']}]")

    # Seed baseline schedule
    sched_path = os.path.join(os.path.dirname(__file__), "..", "exports", "schedule.json")
    if os.path.exists(sched_path):
        with open(sched_path, "r", encoding="utf-8") as f:
            sched = json.load(f)
        await db_manager.get_collection("schedule_versions").update_one(
            {"version_id": sched.get("version_id", "v1")},
            {"$set": sched},
            upsert=True
        )
        await db_manager.get_collection("app_state").update_one(
            {"key": "active_schedule"},
            {"$set": {"active_version_id": sched.get("version_id", "v1")}},
            upsert=True
        )
        print("Seeded active baseline schedule.")

    # Seed bookings
    ds_path = os.path.join(os.path.dirname(__file__), "..", "data", "cit_public.json")
    if os.path.exists(ds_path):
        with open(ds_path, "r", encoding="utf-8") as f:
            ds = json.load(f)
        b_col = db_manager.get_collection("bookings")
        for b in ds.get("booking_requests", []):
            b_doc = dict(b)
            b_doc["requester_id"] = "USR_CLUB_01" if b["type"] == "club_event" else "USR_ADMIN_01"
            await b_col.update_one({"id": b["id"]}, {"$set": b_doc}, upsert=True)
        print(f"Seeded {len(ds.get('booking_requests', []))} Spectra booking requests.")

    print("\nDatabase seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())

