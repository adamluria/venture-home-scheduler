import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Users, Target, Sun, Cloud } from 'lucide-react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { forecastDemand, forecastWeek, forecastAllTerritories, predictSitRate, getSitRateTrend, estimateStaffingNeed, scoreTimeSlot, RAW_DATA } from '../data/forecastEngine.js';

export default function ForecastPanel({ currentDate, selectedRegions }) {
  const [activeTab, setActiveTab] = useState('demand');

  return (
    <div style={{
      background: T.surface,
      borderRadius: '8px',
      border: `1px solid ${T.border}`,
      overflow: 'hidden',
    }}>
      {/* Tab header */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${T.border}`,
      }}>
        {[
          { key: 'demand', label: 'Demand Forecast' },
          { key: 'sitrate', label: 'Sit Rate' },
          { key: 'staffing', label: 'Staffing' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none',
              background: activeTab === tab.key ? T.accentDim : 'transparent',
              color: activeTab === tab.key ? T.accent : T.muted,
              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              fontFamily: fonts.ui,
              borderBottom: activeTab === tab.key ? `2px solid ${T.accent}` : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {activeTab === 'demand' && <DemandTab date={currentDate} regions={selectedRegions} />}
        {activeTab === 'sitrate' && <SitRateTab />}
        {activeTab === 'staffing' && <StaffingTab date={currentDate} regions={selectedRegions} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DEMAND TAB
// ═══════════════════════════════════════════════════════════════
function DemandTab({ date, regions }) {
  const allTerr = useMemo(() => forecastAllTerritories(date), [date]);
  const weekData = useMemo(() => {
    const d = new Date(date + 'T12:00:00');
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    return forecastWeek(start.toISOString().split('T')[0], regions[0] || 'CT');
  }, [date, regions]);

  const month = new Date(date + 'T12:00:00').getMonth() + 1;
  const seasonal = RAW_DATA.SEASONALITY[month];
  const seasonLabel = seasonal > 1.1 ? 'Above avg' : seasonal < 0.9 ? 'Below avg' : 'Average';
  const seasonIcon = seasonal > 1.1 ? <Sun size={14} color={T.accent} /> : seasonal < 0.9 ? <Cloud size={14} color={T.muted} /> : <Minus size={14} color={T.muted} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Seasonal context */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', borderRadius: '6px', background: T.bg,
      }}>
        {seasonIcon}
        <span style={{ fontSize: '12px', color: T.muted }}>
          Season: <strong style={{ color: T.text }}>{seasonLabel}</strong> ({(seasonal * 100).toFixed(0)}% of avg)
        </span>
      </div>

      {/* Territory breakdown */}
      <div>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Expected appointments today
        </div>
        {Object.entries(allTerr.territories)
          .filter(([code]) => regions.includes(code))
          .sort((a, b) => b[1].expected - a[1].expected)
          .map(([code, data]) => (
            <TerritoryDemandRow key={code} code={code} data={data} />
          ))
        }
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0', borderTop: `1px solid ${T.border}`, marginTop: '4px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Total</span>
          <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: fonts.data, color: T.accent }}>
            {allTerr.totalExpected}
          </span>
        </div>
      </div>

      {/* Week sparkline */}
      <div>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          This week trend
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '60px' }}>
          {weekData.map((day, i) => {
            const maxVal = Math.max(...weekData.map(d => d.expected));
            const height = maxVal > 0 ? (day.expected / maxVal) * 50 : 10;
            const isToday = day.date === date;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  width: '100%', height: `${height}px`, borderRadius: '3px 3px 0 0',
                  background: isToday ? T.accent : T.borderLight,
                  transition: 'height 0.3s',
                }} />
                <span style={{
                  fontSize: '9px', color: isToday ? T.accent : T.dim,
                  fontFamily: fonts.data, fontWeight: isToday ? '700' : '400',
                }}>
                  {day.dow}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TerritoryDemandRow({ code, data }) {
  const terr = TERRITORIES[code];
  const trendIcon = data.trend > 0.05
    ? <TrendingUp size={12} color={T.green} />
    : data.trend < -0.05
      ? <TrendingDown size={12} color={T.red} />
      : <Minus size={12} color={T.dim} />;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: `1px solid ${T.bg}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: terr?.color || T.muted }} />
        <span style={{ fontSize: '12px' }}>{terr?.name || code}</span>
        {trendIcon}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: T.dim, fontFamily: fonts.data }}>{data.low}–{data.high}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: fonts.data, minWidth: '28px', textAlign: 'right' }}>
          {data.expected}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SIT RATE TAB
// ═══════════════════════════════════════════════════════════════
function SitRateTab() {
  const trend = useMemo(() => getSitRateTrend(), []);
  const categories = [
    { key: 'get_the_referral', label: 'Get the Referral', color: T.green },
    { key: 'inbound', label: 'Inbound / Website', color: T.accent },
    { key: 'paid', label: 'Paid Leads', color: T.cyan },
    { key: 'partner', label: 'Partners', color: T.purple },
    { key: 'self_gen', label: 'Self Gen / Canvass', color: T.pink },
    { key: 'retail', label: 'Retail (BJs, Ace)', color: T.muted },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Current trend */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: '6px', background: T.bg,
      }}>
        <div>
          <div style={{ fontSize: '11px', color: T.muted }}>Current Sit Rate</div>
          <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: fonts.data, color: T.accent }}>{trend.current}%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: T.muted }}>6mo trend</div>
          <div style={{
            fontSize: '14px', fontWeight: '600', fontFamily: fonts.data,
            color: trend.direction === 'improving' ? T.green : trend.direction === 'declining' ? T.red : T.muted,
            display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end',
          }}>
            {trend.direction === 'improving' ? <TrendingUp size={14} /> : trend.direction === 'declining' ? <TrendingDown size={14} /> : <Minus size={14} />}
            {trend.trend > 0 ? '+' : ''}{trend.trend}pp
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Sit rate by lead source
        </div>
        {categories.map(cat => {
          const data = predictSitRate(cat.key);
          return (
            <div key={cat.key} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 0', borderBottom: `1px solid ${T.bg}`,
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
              <span style={{ flex: 1, fontSize: '12px' }}>{cat.label}</span>
              {/* Bar */}
              <div style={{ width: '60px', height: '6px', background: T.bg, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${data.sitRate}%`, height: '100%', background: cat.color, borderRadius: '3px' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: fonts.data, minWidth: '38px', textAlign: 'right' }}>
                {data.sitRate}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Monthly trend mini chart */}
      <div>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Monthly trend
        </div>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '50px' }}>
          {Object.entries(trend.history).map(([month, rate], i) => {
            const minRate = Math.min(...Object.values(trend.history));
            const maxRate = Math.max(...Object.values(trend.history));
            const range = maxRate - minRate || 1;
            const height = ((rate - minRate) / range) * 40 + 10;
            return (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  width: '100%', height: `${height}px`, borderRadius: '2px 2px 0 0',
                  background: rate >= 33 ? T.green : rate >= 30 ? T.accent : T.red,
                  opacity: 0.7,
                }} />
                {i % 3 === 0 && (
                  <span style={{ fontSize: '8px', color: T.dim, fontFamily: fonts.data }}>
                    {month.slice(5)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAFFING TAB
// ═══════════════════════════════════════════════════════════════
function StaffingTab({ date, regions }) {
  const staffing = useMemo(() => {
    const results = {};
    for (const region of regions) {
      results[region] = estimateStaffingNeed(date, region);
    }
    return results;
  }, [date, regions]);

  const totalReps = Object.values(staffing).reduce((sum, s) => sum + s.repsNeeded, 0);
  const totalDemand = Object.values(staffing).reduce((sum, s) => sum + s.expectedDemand, 0);

  // Time slot scores
  const slots = ['9:00 AM', '11:30 AM', '2:00 PM', '5:00 PM', '7:00 PM'];
  const slotScores = slots.map(s => ({ time: s, ...scoreTimeSlot(s) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
      }}>
        <div style={{ padding: '10px', borderRadius: '6px', background: T.bg }}>
          <div style={{ fontSize: '11px', color: T.muted }}>Reps Needed</div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: fonts.data, color: T.accent }}>{totalReps}</div>
        </div>
        <div style={{ padding: '10px', borderRadius: '6px', background: T.bg }}>
          <div style={{ fontSize: '11px', color: T.muted }}>Expected Demand</div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: fonts.data }}>{Math.round(totalDemand)}</div>
        </div>
      </div>

      {/* Per-territory staffing */}
      <div>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Staffing by territory
        </div>
        {Object.entries(staffing)
          .sort((a, b) => b[1].repsNeeded - a[1].repsNeeded)
          .map(([code, data]) => {
            const terr = TERRITORIES[code];
            return (
              <div key={code} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: `1px solid ${T.bg}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: terr?.color || T.muted }} />
                  <span style={{ fontSize: '12px' }}>{terr?.name || code}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', color: T.dim, fontFamily: fonts.data }}>
                    {data.expectedSits} sits
                  </span>
                  <div style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '12px',
                    fontWeight: '600', fontFamily: fonts.data,
                    background: T.accentDim, color: T.accent,
                  }}>
                    {data.repsNeeded} reps
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Time slot heat */}
      <div>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Slot demand score
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {slotScores.map(slot => (
            <div key={slot.time} style={{
              flex: 1, padding: '8px 4px', borderRadius: '6px', background: T.bg, textAlign: 'center',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: '600', marginBottom: '4px',
                color: slot.label === 'High' ? T.green : slot.label === 'Medium' ? T.accent : T.muted,
              }}>
                {slot.score}
              </div>
              <div style={{ fontSize: '9px', color: T.dim, fontFamily: fonts.data }}>
                {slot.time.replace(':00 ', '')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
