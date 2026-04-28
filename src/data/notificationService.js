// ═══════════════════════════════════════════════════════════════════
// Notification Service (SMS + Email)
//
// Adapter-pattern: swap the underlying transport without touching callers.
// Providers:
//   - 'mock'     (default for dev) — logs to console + optional in-memory log
//   - 'twilio'   (sms)  — expects VITE_TWILIO_* env vars at deploy time
//   - 'sendgrid' (email) — expects VITE_SENDGRID_* env vars
//
// Reschedule-link tokens are signed with a simple HMAC-ish hash for dev.
// In production the backend should mint real JWTs — see `getRescheduleLink`.
// ═══════════════════════════════════════════════════════════════════

import { getConsultantName, formatDateFull } from './mockData.js';
import { predictSitRate } from './forecastEngine.js';

// ─── In-memory log (mock provider) ────────────────────────────────
const _log = [];

export function getNotificationLog() {
  return [..._log];
}
export function clearNotificationLog() {
  _log.length = 0;
}

// ─── Message templates ────────────────────────────────────────────

function confirmationSmsBody({ customerName, appointment, repName, rescheduleLink }) {
  const when = `${formatDateFull(appointment.date)} at ${appointment.time}`;
  return (
    `VH Solar: Hi ${customerName || 'there'}! Your appointment is confirmed for ${when}` +
    (repName ? ` with ${repName}.` : '.') +
    ` Need to change it? ${rescheduleLink}  Reply STOP to opt out.`
  );
}

function reminderSmsBody({ customerName, appointment, repName, rescheduleLink, hoursOut }) {
  const when = `${formatDateFull(appointment.date)} at ${appointment.time}`;
  return (
    `VH Solar reminder: ${customerName || 'there'}, we'll see you ${hoursOut <= 3 ? 'soon' : 'tomorrow'} — ${when}` +
    (repName ? ` with ${repName}.` : '.') +
    ` Reschedule: ${rescheduleLink}`
  );
}

function confirmationEmailHtml({ customerName, appointment, repName, rescheduleLink }) {
  const when = `${formatDateFull(appointment.date)} at ${appointment.time}`;
  // Intentionally minimal HTML — real templating happens in SendGrid.
  return `
    <p>Hi ${customerName || 'there'},</p>
    <p>Your Venture Home consultation is confirmed for <strong>${when}</strong>${repName ? ` with ${repName}` : ''}.</p>
    <p>If you need to reschedule, <a href="${rescheduleLink}">pick a new time here</a>.</p>
    <p>— Venture Home</p>
  `.trim();
}

// ─── Reschedule links (dev-only signing) ──────────────────────────

function simpleHash(s) {
  // DJB2 — only used as a pseudo-signature for dev. Real signing happens server-side.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return Math.abs(h).toString(36);
}

/**
 * Produce a client-routable reschedule URL.
 * Format: `${base}/#/reschedule/${token}`
 * Token encodes appointment id + a hash so the link can't be easily guessed.
 */
export function getRescheduleLink(appointmentId, base = typeof window !== 'undefined' ? window.location.origin : '') {
  const salt = 'vh-reschedule-v1';
  const token = `${appointmentId}.${simpleHash(appointmentId + '|' + salt)}`;
  return `${base}/#/reschedule/${token}`;
}

/**
 * Validate + extract an appointment id from a reschedule token.
 * Returns null if tampered.
 */
export function parseRescheduleToken(token) {
  if (!token || !token.includes('.')) return null;
  const [id, sig] = token.split('.');
  const salt = 'vh-reschedule-v1';
  if (simpleHash(id + '|' + salt) !== sig) return null;
  return id;
}

// ─── Public send API ──────────────────────────────────────────────

/**
 * Dispatch a confirmation (SMS + email) when an appointment is created/updated.
 * Returns a summary that can feed a toast / audit log.
 */
export async function sendConfirmation(appointment, { provider = 'mock' } = {}) {
  const repName = getConsultantName(appointment.consultant) || '';
  const rescheduleLink = getRescheduleLink(appointment.id || 'new');
  const customerName = (appointment.customer || '').split(/\s+/)[0] || '';

  const smsBody = confirmationSmsBody({
    customerName, appointment, repName, rescheduleLink,
  });
  const emailHtml = confirmationEmailHtml({
    customerName, appointment, repName, rescheduleLink,
  });

  const summary = {
    appointmentId: appointment.id,
    smsTo: appointment.phone || null,
    emailTo: appointment.email || null,
    rescheduleLink,
    provider,
    at: new Date().toISOString(),
  };

  if (provider === 'mock') {
    _log.push({ kind: 'confirmation', channel: 'sms', to: summary.smsTo, body: smsBody, at: summary.at });
    _log.push({ kind: 'confirmation', channel: 'email', to: summary.emailTo, html: emailHtml, at: summary.at });
    // eslint-disable-next-line no-console
    console.log('[notif] sent (mock)', summary);
    return { ok: true, ...summary };
  }

  // Real transport — wired when env vars are available. Defer to backend endpoint
  // so client never sees the provider API keys.
  try {
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'confirmation',
        appointment,
        smsBody,
        emailHtml,
      }),
    });
    return { ok: res.ok, ...summary, status: res.status };
  } catch (err) {
    return { ok: false, ...summary, error: err.message };
  }
}

/**
 * Schedule follow-up reminders. In mock mode, this just logs what WOULD fire.
 * Real mode POSTs to a backend job queue.
 *
 * Reminder cadence tuned per lead-source sit rate — lower sit rate = more touches.
 */
export async function scheduleReminders(appointment, { provider = 'mock' } = {}) {
  const sitRate = predictSitRate(appointment.leadSource || 'paid'); // percent
  const baseWindows = [48, 2]; // hours before appointment
  const extraWindows = sitRate < 25 ? [24] : []; // add a 24h ping for low sit-rate sources
  const windows = [...baseWindows, ...extraWindows].sort((a, b) => b - a);

  const scheduled = windows.map((hoursOut) => ({
    appointmentId: appointment.id,
    hoursOut,
    channel: appointment.phone ? 'sms' : 'email',
    fireAt: new Date(
      new Date(appointment.date + 'T' + normalizeTimeForIso(appointment.time)).getTime()
      - hoursOut * 3600 * 1000
    ).toISOString(),
    bodyPreview: reminderSmsBody({
      customerName: (appointment.customer || '').split(/\s+/)[0] || '',
      appointment,
      repName: getConsultantName(appointment.consultant) || '',
      rescheduleLink: getRescheduleLink(appointment.id || 'new'),
      hoursOut,
    }),
  }));

  if (provider === 'mock') {
    scheduled.forEach(s => _log.push({ kind: 'reminder-scheduled', ...s }));
    // eslint-disable-next-line no-console
    console.log('[notif] scheduled reminders (mock)', scheduled);
    return { ok: true, scheduled };
  }

  try {
    const res = await fetch('/api/notifications/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment, windows }),
    });
    return { ok: res.ok, scheduled, status: res.status };
  } catch (err) {
    return { ok: false, scheduled, error: err.message };
  }
}

// Helper: "2:00 PM" → "14:00:00" for Date parsing
function normalizeTimeForIso(slot) {
  if (!slot) return '12:00:00';
  const m = slot.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)/i);
  if (!m) return '12:00:00';
  let hh = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && hh < 12) hh += 12;
  if (ap === 'AM' && hh === 12) hh = 0;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}
