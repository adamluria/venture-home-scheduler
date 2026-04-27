// Travel buffer validation between consecutive appointments
// Ensures reps have adequate travel time between locations based on distance

import { mockAppointments } from './mockData.js';
import { TIME_SLOTS } from './theme.js';

// Minimum buffer in minutes between appointments by zip code proximity
// Same zip: 30min, same 3-digit: 45min, same 2-digit: 60min, different: 90min
export const BUFFER_MINUTES = { same: 30, near: 45, medium: 60, far: 90 };

// ─── Utility functions ───────────────────────────────────────────────────

function slotToMinutes(slot) {
  const [time, period] = slot.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + minutes;
}

function minutesToSlot(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const displayM = m === 0 ? '00' : m;
  return `${displayH}:${displayM} ${period}`;
}

function getSlotDuration(type) {
  // Rough appointment duration in minutes
  const durations = {
    appointment: 90,
    'follow-up': 60,
    contract: 90,
    'change-order': 60,
    'cancel-save': 60,
  };
  return durations[type] || 60;
}

export function zipProximity(zip1, zip2) {
  if (!zip1 || !zip2) return 'far';
  if (zip1 === zip2) return 'same';
  if (zip1.substring(0, 3) === zip2.substring(0, 3)) return 'near';
  if (zip1.substring(0, 2) === zip2.substring(0, 2)) return 'medium';
  return 'far';
}

// ─── Buffer validation ───────────────────────────────────────────────────

export function getRequiredBuffer(zip1, zip2) {
  const proximity = zipProximity(zip1, zip2);
  return BUFFER_MINUTES[proximity];
}

export function checkBufferConflict(repId, date, newSlot, newZip) {
  const daySchedule = getRepDaySchedule(repId, date);
  const newSlotMinutes = slotToMinutes(newSlot);
  const newDuration = 90; // Conservative estimate
  const newEndMinutes = newSlotMinutes + newDuration;

  const conflicts = [];

  for (const { appointment, slotMinutes } of daySchedule) {
    const apptDuration = getSlotDuration(appointment.type);
    const apptEndMinutes = slotMinutes + apptDuration;

    // Check buffer BEFORE new appointment
    if (slotMinutes < newSlotMinutes) {
      const requiredBuffer = getRequiredBuffer(appointment.zipCode, newZip);
      const gap = newSlotMinutes - apptEndMinutes;
      if (gap < requiredBuffer) {
        conflicts.push({
          appointment,
          gap,
          required: requiredBuffer,
          shortfall: requiredBuffer - gap,
          position: 'before',
        });
      }
    }

    // Check buffer AFTER new appointment
    if (slotMinutes > newSlotMinutes) {
      const requiredBuffer = getRequiredBuffer(newZip, appointment.zipCode);
      const gap = slotMinutes - newEndMinutes;
      if (gap < requiredBuffer) {
        conflicts.push({
          appointment,
          gap,
          required: requiredBuffer,
          shortfall: requiredBuffer - gap,
          position: 'after',
        });
      }
    }
  }

  return {
    ok: conflicts.length === 0,
    conflicts,
  };
}

export function getRepDaySchedule(repId, date) {
  const dayAppts = mockAppointments.filter(
    apt => apt.date === date && apt.consultant === repId && !apt.isPlaceholder
  );

  // Sort by time slot
  const slotOrder = ['9:00 AM', '11:30 AM', '2:00 PM', '5:00 PM', '7:00 PM'];
  dayAppts.sort((a, b) => slotOrder.indexOf(a.time) - slotOrder.indexOf(b.time));

  return dayAppts.map(appointment => ({
    appointment,
    slotMinutes: slotToMinutes(appointment.time),
  }));
}

export function validateDaySchedule(repId, date) {
  const daySchedule = getRepDaySchedule(repId, date);
  const violations = [];

  for (let i = 0; i < daySchedule.length - 1; i++) {
    const curr = daySchedule[i];
    const next = daySchedule[i + 1];

    const currDuration = getSlotDuration(curr.appointment.type);
    const currEndMinutes = curr.slotMinutes + currDuration;
    const nextStartMinutes = next.slotMinutes;

    const requiredBuffer = getRequiredBuffer(curr.appointment.zipCode, next.appointment.zipCode);
    const actualGap = nextStartMinutes - currEndMinutes;

    if (actualGap < requiredBuffer) {
      violations.push({
        from: curr.appointment,
        to: next.appointment,
        gap: actualGap,
        required: requiredBuffer,
        shortfall: requiredBuffer - actualGap,
      });
    }
  }

  return violations;
}
