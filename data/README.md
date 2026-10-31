# CIT Campus Scheduling Dataset

This dataset provides the official benchmark environment for Chilika Institute of Technology (CIT) scheduling.

## Dataset Structure (`cit_public.json`)

- **rooms**: 27 rooms
  - Classrooms (CR101-CR104, CR201-CR204, CR301-CR304)
  - Lecture Halls (LH101, LH102, LH201, LH202)
  - Seminar Halls (SH1, SH2)
  - Auditorium (AUD1)
  - Open Air Theatre (OAT1)
  - 7 Specialized Laboratories: Physics, Chemistry, Computer 1, Computer 2, Electronics, Mechanical, Civil
- **faculty**: 40 faculty members
  - Daily teaching hour limit: 4 hours
  - Specific unavailable slots & avoid preference slots
- **student_groups**: 14 student groups
  - Year 1: Y1-A, Y1-B, Y1-C, Y1-D
  - Year 2: Y2-CSE, Y2-ECE, Y2-EEE, Y2-ME, Y2-CE
  - Year 3: Y3-CSE, Y3-ECE, Y3-EEE, Y3-ME, Y3-CE
- **courses**: 62 courses across departments
- **sessions**: 189 teaching sessions (243 weekly teaching hours)
  - 162 1-hour lectures/tutorials
  - 27 3-hour laboratory sessions
- **midsem_exams**: 41 midsem course examinations (capacity halved during exams)
- **booking_requests**: 25 Spectra week requests (1 cancelled)

## Time Grid
- Days: Monday through Friday
- Periods: P1 through P9
  - P1: 08:00 - 09:00
  - P2: 09:00 - 10:00
  - P3: 10:00 - 11:00
  - P4: 11:00 - 12:00
  - P5: 12:00 - 13:00 (Lunch band)
  - P6: 13:00 - 14:00
  - P7: 14:00 - 15:00
  - P8: 15:00 - 16:00
  - P9: 16:00 - 17:00
- Event Periods: P10 to P13 (18:00 to 22:00)

## Running the Validator
```bash
python validator.py <schedule_path> [dataset_path] [--before <baseline_path>]
```
Exits with 0 when clash-free (0 hard violations), 1 otherwise.

