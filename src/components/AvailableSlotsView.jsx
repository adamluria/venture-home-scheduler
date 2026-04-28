import React, { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { T, fonts, TIME_SLOTS, TERRITORIES } from '../data/theme.js';
import { consultants } from '../data/mockData.js';
import { getBatchSlotAvailability } from '../data/calendarService.js';

/**
 * Grid view showing open-slot capacity: rows = dates, cols = time slots.
 * Each cell shows "<available>/<total>" reps free at that slot in the
 * selected territories. Cells are color-graded by saturation.
 *
 * Props:
 *   - weekDates   7 YYYY-MM-DD strings
 *   - selectedRegions  territory codes to include
 *   - onSelectDate(date)   click a date label to jump to day view
 *   - onCellClick({date, slot})  optional — open new-appt modal prefilled
 */
export default function AvailableSlotsView({ weekDates, selectedRegions, onSelectDate, onCellClick }) {
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState({}); // { [date]: { [slot]: {available, total} } }

  // Pull eligible reps for the filter
  const eligibleReps = useMemo(() => consultants.filter(c =>
    !c.isCloserOnly &&  // field reps only
    c.territories.some(t => selectedRegions.includes(t))
  ), [selectedRegions]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const repIds = eligibleReps.map(r => r.id);

    // Single batched call for all 7 days instead of 7 separate calls
    getBatchSlotAvailability(weekDates, repIds).then(batchResult => {
      if (!alive) return;
      const newGrid = {};
      for (const date of weekDates) {
        const dayAvail = batchResult[date] || {};
        const slotCounts = {};
        for (const slot of TIME_SLOTS) {
          const free = repIds.filter(id => dayAvail[id]?.[slot]?.available).length;
          slotCounts[slot] = { available: free, total: repIds.length };
        }
        newGrid[date] = slotCounts;
      }
      setGrid(newGrid);
      setLoading(false);
    });

    return () => { alive = false; };
  }, [weekDates.join(','), eligibleReps.length, selectedRegions.join(',')]);

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '10px', color: T.muted }}>
        <Loader2 size={18} className="spin" />
        Loading availability grid…
      </div>
    );
  }

  return (
    <div style={{ overflow: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `minmax(140px, 1.2fr) repeat(${TIME_SLOTS.length}, 1fr)`,
        gap: '4px',
        minWidth: '640px',
      }}>
        {/* Header row */}
        <div style={headerCell}>Date</div>
        {TIME_SLOTS.map(slot => (
          <div key={slot} style={headerCell}>{slot}</div>
        ))}

        {/* Data rows */}
        {weekDates.map(date => {
          const d = new Date(date + 'T12:00:00');
          const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const dow = d.getDay();
          const isWeekend = dow === 0 || dow === 6;

          return (
            <React.Fragment key={date}>
              <button onClick={() => onSelectDate?.(date)} style={{
                ...dateCell,
                cursor: onSelectDate ? 'pointer' : 'default',
              }}>
                {dayLabel}
              </button>

              {TIME_SLOTS.map(slot => {
                const cell = grid[date]?.[slot] || { available: 0, total: 0 };
                const blockedWeekend = isWeekend && slot === '7:00 PM';
                return (
                  <SlotCell
                    key={slot}
                    available={cell.available}
                    total={cell.total}
                    blocked={blockedWeekend}
                    onClick={() => onCellClick?.({ date, slot })}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '11px',
        color: T.muted,
        fontFamily: fonts.ui,
      }}>
        <span>Capacity:</span>
        <LegendSwatch color={T.green}  label="Open" />
        <LegendSwatch color={T.accent} label="Tight" />
        <LegendSwatch color={T.red}    label="Full" />
        <LegendSwatch color={T.dim}    label="Blocked" />
        <span style={{ marginLeft: 'auto' }}>
          {eligibleReps.length} reps across {selectedRegions.length} territories
        </span>
      </div>
    </div>
  );
}

function SlotCell({ available, total, blocked, onClick }) {
  if (blocked) {
    return (
      <div style={{
        ...baseCell,
        background: T.bg,
        color: T.dim,
        fontSize: '10px',
        letterSpacing: '0.5px',
      }}>
        BLOCKED
      </div>
    );
  }

  const pct = total === 0 ? 0 : available / total;
  let color;
  if (pct === 0) color = T.red;
  else if (pct < 0.25) color = T.accent;
  else color = T.green;

  return (
    <button
      onClick={onClick}
      title={`${available} of ${total} reps free`}
      style={{
        ...baseCell,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        color: color,
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: fonts.data,
        fontWeight: 600,
      }}
    >
      <div style={{ fontSize: '16px' }}>{available}</div>
      <div style={{ fontSize: '10px', opacity: 0.7 }}>of {total}</div>
    </button>
  );
}

function LegendSwatch({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: `${color}40`, border: `1px solid ${color}` }} />
      {label}
    </span>
  );
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
};

const baseCell = {
  padding: '12px 8px',
  borderRadius: '6px',
  textAlign: 'center',
  background: T.bg,
  border: `1px solid ${T.border}`,
  color: T.text,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '56px',
};

const dateCell = {
  ...baseCell,
  alignItems: 'flex-start',
  textAlign: 'left',
  padding: '12px 14px',
  fontFamily: fonts.data,
  fontSize: '12px',
};
