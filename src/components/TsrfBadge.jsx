import React from 'react';
import { Sun, HelpCircle } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import { getTsrfTier } from '../data/tsrf.js';

/**
 * Small TSRF pill — renders a sun icon, the % value, and a tier color.
 *
 * Variants:
 *   - "chip"     (default) full pill with label + value — good for list cards
 *   - "dot"      minimal colored dot only — good for dense grids
 *   - "compact"  value only, no label — good when a card is cramped
 *   - "detail"   bigger card-style — good for the AppointmentDetail drawer
 *
 * Pass `tsrf` as a number (0-100) or null/undefined for "not run yet".
 */
export default function TsrfBadge({ tsrf, variant = 'chip' }) {
  const tier = getTsrfTier(tsrf);
  const hasValue = tsrf !== null && tsrf !== undefined && !Number.isNaN(Number(tsrf));
  const valueLabel = hasValue ? `${Math.round(Number(tsrf))}%` : '—';

  if (variant === 'dot') {
    return (
      <span
        title={`TSRF ${valueLabel} · ${tier.label}`}
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 4,
          background: tier.color,
          flexShrink: 0,
        }}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <span
        title={`TSRF ${valueLabel} · ${tier.label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 6px',
          borderRadius: 10,
          background: tier.bg,
          border: `1px solid ${tier.color}40`,
          color: tier.color,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: fonts.data,
          whiteSpace: 'nowrap',
        }}
      >
        {hasValue ? <Sun size={9} /> : <HelpCircle size={9} />}
        {valueLabel}
      </span>
    );
  }

  if (variant === 'detail') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 8,
          background: tier.bg,
          border: `1px solid ${tier.color}40`,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          background: tier.color, color: T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {hasValue ? <Sun size={18} /> : <HelpCircle size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: tier.color,
            fontFamily: fonts.data, lineHeight: 1,
          }}>
            {valueLabel}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
            {tier.label} · Aurora avg TSRF
          </div>
        </div>
      </div>
    );
  }

  // Default: "chip"
  return (
    <span
      title={`Average TSRF from Aurora · ${tier.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 11,
        background: tier.bg,
        border: `1px solid ${tier.color}40`,
        color: tier.color,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: fonts.ui,
        whiteSpace: 'nowrap',
      }}
    >
      {hasValue ? <Sun size={10} /> : <HelpCircle size={10} />}
      <span style={{ fontFamily: fonts.data }}>{valueLabel}</span>
      <span style={{ color: tier.color, opacity: 0.85, fontSize: 10, fontWeight: 500 }}>
        {tier.short}
      </span>
    </span>
  );
}
