import React, { useState, useEffect } from 'react';
import { T, fonts, TIME_SLOTS, TERRITORIES } from '../data/theme.js';
import { getAppointmentsForDate, formatDateFull, consultants } from '../data/mockData.js';
import { getSlotAvailability } from '../data/calendarService.js';
import AppointmentCard from './AppointmentCard.jsx';

export default function DayView({ dateString, selectedRegions, onSelectAppointment }) {
  const appointments = getAppointmentsForDate(dateString, selectedRegions);
  const [busyData, setBusyData] = useState(null);

  // Fetch availability data for all consultants in selected regions
  useEffect(() => {
    const regionConsultants = consultants
      .filter(c => selectedRegions.includes(c.territory))
      .map(c => c.id);

    if (regionConsultants.length === 0) { setBusyData(null); return; }

    getSlotAvailability(dateString, regionConsultants).then(setBusyData).catch(() => setBusyData(null));
  }, [dateString, selectedRegions.join(',')]);

  // Compute per-slot availability summary
  const getSlotSummary = (slotTime) => {
    if (!busyData) return null;
    const ids = Object.keys(busyData);
    const total = ids.length;
    const busy = ids.filter(id => !busyData[id]?.[slotTime]?.available).length;
    return { total, busy, available: total - busy };
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '500', fontFamily: fonts.ui }}>
        {formatDateFull(dateString)}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {TIME_SLOTS.map(slot => {
          const slotAppointments = appointments.filter(a => a.time === slot);
          const summary = getSlotSummary(slot);

          return (
            <div
              key={slot}
              style={{
                display: 'flex',
                minHeight: '80px',
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {/* Time label + availability indicator */}
              <div style={{
                width: '80px',
                paddingTop: '12px',
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: T.muted,
                  fontFamily: fonts.data,
                }}>
                  {slot}
                </div>
                {summary && (
                  <div style={{
                    marginTop: '4px',
                    fontSize: '10px',
                    color: summary.available === 0 ? '#EF4444' : summary.available <= 2 ? T.accent : T.dim,
                    fontFamily: fonts.data,
                  }}>
                    {summary.available}/{summary.total} free
                  </div>
                )}
              </div>

              {/* Appointments in this slot */}
              <div style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {slotAppointments.length > 0 ? (
                  slotAppointments.map(apt => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onClick={() => onSelectAppointment && onSelectAppointment(apt)}
                    />
                  ))
                ) : (
                  <div style={{
                    padding: '12px 16px',
                    color: summary && summary.available === 0 ? '#EF4444' : T.dim,
                    fontSize: '13px',
                    fontStyle: 'italic',
                    borderRadius: '6px',
                    border: `1px dashed ${summary && summary.available === 0 ? 'rgba(239,68,68,0.3)' : T.border}`,
                    background: summary && summary.available === 0 ? 'rgba(239,68,68,0.05)' : 'transparent',
                    cursor: summary && summary.available === 0 ? 'default' : 'pointer',
                  }}>
                    {summary && summary.available === 0 ? 'All reps busy' : 'Available slot'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
