"""
Generate synthetic yet fully consistent, realistic dataset for Chilika Institute of Technology (CIT)
Matching all exact counts and requirements in the build prompt:
- Rooms: 27 (classrooms, lecture halls, auditorium, seminar halls, open-air theatre, 7 labs)
- Faculty: 40 (daily limit 4 hours, unavailable slots, avoid slots)
- Student groups: 14 (Year 1: A-D, Year 2: 5 branches, Year 3: 5 branches)
- Courses: 62
- Teaching sessions: 189 (243 weekly hours = 162 1-hr sessions + 27 3-hr lab sessions)
- Midsem exams: 41
- Spectra booking requests: 25 (one cancelled)
"""

import json
import random

random.seed(42)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"]

# 1. Rooms (27)
rooms = [
    # Lecture Halls (4)
    {"id": "LH101", "name": "Lecture Hall 101", "type": "lecture_hall", "capacity": 120, "features": ["projector", "mic", "tiered_seating"], "accessible": True},
    {"id": "LH102", "name": "Lecture Hall 102", "type": "lecture_hall", "capacity": 120, "features": ["projector", "mic", "tiered_seating"], "accessible": True},
    {"id": "LH201", "name": "Lecture Hall 201", "type": "lecture_hall", "capacity": 150, "features": ["projector", "mic", "tiered_seating"], "accessible": False},
    {"id": "LH202", "name": "Lecture Hall 202", "type": "lecture_hall", "capacity": 150, "features": ["projector", "mic", "tiered_seating"], "accessible": False},
    # Classrooms (12)
    {"id": "CR101", "name": "Classroom 101", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": True},
    {"id": "CR102", "name": "Classroom 102", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": True},
    {"id": "CR103", "name": "Classroom 103", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": True},
    {"id": "CR104", "name": "Classroom 104", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": True},
    {"id": "CR201", "name": "Classroom 201", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR202", "name": "Classroom 202", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR203", "name": "Classroom 203", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR204", "name": "Classroom 204", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR301", "name": "Classroom 301", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR302", "name": "Classroom 302", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR303", "name": "Classroom 303", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    {"id": "CR304", "name": "Classroom 304", "type": "classroom", "capacity": 70, "features": ["projector", "whiteboard"], "accessible": False},
    # Seminar Halls (2)
    {"id": "SH1", "name": "Seminar Hall 1", "type": "seminar_hall", "capacity": 100, "features": ["projector", "sound_system", "ac"], "accessible": True},
    {"id": "SH2", "name": "Seminar Hall 2", "type": "seminar_hall", "capacity": 100, "features": ["projector", "sound_system", "ac"], "accessible": False},
    # Auditorium (1)
    {"id": "AUD1", "name": "Main Auditorium", "type": "auditorium", "capacity": 300, "features": ["stage", "lighting", "mic", "projector", "ac"], "accessible": True},
    # Open Air Theatre (1)
    {"id": "OAT1", "name": "Open Air Theatre", "type": "open_air_theatre", "capacity": 400, "features": ["stage", "open_seating", "sound_rig"], "accessible": True},
    # 7 Specialized Labs
    {"id": "LAB_PHY", "name": "Physics Laboratory", "type": "physics_lab", "capacity": 65, "features": ["lab_benches", "optical_tables"], "accessible": True},
    {"id": "LAB_CHEM", "name": "Chemistry Laboratory", "type": "chemistry_lab", "capacity": 65, "features": ["fume_hoods", "gas_lines"], "accessible": True},
    {"id": "LAB_CS1", "name": "Computer Lab 1", "type": "computer_lab", "capacity": 65, "features": ["workstations", "lan", "ups"], "accessible": True},
    {"id": "LAB_CS2", "name": "Computer Lab 2", "type": "computer_lab", "capacity": 65, "features": ["workstations", "lan", "ups"], "accessible": False},
    {"id": "LAB_ECE", "name": "Electronics & Comm Lab", "type": "electronics_lab", "capacity": 65, "features": ["oscilloscopes", "soldering_stations"], "accessible": True},
    {"id": "LAB_MECH", "name": "Mechanical Workshop", "type": "mechanical_lab", "capacity": 65, "features": ["lathes", "milling_machines"], "accessible": True},
    {"id": "LAB_CIVIL", "name": "Civil Engineering Lab", "type": "civil_lab", "capacity": 65, "features": ["compression_testing", "survey_gear"], "accessible": True},
]

# Maintenance windows
maintenance_windows = [
    {"room_id": "LH201", "day": "Wednesday", "start_period": "P7", "end_period": "P9", "reason": "A/V System Firmware Upgrade"},
    {"room_id": "LAB_CHEM", "day": "Friday", "start_period": "P8", "end_period": "P9", "reason": "Chemical Safety Inspection"}
]

# 2. Student Groups (14)
student_groups = [
    {"id": "Y1-A", "name": "Year 1 Section A", "size": 60, "year": 1, "branch": "General"},
    {"id": "Y1-B", "name": "Year 1 Section B", "size": 60, "year": 1, "branch": "General"},
    {"id": "Y1-C", "name": "Year 1 Section C", "size": 60, "year": 1, "branch": "General"},
    {"id": "Y1-D", "name": "Year 1 Section D", "size": 60, "year": 1, "branch": "General"},
    {"id": "Y2-CSE", "name": "Year 2 Computer Science", "size": 60, "year": 2, "branch": "CSE"},
    {"id": "Y2-ECE", "name": "Year 2 Electronics & Comm", "size": 60, "year": 2, "branch": "ECE"},
    {"id": "Y2-EEE", "name": "Year 2 Electrical & Electronics", "size": 60, "year": 2, "branch": "EEE"},
    {"id": "Y2-ME", "name": "Year 2 Mechanical Eng", "size": 60, "year": 2, "branch": "ME"},
    {"id": "Y2-CE", "name": "Year 2 Civil Eng", "size": 60, "year": 2, "branch": "CE"},
    {"id": "Y3-CSE", "name": "Year 3 Computer Science", "size": 60, "year": 3, "branch": "CSE"},
    {"id": "Y3-ECE", "name": "Year 3 Electronics & Comm", "size": 60, "year": 3, "branch": "ECE"},
    {"id": "Y3-EEE", "name": "Year 3 Electrical & Electronics", "size": 60, "year": 3, "branch": "EEE"},
    {"id": "Y3-ME", "name": "Year 3 Mechanical Eng", "size": 60, "year": 3, "branch": "ME"},
    {"id": "Y3-CE", "name": "Year 3 Civil Eng", "size": 60, "year": 3, "branch": "CE"},
]

# 3. Faculty (40)
departments = ["Basic Sciences", "CSE", "ECE", "EEE", "ME", "CE"]
faculty_names = [
    "Dr. Arvind Sharma", "Prof. Sunita Rao", "Dr. Rajesh Iyer", "Prof. Meenakshi Sundaram",
    "Dr. Amit Patel", "Prof. Ananya Gupta", "Dr. Vikram Sethi", "Prof. Kavita Nair",
    "Dr. Pradeep Verma", "Prof. Neha Deshmukh", "Dr. Sanjay Kulkarni", "Prof. Pooja Joshi",
    "Dr. Suresh Menon", "Prof. Deepa Pillai", "Dr. Alok Nath", "Prof. Swati Tiwari",
    "Dr. Manoj Bajpayee", "Prof. Ritu Kapoor", "Dr. Harish Chandra", "Prof. Shalini Varma",
    "Dr. Tarun Gogoi", "Prof. Vandana Shiva", "Dr. Abhay Bang", "Prof. Medha Patkar",
    "Dr. Ashok Sen", "Prof. Rohini Godbole", "Dr. Jayant Narlikar", "Prof. Sudha Murty",
    "Dr. K. Radhakrishnan", "Prof. Tessy Thomas", "Dr. C.N.R. Rao", "Prof. Gagandeep Kang",
    "Dr. Manjul Bhargava", "Prof. Sourav Pal", "Dr. Anil Kakodkar", "Prof. Indira Nath",
    "Dr. R.A. Mashelkar", "Prof. Archana Sharma", "Dr. K. Sivan", "Prof. Priyamvada Natarajan"
]

faculty = []
for i in range(40):
    fid = f"FAC{i+1:02d}"
    dept = departments[i % len(departments)]
    unavail = []
    avoid = []
    # Seed a few realistic unavailabilities & avoid preferences
    if i % 5 == 1:
        unavail.append({"day": "Monday", "period": "P1"})
    if i % 7 == 2:
        unavail.append({"day": "Friday", "period": "P9"})
    if i % 4 == 3:
        avoid.append({"day": "Thursday", "period": "P9"})
    if i % 6 == 0:
        avoid.append({"day": "Tuesday", "period": "P1"})
    
    faculty.append({
        "id": fid,
        "name": faculty_names[i],
        "department": dept,
        "daily_limit": 4,
        "unavailable_slots": unavail,
        "avoid_slots": avoid
    })

# 4. Courses (62)
courses = []
# Year 1 courses (12 courses)
courses.extend([
    {"code": "BS101", "name": "Calculus & Linear Algebra", "department": "Basic Sciences", "year": 1},
    {"code": "BS102", "name": "Engineering Physics", "department": "Basic Sciences", "year": 1},
    {"code": "BS103", "name": "Engineering Chemistry", "department": "Basic Sciences", "year": 1},
    {"code": "BS104", "name": "Physics Laboratory", "department": "Basic Sciences", "year": 1},
    {"code": "BS105", "name": "Chemistry Laboratory", "department": "Basic Sciences", "year": 1},
    {"code": "CS101", "name": "Introduction to Programming", "department": "CSE", "year": 1},
    {"code": "CS102", "name": "Programming Lab", "department": "CSE", "year": 1},
    {"code": "EC101", "name": "Basic Electronics", "department": "ECE", "year": 1},
    {"code": "EE101", "name": "Basic Electrical Engineering", "department": "EEE", "year": 1},
    {"code": "ME101", "name": "Engineering Mechanics", "department": "ME", "year": 1},
    {"code": "ME102", "name": "Workshop Practice", "department": "ME", "year": 1},
    {"code": "HS101", "name": "Professional Communication", "department": "Basic Sciences", "year": 1},
])

# Year 2 courses (25 courses - 5 per branch)
y2_branches = [
    ("CSE", ["CS201 Data Structures", "CS202 Discrete Mathematics", "CS203 Computer Organization", "CS204 OOP with Java", "CS205 Data Structures Lab"]),
    ("ECE", ["EC201 Signals & Systems", "EC202 Analog Circuits", "EC203 Digital Logic Design", "EC204 Network Theory", "EC205 Analog Circuits Lab"]),
    ("EEE", ["EE201 Electrical Machines I", "EE202 Electromagnetic Fields", "EE203 Circuit Theory", "EE204 Power Systems I", "EE205 Electrical Machines Lab"]),
    ("ME", ["ME201 Thermodynamics", "ME202 Strength of Materials", "ME203 Fluid Mechanics", "ME204 Manufacturing Processes", "ME205 Fluid Mechanics Lab"]),
    ("CE", ["CE201 Surveying", "CE202 Building Materials", "CE203 Solid Mechanics", "CE204 Fluid Mechanics (Civil)", "CE205 Surveying Practice Lab"])
]
for dept, clist in y2_branches:
    for ctitle in clist:
        code, name = ctitle.split(" ", 1)
        courses.append({"code": code, "name": name, "department": dept, "year": 2})

# Year 3 courses (25 courses - 5 per branch, including elective basket)
y3_branches = [
    ("CSE", [("CS301", "Operating Systems", None), ("CS302", "Database Management Systems", None), ("CS303", "DBMS Lab", None), ("CS304", "Elective: Cloud Computing", "BASKET_CS_E1"), ("CS305", "Elective: Cyber Security", "BASKET_CS_E1")]),
    ("ECE", [("EC301", "Microprocessors & Microcontrollers", None), ("EC302", "Control Systems", None), ("EC303", "Microcontroller Lab", None), ("EC304", "Elective: VLSI Design", "BASKET_EC_E1"), ("EC305", "Elective: Embedded Systems", "BASKET_EC_E1")]),
    ("EEE", [("EE301", "Power Electronics", None), ("EE302", "Control Systems Eng", None), ("EE303", "Power Electronics Lab", None), ("EE304", "Elective: Renewable Energy", "BASKET_EE_E1"), ("EE305", "Elective: Smart Grids", "BASKET_EE_E1")]),
    ("ME", [("ME301", "Heat & Mass Transfer", None), ("ME302", "Design of Machine Elements", None), ("ME303", "Heat Transfer Lab", None), ("ME304", "Elective: Automobile Eng", "BASKET_ME_E1"), ("ME305", "Elective: Robotics", "BASKET_ME_E1")]),
    ("CE", [("CE301", "Structural Analysis", None), ("CE302", "Geotechnical Engineering", None), ("CE303", "Geotechnical Lab", None), ("CE304", "Elective: Transportation Eng", "BASKET_CE_E1"), ("CE305", "Elective: Environmental Eng", "BASKET_CE_E1")])
]
for dept, clist in y3_branches:
    for code, name, basket in clist:
        courses.append({"code": code, "name": name, "department": dept, "year": 3, "basket_id": basket})

assert len(courses) == 62, f"Expected 62 courses, got {len(courses)}"

# 5. Teaching Sessions (189 total: exactly 162 1-hr sessions + 27 3-hr lab sessions = 243 hours)
sessions = []
sid_counter = 1

def add_session(course_code, faculty_ids, group_ids, stype, duration, room_type_req, min_cap, accessible=False, fixed_slot=None, basket_id=None):
    global sid_counter
    sid = f"SES{sid_counter:03d}"
    sid_counter += 1
    sessions.append({
        "id": sid,
        "course_code": course_code,
        "faculty_ids": faculty_ids,
        "group_ids": group_ids,
        "type": stype,
        "duration": duration,
        "room_type_required": room_type_req,
        "min_capacity": min_cap,
        "needs_accessible": accessible,
        "fixed_slot": fixed_slot,
        "basket_id": basket_id
    })

# Year 1 (4 groups: Y1-A, Y1-B, Y1-C, Y1-D)
# 4 sections * 3 labs (Physics, Chem, Workshop) = 12 3-hr labs
# Y1 Labs (12 sessions of 3 hours = 36 hours)
y1_groups = ["Y1-A", "Y1-B", "Y1-C", "Y1-D"]
for i, g in enumerate(y1_groups):
    add_session("BS104", [f"FAC{1 + (i % 4):02d}"], [g], "lab", 3, "physics_lab", 60, accessible=True)
    add_session("BS105", [f"FAC{5 + (i % 4):02d}"], [g], "lab", 3, "chemistry_lab", 60, accessible=True)
    add_session("ME102", [f"FAC{9 + (i % 4):02d}"], [g], "lab", 3, "mechanical_lab", 60, accessible=True)

# Y1 Lectures: 14 lectures of 1 hr per section = 56 1-hr sessions
y1_lec_courses = [
    ("BS101", 3), # 3 hrs Math
    ("BS102", 3), # 3 hrs Physics
    ("BS103", 3), # 3 hrs Chem
    ("CS101", 2), # 2 hrs CS
    ("EC101", 1), # 1 hr ECE
    ("EE101", 1), # 1 hr EEE
    ("HS101", 1), # 1 hr Comm
]
for g_idx, g in enumerate(y1_groups):
    fac_offset = (g_idx * 3) % 20
    for c_code, hrs in y1_lec_courses:
        for h in range(hrs):
            f_id = f"FAC{1 + ((fac_offset + h) % 35):02d}"
            # Combined lecture for Y1-A and Y1-B on first BS101 lecture as demo
            add_session(c_code, [f_id], [g], "lecture", 1, "classroom", 60, accessible=(h == 0 and g_idx == 0))

# Year 2: 5 branches (Y2-CSE, Y2-ECE, Y2-EEE, Y2-ME, Y2-CE)
# 5 branches * 2 labs (e.g. 1 3-hr lab each = 5 labs * 3 = 15 lab hours; wait: 27 total labs: Y1 has 12 labs, Y2 has 10 labs (2 each branch), Y3 has 5 labs (1 each branch) = 27 labs!)
# Let's verify: 12 + 10 + 5 = 27 3-hr labs!
# 27 labs * 3 = 81 hours!
# 189 - 27 = 162 1-hr lectures! 162 + 81 = 243 hours exactly!
y2_lab_configs = {
    "Y2-CSE": [("CS205", "computer_lab", ["FAC15"]), ("CS102", "computer_lab", ["FAC16"])],
    "Y2-ECE": [("EC205", "electronics_lab", ["FAC17"]), ("EC203", "electronics_lab", ["FAC18"])],
    "Y2-EEE": [("EE205", "electronics_lab", ["FAC19"]), ("EE201", "electronics_lab", ["FAC20"])],
    "Y2-ME":  [("ME205", "mechanical_lab", ["FAC21"]), ("ME204", "mechanical_lab", ["FAC22"])],
    "Y2-CE":  [("CE205", "civil_lab", ["FAC23"]), ("CE201", "civil_lab", ["FAC24"])],
}
for g, llist in y2_lab_configs.items():
    for c_code, rtype, facs in llist:
        add_session(c_code, facs, [g], "lab", 3, rtype, 60, accessible=True)

# Y2 Lectures: 5 branches * 11 1-hr sessions = 55 1-hr sessions
y2_lec_courses = {
    "Y2-CSE": [("CS201", 3), ("CS202", 3), ("CS203", 3), ("CS204", 2)],
    "Y2-ECE": [("EC201", 3), ("EC202", 3), ("EC203", 3), ("EC204", 2)],
    "Y2-EEE": [("EE201", 3), ("EE202", 3), ("EE203", 3), ("EE204", 2)],
    "Y2-ME":  [("ME201", 3), ("ME202", 3), ("ME203", 3), ("ME204", 2)],
    "Y2-CE":  [("CE201", 3), ("CE202", 3), ("CE203", 3), ("CE204", 2)],
}
for g, clist in y2_lec_courses.items():
    for c_code, hrs in clist:
        for h in range(hrs):
            fac_idx = (int(c_code[-3:]) + h) % 38 + 1
            add_session(c_code, [f"FAC{fac_idx:02d}"], [g], "lecture", 1, "classroom", 60)

# Year 3: 5 branches (Y3-CSE, Y3-ECE, Y3-EEE, Y3-ME, Y3-CE)
# 5 3-hr labs (1 per branch = 5 labs)
y3_lab_configs = {
    "Y3-CSE": ("CS303", "computer_lab", ["FAC25"]),
    "Y3-ECE": ("EC303", "electronics_lab", ["FAC26"]),
    "Y3-EEE": ("EE303", "electronics_lab", ["FAC27"]),
    "Y3-ME":  ("ME303", "mechanical_lab", ["FAC28"]),
    "Y3-CE":  ("CE303", "civil_lab", ["FAC29"]),
}
for g, (c_code, rtype, facs) in y3_lab_configs.items():
    add_session(c_code, facs, [g], "lab", 3, rtype, 60, accessible=False)

# Y3 Lectures:
# Total 1-hr lectures needed so far:
# Currently: Y1 = 56, Y2 = 55, total = 111.
# Target total 1-hr lectures = 162.
# So Y3 needs 162 - 111 = 51 1-hr sessions.
# 5 branches: 10 each for 4 branches (40) + 11 for 1 branch (11) = 51 sessions!
# Plus elective basket sessions: Basket sessions run in parallel at the SAME slot!
y3_lec_courses = {
    "Y3-CSE": [("CS301", 3, None), ("CS302", 3, None), ("CS304", 2, "BASKET_CS_E1"), ("CS305", 2, "BASKET_CS_E1")], # 10 hrs
    "Y3-ECE": [("EC301", 3, None), ("EC302", 3, None), ("EC304", 2, "BASKET_EC_E1"), ("EC305", 2, "BASKET_EC_E1")], # 10 hrs
    "Y3-EEE": [("EE301", 3, None), ("EE302", 3, None), ("EE304", 2, "BASKET_EE_E1"), ("EE305", 2, "BASKET_EE_E1")], # 10 hrs
    "Y3-ME":  [("ME301", 3, None), ("ME302", 3, None), ("ME304", 2, "BASKET_ME_E1"), ("ME305", 2, "BASKET_ME_E1")], # 10 hrs
    "Y3-CE":  [("CE301", 3, None), ("CE302", 3, None), ("CE304", 3, "BASKET_CE_E1"), ("CE305", 2, "BASKET_CE_E1")], # 11 hrs
}
for g, clist in y3_lec_courses.items():
    for c_code, hrs, b_id in clist:
        for h in range(hrs):
            fac_idx = (int(c_code[-3:]) + h * 2) % 38 + 1
            add_session(c_code, [f"FAC{fac_idx:02d}"], [g], "lecture", 1, "classroom", 60, basket_id=b_id)

print(f"Total sessions created: {len(sessions)}")
total_hours = sum(s["duration"] for s in sessions)
print(f"Total teaching hours: {total_hours}")
lab_count = sum(1 for s in sessions if s["duration"] == 3)
lec_count = sum(1 for s in sessions if s["duration"] == 1)
print(f"Labs: {lab_count}, Lectures: {lec_count}")
assert len(sessions) == 189, f"Expected 189 sessions, got {len(sessions)}"
assert total_hours == 243, f"Expected 243 hours, got {total_hours}"

# 6. Midsem Exams (41)
# Midsem exams for 41 core lecture courses across student groups
exam_courses = [c for c in courses if "Lab" not in c["name"] and "Workshop" not in c["name"]][:41]
exams = []
for i, c in enumerate(exam_courses):
    eid = f"EXAM{i+1:02d}"
    yr = c.get("year", 1)
    if yr == 1:
        g_target = [f"Y1-{chr(65 + (i % 4))}"]
    else:
        dept = c["department"]
        g_target = [f"Y{yr}-{dept}"]
    
    exams.append({
        "id": eid,
        "course_code": c["code"],
        "course_name": c["name"],
        "group_ids": g_target,
        "duration": 2, # 2 hours
        "expected_students": 60,
        "room_types_allowed": ["lecture_hall", "auditorium"]
    })
print(f"Total exams created: {len(exams)}")
assert len(exams) == 41, f"Expected 41 exams, got {len(exams)}"

# 7. Spectra Booking Requests (25)
# Spectra is the annual tech fest in Week 7.
# Priority classes:
# 1: exams
# 2: regular_classes
# 3: institute_events (Spectra main events, convocation)
# 4: guest_lectures
# 5: department_events
# 6: club_events
booking_templates = [
    # 5 Institute Events (Spectra key ceremonies)
    {"title": "Spectra 2025 Inaugural Ceremony", "type": "institute_event", "priority": 3, "room_id": "AUD1", "day": "Monday", "start_period": "P1", "duration": 3, "requester": "Dean Academic", "expected_attendance": 280, "message": "Inauguration ceremony for Spectra Week 7 in Main Auditorium"},
    {"title": "Spectra Keynote: Future of Quantum Computing", "type": "institute_event", "priority": 3, "room_id": "AUD1", "day": "Tuesday", "start_period": "P6", "duration": 2, "requester": "Director Office", "expected_attendance": 250, "message": "Keynote address by distinguished scientist in Auditorium"},
    {"title": "RoboWars Arena Championship", "type": "institute_event", "priority": 3, "room_id": "OAT1", "day": "Wednesday", "start_period": "P6", "duration": 3, "requester": "Tech Fest Convenor", "expected_attendance": 350, "message": "Spectra National RoboWars Arena contest in Open Air Theatre"},
    {"title": "Spectra Hackathon Finale & Demos", "type": "institute_event", "priority": 3, "room_id": "SH1", "day": "Thursday", "start_period": "P6", "duration": 3, "requester": "Tech Council", "expected_attendance": 90, "message": "24-hr Hackathon judging and live demonstrations in Seminar Hall 1"},
    {"title": "Spectra Valedictory & Awards Night", "type": "institute_event", "priority": 3, "room_id": "AUD1", "day": "Friday", "start_period": "P6", "duration": 3, "requester": "Dean Student Welfare", "expected_attendance": 300, "message": "Annual prize distribution and closing ceremony"},

    # 4 Guest Lectures
    {"title": "Industry Talk: Generative AI in Production", "type": "guest_lecture", "priority": 4, "room_id": "SH1", "day": "Monday", "start_period": "P3", "duration": 2, "requester": "Prof. Ananya Gupta", "expected_attendance": 85, "message": "Guest lecture by VP Engineering, Google on LLM architecture"},
    {"title": "Clean Energy Transitions: Grid Modernization", "type": "guest_lecture", "priority": 4, "room_id": "SH2", "day": "Tuesday", "start_period": "P2", "duration": 2, "requester": "Dr. Suresh Menon", "expected_attendance": 70, "message": "Invited talk on renewable grid integration"},
    {"title": "Aerospace Composites & Smart Materials", "type": "guest_lecture", "priority": 4, "room_id": "LH202", "day": "Thursday", "start_period": "P2", "duration": 2, "requester": "Dr. Abhay Bang", "expected_attendance": 100, "message": "Guest session on next-gen aerospace polymers"},
    {"title": "FinTech & Blockchain Scalability", "type": "guest_lecture", "priority": 4, "room_id": "SH1", "day": "Friday", "start_period": "P3", "duration": 2, "requester": "Prof. Deepa Pillai", "expected_attendance": 75, "message": "Special lecture by industry expert on distributed ledgers"},

    # 6 Department Events
    {"title": "CSE Department Project Expo", "type": "department_event", "priority": 5, "room_id": "LAB_CS1", "day": "Tuesday", "start_period": "P2", "duration": 3, "requester": "CSE Dept Coordinator", "expected_attendance": 60, "message": "Annual CSE student capstone project display"},
    {"title": "ECE Circuit Design Challenge", "type": "department_event", "priority": 5, "room_id": "LAB_ECE", "day": "Wednesday", "start_period": "P2", "duration": 3, "requester": "ECE Dept Coordinator", "expected_attendance": 50, "message": "Competitive circuit building time trial"},
    {"title": "Mechanical CAD Modeling Sprint", "type": "department_event", "priority": 5, "room_id": "LAB_CS2", "day": "Thursday", "start_period": "P2", "duration": 3, "requester": "ME Dept Coordinator", "expected_attendance": 55, "message": "High-speed 3D CAD modeling competition"},
    {"title": "Civil Bridge Load Testing Competition", "type": "department_event", "priority": 5, "room_id": "LAB_CIVIL", "day": "Friday", "start_period": "P2", "duration": 3, "requester": "Civil Dept Coordinator", "expected_attendance": 50, "message": "Popsicle stick bridge stress testing"},
    {"title": "EEE Power Innovation Showcase", "type": "department_event", "priority": 5, "room_id": "SH2", "day": "Wednesday", "start_period": "P6", "duration": 3, "requester": "EEE Dept Coordinator", "expected_attendance": 80, "message": "Department mini-projects review"},
    {"title": "Basic Sciences Math Olympiad Screening", "type": "department_event", "priority": 5, "room_id": "LH101", "day": "Thursday", "start_period": "P7", "duration": 2, "requester": "Maths Dept Head", "expected_attendance": 110, "message": "Inter-college Mathematics Olympiad preliminary test"},

    # 10 Club Events (with English & Hinglish prompts)
    {"title": "Coding Club: Bug Hunt Contest", "type": "club_event", "priority": 6, "room_id": "LAB_CS2", "day": "Monday", "start_period": "P6", "duration": 3, "requester": "Coding Club Lead", "expected_attendance": 60, "message": "Bug debugging challenge for freshers"},
    {"title": "Robotics Club: Drone Simulator Workshop", "type": "club_event", "priority": 6, "room_id": "SH2", "day": "Monday", "start_period": "P2", "duration": 2, "requester": "Robotics Club Secretary", "expected_attendance": 65, "message": "Hands-on drone piloting simulation"},
    {"title": "Astronomy Club: Space Telescope Talk", "type": "club_event", "priority": 6, "room_id": "SH1", "day": "Tuesday", "start_period": "P7", "duration": 2, "requester": "Astro Club Lead", "expected_attendance": 80, "message": "Seminar on James Webb deep space telemetry"},
    {"title": "Literary & Debate Society: Parliamentary Debate", "type": "club_event", "priority": 6, "room_id": "CR101", "day": "Tuesday", "start_period": "P7", "duration": 2, "requester": "DebSoc President", "expected_attendance": 50, "message": "Hume Spectra ke liye Tuesday shaam ko room chahiye debate ke liye"},
    {"title": "Music Club: Acoustic Jam Session", "type": "club_event", "priority": 6, "room_id": "OAT1", "day": "Thursday", "start_period": "P7", "duration": 2, "requester": "Music Society", "expected_attendance": 150, "message": "Sunset acoustic jam in Open Air Theatre"},
    {"title": "Gaming Club: LAN Valorant Prelims", "type": "club_event", "priority": 6, "room_id": "LAB_CS1", "day": "Friday", "start_period": "P6", "duration": 3, "requester": "Esports Club", "expected_attendance": 60, "message": "Inter-hostel gaming qualifier matches"},
    {"title": "Photography Club: Portfolio Exhibition", "type": "club_event", "priority": 6, "room_id": "CR102", "day": "Wednesday", "start_period": "P3", "duration": 2, "requester": "Photo Club Secretary", "expected_attendance": 45, "message": "Annual photo gallery display"},
    {"title": "Quiz Club: General Knowledge Trivia", "type": "club_event", "priority": 6, "room_id": "CR103", "day": "Thursday", "start_period": "P3", "duration": 2, "requester": "Quiz Club Lead", "expected_attendance": 55, "message": "College quiz preliminary written round"},
    {"title": "AI Club: LLM Prompt Engineering Workshop", "type": "club_event", "priority": 6, "room_id": "SH1", "day": "Friday", "start_period": "P6", "duration": 3, "requester": "AI Student Lead", "expected_attendance": 90, "message": "Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye."},
    # The 25th is cancelled
    {"title": "Design Club: UI/UX Poster Design Sprint", "type": "club_event", "priority": 6, "room_id": "CR104", "day": "Wednesday", "start_period": "P7", "duration": 2, "requester": "Design Club Rep", "expected_attendance": 40, "message": "Cancelled request for poster design", "status": "cancelled"},
]

booking_requests = []
for i, b in enumerate(booking_templates):
    bid = f"BR{i+1:02d}"
    b_copy = dict(b)
    b_copy["id"] = bid
    if "status" not in b_copy:
        b_copy["status"] = "pending"
    booking_requests.append(b_copy)

print(f"Total bookings created: {len(booking_requests)}")
assert len(booking_requests) == 25, f"Expected 25 bookings, got {len(booking_requests)}"

# Complete dataset payload
dataset = {
    "institute": "Chilika Institute of Technology",
    "academic_year": "2024-2025",
    "semester": "Spring",
    "week": 7,
    "time_grid": {
        "days": DAYS,
        "periods": PERIODS,
        "lunch_period": "P5",
        "period_timings": {
            "P1": "08:00 - 09:00",
            "P2": "09:00 - 10:00",
            "P3": "10:00 - 11:00",
            "P4": "11:00 - 12:00",
            "P5": "12:00 - 13:00 (Lunch)",
            "P6": "13:00 - 14:00",
            "P7": "14:00 - 15:00",
            "P8": "15:00 - 16:00",
            "P9": "16:00 - 17:00"
        },
        "event_periods": ["P10", "P11", "P12", "P13"]
    },
    "rooms": rooms,
    "maintenance_windows": maintenance_windows,
    "faculty": faculty,
    "student_groups": student_groups,
    "courses": courses,
    "sessions": sessions,
    "exams": exams,
    "booking_requests": booking_requests
}

with open("data/cit_public.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2)

print("Saved data/cit_public.json successfully!")
