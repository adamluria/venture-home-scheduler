// Mock Google Calendar data layer
// Mirrors the exact shape of Google Calendar API v3 responses
// Toggle with USE_MOCK env var — mock stays working after live data is wired up

import { consultants, mockAppointments, getTodayString, getConsultantName } from './mockData.js';
import { APPOINTMENT_TYPES } from './theme.js';

// ─── Mock calendar IDs (one per consultant) ──────────────────────────
// In production these come from each consultant's Google account
export function getCalendarId(consultantId) {
  const consultant = consultants.find(c => c.id === consultantId);
  if (!consultant) return null;
  return `${consultant.name.toLowerCase().replace(/\s+/g, '.')}@venturehome.com`;
}

export function getCalendarIdMap() {
  const map = {};
  for (const c of consultants) {
    map[c.id] = getCalendarId(c.id);
  }
  return map;
}

// ─── Mock "existing" Google Calendar events ──────────────────────────
// These represent meetings already on consultants' calendars (team meetings,
// lunch blocks, etc.) that should show as busy in the scheduler

function dayOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

const existingCalendarEvents = [
  // Claire Sharkey — CT team standup every morning
  { calendarId: getCalendarId('c9'), summary: 'CT Team Standup', start: `${dayOffset(0)}T08:30:00`, end: `${dayOffset(0)}T09:00:00`, status: 'confirmed', isMandatory: true },
  { calendarId: getCalendarId('c9'), summary: 'CT Team Standup', start: `${dayOffset(1)}T08:30:00`, end: `${dayOffset(1)}T09:00:00`, status: 'confirmed', isMandatory: true },
  { calendarId: getCalendarId('c9'), summary: 'CT Team Standup', start: `${dayOffset(2)}T08:30:00`, end: `${dayOffset(2)}T09:00:00`, status: 'confirmed', isMandatory: true },

  // Arturo Bustamante — lunch block + optional training
  { calendarId: getCalendarId('c1'), summary: 'Lunch', start: `${dayOffset(0)}T12:00:00`, end: `${dayOffset(0)}T13:00:00`, status: 'confirmed', isMandatory: false },
  { calendarId: getCalendarId('c1'), summary: 'Product Training (Optional)', start: `${dayOffset(1)}T14:00:00`, end: `${dayOffset(1)}T15:00:00`, status: 'tentative', isMandatory: false },

  // Alastair Cornell — all-hands + client dinner
  { calendarId: getCalendarId('c20'), summary: 'Company All-Hands', start: `${dayOffset(0)}T16:00:00`, end: `${dayOffset(0)}T17:00:00`, status: 'confirmed', isMandatory: true },
  { calendarId: getCalendarId('c20'), summary: 'Client Dinner', start: `${dayOffset(2)}T18:00:00`, end: `${dayOffset(2)}T20:00:00`, status: 'confirmed', isMandatory: true },

  // Brian Graham — ME/NH territory drive day
  { calendarId: getCalendarId('c17'), summary: 'Territory Drive Day', start: `${dayOffset(1)}T07:00:00`, end: `${dayOffset(1)}T18:00:00`, status: 'confirmed', isMandatory: true },

  // Justin Robinson (Design Expert) — back-to-back closings
  { calendarId: getCalendarId('de1'), summary: 'Pipeline Review', start: `${dayOffset(0)}T08:00:00`, end: `${dayOffset(0)}T09:00:00`, status: 'confirmed', isMandatory: true },
  { calendarId: getCalendarId('de1'), summary: 'Closer Training', start: `${dayOffset(3)}T10:00:00`, end: `${dayOffset(3)}T11:30:00`, status: 'tentative', isMandatory: false },

  // Boris Kaiser (Design Expert) — heavy day
  { calendarId: getCalendarId('de2'), summary: 'Sales Leadership Sync', start: `${dayOffset(0)}T08:00:00`, end: `${dayOffset(0)}T08:30:00`, status: 'confirmed', isMandatory: true },
  { calendarId: getCalendarId('de2'), summary: 'Lunch with Manager', start: `${dayOffset(0)}T12:30:00`, end: `${dayOffset(0)}T13:30:00`, status: 'confirmed', isMandatory: false },

  // Tom Harper — MD weekly review
  { calendarId: getCalendarId('c24'), summary: 'MD Weekly Review', start: `${dayOffset(4)}T09:00:00`, end: `${dayOffset(4)}T10:00:00`, status: 'confirmed', isMandatory: true },
];

// ─── Convert mock appointments to Google Calendar event shape ────────
function appointmentToGoogleEvent(apt) {
  const typeInfo = APPOINTMENT_TYPES[apt.type] || {};
  const consultantName = getConsultantName(apt.consultant);
  const duration = typeInfo.duration || 90;

  // Parse time string to hours/minutes
  const timeParts = apt.time.match(/(\d+):(\d+)\s*(AM|PM)/);
  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  if (timeParts[3] === 'PM' && hours !== 12) hours += 12;
  if (timeParts[3] === 'AM' && hours === 12) hours = 0;

  const startDt = new Date(`${apt.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  const endDt = new Date(startDt.getTime() + duration * 60000);

  return {
    id: `gcal_${apt.id}`,
    summary: `${typeInfo.name || 'Appointment'}: ${apt.customer}`,
    description: `Consultant: ${consultantName}\nAddress: ${apt.address}\nType: ${typeInfo.name}\nPartner: VH Scheduling`,
    start: { dateTime: startDt.toISOString(), timeZone: 'America/New_York' },
    end: { dateTime: endDt.toISOString(), timeZone: 'America/New_York' },
    location: apt.address,
    status: apt.status === 'confirmed' ? 'confirmed' : 'tentative',
    attendees: [
      consultantName ? { email: getCalendarId(apt.consultant), displayName: consultantName, responseStatus: 'accepted' } : null,
      apt.designExpert ? { email: getCalendarId(apt.designExpert), displayName: getConsultantName(apt.designExpert), responseStatus: 'accepted' } : null,
    ].filter(Boolean),
    conferenceData: apt.isVirtual ? {
      entryPoints: [{ entryPointType: 'video', uri: `https://meet.google.com/vh-${apt.id}-mock`, label: 'Google Meet' }],
      conferenceSolution: { name: 'Google Meet', iconUri: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-16dp/logo_meet_2020q4_color_1x_web_16dp.png' },
    } : null,
    extendedProperties: {
      private: {
        vh_appointment_id: apt.id,
        vh_territory: apt.territory,
        vh_type: apt.type,
        vh_status: apt.status,
      },
    },
  };
}

// ─── Pre-built indexes for O(1) lookups ─────────────────────────────
// Rebuilt lazily so hot paths avoid scanning full arrays every call.

let _calEventIdx = null;   // { calendarId → [event, ...] }
let _calIdToConsultant = null; // { calendarId → consultant }
let _apptIdxVersion = 0;

function getCalEventIndex() {
  if (!_calEventIdx) {
    _calEventIdx = {};
    for (const e of existingCalendarEvents) {
      (_calEventIdx[e.calendarId] ||= []).push(e);
    }
  }
  return _calEventIdx;
}

function getCalIdToConsultant() {
  if (!_calIdToConsultant) {
    _calIdToConsultant = {};
    for (const c of consultants) {
      const calId = getCalendarId(c.id);
      if (calId) _calIdToConsultant[calId] = c;
    }
  }
  return _calIdToConsultant;
}

// Appointment index: { consultantId → { date → [appt, ...] } }
let _apptIdx = null;

function getApptIndex() {
  if (!_apptIdx || _apptIdxVersion !== mockAppointments.length) {
    _apptIdx = {};
    for (const a of mockAppointments) {
      if (a.isPlaceholder) continue;
      if (a.consultant) {
        ((_apptIdx[a.consultant] ||= {})[a.date] ||= []).push(a);
      }
      if (a.designExpert && a.designExpert !== a.consultant) {
        ((_apptIdx[a.designExpert] ||= {})[a.date] ||= []).push(a);
      }
    }
    _apptIdxVersion = mockAppointments.length;
  }
  return _apptIdx;
}

// ─── API-shaped response functions ───────────────────────────────────

/**
 * GET /api/calendar/freebusy
 * Mirrors: POST https://www.googleapis.com/calendar/v3/freeBusy
 */
export function getMockFreeBusy(calendarIds, dateMin, dateMax) {
  const calendars = {};
  const calEventIdx = getCalEventIndex();
  const calIdMap = getCalIdToConsultant();
  const apptIdx = getApptIndex();
  const rangeStart = new Date(dateMin);
  const rangeEnd = new Date(dateMax);
  const dateMinDay = dateMin.split('T')[0];
  const dateMaxDay = dateMax.split('T')[0];

  for (const calId of calendarIds) {
    const busyBlocks = [];

    // Indexed calendar events — only scan this calId's events
    const events = calEventIdx[calId];
    if (events) {
      for (const e of events) {
        if (!e.isMandatory) continue;
        const eStart = new Date(e.start);
        const eEnd = new Date(e.end);
        if (eStart < rangeEnd && eEnd > rangeStart) {
          busyBlocks.push({ start: eStart.toISOString(), end: eEnd.toISOString() });
        }
      }
    }

    // Indexed VH appointments — direct lookup by consultant + date
    const consultant = calIdMap[calId];
    if (consultant) {
      const consultantAppts = apptIdx[consultant.id];
      if (consultantAppts) {
        // Walk only the dates in range
        for (const [date, appts] of Object.entries(consultantAppts)) {
          if (date < dateMinDay || date > dateMaxDay) continue;
          for (const apt of appts) {
            const event = appointmentToGoogleEvent(apt);
            busyBlocks.push({ start: event.start.dateTime, end: event.end.dateTime });
          }
        }
      }
    }

    calendars[calId] = { busy: busyBlocks };
  }

  return {
    kind: 'calendar#freeBusy',
    timeMin: dateMin,
    timeMax: dateMax,
    calendars,
  };
}

/**
 * GET /api/calendar/events
 * Mirrors: GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
 */
export function getMockEvents(calendarId, dateMin, dateMax) {
  const events = [];

  // Existing calendar events
  const existing = existingCalendarEvents.filter(e => {
    if (e.calendarId !== calendarId) return false;
    if (dateMin && new Date(e.start) < new Date(dateMin)) return false;
    if (dateMax && new Date(e.end) > new Date(dateMax)) return false;
    return true;
  }).map(e => ({
    id: `existing_${e.summary.replace(/\s+/g, '_').toLowerCase()}_${e.start}`,
    summary: e.summary,
    start: { dateTime: new Date(e.start).toISOString(), timeZone: 'America/New_York' },
    end: { dateTime: new Date(e.end).toISOString(), timeZone: 'America/New_York' },
    status: e.status,
    extendedProperties: { private: { isMandatory: String(e.isMandatory) } },
  }));

  events.push(...existing);

  // VH appointments as events
  const consultant = consultants.find(c => getCalendarId(c.id) === calendarId);
  if (consultant) {
    const appts = mockAppointments.filter(a =>
      (a.consultant === consultant.id || a.designExpert === consultant.id) &&
      (!dateMin || a.date >= dateMin.split('T')[0]) &&
      (!dateMax || a.date <= dateMax.split('T')[0]) &&
      !a.isPlaceholder
    );
    for (const apt of appts) {
      events.push(appointmentToGoogleEvent(apt));
    }
  }

  return {
    kind: 'calendar#events',
    summary: calendarId,
    items: events,
    timeZone: 'America/New_York',
  };
}

/**
 * POST /api/calendar/events
 * Mirrors: POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
 */
export function createMockEvent(calendarId, event) {
  const newEvent = {
    id: `gcal_new_${Date.now()}`,
    ...event,
    status: event.status || 'confirmed',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    htmlLink: `https://calendar.google.com/calendar/event?eid=mock_${Date.now()}`,
  };

  // If virtual, generate a mock Meet link
  if (event.conferenceDataRequested) {
    newEvent.conferenceData = {
      entryPoints: [{ entryPointType: 'video', uri: `https://meet.google.com/vh-${Date.now()}`, label: 'Google Meet' }],
      conferenceSolution: { name: 'Google Meet' },
    };
    newEvent.hangoutLink = newEvent.conferenceData.entryPoints[0].uri;
  }

  console.log(`[Mock] Created calendar event: ${newEvent.summary} on ${calendarId}`);
  return newEvent;
}

/**
 * PATCH /api/calendar/events/:eventId
 * Mirrors: PATCH https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}
 */
export function updateMockEvent(calendarId, eventId, updates) {
  console.log(`[Mock] Updated event ${eventId} on ${calendarId}:`, updates);
  return {
    id: eventId,
    ...updates,
    updated: new Date().toISOString(),
  };
}
