import React, { useState, useEffect } from 'react';
import { T, fonts, TIME_SLOTS, TERRITORIES } from '../data/theme.js';
import { getAppointmentsForDate, formatDateDisplay, getTodayString, consultants } from '../data/mockData.js';
import { getSlotAvailability } from '../data/calendarService.js';
import AppointmentCard from './AppointmentCard.jsx';

export default function WeekView({ weekDates, selectedRegions, onSelectAppointment, onSelectDate }) {
  const today = getTodayString();
  const [weekBusy, setWeekBusy] = useState({});

  // Fetch availability for the whole week
  useEffect(() => {
    const regionConsultants = consultants
      .filter(c => selectedRegions.includes(c.territory))
      .map(c => c.id);

    if (regionConsultants.length === 0) { setWeekBusy({}); return; }

    const fetchAll = async () => {
      const result = {};
      for (const date of weekDates) {
        try {
          result[date] = await getSlotAvailability(date, regionConsultants);
        } catch { result[date] = null; }
      }
      setWeekBusy(result);
    };
    fetchAll();
  }, [weekDates.join(','), selectedRegions.join(',')]);

  const getSlotSummary = (date, slotTime) => {
    const dayData = weekBusy[date];
    if (!dayData) return null;
    const ids = Object.keys(dayData);
    const total = ids.length;
    const busy = ids.filter(id => !dayData[id]?.[slotTime]?.available).length;
    return { total, busy, available: total - busy };
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '900px' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '1px', marginBottom: '2px' }}>
          <div /> {/* spacer for time column */}
          {weekDates.map(date => {
            const isToday = date === today;
            const dayAppts = getAppointmentsForDate(date, selectedRegions);

            return (
              <div
                key={date}
                onClick={() => onSelectDate && onSelectDate(date)}
                style={{
                  textAlign: 'center',
                  padding: '10px 4px',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  background: isToday ? T.accentDim : 'transparent',
                  borderBottom: isToday ? `2px solid ${T.accent}` : `2px solid ${T.border}`,
                }}
              >
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isToday ? T.accent : T.muted,
                  fontFamily: fonts.ui,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {formatDateDisplay(date)}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: T.dim,
                  fontFamily: fonts.data,
                  marginTop: '2px',
                }}>
                  {dayAppts.filter(a => !a.isPlaceholder).length} appts
                </div>
              </div>
            );
          })}
        </div>

        {/* Time slot grid */}
        {TIME_SLOTS.map(slot => (
          <div
            key={slot}
            style={{
              display: 'grid',
              gridTemplateColumns: '70px repeat(7, 1fr)',
              gap: '1px',
              minHeight: '68px',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {/* Time label */}
            <div style={{
              paddingTop: '8px',
              fontSize: '12px',
              color: T.muted,
              fontFamily: fonts.data,
              textAlign: 'right',
              paddingRight: '8px',
            }}>
              {slot}
            </div>

            {/* Day cells */}
            {weekDates.map(date => {
              const cellAppts = getAppointmentsForDate(date, selectedRegions).filter(a => a.time === slot);
              const summary = getSlotSummary(date, slot);
              const allBusy = summary && summary.available === 0;

              return (
                <div
                  key={`${date}-${slot}`}
                  style={{
                    padding: '4px',
                    background: allBusy
                      ? 'rgba(239,68,68,0.04)'
                      : date === today
                        ? 'rgba(240, 168, 48, 0.03)'
                        : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    position: 'relative',
                  }}
                >
                  {cellAppts.map(apt => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      compact={true}
                      onClick={() => onSelectAppointment && onSelectAppointment(apt)}
                    />
                  ))}
                  {/* Availability dot */}
                  {summary && cellAppts.length === 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: allBusy ? '#EF4444' : summary.available <= 2 ? T.accent : T.green,
                      opacity: 0.7,
                    }}
                      title={`${summary.available}/${summary.total} consultants available`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
