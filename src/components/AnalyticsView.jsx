import React, { useMemo, useState, useEffect } from 'react';
import { T, fonts, APPOINTMENT_STATUSES, TERRITORIES } from '../data/theme.js';
import { mockAppointments, consultants, getConsultantName } from '../data/mockData.js';
import { getRepOverallStats } from '../data/repPerformance.js';
import { predictSitRate } from '../data/forecastEngine.js';
import { RefreshCw, Database, BarChart3 } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Full analytics dashboard view
 * Two tabs: "In-App" (mock data) and "Salesforce Live" (real SFDC data)
 * Shows KPIs, conversion funnel, lead source performance, top performers, and territory stats
 */
export default function AnalyticsView({ selectedRegions = [] }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('app'); // 'app' | 'sfdc'

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
    const closedWon = recentAppts.filter(a => a.status === 'closed-won').length;
    const sits = completed + closedWon; // a closed-won deal was sat first
    const sitRate = total > 0 ? ((sits / total) * 100).toFixed(1) : '0';

    const closeRate = sits > 0 ? ((closedWon / sits) * 100).toFixed(1) : '0';

    // Avg appointments per rep per week
    const fieldReps = consultants.filter(c => !c.isCloserOnly);
    const apptPerRepPerWeek = fieldReps.length > 0 ? (total / fieldReps.length / 4.3).toFixed(1) : '0';

    return { total, sits, sitRate, closeRate, apptPerRepPerWeek };
  }, [recentAppts]);

  // Conversion funnel data
  const funnel = useMemo(() => {
    const booked = recentAppts.length;
    const confirmed = recentAppts.filter(a => a.status === 'confirmed').length;
    const closedWon = recentAppts.filter(a => a.status === 'closed-won').length;
    const sat = recentAppts.filter(a => a.status === 'completed').length + closedWon;

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
        const closed = appts.filter(a => a.status === 'closed-won').length;
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
      {/* Header + Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: T.accent, margin: 0 }}>
          Analytics Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '4px', background: T.surface, borderRadius: '8px', padding: '4px', border: `1px solid ${T.border}` }}>
          <button onClick={() => setTab('app')} style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: tab === 'app' ? T.accent : 'transparent',
            color: tab === 'app' ? T.bg : T.muted,
            fontSize: '13px', fontWeight: '600', fontFamily: fonts.ui,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <BarChart3 size={14} /> In-App
          </button>
          <button onClick={() => setTab('sfdc')} style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: tab === 'sfdc' ? T.accent : 'transparent',
            color: tab === 'sfdc' ? T.bg : T.muted,
            fontSize: '13px', fontWeight: '600', fontFamily: fonts.ui,
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Database size={14} /> Salesforce Live
          </button>
        </div>
      </div>

      {tab === 'sfdc' ? (
        <SfdcPerformanceDashboard isMobile={isMobile} selectedRegions={selectedRegions} />
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}

// ─── Salesforce Live Performance Dashboard ──────────────────────────

function SfdcPerformanceDashboard({ isMobile, selectedRegions }) {
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, repRes, sourceRes, setterRes, terrRes] = await Promise.all([
        fetch(`/api/sfdc/performance/summary?months=${months}`),
        fetch(`/api/sfdc/performance/by-rep?months=${months}`),
        fetch(`/api/sfdc/performance/by-source?months=${months}`),
        fetch(`/api/sfdc/performance/by-setter?months=${months}`),
        fetch(`/api/sfdc/performance/by-territory?months=${months}`),
      ]);

      // Check if SFDC is connected
      if (summaryRes.status === 401) {
        setError('not_connected');
        setLoading(false);
        return;
      }

      const [summary, byRep, bySource, bySetter, byTerritory] = await Promise.all([
        summaryRes.json(), repRes.json(), sourceRes.json(), setterRes.json(), terrRes.json(),
      ]);

      setData({ summary, byRep, bySource, bySetter, byTerritory });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [months]);

  // Not connected state
  if (error === 'not_connected') {
    return (
      <div style={{
        background: T.surface, borderRadius: '12px', border: `1px solid ${T.border}`,
        padding: '40px 20px', textAlign: 'center',
      }}>
        <Database size={40} color={T.muted} style={{ marginBottom: '16px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: T.text }}>Salesforce Not Connected</h3>
        <p style={{ color: T.muted, fontSize: '14px', margin: '0 0 20px' }}>
          Connect to Salesforce to see live performance data from your Appointment__c records.
        </p>
        <a href="/auth/salesforce" style={{
          display: 'inline-block', padding: '10px 24px', borderRadius: '6px',
          background: T.accent, color: T.bg, fontWeight: '600', fontSize: '14px',
          textDecoration: 'none', fontFamily: fonts.ui,
        }}>
          Connect Salesforce
        </a>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: T.muted }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <p>Loading Salesforce performance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: T.redDim, borderRadius: '8px', padding: '16px', color: T.red, fontSize: '14px' }}>
        Failed to load Salesforce data: {error}
        <button onClick={fetchData} style={{
          marginLeft: '12px', padding: '4px 12px', borderRadius: '4px',
          background: T.red, color: T.bg, border: 'none', cursor: 'pointer', fontSize: '13px',
        }}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const summary = data.summary?.appointments || {};
  const revenue = data.summary?.revenue || {};
  const totalAppts = summary.total_appts || 0;
  const sits = summary.sits || 0;
  const closed = summary.closed || 0;
  const noShows = summary.no_shows || 0;
  const sitRate = totalAppts > 0 ? ((sits / totalAppts) * 100).toFixed(1) : '0';
  const closeRate = sits > 0 ? ((closed / sits) * 100).toFixed(1) : '0';

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={months} onChange={e => setMonths(Number(e.target.value))} style={{
          padding: '8px 12px', borderRadius: '6px', background: T.surface, border: `1px solid ${T.border}`,
          color: T.text, fontSize: '13px', fontFamily: fonts.ui,
        }}>
          <option value={1}>Last 30 days</option>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
        <button onClick={fetchData} style={{
          padding: '8px 12px', borderRadius: '6px', background: 'transparent',
          border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: fonts.ui,
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
        {loading && <span style={{ fontSize: '12px', color: T.muted }}>Updating...</span>}
      </div>

      {/* SFDC KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '12px', marginBottom: '24px',
      }}>
        {[
          { label: 'Total Appointments', value: totalAppts, color: T.accent },
          { label: 'Sit Rate', value: `${sitRate}%`, color: T.green },
          { label: 'Close Rate', value: `${closeRate}%`, color: T.cyan },
          { label: 'No-Shows', value: noShows, color: T.red },
          { label: 'Revenue', value: revenue.revenue ? `$${(revenue.revenue / 1000).toFixed(0)}k` : '—', color: T.accent },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: T.surface, borderRadius: '8px', padding: '16px',
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: fonts.data, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Performance by Sales Rep */}
      <SfdcTable
        title="Performance by Sales Rep"
        records={data.byRep?.appointments || []}
        columns={[
          { key: 'rep', label: 'Rep', align: 'left' },
          { key: 'total_appts', label: 'Appts', align: 'right' },
          { key: 'sits', label: 'Sits', align: 'right' },
          { key: 'closed', label: 'Closed', align: 'right' },
          { key: 'no_shows', label: 'No Shows', align: 'right' },
          { key: '_sitRate', label: 'Sit %', align: 'right', compute: r => r.total_appts > 0 ? ((r.sits / r.total_appts) * 100).toFixed(1) + '%' : '—' },
          { key: '_closeRate', label: 'Close %', align: 'right', compute: r => r.sits > 0 ? ((r.closed / r.sits) * 100).toFixed(1) + '%' : '—' },
        ]}
        isMobile={isMobile}
      />

      {/* Performance by Lead Source */}
      <SfdcTable
        title="Performance by Lead Source"
        records={data.bySource?.records || []}
        columns={[
          { key: 'source', label: 'Source', align: 'left' },
          { key: 'total_appts', label: 'Appts', align: 'right' },
          { key: 'sits', label: 'Sits', align: 'right' },
          { key: 'closed', label: 'Closed', align: 'right' },
          { key: 'canceled', label: 'Canceled', align: 'right' },
          { key: '_sitRate', label: 'Sit %', align: 'right', compute: r => r.total_appts > 0 ? ((r.sits / r.total_appts) * 100).toFixed(1) + '%' : '—' },
          { key: '_closeRate', label: 'Close %', align: 'right', compute: r => r.sits > 0 ? ((r.closed / r.sits) * 100).toFixed(1) + '%' : '—' },
        ]}
        isMobile={isMobile}
      />

      {/* Performance by Setter */}
      <SfdcTable
        title="Performance by Setter"
        records={data.bySetter?.records || []}
        columns={[
          { key: 'setter_name', label: 'Setter', align: 'left' },
          { key: 'total_appts', label: 'Set', align: 'right' },
          { key: 'sits', label: 'Sat', align: 'right' },
          { key: 'closed', label: 'Closed', align: 'right' },
          { key: 'no_shows', label: 'No Shows', align: 'right' },
          { key: '_sitRate', label: 'Sit %', align: 'right', compute: r => r.total_appts > 0 ? ((r.sits / r.total_appts) * 100).toFixed(1) + '%' : '—' },
          { key: '_convRate', label: 'Set→Close %', align: 'right', compute: r => r.total_appts > 0 ? ((r.closed / r.total_appts) * 100).toFixed(1) + '%' : '—' },
        ]}
        isMobile={isMobile}
      />

      {/* Performance by Territory */}
      <SfdcTable
        title="Performance by Territory"
        records={data.byTerritory?.records || []}
        columns={[
          { key: 'territory', label: 'Territory', align: 'left' },
          { key: 'total_appts', label: 'Appts', align: 'right' },
          { key: 'sits', label: 'Sits', align: 'right' },
          { key: 'closed', label: 'Closed', align: 'right' },
          { key: 'canceled', label: 'Canceled', align: 'right' },
          { key: '_sitRate', label: 'Sit %', align: 'right', compute: r => r.total_appts > 0 ? ((r.sits / r.total_appts) * 100).toFixed(1) + '%' : '—' },
          { key: '_closeRate', label: 'Close %', align: 'right', compute: r => r.sits > 0 ? ((r.closed / r.sits) * 100).toFixed(1) + '%' : '—' },
        ]}
        isMobile={isMobile}
      />
    </div>
  );
}

// ─── Reusable SFDC data table ───────────────────────────────────────

function SfdcTable({ title, records, columns, isMobile }) {
  if (!records || records.length === 0) {
    return (
      <div style={{
        background: T.surface, borderRadius: '8px', border: `1px solid ${T.border}`,
        padding: '20px', marginBottom: '20px',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>{title}</h3>
        <p style={{ color: T.muted, fontSize: '13px', margin: 0 }}>No data available for this period.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: T.surface, borderRadius: '8px', border: `1px solid ${T.border}`,
      padding: '20px', marginBottom: '20px', overflowX: 'auto',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: isMobile ? '600px' : 'auto' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {columns.map(col => (
              <th key={col.key} style={{
                textAlign: col.align || 'left', padding: '8px 6px',
                fontWeight: '600', fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.3px',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '10px 6px',
                  textAlign: col.align || 'left',
                  fontFamily: col.align === 'right' ? fonts.data : fonts.ui,
                  fontWeight: col.key.startsWith('_') ? '500' : '400',
                  color: col.key.startsWith('_') ? T.accent : T.text,
                }}>
                  {col.compute ? col.compute(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
