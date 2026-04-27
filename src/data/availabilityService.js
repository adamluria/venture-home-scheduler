// Rep availability and time-off system
// In-memory store with working hours and time-off tracking

import { consultants, getAppointmentsForDate } from './mockData.js';
import { TIME_SLOTS } from './theme.js';

// In-memory store: repId → [{ id, startDate, endDate, type, reason }]
const _timeOff = new Map();

// In-memory store: repId → { start, end, lunchStart, lunchEnd }
const _workingHours = new Map();

// Default working hours
const DEFAULT_WORKING_HOURS = {
  start: '9:00 AM',
  end: '7:00 PM',
  lunchStart: '12:00 PM',
  lunchEnd: '1:00 PM',
};

// ─── Time-off management ─────────────────────────────────────────────────

export function addTimeOff(repId, { startDate, endDate, type, reason }) {
  if (!_timeOff.has(repId)) {
    _timeOff.set(repId, []);
  }
  const id = `toff-${repId}-${Date.now()}`;
  const entry = {
    id,
    startDate,
    endDate,
    type, // 'pto', 'sick', 'personal', 'training'
    reason,
  };
  _timeOff.get(repId).push(entry);
  return entry;
}

export function removeTimeOff(repId, entryId) {
  if (!_timeOff.has(repId)) return false;
  const entries = _timeOff.get(repId);
  const index = entries.findIndex(e => e.id === entryId);
  if (index === -1) return false;
  entries.splice(index, 1);
  return true;
}

export function getTimeOff(repId, { from, to } = {}) {
  const entries = _timeOff.get(repId) || [];
  if (!from || !to) return entries;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  return entries.filter(entry => {
    const startDate = new Date(entry.startDate);
    const endDate = new Date(entry.endDate);
    // Check overlap: entry overlaps with [from, to]
    return startDate <= toDate && endDate >= fromDate;
  });
}

// ─── Availability checking ────────────────────────────────────────────────

function timeSlotToMinutes(slot) {
  const [time, period] = slot.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + minutes;
}

export function isRepAvailable(repId, date, timeSlot) {
  // Check: is date within any time-off range?
  const dateObj = new Date(date);
  const timeOffList = getTimeOff(repId);

  for (const entry of timeOffList) {
    const startDate = new Date(entry.startDate);
    const endDate = new Date(entry.endDate);
    if (dateObj >= startDate && dateObj <= endDate) {
      return {
        available: false,
        reason: `${entry.type.toUpperCase()}: ${entry.reason || 'No reason provided'}`,
      };
    }
  }

  // Check: is timeSlot outside working hours?
  const hours = getWorkingHours(repId);
  const slotMinutes = timeSlotToMinutes(timeSlot);
  const startMinutes = timeSlotToMinutes(hours.start);
  const endMinutes = timeSlotToMinutes(hours.end);
  const lunchStartMinutes = timeSlotToMinutes(hours.lunchStart);
  const lunchEndMinutes = timeSlotToMinutes(hours.lunchEnd);

  if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
    return { available: false, reason: 'Outside working hours' };
  }

  if (slotMinutes >= lunchStartMinutes && slotMinutes < lunchEndMinutes) {
    return { available: false, reason: 'During lunch break' };
  }

  return { available: true };
}

// ─── Working hours management ─────────────────────────────────────────────

export function getWorkingHours(repId) {
  return _workingHours.get(repId) || DEFAULT_WORKING_HOURS;
}

export function setWorkingHours(repId, hours) {
  _workingHours.set(repId, {
    start: hours.start || DEFAULT_WORKING_HOURS.start,
    end: hours.end || DEFAULT_WORKING_HOURS.end,
    lunchStart: hours.lunchStart || DEFAULT_WORKING_HOURS.lunchStart,
    lunchEnd: hours.lunchEnd || DEFAULT_WORKING_HOURS.lunchEnd,
  });
}

// ─── Rep availability queries ─────────────────────────────────────────────

export function getUnavailableReps(date) {
  const dateObj = new Date(date);
  const unavailable = [];

  for (const rep of consultants) {
    const timeOffList = getTimeOff(rep.id);
    for (const entry of timeOffList) {
      const startDate = new Date(entry.startDate);
      const endDate = new Date(entry.endDate);
      if (dateObj >= startDate && dateObj <= endDate) {
        unavailable.push({
          repId: rep.id,
          repName: rep.name,
          reason: entry.reason || 'No reason provided',
          type: entry.type,
        });
        break; // Only report once per rep
      }
    }
  }

  return unavailable;
}

// ─── Seed mock data: give 2-3 reps PTO for the coming week ──────────────────

function seedMockTimeOff() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 3);

  const today2 = today.toISOString().split('T')[0];
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 2);
  const nextWeekEndStr = nextWeekEnd.toISOString().split('T')[0];

  // ct-1: PTO end of this week
  addTimeOff('ct-1', {
    startDate: today2,
    endDate: endOfWeekStr,
    type: 'pto',
    reason: 'Scheduled vacation',
  });

  // mari-1: Sick leave mid-week
  addTimeOff('mari-1', {
    startDate: endOfWeekStr,
    endDate: endOfWeekStr,
    type: 'sick',
    reason: 'Unwell',
  });

  // menh-3: Training next week
  addTimeOff('menh-3', {
    startDate: nextWeekStr,
    endDate: nextWeekEndStr,
    type: 'training',
    reason: 'Sales training program',
  });
}

// Seed on module load
seedMockTimeOff();
