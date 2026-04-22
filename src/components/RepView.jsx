import React, { useMemo } from 'react';
import { T, fonts, TIME_SLOTS, TERRITORIES, APPOINTMENT_TYPES } from '../data/theme.js';
import { consultants, getAppointmentsForDateRange } from '../data/mockData.js';
import { getRepOverallStats } from '../data/repPerformance.js';
import { getTsrfTier } from '../data/tsrf.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Rep-centric view: one row per rep, columns = dates in the week.
 * Each cell shows their appointment count for that day.
 * Hover a cell to see what's scheduled.
 */
export default function RepView({ weekDates, selectedRegions, onSelectAppointment }) {
  const isMobile = useIsMobile();
  const reps = useMemo(
    () => consultants
      .filter(c => !c.isCloserOnly && c.territories.some(t => selectedRegions.includes(t)))
      .sort((a, b) => {
        // Sort by team, then by position (sr first), then name
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        const pOrder = { sr_solar_consultant: 0, solar_consultant: 1, design_expert: 2, regional_sales_manager: 3 };
        return (pOrder[a.position] ?? 9) - (pOrder[b.position] ?? 9);
      }),
    [selectedRegions]
  );

  const startDate = weekDates[0];
  const endDate = weekDates[weekDates.length - 1];
  const allWeekAppts = useMemo(
    () => getAppointmentsForDateRange(startDate, endDate, selectedRegions),
    [startDate, endDate, selectedRegions]
  );

  return (
    <div style={{ overflow: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `minmax(220px, 1.3fr) repeat(7, 1fr) 90px`,
        gap: '2px',
        minWidth: '960px',
      }}>
        {/* Header */}
        <div style={headerCell}>Rep</div>
        {weekDates.map(date => {
          const d = new Date(date + 'T12:00:00');
          return (
            <div key={date} style={headerCell}>
              <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div style={{ fontSize: '10px', opacity: 0.7, fontFamily: fonts.data }}>
                {d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </div>
            </div>
          );
        })}
        <div style={headerCell}>Week</div>

        {/* Rows */}
        {reps.map(rep => {
          const repAppts = allWeekAppts.filter(a => a.consultant === rep.id && !a.isPlaceholder);
          const weekTotal = repAppts.length;
          const territoryColor = TERRITORIES[rep.team]?.color || T.muted;
          const stats = getRepOverallStats(rep.id);

          return (
            <React.Fragment key={rep.id}>
              <div style={{
                ...repLabelCell,
                borderLeft: `3px solid ${territoryColor}`,
              }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{rep.name}</div>
                <div style={{ fontSize: '10px', color: T.muted, marginTop: '2px', display: 'flex', gap: '6px' }}>
                  <span>{rep.team}</span>
                  <span>·</span>
                  <span>{positionLabel(rep.position)}</span>
                  {rep.isHybrid && <>
                    <span>·</span>
                    <span style={{ color: T.cyan }}>hybrid</span>
                  </>}
                </div>
                <div style={{ fontSize: '10px', marginTop: '3px', fontFamily: fonts.data, color: T.green }}>
                  {stats.closeRate}% close · {stats.sitRate}% sit
                </div>
              </div>

              {weekDates.map(date => {
                const dayAppts = repAppts.filter(a => a.date === date);
                return (
                  <DayCell
                    key={date}
                    appointments={dayAppts}
                    onSelect={onSelectAppointment}
                  />
                );
              })}

              <div style={{
                ...weekTotalCell,
                color: weekTotal === 0 ? T.dim : T.text,
                background: weekTotal >= 8 ? T.accentDim : T.bg,
              }}>
                <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: fonts.data }}>{weekTotal}</div>
                <div style={{ fontSize: '9px', color: T.muted, letterSpacing: '0.5px' }}>APPTS</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {reps.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: T.muted }}>
          No reps match the selected territories.
        </div>
      )}
    </div>
  );
}

function DayCell({ appointments, onSelect }) {
  if (appointments.length === 0) {
    return <div style={{ ...cellBase, color: T.dim, fontSize: '11px' }}>—</div>;
  }

  return (
    <div style={{ ...cellBase, padding: '4px', flexDirection: 'column', gap: '2px', alignItems: 'stretch' }}>
      {appointments.map(a => {
        const color = APPOINTMENT_TYPES[a.type]?.color || T.muted;
        const tsrfTier = getTsrfTier(a.tsrf);
        return (
          <button
            key={a.id}
            onClick={() => onSelect?.(a)}
            title={`${a.time} — ${a.customer} · TSRF ${a.tsrf ?? '—'} (${tsrfTier.label})`}
            style={{
              background: `${color}15`,
              border: `1px solid ${color}40`,
              borderLeft: `3px solid ${tsrfTier.color}`,
              color: color,
              borderRadius: '3px',
              padding: '2px 4px',
              fontSize: '10px',
              fontFamily: fonts.data,
              cursor: 'pointer',
              textAlign: 'left',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {a.time.replace(':00', '')} {a.isVirtual ? '📹' : ''}
          </button>
        );
      })}
    </div>
  );
}

function positionLabel(pos) {
  return ({
    sr_solar_consultant: 'Sr. SC',
    solar_consultant: 'SC',
    regional_sales_manager: 'RSM',
    design_expert: 'DE',
  })[pos] || pos;
}

const headerCell = {
  padding: '8px 10px',
  fontSize: '11px',
  color: T.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: fonts.ui,
  fontWeight: 500,
  textAlign: 'center',
  borderBottom: `1px solid ${T.border}`,
};

const repLabelCell = {
  padding: '10px 12px',
  background: T.surface,
  borderRadius: '0 4px 4px 0',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const cellBase = {
  padding: '6px',
  background: T.bg,
  borderRadius: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '44px',
  overflow: 'hidden',
};

const weekTotalCell = {
  ...cellBase,
  flexDirection: 'column',
  gap: '2px',
  fontFamily: fonts.data,
  borderRadius: '4px',
  border: `1px solid ${T.border}`,
};
