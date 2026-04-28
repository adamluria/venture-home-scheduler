import React, { useState, useMemo } from 'react';
import { Check, AlertCircle, ArrowLeft, Clock } from 'lucide-react';
import { T, fonts, TIME_SLOTS } from '../data/theme.js';
import { mockAppointments, getConsultantName, formatDateFull } from '../data/mockData.js';
import { parseRescheduleToken } from '../data/notificationService.js';

/**
 * Customer-facing self-service reschedule page.
 * Routed as `#/reschedule/:token` from App's hash router.
 *
 * Flow:
 *   1. Validate the token → load the appointment
 *   2. Show the current slot + a list of 6 upcoming alternative slots
 *   3. On pick, call onReschedule({appointmentId, newDate, newTime})
 */
export default function ReschedulePage({ token, onReschedule, onBack }) {
  const appointmentId = parseRescheduleToken(token);
  const appointment = appointmentId
    ? mockAppointments.find(a => a.id === appointmentId)
    : null;

  const [picked, setPicked] = useState(null);
  const [committed, setCommitted] = useState(false);

  // Build 6 upcoming (date, slot) options starting tomorrow, one per slot across 2 days
  const options = useMemo(() => {
    if (!appointment) return [];
    const out = [];
    const base = new Date();
    base.setDate(base.getDate() + 1);
    for (let d = 0; d < 6 && out.length < 6; d++) {
      const day = new Date(base);
      day.setDate(base.getDate() + d);
      const dow = day.getDay();
      for (const slot of TIME_SLOTS) {
        // apply weekend 7pm rule
        if ((dow === 0 || dow === 6) && slot === '7:00 PM') continue;
        const iso = day.toISOString().split('T')[0];
        if (appointment.date === iso && appointment.time === slot) continue;
        out.push({ date: iso, slot });
        if (out.length >= 6) break;
      }
    }
    return out;
  }, [appointment?.id]);

  if (!appointment) {
    return (
      <Shell onBack={onBack}>
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.red }}>
            <AlertCircle size={18} /> <b>Link expired or invalid</b>
          </div>
          <p style={{ marginTop: 10, color: T.muted, fontSize: 14 }}>
            Please contact your sales consultant for a fresh link, or call Venture Home at (800) 555-0123.
          </p>
        </div>
      </Shell>
    );
  }

  if (committed) {
    return (
      <Shell onBack={onBack}>
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.green }}>
            <Check size={20} /> <b>You're rescheduled!</b>
          </div>
          <p style={{ marginTop: 10, color: T.muted, fontSize: 14 }}>
            New appointment: {formatDateFull(picked.date)} at {picked.slot}
            {getConsultantName(appointment.consultant) && <> with {getConsultantName(appointment.consultant)}</>}.
          </p>
          <p style={{ marginTop: 4, color: T.muted, fontSize: 13 }}>
            We'll send a confirmation text shortly.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack}>
      <div style={panel}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Reschedule your appointment</h2>
        <div style={{ marginTop: 6, color: T.muted, fontSize: 13 }}>
          Currently booked for <b style={{ color: T.text }}>{formatDateFull(appointment.date)} at {appointment.time}</b>
          {getConsultantName(appointment.consultant) && <> with {getConsultantName(appointment.consultant)}</>}.
        </div>
      </div>

      <div style={{ ...panel, marginTop: 12 }}>
        <div style={{ fontSize: 12, color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
          Available times
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
        }}>
          {options.map((opt, i) => {
            const isSel = picked && picked.date === opt.date && picked.slot === opt.slot;
            return (
              <button
                key={i}
                onClick={() => setPicked(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 8,
                  background: isSel ? T.accentDim : T.bg,
                  border: `1px solid ${isSel ? T.accent : T.border}`,
                  color: T.text, cursor: 'pointer',
                  fontFamily: fonts.ui, fontSize: 14, textAlign: 'left',
                }}
              >
                <Clock size={14} color={isSel ? T.accent : T.muted} />
                <div>
                  <div style={{ fontWeight: 500 }}>{formatDateFull(opt.date)}</div>
                  <div style={{ fontSize: 12, color: T.muted, fontFamily: fonts.data }}>{opt.slot}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button onClick={onBack} style={btnSecondary}>Cancel</button>
        <button
          disabled={!picked}
          onClick={() => {
            onReschedule?.({
              appointmentId: appointment.id,
              newDate: picked.date,
              newTime: picked.slot,
            });
            setCommitted(true);
          }}
          style={{
            ...btnPrimary,
            opacity: picked ? 1 : 0.4,
            cursor: picked ? 'pointer' : 'not-allowed',
          }}
        >
          Confirm new time
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children, onBack }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      fontFamily: fonts.ui, padding: 20,
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none', color: T.muted,
            cursor: 'pointer', padding: 0, marginBottom: 16,
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
            fontFamily: fonts.ui,
          }}
        >
          <ArrowLeft size={14} /> Back to scheduler
        </button>
        {children}
      </div>
    </div>
  );
}

const panel = {
  background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: '18px 20px',
};

const btnPrimary = {
  padding: '10px 20px', borderRadius: 6, background: T.accent,
  border: 'none', color: T.bg, fontWeight: 600, fontSize: 14,
  fontFamily: fonts.ui,
};

const btnSecondary = {
  padding: '10px 20px', borderRadius: 6, background: 'transparent',
  border: `1px solid ${T.border}`, color: T.text, fontSize: 14,
  fontFamily: fonts.ui, cursor: 'pointer',
};
