import json
import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from app.solver.preprocess import PreprocessedDataset
from app.solver.stage1_time import solve_stage1_time
from app.solver.stage2_rooms import solve_stage2_rooms

with open("data/cit_public.json") as f:
    d = json.load(f)

prep = PreprocessedDataset(d)
s1_status, time_sol = solve_stage1_time(prep, time_limit_sec=20)
print("Stage 1 status:", s1_status)

if time_sol:
    s2_status, room_sol, cut = solve_stage2_rooms(prep, time_sol, time_limit_sec=20)
    print("Stage 2 status:", s2_status)
    if not room_sol:
        print("Cut / Error info:", cut)

