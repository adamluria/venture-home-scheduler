import { useState, useMemo } from 'react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { consultants, getAppointmentsForDateRange } from '../data/mockData.js';
import { getRepOverallStats } from '../data/repPerformance.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Position label mapping
 */
const POSITION_LABELS = {
  regional_sales_manager: 'RSM',
  design_expert: 'DE',
  sr_solar_consultant: 'Sr. SC',
  solar_consultant: 'SC',
};

/**
 * TeamView — displays sales teams (= territories) in expandable sections
 * Each team shows roster of reps with their stats.
 *
 * Props:
 *   weekDates: array of ISO date strings for the current week
 *   selectedRegions: array of territory codes to filter by (empty = show all)
 *   onSelectAppointment: callback (reserved for future use)
 */
export default function TeamView({ weekDates, selectedRegions, onSelectAppointment }) {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState(null);

  // ─── Compute team roster with stats ─────────────────────────────────────
  const teamData = useMemo(() => {
    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];
    const appts = getAppointmentsForDateRange(startDate, endDate, null);

    // Build team data keyed by territory
    const teams = {};

    Object.values(TERRITORIES).forEach(terr => {
      // Get reps for this territory
      const terrReps = consultants.filter(c => c.territories.includes(terr.code));

      // Count appointments for this territory this week
      const terrAppts = appts.filter(a => a.territory === terr.code && !a.isPlaceholder);

      // Get stats for each rep
      const roster = terrReps.map(rep => {
        const stats = getRepOverallStats(rep.id);
        const repAppts = terrAppts.filter(a => a.consultant === rep.id);
        return {
          id: rep.id,
          name: rep.name,
          position: rep.position,
          positionLabel: POSITION_LABELS[rep.position] || rep.position,
          closeRate: stats.closeRate,
          sitRate: stats.sitRate,
          appointmentCount: repAppts.length,
        };
      });

      // Sort by close rate descending
      roster.sort((a, b) => b.closeRate - a.closeRate);

      // Count team totals
      const teamTotal = terrAppts.length;
      const avgCloseRate = roster.length > 0
        ? roster.reduce((sum, r) => sum + r.closeRate, 0) / roster.length
        : 0;

      teams[terr.code] = {
        code: terr.code,
        name: terr.name,
        color: terr.color,
        roster,
        appointmentCount: teamTotal,
        avgCloseRate,
        repCount: terrReps.length,
      };
    });

    // Filter by selected regions
    const filtered = selectedRegions && selectedRegions.length > 0
      ? Object.values(teams).filter(t => selectedRegions.includes(t.code))
      : Object.values(teams);

    // Sort by appointment count descending
    return filtered.sort((a, b) => b.appointmentCount - a.appointmentCount);
  }, [weekDates, selectedRegions]);

  // ─── Render ──────────────────────────────────────────────────────────────
  const containerStyle = {
    padding: '20px',
    backgroundColor: T.bg,
    minHeight: '100vh',
    fontFamily: fonts.ui,
  };

  const maxWidth = isMobile ? 'none' : '900px';
  const margin = isMobile ? '0' : '0 auto';

  const teamSectionStyle = {
    marginBottom: '20px',
    border: `1px solid ${T.border}`,
    borderRadius: '8px',
    overflow: 'hidden',
  };

  const teamHeaderStyle = (team) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    backgroundColor: T.surface,
    borderLeft: `4px solid ${team.color}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    userSelect: 'none',
  });

  const teamHeaderHoverStyle = {
    backgroundColor: T.surfaceHover,
  };

  const chevronStyle = {
    display: 'inline-block',
    fontSize: '14px',
    color: T.muted,
    transition: 'transform 0.2s ease',
  };

  const teamNameStyle = {
    flex: 1,
    fontSize: '14px',
    fontWeight: '600',
    color: T.text,
  };

  const teamBadgesStyle = {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: T.muted,
  };

  const badgeStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const badgeValueStyle = {
    fontFamily: fonts.data,
    fontWeight: '600',
    color: T.accent,
  };

  const rosterContainerStyle = {
    backgroundColor: T.bg,
  };

  const repRowStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr 1fr',
    gap: '12px',
    padding: '12px 14px',
    borderBottom: `1px solid ${T.border}`,
    alignItems: 'center',
    fontSize: '13px',
    color: T.text,
  };

  const repRowLastStyle = {
    borderBottom: 'none',
  };

  const repNameStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const repNameTextStyle = {
    fontSize: '13px',
    fontWeight: '500',
    color: T.text,
  };

  const repPositionStyle = {
    fontSize: '11px',
    color: T.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  };

  const statCellStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-end',
  };

  const statLabelStyle = {
    fontSize: '10px',
    color: T.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  };

  const statValueStyle = {
    fontSize: '13px',
    fontFamily: fonts.data,
    fontWeight: '600',
    color: T.text,
  };

  const emptyRosterStyle = {
    padding: '20px',
    textAlign: 'center',
    color: T.muted,
    fontSize: '13px',
  };

  const mobileRepRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    padding: '12px 14px',
    borderBottom: `1px solid ${T.border}`,
    fontSize: '12px',
  };

  return (
    <div style={{ ...containerStyle, maxWidth, margin }}>
      {teamData.map(team => {
        const isExpanded = expandedTeam === team.code;

        return (
          <div key={team.code} style={teamSectionStyle}>
            {/* Team Header */}
            <div
              style={teamHeaderStyle(team)}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  Object.assign(e.currentTarget.style, teamHeaderHoverStyle);
                }
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  backgroundColor: T.surface,
                });
              }}
              onClick={() => setExpandedTeam(isExpanded ? null : team.code)}
            >
              {/* Chevron indicator */}
              <div
                style={{
                  ...chevronStyle,
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                {isMobile ? '▸' : '▸'}
              </div>

              {/* Team name */}
              <div style={teamNameStyle}>{team.name}</div>

              {/* Team badges */}
              <div style={teamBadgesStyle}>
                <div style={badgeStyle}>
                  <span>Reps:</span>
                  <span style={badgeValueStyle}>{team.repCount}</span>
                </div>
                <div style={badgeStyle}>
                  <span>Appts:</span>
                  <span style={badgeValueStyle}>{team.appointmentCount}</span>
                </div>
                <div style={badgeStyle}>
                  <span>Close:</span>
                  <span style={badgeValueStyle}>{team.avgCloseRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Roster — shown when expanded */}
            {isExpanded && (
              <div style={rosterContainerStyle}>
                {team.roster.length > 0 ? (
                  <>
                    {/* Desktop header row */}
                    {!isMobile && (
                      <div
                        style={{
                          ...repRowStyle,
                          backgroundColor: T.surface,
                          fontWeight: '600',
                          fontSize: '11px',
                          color: T.muted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        <div>Name</div>
                        <div style={{ textAlign: 'right' }}>Close Rate</div>
                        <div style={{ textAlign: 'right' }}>Sit Rate</div>
                        <div style={{ textAlign: 'right' }}>Appts This Week</div>
                      </div>
                    )}

                    {/* Rep rows */}
                    {team.roster.map((rep, idx) => (
                      isMobile ? (
                        // Mobile layout
                        <div
                          key={rep.id}
                          style={{
                            ...mobileRepRowStyle,
                            borderBottom: idx === team.roster.length - 1 ? 'none' : `1px solid ${T.border}`,
                          }}
                        >
                          <div style={repNameStyle}>
                            <div style={repNameTextStyle}>{rep.name}</div>
                            <div style={repPositionStyle}>{rep.positionLabel}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={statLabelStyle}>Close Rate</div>
                            <div style={statValueStyle}>{rep.closeRate.toFixed(1)}%</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={statLabelStyle}>Sit Rate</div>
                            <div style={statValueStyle}>{rep.sitRate.toFixed(1)}%</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={statLabelStyle}>Appts</div>
                            <div style={statValueStyle}>{rep.appointmentCount}</div>
                          </div>
                        </div>
                      ) : (
                        // Desktop layout
                        <div
                          key={rep.id}
                          style={{
                            ...repRowStyle,
                            ...(idx === team.roster.length - 1 ? repRowLastStyle : {}),
                          }}
                        >
                          <div style={repNameStyle}>
                            <div style={repNameTextStyle}>{rep.name}</div>
                            <div style={repPositionStyle}>{rep.positionLabel}</div>
                          </div>
                          <div style={statCellStyle}>
                            <div style={statLabelStyle}>Close Rate</div>
                            <div style={statValueStyle}>{rep.closeRate.toFixed(1)}%</div>
                          </div>
                          <div style={statCellStyle}>
                            <div style={statLabelStyle}>Sit Rate</div>
                            <div style={statValueStyle}>{rep.sitRate.toFixed(1)}%</div>
                          </div>
                          <div style={statCellStyle}>
                            <div style={statLabelStyle}>Appts This Week</div>
                            <div style={statValueStyle}>{rep.appointmentCount}</div>
                          </div>
                        </div>
                      )
                    ))}
                  </>
                ) : (
                  <div style={emptyRosterStyle}>No reps in this team</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {teamData.length === 0 && (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: T.muted,
            fontSize: '14px',
          }}
        >
          No teams to display
        </div>
      )}
    </div>
  );
}
