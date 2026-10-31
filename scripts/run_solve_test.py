import json
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.solver.engine import SchedulingEngine
from app.solver.exams import solve_midsem_exams
from app.solver.reschedule import solve_reschedule

with open("data/cit_public.json", "r", encoding="utf-8") as f:
    dataset = json.load(f)

print("Starting CP-SAT Two-Stage Solver on 189 sessions...")
engine = SchedulingEngine(time_limit_sec=60, num_workers=2)
success, schedule, violations = engine.generate_schedule(dataset)

if success:
    print(f"Success! Generated {len(schedule['assignments'])} assignments with 0 violations.")
    with open("exports/schedule.json", "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)
    print("Saved exports/schedule.json")
else:
    print("Failed to solve:", violations)
    sys.exit(1)

# Now solve exams
print("Solving 41 midsem exams...")
e_status, exam_assignments = solve_midsem_exams(dataset)
if exam_assignments:
    print(f"Exams solved successfully! {len(exam_assignments)} exams placed.")
    schedule["exams"] = exam_assignments
    with open("exports/schedule.json", "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)
else:
    print("Exams solve failed:", e_status)

# Now test rescheduling with sample_disruption.json
print("Testing Rescheduling with sample_disruption.json...")
with open("data/sample_disruption.json", "r", encoding="utf-8") as f:
    disruption = json.load(f)

res_ok, after_assignments, moved_details, stats = solve_reschedule(
    dataset,
    schedule["assignments"],
    disruption
)

if res_ok:
    print(f"Rescheduling succeeded! Moved sessions: {len(moved_details)}")
    for m in moved_details:
        print(f"  * {m['session_id']}: {m['from_slot']} -> {m['to_slot']} ({m['to_room']}) | {m['reason']}")
    after_schedule = {
        "version": "1.1_after_disruption",
        "assignments": after_assignments,
        "exams": exam_assignments,
        "moved_details": moved_details,
        "status": "feasible"
    }
    with open("exports/schedule_after.json", "w", encoding="utf-8") as f:
        json.dump(after_schedule, f, indent=2)
    print("Saved exports/schedule_after.json")
else:
    print("Rescheduling failed:", stats)

