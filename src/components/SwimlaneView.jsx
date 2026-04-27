import React, { useMemo } from 'react';
import { T, fonts, APPOINTMENT_STATUSES } from '../data/theme.js';
import { getAppointmentsForDateRange, getConsultantName, formatDateDisplay } from '../data/mockData.js';
import { getTsrfTier } from '../data/tsrf.js';
import TsrfBadge from './TsrfBadge.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * SwimlaneView — Kanban-style pipeline view of appointments
 *
 * Shows appointments organized in horizontal columns (swimlanes) by status:
 * Scheduled → Confirmed → Completed → Needs Reschedule → Canceled
 *
 * Props:
 *   - weekDates: array of 7 YYYY-MM-DD strings
 *   - selectedRegions: array of territory codes to filter by
 *   - onSelectAppointment: callback(appointment) when a card is clicked
 */
export default function SwimlaneView({ weekDates, selectedRegions, onSelectAppointment }) {
  const isMobile = useIsMobile();

  // Define the pipeline stages (in order, left to right)
  const pipelineStages = [
    'scheduled',
    'confirmed',
    'completed',
    'needs-reschedule',
    'canceled',
  ];

  // Get start and end dates for the date range
  const startDate = weekDates[0];
  const endDate = weekDates[weekDates.length - 1];

  // Fetch appointments for the week
  const allAppointments = useMemo(
    () => getAppointmentsForDateRange(startDate, endDate, selectedRegions),
    [startDate, endDate, selectedRegions]
  );

  // Organize appointments by status
  const appointmentsByStatus = useMemo(() => {
    const map = {};
    for (const stage of pipelineStages) {
      map[stage] = [];
    }
    for (const apt of allAppointments) {
      if (map[apt.status] !== undefined) {
        map[apt.status].push(apt);
      }
    }
    // Sort each lane: higher TSRF first (sunnier roofs = better leads), then by date/time
    for (const stage of pipelineStages) {
      map[stage].sort((a, b) => {
        // TSRF descending (null = bottom)
        const tsrfA = a.tsrf ?? -1;
        const tsrfB = b.tsrf ?? -1;
        if (tsrfA !== tsrfB) return tsrfB - tsrfA;
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
    }
    return map;
  }, [allAppointments]);

  // Calculate column widths based on device
  const columnMinWidth = isMobile ? 180 : 220;
  const containerPadding = isMobile ? 12 : 16;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: T.bg,
        fontFamily: fonts.ui,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: `0 ${containerPadding}px`,
          paddingBottom: 12,
          borderBottom: `1px solid ${T.border}`,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollBehavior: 'smooth',
        }}
      >
        {pipelineStages.map((stage) => {
          const statusConfig = APPOINTMENT_STATUSES[stage];
          const count = appointmentsByStatus[stage].length;
          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: columnMinWidth,
                paddingTop: 12,
                paddingBottom: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: statusConfig.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.text,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusConfig.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: T.muted,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: T.surface,
                  }}
                >
                  {count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Columns container */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: containerPadding,
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollBehavior: 'smooth',
          ...(isMobile && { scrollSnapType: 'x mandatory' }),
        }}
      >
        {pipelineStages.map((stage) => {
          const cards = appointmentsByStatus[stage];
          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minWidth: columnMinWidth,
                flexShrink: 0,
                minHeight: 200,
                padding: 12,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                ...(isMobile && { scrollSnapAlign: 'start' }),
              }}
            >
              {cards.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onSelect={onSelectAppointment}
                  weekDates={weekDates}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Single appointment card within a swimlane
 */
function AppointmentCard({ appointment, onSelect, weekDates }) {
  const consultantName = getConsultantName(appointment.consultant);
  const displayTime = appointment.time;
  const displayDate = formatDateDisplay(appointment.date);

  // Type color for left border
  const appointmentTypes = {
    appointment: '#F0A830',
    'follow-up': '#2DD4A8',
    contract: '#9333EA',
    'change-order': '#EC4899',
    'cancel-save': '#F87171',
  };
  const typeColor = appointmentTypes[appointment.type] || T.muted;

  return (
    <div
      onClick={() => onSelect(appointment)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 10,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${typeColor}`,
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          background: T.surfaceHover,
          borderColor: T.borderLight,
        },
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.surfaceHover;
        e.currentTarget.style.borderColor = T.borderLight;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.surface;
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      {/* Customer name */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: T.text,
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {appointment.customer}
      </div>

      {/* Time and date */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontSize: 11,
          color: T.muted,
          lineHeight: 1.2,
        }}
      >
        <div>{displayTime}</div>
        <div>{displayDate}</div>
      </div>

      {/* Consultant name */}
      {consultantName && (
        <div
          style={{
            fontSize: 10,
            color: T.dim,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {consultantName}
        </div>
      )}

      {/* TSRF badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 2 }}>
        <TsrfBadge tsrf={appointment.tsrf} variant="compact" />
      </div>
    </div>
  );
}
