import { useMemo } from 'react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { consultants, getAppointmentsForDateRange } from '../data/mockData.js';
import { getRepOverallStats } from '../data/repPerformance.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * StateView — displays territories grouped by state
 * Shows appointment counts, rep counts, and performance metrics per territory.
 *
 * Props:
 *   weekDates: array of ISO date strings for the current week
 *   selectedRegions: array of territory codes to filter by (empty = show all)
 *   onSelectAppointment: callback (reserved for future filtering)
 */
export default function StateView({ weekDates, selectedRegions, onSelectAppointment }) {
  const isMobile = useIsMobile();

  // ─── Compute territory stats ────────────────────────────────────────────
  const territoryStats = useMemo(() => {
    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];

    // Get all appointments in date range
    const appts = getAppointmentsForDateRange(startDate, endDate, null);

    // For each territory, compute stats
    const stats = Object.values(TERRITORIES).map(terr => {
      // Appointments assigned to this territory this week
      const terrAppts = appts.filter(a => a.territory === terr.code && !a.isPlaceholder);

      // Reps in this territory (exclude closers for rep count)
      const terrReps = consultants.filter(
        c => c.territories.includes(terr.code) && !c.isCloserOnly
      );

      // Compute average close rate and sit rate across reps
      let totalCloseRate = 0;
      let totalSitRate = 0;
      let repCount = 0;

      terrReps.forEach(rep => {
        const stats = getRepOverallStats(rep.id);
        totalCloseRate += stats.closeRate || 0;
        totalSitRate += stats.sitRate || 0;
        repCount++;
      });

      const avgCloseRate = repCount > 0 ? totalCloseRate / repCount : 0;
      const avgSitRate = repCount > 0 ? totalSitRate / repCount : 0;

      // Appointment distribution by day of week (for 7-day bar chart)
      const apptsByDay = new Array(7).fill(0);
      terrAppts.forEach(apt => {
        const aptDate = new Date(apt.date + 'T12:00:00');
        const dayIndex = aptDate.getDay();
        // Convert Sunday (0) to index 6, Monday (1) to index 0, etc.
        const weekIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        apptsByDay[weekIndex]++;
      });

      return {
        code: terr.code,
        name: terr.name,
        color: terr.color,
        states: terr.states || [],
        appointmentCount: terrAppts.length,
        repCount,
        avgCloseRate,
        avgSitRate,
        apptsByDay,
      };
    });

    // Filter by selected regions if provided
    const filtered = selectedRegions && selectedRegions.length > 0
      ? stats.filter(s => selectedRegions.includes(s.code))
      : stats;

    // Sort by appointment count descending
    return filtered.sort((a, b) => b.appointmentCount - a.appointmentCount);
  }, [weekDates, selectedRegions]);

  // ─── Group territories by state ─────────────────────────────────────────
  const stateGroups = useMemo(() => {
    const groups = {};
    territoryStats.forEach(terr => {
      const state = terr.states[0] || 'Multi-State';
      if (!groups[state]) groups[state] = [];
      groups[state].push(terr);
    });
    return groups;
  }, [territoryStats]);

  // ─── Render ──────────────────────────────────────────────────────────────
  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '2fr 2fr',
    gap: '16px',
    padding: '20px',
    backgroundColor: T.bg,
    minHeight: '100vh',
    fontFamily: fonts.ui,
  };

  const stateGroupStyle = {
    marginBottom: '24px',
  };

  const stateHeaderStyle = {
    fontSize: '12px',
    fontWeight: '600',
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    paddingLeft: '4px',
  };

  const cardStyle = {
    backgroundColor: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '12px',
  };

  const cardHoverStyle = {
    backgroundColor: T.surfaceHover,
    borderColor: T.borderLight,
    transform: 'translateY(-2px)',
  };

  const colorBarStyle = {
    height: '4px',
    backgroundColor: '#placeholder',
    borderRadius: '2px',
    marginBottom: '12px',
  };

  const cardTitleStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: T.text,
    marginBottom: '12px',
  };

  const statsRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '13px',
  };

  const statItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const statLabelStyle = {
    color: T.muted,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  };

  const statValueStyle = {
    color: T.text,
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: fonts.data,
  };

  const barChartContainerStyle = {
    display: 'flex',
    gap: '4px',
    alignItems: 'flex-end',
    height: '40px',
    paddingTop: '8px',
    borderTop: `1px solid ${T.border}`,
  };

  const barStyle = {
    flex: 1,
    backgroundColor: T.accentDim,
    borderRadius: '3px 3px 0 0',
    transition: 'background-color 0.2s ease',
    minHeight: '4px',
  };

  const dayLabelsStyle = {
    display: 'flex',
    gap: '4px',
    justifyContent: 'space-between',
    marginTop: '6px',
    fontSize: '10px',
    color: T.muted,
    fontFamily: fonts.data,
  };

  const dayLabelItemStyle = {
    flex: 1,
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      {Object.entries(stateGroups).map(([state, territories]) => (
        <div key={state} style={stateGroupStyle}>
          <div style={stateHeaderStyle}>{state}</div>
          {territories.map(terr => (
            <div
              key={terr.code}
              style={cardStyle}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, cardHoverStyle);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  backgroundColor: T.surface,
                  borderColor: T.border,
                  transform: 'translateY(0)',
                });
              }}
              onClick={() => onSelectAppointment?.(terr.code)}
            >
              {/* Color bar indicator */}
              <div style={{ ...colorBarStyle, backgroundColor: terr.color }} />

              {/* Territory name */}
              <div style={cardTitleStyle}>{terr.name}</div>

              {/* Key metrics */}
              <div style={statsRowStyle}>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Appointments</div>
                  <div style={statValueStyle}>{terr.appointmentCount}</div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Reps</div>
                  <div style={statValueStyle}>{terr.repCount}</div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Close Rate</div>
                  <div style={statValueStyle}>{terr.avgCloseRate.toFixed(1)}%</div>
                </div>
                <div style={statItemStyle}>
                  <div style={statLabelStyle}>Sit Rate</div>
                  <div style={statValueStyle}>{terr.avgSitRate.toFixed(1)}%</div>
                </div>
              </div>

              {/* Appointment load by day of week */}
              <div style={barChartContainerStyle}>
                {terr.apptsByDay.map((count, idx) => {
                  const maxCount = Math.max(...terr.apptsByDay, 1);
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        ...barStyle,
                        height: `${Math.max(height, 8)}%`,
                        backgroundColor: count > 0 ? terr.color : T.accentDim,
                      }}
                      title={`${count} appointments`}
                    />
                  );
                })}
              </div>
              <div style={dayLabelsStyle}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <div key={idx} style={dayLabelItemStyle}>
                    {day}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Empty state */}
      {territoryStats.length === 0 && (
        <div
          style={{
            gridColumn: isMobile ? '1' : '1 / -1',
            padding: '40px 20px',
            textAlign: 'center',
            color: T.muted,
          }}
        >
          <div style={{ fontSize: '14px' }}>No territories to display</div>
        </div>
      )}
    </div>
  );
}
