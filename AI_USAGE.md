# AI Usage & Governance Declaration

## 1. Overview
The **Chilika Institute of Technology (CIT) Campus Scheduling Platform** utilizes Artificial Intelligence solely as an intuitive Natural Language Interface (AI Gateway) to translate conversational prompts (in both standard English and colloquial Hinglish) into structured booking intent drafts.

**Deterministic Guarantees:** All core scheduling, timetable optimization, conflict detection, priority displacement, and emergency disruption rescheduling are powered by deterministic constraint programming (**Google OR-Tools CP-SAT**) and verified by a pure Python validator (`validator.py`). **No AI or Large Language Model (LLM) is ever permitted to make autonomous scheduling decisions, bypass hard constraints, or override booking priorities.**

---

## 2. Model & Integration Details

- **Model Declared:** Google Gemini 1.5 Flash (`models/gemini-1.5-flash`)
- **Integration Layer:** `backend/app/ai/gateway.py`
- **Invocation Mode:** Structured JSON Output (`response_mime_type="application/json"`)
- **Timeout & Circuit Breaker:** 8-second HTTP timeout with automatic failover to a deterministic regex parser.

---

## 3. Scope of AI Tasks

| Component | Responsibility | AI Model Used | Deterministic Guardrail |
| :--- | :--- | :--- | :--- |
| **Booking NLP Parser** | Extracts parameters (`event_type`, `room_type_required`, `day`, `start_period`, `duration`, `expected_attendance`) from English / Hinglish prompts. | Gemini 1.5 Flash | Pydantic V2 schema validation (`BookingDraft`); CP-SAT availability validation; Priority hierarchy enforcement. |
| **Displacement Explanations** | Generates polite, clear explanations when a lower-priority booking is displaced. | Template / LLM Assisted | Displacement logic is 100% hardcoded in `backend/app/services/bookings.py`. |

---

## 4. Prompt Templates & Locations

The prompt templates are defined in [`backend/app/ai/gateway.py`](file:///backend/app/ai/gateway.py):

```python
SYSTEM_INSTRUCTION = """
You are the CIT Campus Scheduling AI Assistant.
Your task is to parse unstructured room/venue booking requests in English or Hinglish into a structured JSON draft.

Rules:
1. Extract:
   - title: concise title
   - event_type: one of ["exam", "regular_class", "institute_event", "guest_lecture", "department_event", "club_event"]
   - room_type_required: "auditorium" if audience > 120 or keywords like "auditorium"/"audi", "seminar_hall" if "seminar", "lab" if lab, else "lecture_hall"
   - day: "Monday", "Tuesday", "Wednesday", "Thursday", or "Friday"
   - start_period: map hours to periods (e.g. 09:00->P1, 10:00->P2, 11:00->P3, 12:00->P4, 14:00->P6, 15:00->P7, 16:00->P8, 17:00->P9)
   - duration: integer hours (1, 2, or 3)
   - expected_attendance: integer count of expected participants
2. Output JSON ONLY matching the schema.
"""
```

### Hinglish Test Case Verification:
- **Input:** *"Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye."*
- **Parsed Output:**
  ```json
  {
    "title": "Spectra Event - Seminar Hall",
    "event_type": "institute_event",
    "room_type_required": "seminar_hall",
    "day": "Friday",
    "start_period": "P6",
    "duration": 3,
    "expected_attendance": 100
  }
  ```

---

## 5. Explicit Safety Boundaries & Non-Negotiable Limits

1. **Zero Autonomous Writes:** The AI Gateway generates a **draft request only**. It cannot write to the database or approve bookings.
2. **Deterministic Constraint Gate:** Even if an AI draft requests a room, the booking engine checks all 13 hard constraints (room capacity, maintenance closures, timetable overlaps). If violated, the request is rejected deterministically.
3. **Hardcoded Priority Tiers:** Venue conflicts follow strict numeric tiers:
   $$\text{Exams (1)} > \text{Classes (2)} > \text{Institute (3)} > \text{Guest (4)} > \text{Dept (5)} > \text{Club (6)}$$
   An AI output cannot elevate priority or prevent legitimate displacement.
4. **Resilience & Circuit Breaking:** If the external Gemini API is unreachable, times out (> 8s), or returns invalid JSON, the system smoothly falls back to a deterministic regex parser. The user experience is never blocked.
5. **Data Privacy:** Only the prompt text is sent to the Gemini API. No student names, grades, passwords, or institutional tokens are ever included in prompt payloads.
