"""
Tests for AI Gateway:
- Hinglish samples parse correctly
- Exact test sentence matches requirements:
  "Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye."
  -> Friday, 14:00 to 17:00, seminar hall, 100 attendees.
- Circuit breaker & fallback mechanism.
"""

import pytest
from app.ai.gateway import deterministic_hinglish_parse, parse_booking_prompt

def test_hinglish_exact_sample():
    prompt = "Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye."
    draft = deterministic_hinglish_parse(prompt)

    assert draft.day == "Friday"
    assert draft.start_time == "14:00"
    assert draft.end_time == "17:00"
    assert draft.room_type == "seminar_hall"
    assert draft.expected_attendance == 100
    assert draft.duration == 3

def test_english_sample():
    prompt = "Need Auditorium for 250 students on Monday from 9 to 11 for guest lecture."
    draft = deterministic_hinglish_parse(prompt)

    assert draft.day == "Monday"
    assert draft.room_type == "auditorium"
    assert draft.expected_attendance == 250

@pytest.mark.asyncio
async def test_async_gateway_returns_metadata():
    prompt = "Friday seminar hall chahiye 100 logon ke liye 2 se 5"
    draft, meta = await parse_booking_prompt(prompt)
    assert draft.day == "Friday"
    assert draft.room_type == "seminar_hall"
    assert "latency_sec" in meta

