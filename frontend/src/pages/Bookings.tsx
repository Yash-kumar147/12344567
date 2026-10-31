import React, { useState, useEffect } from 'react';
import { 
  BookmarkCheck, Sparkles, Send, CheckCircle2, AlertTriangle, 
  Clock, XCircle, RefreshCw, Calendar, Users, Armchair 
} from 'lucide-react';
import { parseBookingAi, createBooking, getBookings } from '../api';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';

export const Bookings: React.FC = () => {
  const { user, token } = useAuth();
  const [nlText, setNlText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Editable Form State
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('club_event');
  const [roomId, setRoomId] = useState('SH1');
  const [day, setDay] = useState('Friday');
  const [startPeriod, setStartPeriod] = useState('P6');
  const [duration, setDuration] = useState(3);
  const [attendance, setAttendance] = useState(100);

  const [decisionResult, setDecisionResult] = useState<any>(null);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);

  useEffect(() => {
    getBookings(token || undefined).then(setBookingsList);
  }, [token]);

  const handleAiParse = async (customText?: string) => {
    const textToParse = customText || nlText;
    if (!textToParse) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const draft = await parseBookingAi(textToParse);
      setTitle(draft.title || 'Spectra Tech Fest Session');
      setEventType(draft.event_type || 'club_event');
      setDay(draft.day || 'Friday');
      setStartPeriod(draft.start_period || 'P6');
      setDuration(draft.duration || 3);
      setAttendance(draft.expected_attendance || 100);
      if (draft.room_type === 'seminar_hall') setRoomId('SH1');
      else if (draft.room_type === 'auditorium') setRoomId('AUD1');
      else if (draft.room_type === 'open_air_theatre') setRoomId('OAT1');
    } catch (err: any) {
      setParseError(err.message || 'AI parsing unavailable');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setDecisionResult(null);
    try {
      const res = await createBooking({
        title,
        event_type: eventType,
        room_id: roomId,
        day,
        start_period: startPeriod,
        duration: Number(duration),
        expected_attendance: Number(attendance)
      }, token || undefined);

      setDecisionResult(res);
      // Refresh list
      getBookings(token || undefined).then(setBookingsList);
    } catch (err: any) {
      setDecisionResult({ success: false, reason: err.message });
    }
  };

  const sampleHinglish = "Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye.";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
        <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
          <BookmarkCheck className="w-4 h-4" /> Spectra Venue Bookings
        </div>
        <h1 className="text-xl font-bold text-ink mt-1">Book a Campus Venue</h1>
        <p className="text-xs text-muted">
          AI Natural Language Request or Manual Submission with Strict Hard Constraint Verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Natural Language Box & Form */}
        <div className="space-y-6">
          {/* AI Box */}
          <div className="bg-card p-5 rounded-2xl border border-line shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <Sparkles className="w-4 h-4 text-brand" /> Natural Language Booking (English / Hinglish)
              </div>
              <span className="text-[11px] bg-brand-tint text-brand-dark px-2 py-0.5 rounded-full font-semibold">
                AI Gateway
              </span>
            </div>

            <p className="text-xs text-muted">
              Type your venue booking request in plain English or Hinglish. Missing fields become questions, never guesses.
            </p>

            <div className="relative">
              <textarea
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="e.g. Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-line bg-page focus:border-brand outline-none"
              />
            </div>

            {/* Quick Test Prompt Chip */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted">Try sample:</span>
              <button
                type="button"
                onClick={() => { setNlText(sampleHinglish); handleAiParse(sampleHinglish); }}
                className="text-[11px] bg-teal-50 hover:bg-teal-100 text-brand-dark px-2.5 py-1 rounded-lg border border-teal-200 transition-colors text-left"
              >
                "{sampleHinglish}"
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleAiParse()}
                disabled={isParsing || !nlText}
                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Parse with AI
              </button>
            </div>

            {parseError && (
              <div className="p-3 bg-bad-bg text-bad-text text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{parseError}. You can still fill the manual form below.</span>
              </div>
            )}
          </div>

          {/* Editable Booking Form */}
          <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
            <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" /> Verified Booking Details
            </h2>

            <form onSubmit={handleSubmitBooking} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Event Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Spectra Tech Fest Session"
                  className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Event Priority Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    <option value="institute_event">Institute Event (Spectra Main)</option>
                    <option value="guest_lecture">Guest Lecture</option>
                    <option value="department_event">Department Event</option>
                    <option value="club_event">Club Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Target Venue</label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    <option value="SH1">Seminar Hall 1 (SH1 - Cap: 100)</option>
                    <option value="SH2">Seminar Hall 2 (SH2 - Cap: 100)</option>
                    <option value="AUD1">Main Auditorium (AUD1 - Cap: 300)</option>
                    <option value="OAT1">Open Air Theatre (OAT1 - Cap: 400)</option>
                    <option value="LH101">Lecture Hall 101 (LH101 - Cap: 120)</option>
                    <option value="LAB_CS1">Computer Lab 1 (LAB_CS1 - Cap: 65)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Day</label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Start Period</label>
                  <select
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    <option value="P1">P1 (08:00 - 09:00)</option>
                    <option value="P2">P2 (09:00 - 10:00)</option>
                    <option value="P3">P3 (10:00 - 11:00)</option>
                    <option value="P4">P4 (11:00 - 12:00)</option>
                    <option value="P6">P6 (13:00 - 14:00)</option>
                    <option value="P7">P7 (14:00 - 15:00)</option>
                    <option value="P8">P8 (15:00 - 16:00)</option>
                    <option value="P9">P9 (16:00 - 17:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Expected Attendance</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={attendance}
                  onChange={(e) => setAttendance(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                Submit Venue Request
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Instant Decision & Alternative Recommendations & Bookings List */}
        <div className="space-y-6">
          {/* Decision Card */}
          {decisionResult && (
            <div className={`p-5 rounded-2xl border shadow-sm ${
              decisionResult.success ? 'bg-ok-bg/30 border-teal-200' : 'bg-bad-bg/30 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {decisionResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-ok-text" />
                ) : (
                  <XCircle className="w-5 h-5 text-bad-text" />
                )}
                <h3 className="font-bold text-sm text-ink">
                  {decisionResult.success ? 'Request Accepted' : 'Booking Blocked / Conflict Detected'}
                </h3>
              </div>
              <p className="text-xs text-muted mt-1.5">
                {decisionResult.message || decisionResult.reason}
              </p>

              {/* Alternatives List */}
              {decisionResult.alternatives && decisionResult.alternatives.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line/60">
                  <div className="font-semibold text-xs text-ink mb-2">Ranked Alternatives:</div>
                  <div className="space-y-2">
                    {decisionResult.alternatives.map((alt: any, i: number) => (
                      <div key={i} className="p-3 bg-card rounded-xl border border-line text-xs">
                        <div className="font-bold text-brand flex items-center gap-1.5">
                          <span>Option {i + 1}: {alt.room_name || alt.room_id}</span>
                          <span className="text-[10px] text-muted">({alt.day} {alt.start_period})</span>
                        </div>
                        <p className="text-muted mt-0.5 text-[11px]">{alt.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Bookings List */}
          <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
            <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" /> Spectra Week Requests ({bookingsList.length})
            </h2>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {bookingsList.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl border border-line bg-page hover:bg-white transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-ink">{b.title}</div>
                      <div className="text-[11px] text-muted mt-0.5">
                        {b.day} • {b.start_period} ({b.duration}h) • {b.room_id} • {b.expected_attendance} students
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      b.status === 'approved' ? 'bg-ok-bg text-ok-text' :
                      b.status === 'pending' ? 'bg-wait-bg text-wait-text' :
                      b.status === 'displaced' ? 'bg-purple-100 text-purple-800' :
                      'bg-bad-bg text-bad-text'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  {b.displacement_reason && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg text-[11px] text-amber-900 border border-amber-200">
                      <strong>Displaced:</strong> {b.displacement_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
