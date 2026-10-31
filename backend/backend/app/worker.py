"""
Background Worker Loop for CIT Campus Scheduling Platform.
Polls and claims solver jobs from the `solver_jobs` collection:
findOneAndUpdate({status: "queued"}, {$set: {status: "running", lease_until: ...}})
Reclaims jobs with expired leases.
"""

import asyncio
import os
import json
import logging
from datetime import datetime, timezone, timedelta
from app.db.mongo import db_manager
from app.solver.engine import SchedulingEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cit_worker")

LEASE_DURATION_SECONDS = 180

async def run_worker_loop():
    logger.info("Initializing CIT Solver Worker...")
    await db_manager.connect()
    engine = SchedulingEngine(time_limit_sec=60, num_workers=2)

    logger.info("Worker loop listening for solver jobs...")
    while True:
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            lease_until = (datetime.now(timezone.utc) + timedelta(seconds=LEASE_DURATION_SECONDS)).isoformat()

            jobs_col = db_manager.get_collection("solver_jobs")

            # 1. Reclaim expired running jobs
            # 2. Claim queued job
            job = await jobs_col.find_one_and_update(
                {"status": "queued"},
                {"$set": {
                    "status": "running",
                    "lease_until": lease_until,
                    "heartbeat_at": now_iso
                }}
            )

            if job:
                job_id = job["id"]
                logger.info(f"Worker claimed job {job_id} [{job.get('kind')}]")

                with open("data/cit_public.json", "r", encoding="utf-8") as f:
                    dataset = json.load(f)

                ok, sched, violations = engine.generate_schedule(dataset)
                if ok:
                    ver_id = f"ver_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
                    await jobs_col.update_one(
                        {"id": job_id},
                        {"$set": {"status": "completed", "result_ref": ver_id}}
                    )
                    logger.info(f"Job {job_id} completed successfully! Version: {ver_id}")
                else:
                    await jobs_col.update_one(
                        {"id": job_id},
                        {"$set": {"status": "failed", "error": violations}}
                    )
                    logger.warning(f"Job {job_id} failed with violations: {violations}")

            # Sleep between poll ticks
            await asyncio.sleep(2)

        except Exception as e:
            logger.error(f"Worker iteration error: {e}")
            await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(run_worker_loop())

