"""
Master CP-SAT Solver Engine for CIT Campus Scheduling Platform.
Orchestrates:
1. Stage 0: Preprocessing & candidate generation
2. Stage 1: Time assignment with soft penalties
3. Stage 2: Room assignment with best-fit objective
4. Feedback loop: No-good cut back-propagation if Stage 2 fails
5. Official validation gate before publishing
"""

import sys
import json
import subprocess
from typing import Dict, List, Any, Tuple, Optional
from app.solver.preprocess import PreprocessedDataset
from app.solver.stage1_time import solve_stage1_time
from app.solver.stage2_rooms import solve_stage2_rooms
from app.rules.conflicts import find_violations

class SchedulingEngine:
    def __init__(self, time_limit_sec: int = 60, num_workers: int = 2):
        self.time_limit_sec = time_limit_sec
        self.num_workers = num_workers

    def generate_schedule(
        self,
        dataset: Dict[str, Any],
        hints: Optional[Dict[str, Tuple[str, str]]] = None,
        max_rounds: int = 3
    ) -> Tuple[bool, Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Executes the two-stage CP-SAT solver.
        Returns (success, schedule_dict, violations_list).
        """
        prep = PreprocessedDataset(dataset)
        no_good_cuts: List[Dict[str, Tuple[str, str]]] = []

        round_num = 0
        final_assignments = None

        while round_num < max_rounds:
            round_num += 1
            # Stage 1: Time Assignment
            s1_status, time_solution = solve_stage1_time(
                prep,
                time_limit_sec=self.time_limit_sec // 2,
                num_workers=self.num_workers,
                hints=hints,
                no_good_cuts=no_good_cuts
            )

            if not time_solution:
                return False, None, [{"rule": "STAGE1_INFEASIBLE", "message": f"Stage 1 failed: {s1_status}"}]

            # Stage 2: Room Assignment
            s2_status, room_assignments, offending_cut = solve_stage2_rooms(
                prep,
                time_solution,
                time_limit_sec=self.time_limit_sec // 2,
                num_workers=self.num_workers
            )

            if room_assignments:
                final_assignments = room_assignments
                break
            else:
                if offending_cut:
                    no_good_cuts.append(offending_cut)

        if not final_assignments:
            return False, None, [{"rule": "STAGE2_INFEASIBLE", "message": "Failed to assign clash-free rooms after rounds"}]

        schedule_result = {
            "version": "1.0",
            "assignments": final_assignments,
            "status": "feasible"
        }

        # Internal conflict check
        violations = find_violations(schedule_result, dataset)
        if violations:
            return False, schedule_result, violations

        return True, schedule_result, []

