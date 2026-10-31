"""
FastAPI Main Application for CIT Campus Scheduling Platform.
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongo import db_manager
from app.services.auth import hash_password
from app.api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cit_app")

DEMO_USERS = [
    {
        "id": "USR_ADMIN_01",
        "email": "admin@cit.edu",
        "name": "Dr. Rameshwar Rao (Dean Academics)",
        "role": "admin",
        "department": "Dean Office",
        "password_hash": hash_password("Admin@123")
    },
    {
        "id": "USR_COORD_01",
        "email": "coord@cit.edu",
        "name": "Prof. Meenakshi Sundaram (Dept Coordinator)",
        "role": "coordinator",
        "department": "CSE",
        "password_hash": hash_password("Coord@123")
    },
    {
        "id": "USR_FAC_01",
        "email": "faculty@cit.edu",
        "name": "Dr. Arvind Sharma (Faculty)",
        "role": "faculty",
        "faculty_id": "FAC01",
        "department": "Basic Sciences",
        "password_hash": hash_password("Faculty@123")
    },
    {
        "id": "USR_CLUB_01",
        "email": "club@cit.edu",
        "name": "Aarav Sharma (Club Representative)",
        "role": "club_rep",
        "department": "Spectra Tech Council",
        "password_hash": hash_password("Club@123")
    }
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CIT Campus Scheduling Platform backend...")
    await db_manager.connect()
    await db_manager.create_indexes()

    # Seed demo users if not present
    users_col = db_manager.get_collection("users")
    for u in DEMO_USERS:
        existing = await users_col.find_one({"email": u["email"]})
        if not existing:
            await users_col.insert_one(u)
            logger.info(f"Seeded demo account: {u['email']} [{u['role']}]")

    # Seed initial booking requests from cit_public.json
    data_path_candidates = [
        "data/cit_public.json",
        "backend/data/cit_public.json",
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "cit_public.json"),
        os.path.join(os.path.dirname(__file__), "..", "data", "cit_public.json"),
    ]
    cit_data_file = next((p for p in data_path_candidates if os.path.exists(p)), None)
    if cit_data_file:
        with open(cit_data_file, "r", encoding="utf-8") as f:
            ds = json.load(f)
            b_col = db_manager.get_collection("bookings")
            count = await b_col.count_documents({})
            if count == 0:
                for b in ds.get("booking_requests", []):
                    b_doc = dict(b)
                    b_doc["requester_id"] = "USR_CLUB_01" if b["type"] == "club_event" else "USR_ADMIN_01"
                    await b_col.insert_one(b_doc)
                logger.info(f"Seeded initial Spectra booking requests from {cit_data_file}.")

    yield
    # Shutdown
    logger.info("Shutting down CIT Campus Scheduling Platform backend...")

app = FastAPI(
    title="CIT Campus Scheduling Platform API",
    version="1.0.0",
    description="Automated Timetable, Midsem Exams & Spectra Venue Booking Engine for Chilika Institute of Technology",
    lifespan=lifespan
)

# CORS configuration
raw_cors = os.getenv("CORS_ORIGINS", "")
if raw_cors.strip():
    origins = [o.strip() for o in raw_cors.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

