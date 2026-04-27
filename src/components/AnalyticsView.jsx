import React, { useMemo } from 'react';
import { T, fonts, APPOINTMENT_STATUSES, TERRITORIES } from '../data/theme.js';
import { mockAppointments, consultants, getConsultantName } from '../data/mockData.js';
import { getRepOverallStats } from '../data/repPerformance.js';
import { predictSitRate } from '../data/forecastEngine.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Full analytics dashboard view
 * Shows KPIs, conversion funnel, lead source performance, top performers, and territory stats
 */
export default function AnalyticsView({ selectedRegions = [] }) {
  const isMobile = useIsMobile();

  // Filter appointments to last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAppts = useMemo(() => {
    return mockAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= thirtyDaysAgo;
    });
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = recentAppts.length;
    const confirmed = recentAppts.filter(a => a.status === 'confirmed').length;
    const completed = recentAppts.filter(a => a.status === 'completed').length;
    const sits = completed; // sat = completed
    const sitRate = total > 0 ? ((sits / total) * 100).toFixed(1) : '0';

    // Close rate: closed won / confirmed
    const closedWon = completed; // simplified: assume completed = closed
    const closeRate = confirmed > 0 ? ((closedWon / confirmed) * 100).toFixed(1) : '0';

    // Avg appointments per rep per week
    const fieldReps = consultants.filter(c => !c.isCloserOnly);
    const apptPerRepPerWeek = fieldReps.length > 0 ? (total / fieldReps.length / 4.3).toFixed(1) : '0';

    return { total, sits, sitRate, closeRate, apptPerRepPerWeek };
  }, [recentAppts]);

  // Conversion funnel data
  const funnel = useMemo(() => {
    const booked = recentAppts.length;
    const confirmed = recentAppts.filter(a => a.status === 'confirmed').length;
    const sat = recentAppts.filter(a => a.status === 'completed').length;
    const closedWon = recentAppts.filter(a => a.status === 'completed').length;

    return [
      { stage: 'Booked', count: booked, pct: 100, color: T.accent },
      { stage: 'Confirmed', count: confirmed, pct: booked > 0 ? ((confirmed / booked) * 100).toFixed(0) : 0, color: T.green },
      { stage: 'Sat', count: sat, pct: booked > 0 ? ((sat / booked) * 100).toFixed(0) : 0, color: T.purple },
      { stage: 'Closed Won', count: closedWon, pct: booked > 0 ? ((closedWon / booked) * 100).toFixed(0) : 0, color: T.cyan },
    ];
  }, [recentAppts]);

  // Lead source performance
  const leadSourceStats = useMemo(() => {
    const sources = ['paid', 'self_gen', 'get_the_referral', 'partner', 'inbound', 'retail', 'event'];
    return sources
      .map(source => {
        const appts = recentAppts.filter(a => a.leadSource === source);
        const count = appts.length;
        const confirmed = appts.filter(a => a.status === 'confirmed').length;
        const closed = appts.filter(a => a.status === 'completed').length;
        const sitRate = predictSitRate(source);
        const convRate = confirmed > 0 ? ((closed / confirmed) * 100).toFixed(0) : '0';

        return {
          source: source.replace(/_/g, ' '),
          count,
          sitRate: sitRate.toFixed(1),
          convRate,
          color: source === 'get_the_referral' ? T.green : source === 'paid' ? T.accent : T.cyan,
        };
      })
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [recentAppts]);

  // Top 5 performers by close rate
  const topPerformers = useMemo(() => {
    return consultants
      .filter(c => !c.isCloserOnly)
      .map(rep => {
        const stats = getRepOverallStats(rep.id, recentAppts);
        return {
          ...rep,
          closeRate: (stats.closeRate * 100).toFixed(1),
          sitRate: (stats.sitRate * 100).toFixed(1),
          appointmentCount: stats.appointmentCount,
        };
      })
      .sort((a, b) => parseFloat(b.closeRate) - parseFloat(a.closeRate))
      .slice(0, 5);
  }, [recentAppts]);

  // Territory stats
  const territoryStats = useMemo(() => {
    const selected = selectedRegions.length > 0 ? selectedRegions : Object.keys(TERRITORIES);
    return selected.map(code => {
      const terr = TERRITORIES[code];
      if (!terr) return null;

      const appts = recentAppts.filter(a => a.territory === code);
      const reps = consultants.filter(c => c.territories.includes(code) && !c.isCloserOnly);

      const closeRates = reps.map(rep => {
        const stats = getRepOverallStats(rep.id, recentAppts);
        return stats.closeRate;
      });
      const avgCloseRate = closeRates.length > 0
        ? (closeRates.reduce((a, b) => a + b, 0) / closeRates.length * 100).toFixed(1)
        : '0';

      return {
        code,
        name: terr.name,
        color: terr.color,
        apptCount: appts.length,
        repCount: reps.length,
        closeRate: avgCloseRate,
      };
    }).filter(Boolean);
  }, [selectedRegions, recentAppts]);

  return (
    <div style={{
      fontFamily: fonts.ui,
      backgroundColor: T.bg,
      color: T.text,
      padding: isMobile ? '16px' : '24px',
      minHeight: '100vh',
    }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '24px',
        color: T.accent,
      }}>
        Analytics Dashboard
      </h1>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[
          { label: 'Total Appointments (30d)', value: kpis.total },
          { label: 'Sit Rate %', value: kpis.sitRate },
          { label: 'Close Rate %', value: kpis.closeRate },
          { label: 'Avg Appts/Rep/Week', value: kpis.apptPerRepPerWeek },
        ].map((kpi, idx) => (
          <div key={idx} style={{
            backgroundColor: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{
              fontSize: '12px',
              color: T.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              fontFamily: fonts.data,
              color: T.accent,
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Conversion Funnel */}
      <div style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Conversion Funnel (Last 30 days)
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {funnel.map((stage, idx) => (
            <div key={idx}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '14px',
              }}>
                <span>{stage.stage}</span>
                <span style={{ fontFamily: fonts.data, fontWeight: '500' }}>
                  {stage.count} ({stage.pct}%)
                </span>
              </div>
              <div style={{
                height: '20px',
                backgroundColor: T.bg,
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${stage.pct}%`,
                  backgroundColor: stage.color,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By Lead Source */}
      <div style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        overflowX: 'auto',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Performance by Lead Source
        </h2>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          minWidth: isMobile ? '600px' : 'auto',
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: '600' }}>Source</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Appointments</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Sit Rate %</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Conversion %</th>
              <th style={{ padding: '10px 0', fontWeight: '600' }}></th>
            </tr>
          </thead>
          <tbody>
            {leadSourceStats.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '12px 0', textTransform: 'capitalize' }}>{row.source}</td>
                <td style={{ textAlign: 'right', padding: '12px 0', fontFamily: fonts.data }}>{row.count}</td>
                <td style={{ textAlign: 'right', padding: '12px 0', fontFamily: fonts.data }}>{row.sitRate}</td>
                <td style={{ textAlign: 'right', padding: '12px 0', fontFamily: fonts.data }}>{row.convRate}</td>
                <td style={{ padding: '12px 0', width: '80px' }}>
                  <div style={{
                    height: '6px',
                    backgroundColor: row.color,
                    borderRadius: '3px',
                    width: '100%',
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Performers */}
      <div style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        overflowX: 'auto',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Top 5 Performers by Close Rate
        </h2>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          minWidth: isMobile ? '700px' : 'auto',
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: '600' }}>Rank</th>
              <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: '600' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: '600' }}>Team</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Close %</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Sit %</th>
              <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: '600' }}>Appts</th>
            </tr>
          </thead>
          <tbody>
            {topPerformers.map((rep, idx) => (
              <tr key={rep.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '12px 0', fontWeight: '600', color: T.accent }}>{idx + 1}</td>
                <td style={{ padding: '12px 0' }}>{rep.name}</td>
                <td style={{ padding: '12px 0', color: T.muted, fontSize: '13px' }}>{rep.team}</td>
                <td style={{ textAlign: 'right', padding: '12px 0', fontFamily: fonts.data, fontWeight: '500' }}>
                  {rep.closeRate}%
                </td>
                <td style={{ textAlign: 'right', padding: '12px 0', fontFamily: fonts.data }}>{rep.sitRate}%</td>
                <td style={{ textAlign: 'right', padding: '12px 0', fontFamily: fonts.data }}>{rep.appointmentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By Territory */}
      <div style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '8px',
        padding: '20px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Territory Performance
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
        }}>
          {territoryStats.map(terr => (
            <div key={terr.code} style={{
              backgroundColor: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: '6px',
              padding: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: terr.color,
                  borderRadius: '50%',
                  marginRight: '8px',
                }} />
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{terr.name}</div>
              </div>
              <div style={{
                fontSize: '13px',
                color: T.muted,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}>
                <div>Appointments: <span style={{ color: T.text, fontFamily: fonts.data }}>{terr.apptCount}</span></div>
                <div>Reps: <span style={{ color: T.text, fontFamily: fonts.data }}>{terr.repCount}</span></div>
                <div>Close Rate: <span style={{ color: T.text, fontFamily: fonts.data }}>{terr.closeRate}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
