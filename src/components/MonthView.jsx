import React, { useMemo } from 'react';
import { T, fonts } from '../data/theme.js';
import { getAppointmentsForDate, getTodayString } from '../data/mockData.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * MonthView — Traditional 7-column calendar grid with appointment counts
 * Displays a full month with day cells showing appointment badge counts
 * Color-coded by appointment density: green 1-5, amber 6-10, red 11+
 */
export default function MonthView({ currentDate, selectedRegions, onSelectDate }) {
  const isMobile = useIsMobile();
  const today = getTodayString();

  // Parse the current date and generate the calendar grid
  const calendarData = useMemo(() => {
    const [year, month] = currentDate.split('-').map(Number);

    // Get first day of the month (0 = Sunday)
    const firstDay = new Date(year, month - 1, 1).getDay();
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    // Get number of days in previous month
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const days = [];

    // Previous month's days (dimmed)
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonthDate = new Date(year, month - 2, day);
      const dateStr = prevMonthDate.toISOString().split('T')[0];
      days.push({ day, dateStr, isCurrentMonth: false });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      days.push({ day, dateStr, isCurrentMonth: true });
    }

    // Next month's days (dimmed)
    const remainingCells = 42 - days.length; // 6 rows × 7 columns
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonthDate = new Date(year, month, day);
      const dateStr = nextMonthDate.toISOString().split('T')[0];
      days.push({ day, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Count non-placeholder appointments per date
  const appointmentCounts = useMemo(() => {
    const counts = {};
    calendarData.forEach(({ dateStr }) => {
      const appts = getAppointmentsForDate(dateStr, selectedRegions);
      const nonPlaceholders = appts.filter(a => !a.isPlaceholder);
      counts[dateStr] = nonPlaceholders.length;
    });
    return counts;
  }, [calendarData, selectedRegions]);

  // Determine badge color based on appointment count
  const getBadgeColor = (count) => {
    if (count === 0) return null;
    if (count <= 5) return T.green;
    if (count <= 10) return T.accent;
    return T.red;
  };

  const handleDayClick = (dateStr, isCurrentMonth) => {
    if (isCurrentMonth) {
      onSelectDate(dateStr);
    }
  };

  // Day headers
  const dayHeaders = isMobile ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '8px' : '12px',
        padding: isMobile ? '12px' : '16px',
        backgroundColor: T.bg,
        borderRadius: '8px',
        fontFamily: fonts.ui,
      }}
    >
      {/* Header row with day abbreviations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: isMobile ? '4px' : '6px',
          marginBottom: isMobile ? '4px' : '8px',
        }}
      >
        {dayHeaders.map((day, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: '600',
              color: T.muted,
              padding: isMobile ? '4px' : '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: isMobile ? '4px' : '6px',
          backgroundColor: T.surface,
          borderRadius: '6px',
          padding: isMobile ? '6px' : '8px',
          border: `1px solid ${T.border}`,
        }}
      >
        {calendarData.map(({ day, dateStr, isCurrentMonth }, idx) => {
          const count = appointmentCounts[dateStr] || 0;
          const badgeColor = getBadgeColor(count);
          const isToday = dateStr === today;
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr, isCurrentMonth)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                aspectRatio: '1 / 1',
                padding: isMobile ? '6px' : '8px',
                backgroundColor: isCurrentMonth
                  ? isToday
                    ? T.accentDim
                    : isWeekend
                    ? T.border
                    : T.surface
                  : T.dim,
                border: isToday ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                borderRadius: '4px',
                cursor: isCurrentMonth ? 'pointer' : 'default',
                transition: 'background-color 200ms ease-out',
                fontSize: isMobile ? '11px' : '13px',
                fontWeight: '500',
                color: isCurrentMonth ? T.text : T.muted,
                opacity: isCurrentMonth ? 1 : 0.5,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (isCurrentMonth) {
                  e.currentTarget.style.backgroundColor = T.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                if (isCurrentMonth) {
                  e.currentTarget.style.backgroundColor = isToday
                    ? T.accentDim
                    : isWeekend
                    ? T.border
                    : T.surface;
                }
              }}
            >
              {/* Day number */}
              <span style={{ lineHeight: '1', marginBottom: isMobile ? '3px' : '4px' }}>
                {day}
              </span>

              {/* Appointment count badge */}
              {count > 0 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: isMobile ? '16px' : '20px',
                    height: isMobile ? '16px' : '20px',
                    borderRadius: '50%',
                    backgroundColor: badgeColor,
                    color: badgeColor === T.accent ? T.bg : T.text,
                    fontSize: isMobile ? '9px' : '10px',
                    fontWeight: '700',
                    fontFamily: fonts.data,
                  }}
                >
                  {count}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
