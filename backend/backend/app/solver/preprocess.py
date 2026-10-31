"""
Stage 0: Preprocessor for CIT CP-SAT Solver.
Builds event specifications, computes candidate rooms and legal start slots,
and merges elective basket sessions into shared time events.
"""

from typing import Dict, List, Any, Tuple
from app.rules.candidates import get_candidate_rooms, get_candidate_slots

class PreprocessedDataset:
    def __init__(self, dataset: Dict[str, Any]):
        self.dataset = dataset
        self.rooms = dataset.get("rooms", [])
        self.faculty = dataset.get("faculty", [])
        self.groups = dataset.get("student_groups", [])
        self.sessions = dataset.get("sessions", [])
        self.maintenance = dataset.get("maintenance_windows", [])

        self.rooms_by_id = {r["id"]: r for r in self.rooms}
        self.faculty_by_id = {f["id"]: f for f in self.faculty}
        self.groups_by_id = {g["id"]: g for g in self.groups}
        self.sessions_by_id = {s["id"]: s for s in self.sessions}

        # Count rooms by type
        self.room_count_by_type: Dict[str, int] = {}
        for r in self.rooms:
            t = r.get("type", "classroom")
            self.room_count_by_type[t] = self.room_count_by_type.get(t, 0) + 1

        self.events: List[Dict[str, Any]] = []
        self._build_events()

    def _build_events(self):
        """
        Merge sessions with same basket_id into a single time event,
        while keeping separate room requirements for each sub-session.
        """
        basket_groups: Dict[str, List[Dict[str, Any]]] = {}
        standalone_sessions: List[Dict[str, Any]] = []

        for s in self.sessions:
            b_id = s.get("basket_id")
            if b_id:
                if b_id not in basket_groups:
                    basket_groups[b_id] = []
                basket_groups[b_id].append(s)
            else:
                standalone_sessions.append(s)

        # Standalone events
        for s in standalone_sessions:
            c_rooms = get_candidate_rooms(s, self.rooms)
            c_slots = get_candidate_slots(s, self.faculty_by_id, self.maintenance, candidate_rooms=c_rooms)
            self.events.append({
                "id": s["id"],
                "session_ids": [s["id"]],
                "duration": s.get("duration", 1),
                "faculty_ids": s.get("faculty_ids", []),
                "group_ids": s.get("group_ids", []),
                "room_type_required": s.get("room_type_required", "classroom"),
                "min_capacity": s.get("min_capacity", 0),
                "candidate_rooms": [r["id"] for r in c_rooms],
                "candidate_slots": c_slots,
                "is_basket": False,
                "sub_sessions": [s]
            })

        # Basket events
        for b_id, b_sessions in basket_groups.items():
            duration = b_sessions[0].get("duration", 1)
            all_fac = list({fid for bs in b_sessions for fid in bs.get("faculty_ids", [])})
            all_groups = list({gid for bs in b_sessions for gid in bs.get("group_ids", [])})
            
            # Sub-sessions candidate rooms
            for bs in b_sessions:
                bs["candidate_rooms"] = [r["id"] for r in get_candidate_rooms(bs, self.rooms)]

            common_slots = get_candidate_slots(
                {"duration": duration, "faculty_ids": all_fac},
                self.faculty_by_id,
                self.maintenance
            )

            self.events.append({
                "id": f"BASKET_{b_id}",
                "basket_id": b_id,
                "session_ids": [bs["id"] for bs in b_sessions],
                "duration": duration,
                "faculty_ids": all_fac,
                "group_ids": all_groups,
                "candidate_slots": common_slots,
                "is_basket": True,
                "sub_sessions": b_sessions
            })
