"""
Runs official validator on generated exports:
- exports/schedule.json
- exports/schedule_after.json
"""

import sys
import subprocess
import os

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    validator_path = os.path.join(root, "validator.py")
    dataset_path = os.path.join(root, "data", "cit_public.json")
    schedule_path = os.path.join(root, "exports", "schedule.json")
    after_path = os.path.join(root, "exports", "schedule_after.json")
    disruption_path = os.path.join(root, "data", "sample_disruption.json")

    print("[1/2] Validating baseline schedule...")
    res1 = subprocess.run([sys.executable, validator_path, schedule_path, dataset_path])
    if res1.returncode != 0:
        print("Validation failed for baseline schedule!")
        sys.exit(1)

    print("\n[2/2] Validating rescheduling diff after disruption...")
    res2 = subprocess.run([
        sys.executable, validator_path, after_path, dataset_path,
        "--before", schedule_path,
        "--disruption", disruption_path
    ])
    if res2.returncode != 0:
        print("Validation failed for schedule_after.json!")
        sys.exit(1)

    print("\nAll exported schedules passed official validation!")

if __name__ == "__main__":
    main()

