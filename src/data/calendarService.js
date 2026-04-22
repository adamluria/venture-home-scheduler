// Calendar availability service
// Abstracts free/busy + event data for the frontend.
// In mock mode (default), calls the mock layer directly.
// In live mode, calls the Express backend which proxies to Google Calendar API.

import { getMockFreeBusy, getMockEvents, getCalendarId, getCalendarIdMap } from './mockGoogleCalendar.js';
import { consultants, getConsultant } from './mockData.js';
import { TIME_SLOTS, APPOINTMENT_TYPES } from './theme.js';

const USE_MOCK = true; // flipped to false once backend is live
const API_BASE = '/api';

// ─── Low-level fetchers ─────────────────────────────────────────────

async function fetchFreeBusy(calendarIds, dateMin, dateMax) {
  if (USE_MOCK) {
    return getMockFreeBusy(calendarIds, dateMin, dateMax);
  }
  const params = new URLSearchParams({
    calendarIds: calendarIds.join(','),
    dateMin,
    dateMax,
  });
  const res = await fetch(`${API_BASE}/calendar/freebusy?${params}`);
  if (!res.ok) throw new Error(`FreeBusy request failed: ${res.status}`);
  return res.json();
}

async function fetchEvents(calendarId, dateMin, dateMax) {
  if (USE_MOCK) {
    return getMockEvents(calendarId, dateMin, dateMax);
  }
  const params = new URLSearchParams({ calendarId, dateMin, dateMax });
  const res = await fetch(`${API_BASE}/calendar/events?${params}`);
  if (!res.ok) throw new Error(`Events request failed: ${res.status}`);
  return res.json();
}

// ─── Availability engine ────────────────────────────────────────────

/**
 * For a given date, returns which time slots are available for each consultant.
 * Used by NewAppointmentModal and BookingPage to gray out busy slots.
 *
 * @param {string} dateString  YYYY-MM-DD
 * @param {string[]} consultantIds  IDs to check (or all if omitted)
 * @returns {Object} { [consultantId]: { [timeSlot]: { available, conflicts } } }
 */
export async function getSlotAvailability(dateString, consultantIds) {
  const ids = consultantIds || consultants.map(c => c.id);
  const calendarIds = ids.map(id => getCalendarId(id)).filter(Boolean);

  const dateMin = `${dateString}T00:00:00`;
  const dateMax = `${dateString}T23:59:59`;

  const freeBusy = await fetchFreeBusy(calendarIds, dateMin, dateMax);

  const result = {};

  for (const cId of ids) {
    const calId = getCalendarId(cId);
    const busyBlocks = freeBusy.calendars?.[calId]?.busy || [];

    result[cId] = {};

    for (const slot of TIME_SLOTS) {
      const slotStart = parseSlotTime(dateString, slot.time);
      const slotEnd = new Date(slotStart.getTime() + 90 * 60000); // default 90min

      const conflicts = busyBlocks.filter(block => {
        const bStart = new Date(block.start);
        const bEnd = new Date(block.end);
        return bStart < slotEnd && bEnd > slotStart;
      });

      result[cId][slot.time] = {
        available: conflicts.length === 0,
        conflicts: conflicts.map(c => ({
          start: c.start,
          end: c.end,
        })),
      };
    }
  }

  return result;
}

/**
 * For a given date and territory, returns a summary of slot availability
 * across all consultants in that territory.
 *
 * @param {string} dateString  YYYY-MM-DD
 * @param {string} territory   Territory code (e.g. 'CT', 'NYE')
 * @returns {Object} { [timeSlot]: { total, available, consultants: [...] } }
 */
export async function getTerritorySlotSummary(dateString, territory) {
  const territoryConsultants = consultants.filter(c => c.territory === territory);
  if (territoryConsultants.length === 0) return {};

  const ids = territoryConsultants.map(c => c.id);
  const availability = await getSlotAvailability(dateString, ids);

  const summary = {};

  for (const slot of TIME_SLOTS) {
    // Respect weekend 7 PM rule
    const dayOfWeek = new Date(dateString + 'T12:00:00').getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (slot.time === '7:00 PM' && isWeekend) {
      summary[slot.time] = { total: ids.length, available: 0, consultants: [], blocked: true, reason: 'No 7 PM on weekends' };
      continue;
    }

    const availableConsultants = ids.filter(id => availability[id]?.[slot.time]?.available);

    summary[slot.time] = {
      total: ids.length,
      available: availableConsultants.length,
      consultants: availableConsultants,
      blocked: false,
    };
  }

  return summary;
}

/**
 * Get all calendar events (both VH appointments and external calendar events)
 * for a consultant on a given date. Used to render busy blocks on DayView.
 *
 * @param {string} consultantId
 * @param {string} dateString YYYY-MM-DD
 * @returns {Array} Array of event objects with start, end, summary, type
 */
export async function getConsultantDayEvents(consultantId, dateString) {
  const calId = getCalendarId(consultantId);
  if (!calId) return [];

  const dateMin = `${dateString}T00:00:00`;
  const dateMax = `${dateString}T23:59:59`;

  const response = await fetchEvents(calId, dateMin, dateMax);

  return (response.items || []).map(event => ({
    id: event.id,
    summary: event.summary,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    status: event.status,
    isVHAppointment: !!event.extendedProperties?.private?.vh_appointment_id,
    isMandatory: event.extendedProperties?.private?.isMandatory === 'true',
    meetLink: event.conferenceData?.entryPoints?.[0]?.uri || event.hangoutLink || null,
  }));
}

/**
 * Check if a specific consultant is available for a given time slot on a date.
 * Quick single-consultant check used before creating/moving appointments.
 *
 * @param {string} consultantId
 * @param {string} dateString YYYY-MM-DD
 * @param {string} timeSlot   e.g. '9:00 AM'
 * @param {number} durationMin Duration in minutes (default 90)
 * @returns {{ available: boolean, conflicts: Array }}
 */
export async function checkConsultantSlot(consultantId, dateString, timeSlot, durationMin = 90) {
  const calId = getCalendarId(consultantId);
  if (!calId) return { available: false, conflicts: [{ reason: 'Unknown consultant' }] };

  const slotStart = parseSlotTime(dateString, timeSlot);
  const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

  const freeBusy = await fetchFreeBusy(
    [calId],
    slotStart.toISOString(),
    slotEnd.toISOString()
  );

  const busyBlocks = freeBusy.calendars?.[calId]?.busy || [];
  const conflicts = busyBlocks.filter(block => {
    const bStart = new Date(block.start);
    const bEnd = new Date(block.end);
    return bStart < slotEnd && bEnd > slotStart;
  });

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseSlotTime(dateString, timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
  if (!match) return new Date(dateString);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  if (match[3] === 'PM' && hours !== 12) hours += 12;
  if (match[3] === 'AM' && hours === 12) hours = 0;
  return new Date(`${dateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
}

export { getCalendarId, getCalendarIdMap };
