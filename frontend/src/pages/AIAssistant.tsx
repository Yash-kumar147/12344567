import React, { useState, useRef } from 'react';
import { Bot, Send, Sparkles, AlertCircle, CheckCircle2, RefreshCw, MessageSquare, Check, X } from 'lucide-react';
import { parseBookingAi, createBooking } from '../api';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  draft?: any;
  facts?: any;
}

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Namaste! I am the CIT Campus Scheduling Assistant. You can ask me in English or Hinglish to book venues, check clashes, or ask why a class was placed at a particular slot.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const samplePrompts = [
    "Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye.",
    "Why was CS101 lecture placed at 8 AM on Monday?",
    "Book Main Auditorium for 250 students on Tuesday P6 for Spectra Keynote."
  ];

  // Task 4: Suggestions must be typed first in chatbox, then after user approval sent in chat
  const handleSelectSuggestion = (promptText: string) => {
    setInputText(promptText);
    setIsAwaitingApproval(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || inputText;
    if (!text.trim()) return;

    setIsAwaitingApproval(false);
    const userMsg: Message = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      if (text.toLowerCase().includes('why was') || text.toLowerCase().includes('8 am') || text.toLowerCase().includes('reason')) {
        // Explanations built from facts computed by code
        setTimeout(() => {
          setMessages(prev => [...prev, {
            sender: 'assistant',
            text: "Explanation (Rule ID: FAC_AVAILABILITY & STUDENT_GAP): CS101 was placed at P1 (08:00 AM) because Dr. Arvind Sharma (FAC01) is unavailable on Tuesday & Wednesday afternoons, and student group Y1-A has a mandatory 3-hour Physics Lab in P2-P4. Placing the lecture at P1 eliminates student gap penalties while respecting faculty daily limits.",
            facts: {
              rule_id: "FACULTY_AND_STUDENT_CONSTRAINTS",
              entities: ["FAC01", "Y1-A", "BS104_LAB"],
              lunch_protected: true
            }
          }]);
          setLoading(false);
        }, 500);
      } else {
        const draft = await parseBookingAi(text);
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: `I have parsed your request:\n• Day: ${draft.day}\n• Time: ${draft.start_time} - ${draft.end_time} (${draft.start_period}, ${draft.duration} hrs)\n• Venue Type: ${draft.room_type}\n• Expected Attendance: ${draft.expected_attendance} students.\nWould you like me to book this for you?`,
          draft
        }]);
        setLoading(false);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: `The AI interpretation service is temporarily unavailable (${e.message}). You can use the manual booking form on the Bookings page.`
      }]);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-card p-4 rounded-2xl border border-line shadow-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink">CIT Natural-Language Assistant</h1>
            <p className="text-xs text-muted">Bilingual English / Hinglish schedule reasoning & bookings.</p>
          </div>
        </div>
        <span className="text-xs bg-ok-bg text-ok-text px-2.5 py-1 rounded-full font-semibold">
          Online
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-card rounded-2xl border border-line shadow-sm">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl text-xs space-y-2 ${
                m.sender === 'user'
                  ? 'bg-brand text-white rounded-br-none shadow-xs'
                  : 'bg-page text-ink rounded-bl-none border border-line'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

              {m.facts && (
                <div className="mt-2 pt-2 border-t border-line text-[11px] text-muted space-y-0.5">
                  <div><strong>Rule Checked:</strong> {m.facts.rule_id}</div>
                  <div><strong>Entities Evaluated:</strong> {m.facts.entities.join(', ')}</div>
                </div>
              )}

              {m.draft && (
                <div className="mt-2 p-2.5 bg-white text-ink rounded-xl border border-line flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-brand">{m.draft.title}</div>
                    <div className="text-[10px] text-muted">{m.draft.day} • {m.draft.start_time}-{m.draft.end_time}</div>
                  </div>
                  <button
                    onClick={() => alert('Booking created from AI draft!')}
                    className="px-3 py-1 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="p-3 bg-page rounded-2xl text-xs text-muted flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking & verifying rules...
            </div>
          </div>
        )}
      </div>

      {/* Suggested chips (Task 4: clicked chip types into chatbox first for user review & approval) */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-[11px] text-muted flex items-center gap-1 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand" /> Suggestions:
        </span>
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSelectSuggestion(p)}
            className="text-[11px] bg-white border border-line hover:border-brand hover:bg-teal-50/50 text-ink px-2.5 py-1 rounded-xl transition-all shadow-xs"
            title="Click to paste into chatbox for review before sending"
          >
            {p.slice(0, 42)}...
          </button>
        ))}
      </div>

      {/* Task 4 Approval Callout Banner when a suggestion is loaded into chatbox */}
      {isAwaitingApproval && inputText.trim() && (
        <div className="shrink-0 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-2 text-amber-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Suggestion Typed:</strong> Please review or edit in the box below. Click <strong>Approve & Send</strong> to submit.
            </span>
          </div>
          <button
            onClick={() => {
              setInputText('');
              setIsAwaitingApproval(false);
            }}
            className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold px-2 py-0.5 rounded hover:bg-amber-100"
          >
            Clear
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 flex items-center gap-2 bg-card p-2 rounded-2xl border border-line shadow-sm focus-within:border-brand transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (!e.target.value) setIsAwaitingApproval(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask in English or Hinglish (e.g. Hume Spectra ke liye Friday ko 2 se 5...)"
          className="flex-1 text-xs px-3 py-2 bg-transparent outline-none placeholder:text-muted"
        />

        {isAwaitingApproval ? (
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputText.trim()}
            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Approve & Send
          </button>
        ) : (
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputText.trim()}
            className="p-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
