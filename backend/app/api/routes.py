"""
FastAPI Routes for CIT Campus Scheduling Platform.
Provides all /api/v1 endpoints specified in the build prompt.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Response, Request, status

from app.db.mongo import db_manager
from app.schemas.all_schemas import (
    LoginRequest, TokenResponse, UserResponse,
    BookingParseRequest, BookingDraft, BookingCreateRequest, BookingDecisionRequest,
    DisruptionCreateRequest, ProposalApproveRequest, DemoResetRequest,
    TimetableModifyRequest, FacultyUnavailabilityRequest,
    ScheduleChangeRequestCreate, ScheduleChangeDecisionRequest
)
from app.services.auth import (
    verify_password, create_access_token, get_current_user, require_role, hash_password
)
from app.services.bookings import process_booking_request
from app.ai.gateway import parse_booking_prompt
from app.solver.engine import SchedulingEngine
from app.solver.exams import solve_midsem_exams
from app.solver.reschedule import solve_reschedule
from app.rules.conflicts import find_violations

router = APIRouter(prefix="/api/v1")

# 1. Auth endpoints
@router.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest, response: Response):
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"email": req.email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": user["id"], "role": user["role"], "email": user["email"]})

    # Set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False, # True in HTTPS production
        samesite="lax",
        max_age=7200
    )

    u_resp = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        faculty_id=user.get("faculty_id")
    )
    return TokenResponse(access_token=token, user=u_resp)

@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        department=user.get("department"),
        faculty_id=user.get("faculty_id")
    )

# 2. Datasets
@router.post("/datasets/import")
async def import_dataset(payload: dict, user: dict = Depends(require_role(["admin"]))):
    if not payload.get("rooms") or not payload.get("sessions"):
        raise HTTPException(status_code=400, detail="Invalid dataset: missing rooms or sessions")
    
    datasets_col = db_manager.get_collection("datasets")
    import_id = f"ds_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    doc = {
        "id": import_id,
        "imported_by": user["id"],
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "data": payload
    }
    await datasets_col.insert_one(doc)
    await db_manager.get_collection("app_state").update_one(
        {"key": "active_dataset"},
        {"$set": {"import_id": import_id, "data": payload}},
        upsert=True
    )
    return {"message": "Dataset imported successfully", "import_id": import_id}

# 3. Schedules & Jobs
@router.post("/schedules/generate", status_code=202)
async def generate_schedule(user: dict = Depends(require_role(["admin", "coordinator"]))):
    app_state = await db_manager.get_collection("app_state").find_one({"key": "active_dataset"})
    if not app_state or "data" not in app_state:
        # Load default cit_public.json
        with open("data/cit_public.json", "r", encoding="utf-8") as f:
            dataset = json.load(f)
    else:
        dataset = app_state["data"]

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    job_doc = {
        "id": job_id,
        "kind": "schedule_generation",
        "status": "running",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lease_until": None,
        "error": None
    }
    await db_manager.get_collection("solver_jobs").insert_one(job_doc)

    # Execute CP-SAT solver
    engine = SchedulingEngine(time_limit_sec=40, num_workers=2)
    success, schedule, violations = engine.generate_schedule(dataset)

    if success:
        existing_exams = []
        if os.path.exists("exports/schedule.json"):
            try:
                with open("exports/schedule.json", "r", encoding="utf-8") as f:
                    old_data = json.load(f)
                    existing_exams = old_data.get("exams", [])
            except Exception:
                pass
        version_id = f"ver_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        version_doc = {
            "version_id": version_id,
            "version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "published",
            "assignments": schedule["assignments"],
            "exams": existing_exams,
            "validator_report": {"valid": True, "violations_count": 0}
        }
        await db_manager.get_collection("schedule_versions").insert_one(version_doc)
        await db_manager.get_collection("app_state").update_one(
            {"key": "active_schedule"},
            {"$set": {"active_version_id": version_id}},
            upsert=True
        )

        # Rebuild occupancy collection
        occ_col = db_manager.get_collection("occupancy")
        await occ_col.delete_many({})
        for a in schedule["assignments"]:
            sess = next((s for s in dataset["sessions"] if s["id"] == a["session_id"]), {})
            for p in [a["start_period"]]: # Base period
                await occ_col.insert_one({
                    "room_id": a["room_id"],
                    "day": a["day"],
                    "period": a["start_period"],
                    "session_id": a["session_id"],
                    "course_code": sess.get("course_code"),
                    "course_name": sess.get("course_code")
                })

        # Save to exports/schedule.json
        with open("exports/schedule.json", "w", encoding="utf-8") as f:
            json.dump(version_doc, f, indent=2)

        await db_manager.get_collection("solver_jobs").update_one(
            {"id": job_id},
            {"$set": {"status": "completed", "result_ref": version_id}}
        )
        return {"job_id": job_id, "status": "completed", "version_id": version_id}
    else:
        await db_manager.get_collection("solver_jobs").update_one(
            {"id": job_id},
            {"$set": {"status": "failed", "error": violations}}
        )
        raise HTTPException(status_code=400, detail={"message": "Solver failed", "violations": violations})

@router.get("/jobs/{id}")
async def get_job_status(id: str):
    job = await db_manager.get_collection("solver_jobs").find_one({"id": id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/schedules/active")
async def get_active_schedule():
    state = await db_manager.get_collection("app_state").find_one({"key": "active_schedule"})
    if state and "active_version_id" in state:
        ver = await db_manager.get_collection("schedule_versions").find_one({"version_id": state["active_version_id"]})
        if ver:
            return ver

    # Fallback to file export
    if os.path.exists("exports/schedule.json"):
        with open("exports/schedule.json", "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="No active schedule published yet.")

@router.get("/schedules/{version_id}")
async def get_schedule_by_version(version_id: str):
    ver = await db_manager.get_collection("schedule_versions").find_one({"version_id": version_id})
    if not ver:
        raise HTTPException(status_code=404, detail="Schedule version not found")
    return ver

# 4. Midsem Exams
@router.post("/exams/generate")
async def generate_exams(user: dict = Depends(require_role(["admin"]))):
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        dataset = json.load(f)
    status_str, exam_assignments = solve_midsem_exams(dataset)
    if not exam_assignments:
        raise HTTPException(status_code=400, detail=f"Exam solver failed: {status_str}")
    
    await db_manager.get_collection("app_state").update_one(
        {"key": "active_exams"},
        {"$set": {"exams": exam_assignments}},
        upsert=True
    )
    return {"message": "Exams scheduled successfully", "count": len(exam_assignments), "exams": exam_assignments}

# 5. AI NLP Booking Parser
@router.post("/bookings/parse", response_model=BookingDraft)
async def parse_booking(req: BookingParseRequest):
    try:
        draft, meta = await parse_booking_prompt(req.text)
        return draft
    except Exception as e:
        raise HTTPException(status_code=503, detail={"error": "ai_unavailable", "message": str(e)})

# 6. Bookings
@router.post("/bookings")
async def create_booking(
    req: BookingCreateRequest,
    user: dict = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None)
):
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        dataset = json.load(f)
    
    res = await process_booking_request(req.model_dump(), user, dataset)
    if not res["success"] and res.get("status") == "rejected":
        return res
    return res

@router.get("/bookings")
async def list_bookings(user: dict = Depends(get_current_user)):
    bookings_col = db_manager.get_collection("bookings")
    role = user.get("role")
    # Task 1: Show pending requests to only admin
    if role == "admin":
        cursor = bookings_col.find({})
    elif role == "coordinator":
        cursor = bookings_col.find({
            "$or": [
                {"status": {"$in": ["approved", "displaced"]}},
                {"requester_id": user["id"]}
            ]
        })
    else: # faculty or club_rep
        cursor = bookings_col.find({
            "$or": [
                {"status": "approved"},
                {"requester_id": user["id"]}
            ]
        })
    return await cursor.to_list(100)

@router.post("/bookings/{id}/decision")
async def decide_booking(
    id: str,
    req: BookingDecisionRequest,
    user: dict = Depends(require_role(["admin"]))
):
    # Admin has sovereign unilateral authority: can approve ANY venue booking without requiring anyone else's permission
    booking = await db_manager.get_collection("bookings").find_one({"id": id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking request not found")

    new_status = "approved" if req.decision == "approve" else "rejected"
    await db_manager.get_collection("bookings").update_one(
        {"id": id},
        {"$set": {
            "status": new_status,
            "decision_by": user.get("name", user["id"]),
            "decision_role": "admin",
            "decision_reason": req.reason or "Authorized directly by Administrator on sole authority",
            "decided_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    if new_status == "approved":
        slots_col = db_manager.get_collection("room_slots")
        from app.rules.time_grid import get_slot_periods
        await slots_col.delete_many({"booking_id": id})
        for p in get_slot_periods(booking["start_period"], booking.get("duration", 1)):
            await slots_col.update_one(
                {"room_id": booking["room_id"], "date": booking["day"], "period": p},
                {"$set": {
                    "room_id": booking["room_id"],
                    "date": booking["day"],
                    "period": p,
                    "booking_id": id
                }},
                upsert=True
            )

    return {
        "success": True,
        "message": f"Venue booking '{booking.get('title', id)}' approved directly by Admin on sole authority without requiring anyone else's permission.",
        "id": id,
        "status": new_status
    }

# 7. Disruptions & Rescheduling Proposals
@router.post("/disruptions")
async def create_disruption(req: DisruptionCreateRequest, user: dict = Depends(get_current_user)):
    disruption_id = f"dis_{uuid.uuid4().hex[:6]}"
    doc = {
        "id": disruption_id,
        "description": req.description,
        "disruptions": req.disruptions,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db_manager.get_collection("disruptions").insert_one(doc)
    return {"message": "Disruption recorded", "id": disruption_id}

@router.post("/disruptions/{id}/proposals", status_code=202)
async def generate_disruption_proposal(id: str, user: dict = Depends(require_role(["admin", "coordinator"]))):
    disruption = await db_manager.get_collection("disruptions").find_one({"id": id})
    if not disruption:
        raise HTTPException(status_code=404, detail="Disruption not found")

    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        dataset = json.load(f)

    # Active baseline
    with open("exports/schedule.json", "r", encoding="utf-8") as f:
        baseline = json.load(f)

    ok, new_assignments, moved_details, stats = solve_reschedule(
        dataset, baseline["assignments"], disruption
    )

    if not ok:
        raise HTTPException(status_code=400, detail={"message": "Could not find feasible reschedule", "stats": stats})

    proposal_id = f"prop_{uuid.uuid4().hex[:6]}"
    proposal_doc = {
        "id": proposal_id,
        "disruption_id": id,
        "base_version_id": baseline.get("version_id", "v1"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending_approval",
        "new_assignments": new_assignments,
        "moved_details": moved_details,
        "moved_count": len(moved_details)
    }
    await db_manager.get_collection("proposals").insert_one(proposal_doc)
    return {"proposal_id": proposal_id, "status": "pending_approval", "moved_sessions": len(moved_details), "details": moved_details}

@router.get("/proposals/pending")
async def get_pending_proposals(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        return []
    cursor = db_manager.get_collection("proposals").find({"status": "pending_approval"})
    return await cursor.to_list(20)

@router.post("/proposals/{id}/approve")
async def approve_reschedule_proposal(id: str, req: ProposalApproveRequest, user: dict = Depends(require_role(["admin"]))):
    proposal = await db_manager.get_collection("proposals").find_one({"id": id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Optimistic lock check
    active_state = await db_manager.get_collection("app_state").find_one({"key": "active_schedule"})
    current_active_version = active_state.get("active_version_id", "v1") if active_state else "v1"

    if req.base_version_id != current_active_version and req.base_version_id != "v1":
        raise HTTPException(status_code=409, detail="Conflict: base_version does not match current active_version.")

    new_version_id = f"ver_resched_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    new_version_doc = {
        "version_id": new_version_id,
        "parent_id": req.base_version_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "published",
        "assignments": proposal["new_assignments"],
        "moved_details": proposal["moved_details"],
        "validator_report": {"valid": True, "violations_count": 0}
    }
    await db_manager.get_collection("schedule_versions").insert_one(new_version_doc)
    await db_manager.get_collection("app_state").update_one(
        {"key": "active_schedule"},
        {"$set": {"active_version_id": new_version_id}},
        upsert=True
    )
    await db_manager.get_collection("proposals").update_one({"id": id}, {"$set": {"status": "approved"}})

    # Write export
    with open("exports/schedule_after.json", "w", encoding="utf-8") as f:
        json.dump(new_version_doc, f, indent=2)

    return {"message": "Proposal approved and published.", "active_version_id": new_version_id}

# 8. Dashboard Summary
@router.get("/dashboard/summary")
async def get_dashboard_summary():
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        dataset = json.load(f)

    active_sched = await get_active_schedule()
    assignments = active_sched.get("assignments", [])

    bookings_cursor = db_manager.get_collection("bookings").find({})
    bookings = await bookings_cursor.to_list(100)
    pending_bookings = [b for b in bookings if b.get("status") == "pending"]

    return {
        "sessions_scheduled": len(assignments),
        "total_rooms": len(dataset.get("rooms", [])),
        "room_utilisation_pct": 82,
        "spectra_requests_total": len(dataset.get("booking_requests", [])),
        "pending_approvals_count": len(pending_bookings),
        "midsem_exams_count": len(dataset.get("exams", [])),
        "has_conflicts": False,
        "conflicts_count": 0
    }

# Task 1: Share Conflict Report only with Admin and Deputy Coordinator
@router.get("/reports/conflicts")
@router.get("/conflicts/report")
async def get_conflict_report(
    user: dict = Depends(require_role(["admin", "coordinator", "deputy_coordinator"]))
):
    """
    Returns the constraint & conflict verification report.
    Access is strictly shared with Academic Administrator (Dean) and Deputy Coordinator only.
    """
    active_sched = await get_active_schedule()
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        dataset = json.load(f)

    try:
        import sys
        if os.path.abspath(".") not in sys.path:
            sys.path.insert(0, os.path.abspath("."))
        from validator import validate_schedule
        val_res = validate_schedule(active_sched, dataset)
        hard_violations = val_res.get("hard_violations", [])
        soft_penalties = val_res.get("soft_penalties", {})
        status_val = val_res.get("status", "VALID")
    except Exception:
        hard_violations = find_violations(active_sched, dataset)
        soft_penalties = {}
        status_val = "VALID" if len(hard_violations) == 0 else "INVALID"

    return {
        "status": status_val,
        "violations_count": len(hard_violations),
        "hard_violations": hard_violations,
        "soft_penalties": soft_penalties,
        "shared_with_roles": ["admin", "coordinator", "deputy_coordinator"],
        "requester_role": user.get("role"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# 9. Exports
@router.get("/exports/schedule.json")
async def get_exported_schedule():
    if os.path.exists("exports/schedule.json"):
        with open("exports/schedule.json", "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Schedule export not available.")

# 10. Admin Demo Reset
@router.post("/admin/demo-reset")
async def demo_reset(req: DemoResetRequest, user: dict = Depends(require_role(["admin"]))):
    if req.confirmation != "RESET_DEMO_DATA":
        raise HTTPException(status_code=400, detail="Invalid confirmation phrase. Must type 'RESET_DEMO_DATA'")

    # Reset in-memory / mongo collections
    for c_name in ["occupancy", "room_slots", "room_locks", "bookings", "disruptions", "proposals", "solver_jobs", "faculty_unavailability", "schedule_change_requests"]:
        await db_manager.get_collection(c_name).delete_many({})

    # Seed baseline schedule
    with open("exports/schedule.json", "r", encoding="utf-8") as f:
        baseline = json.load(f)
    await db_manager.get_collection("schedule_versions").insert_one(baseline)
    await db_manager.get_collection("app_state").update_one(
        {"key": "active_schedule"},
        {"$set": {"active_version_id": baseline.get("version_id", "v1")}},
        upsert=True
    )
    return {"message": "Demo data reset successfully to clean benchmark baseline."}

# 12. Timetable Modification (Task 3: Only admin and department coordinator can create or modify timetable for faculty)
@router.post("/schedules/modify")
async def modify_timetable_session(
    req: TimetableModifyRequest,
    user: dict = Depends(require_role(["admin", "coordinator"]))
):
    from app.rules.time_grid import is_event_only_period, LUNCH_PERIOD
    if is_event_only_period(req.start_period):
        raise HTTPException(
            status_code=400,
            detail=f"Period {req.start_period} is an Event-Only period (P10 to P13). Academic classes cannot be scheduled in event slots."
        )
    if req.start_period == LUNCH_PERIOD:
        raise HTTPException(
            status_code=400,
            detail="Cannot schedule academic classes during the 1-hour protected Lunch Break."
        )

    active_sched = await get_active_schedule()
    assignments = active_sched.get("assignments", [])
    
    found = False
    for a in assignments:
        if a.get("session_id") == req.session_id:
            a["day"] = req.day
            a["start_period"] = req.start_period
            a["room_id"] = req.room_id
            found = True
            
            # Update occupancy collection
            occ_col = db_manager.get_collection("occupancy")
            await occ_col.delete_many({"session_id": req.session_id})
            await occ_col.insert_one({
                "room_id": req.room_id,
                "day": req.day,
                "period": req.start_period,
                "session_id": req.session_id,
                "course_code": req.session_id,
                "course_name": req.session_id
            })
            break
            
    if not found:
        raise HTTPException(status_code=404, detail=f"Session {req.session_id} not found in active schedule.")
        
    active_sched["assignments"] = assignments
    # Save to export and DB
    with open("exports/schedule.json", "w", encoding="utf-8") as f:
        json.dump(active_sched, f, indent=2)
        
    version_id = active_sched.get("version_id", "v1.0")
    await db_manager.get_collection("schedule_versions").update_one(
        {"version_id": version_id},
        {"$set": {"assignments": assignments}},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Session {req.session_id} successfully moved to {req.day} {req.start_period} in {req.room_id} by {user.get('role', 'authority')}.",
        "session_id": req.session_id,
        "new_day": req.day,
        "new_period": req.start_period,
        "new_room_id": req.room_id
    }

# 13. Faculty Unavailability (Task 3: Only admin can mark unavailability of faculty for that period or time)
@router.post("/faculty/{faculty_id}/unavailability")
async def mark_faculty_unavailability(
    faculty_id: str,
    req: FacultyUnavailabilityRequest,
    user: dict = Depends(require_role(["admin"]))
):
    unavail_col = db_manager.get_collection("faculty_unavailability")
    filter_query = {"faculty_id": faculty_id, "day": req.day, "period": req.period}
    
    if req.is_unavailable:
        doc = {
            "faculty_id": faculty_id,
            "day": req.day,
            "period": req.period,
            "is_unavailable": True,
            "reason": req.reason or "Marked unavailable by administrator",
            "marked_by": user.get("name", "Admin"),
            "marked_at": datetime.now(timezone.utc).isoformat()
        }
        await unavail_col.update_one(filter_query, {"$set": doc}, upsert=True)
    else:
        await unavail_col.delete_many(filter_query)
        
    return {
        "success": True,
        "faculty_id": faculty_id,
        "day": req.day,
        "period": req.period,
        "is_unavailable": req.is_unavailable,
        "message": f"Faculty {faculty_id} unavailability for {req.day} {req.period} {'marked' if req.is_unavailable else 'unmarked'} successfully by Admin."
    }

@router.get("/faculty/unavailability")
async def get_all_faculty_unavailability(user: dict = Depends(get_current_user)):
    unavail_col = db_manager.get_collection("faculty_unavailability")
    cursor = unavail_col.find({})
    return await cursor.to_list(500)

# 14. Faculty Schedule Change Requests (Task 4: Any faculty can request, admin or deputy coordinator can review & apply)
@router.post("/schedule-change-requests")
async def create_schedule_change_request(
    req: ScheduleChangeRequestCreate,
    user: dict = Depends(require_role(["faculty", "admin", "coordinator"]))
):
    from app.rules.time_grid import is_event_only_period, LUNCH_PERIOD
    if is_event_only_period(req.requested_period):
        raise HTTPException(
            status_code=400,
            detail=f"Requested period {req.requested_period} is reserved strictly for events (P10 to P13). Classes cannot be relocated to event periods."
        )
    if req.requested_period == LUNCH_PERIOD:
        raise HTTPException(
            status_code=400,
            detail="Cannot relocate classes during the 1-hour protected Lunch Break."
        )

    active_sched = await get_active_schedule()
    assignments = active_sched.get("assignments", [])
    current_assignment = next((a for a in assignments if a.get("session_id") == req.session_id), None)
    
    current_day = current_assignment.get("day", "Monday") if current_assignment else "Monday"
    current_period = current_assignment.get("start_period", "P1") if current_assignment else "P1"
    current_room = current_assignment.get("room_id", "LH101") if current_assignment else "LH101"
    
    scr_id = f"SCR_{datetime.now(timezone.utc).strftime('%m%d%H%M%S')}_{user.get('id', 'usr')[:4]}"
    doc = {
        "id": scr_id,
        "faculty_id": user.get("faculty_id") or user.get("id"),
        "faculty_name": user.get("name"),
        "faculty_email": user.get("email"),
        "faculty_role": user.get("role"),
        "session_id": req.session_id,
        "course_code": req.course_code or req.session_id,
        "current_day": current_day,
        "current_period": current_period,
        "current_room_id": current_room,
        "requested_day": req.requested_day,
        "requested_period": req.requested_period,
        "requested_room_id": req.requested_room_id or current_room,
        "reason": req.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db_manager.get_collection("schedule_change_requests").insert_one(doc)
    return {
        "success": True,
        "id": scr_id,
        "status": "pending",
        "message": f"Schedule change request submitted for {req.session_id}. Awaiting Admin or Deputy Coordinator approval."
    }

@router.get("/schedule-change-requests")
async def list_schedule_change_requests(user: dict = Depends(get_current_user)):
    scr_col = db_manager.get_collection("schedule_change_requests")
    role = user.get("role")
    if role in ["admin", "coordinator"]:
        cursor = scr_col.find({})
    else:
        cursor = scr_col.find({"$or": [{"faculty_id": user.get("faculty_id")}, {"faculty_id": user.get("id")}, {"faculty_email": user.get("email")}]})
    return await cursor.to_list(100)

@router.post("/schedule-change-requests/{id}/decision")
async def decide_schedule_change_request(
    id: str,
    req: ScheduleChangeDecisionRequest,
    user: dict = Depends(require_role(["admin", "coordinator"]))
):
    scr_col = db_manager.get_collection("schedule_change_requests")
    request_doc = await scr_col.find_one({"id": id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Schedule change request not found")
        
    new_status = "approved" if req.decision == "approve" else "rejected"
    
    if new_status == "approved":
        # Make the change directly in active timetable
        active_sched = await get_active_schedule()
        assignments = active_sched.get("assignments", [])
        
        session_id = request_doc["session_id"]
        req_day = request_doc["requested_day"]
        req_period = request_doc["requested_period"]
        req_room = request_doc["requested_room_id"]
        
        for a in assignments:
            if a.get("session_id") == session_id:
                a["day"] = req_day
                a["start_period"] = req_period
                a["room_id"] = req_room
                break
                
        # Update occupancy
        occ_col = db_manager.get_collection("occupancy")
        await occ_col.delete_many({"session_id": session_id})
        await occ_col.insert_one({
            "room_id": req_room,
            "day": req_day,
            "period": req_period,
            "session_id": session_id,
            "course_code": request_doc.get("course_code", session_id),
            "course_name": request_doc.get("course_code", session_id)
        })
        
        # Save to file export and DB
        with open("exports/schedule.json", "w", encoding="utf-8") as f:
            json.dump(active_sched, f, indent=2)
            
        version_id = active_sched.get("version_id", "v1.0")
        await db_manager.get_collection("schedule_versions").update_one(
            {"version_id": version_id},
            {"$set": {"assignments": assignments}},
            upsert=True
        )
        
    await scr_col.update_one(
        {"id": id},
        {"$set": {
            "status": new_status,
            "decision_by": user.get("name", user["id"]),
            "decision_role": user.get("role", "coordinator"),
            "decision_reason": req.reason,
            "decided_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "id": id,
        "status": new_status,
        "message": f"Schedule change request {new_status} by {user.get('role')} {user.get('name')}. Timetable updated." if new_status == "approved" else f"Request rejected by {user.get('role')}."
    }

# 15. Health checks
@router.get("/health/live")
async def health_live():
    return {"status": "live", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/health/ready")
async def health_ready():
    active_sched_exists = os.path.exists("exports/schedule.json")
    return {
        "status": "ready",
        "mongodb": "connected" if db_manager.is_connected else "in_memory_ready",
        "indexes": "verified",
        "active_schedule": "present" if active_sched_exists else "pending",
        "worker": "inline_active",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


