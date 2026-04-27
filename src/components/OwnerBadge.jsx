import React, { useState, useEffect } from 'react';
import { T, fonts } from '../data/theme.js';
import { lookupPropertyOwner, OWNER_MATCH_STATUS } from '../data/propertyService.js';

/**
 * OwnerBadge — shows property owner verification status.
 *
 * Variants:
 *   - 'chip'    (default) — pill with icon + short label
 *   - 'dot'     — 8px colored dot (for compact cards)
 *   - 'detail'  — full card with owner name, match reason, property info
 *
 * Automatically looks up owner data on mount (mock by default).
 */
export default function OwnerBadge({ appointment, variant = 'chip' }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointment?.address || !appointment?.customer) {
      setLoading(false);
      return;
    }

    lookupPropertyOwner({
      address: appointment.address,
      zipCode: appointment.zipCode || '',
      customerName: appointment.customer,
    }).then(r => {
      setResult(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [appointment?.id, appointment?.address, appointment?.customer]);

  if (loading) {
    if (variant === 'dot') return <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.dim }} />;
    return (
      <span style={{ fontSize: 11, color: T.dim, fontFamily: fonts.ui }}>
        Checking owner...
      </span>
    );
  }

  const status = result?.status || OWNER_MATCH_STATUS.unknown;

  // ── Dot variant ──
  if (variant === 'dot') {
    return (
      <div
        title={`Owner: ${status.label}${result?.ownerName ? ` (${result.ownerName})` : ''}`}
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: status.color, flexShrink: 0,
        }}
      />
    );
  }

  // ── Chip variant ──
  if (variant === 'chip') {
    return (
      <span
        title={`${status.label}${result?.comparison?.reason ? `: ${result.comparison.reason}` : ''}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 10,
          background: status.bg, color: status.color,
          fontSize: 11, fontWeight: 500, fontFamily: fonts.ui,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 10 }}>{status.icon}</span>
        {status.short}
      </span>
    );
  }

  // ── Detail variant ──
  if (variant === 'detail') {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 8,
        background: status.bg, border: `1px solid ${status.color}30`,
      }}>
        {/* Status header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: status.color, color: T.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
          }}>
            {status.icon}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: status.color }}>
              {status.label}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>
              {result?.comparison?.reason || 'No data available'}
            </div>
          </div>
        </div>

        {/* Owner details */}
        {result?.ownerName && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '6px 12px', fontSize: 12,
          }}>
            <div>
              <div style={{ color: T.dim, fontSize: 10, marginBottom: 1 }}>Property Owner</div>
              <div style={{ color: T.text, fontWeight: 500 }}>{result.ownerName}</div>
            </div>
            <div>
              <div style={{ color: T.dim, fontSize: 10, marginBottom: 1 }}>Customer Name</div>
              <div style={{ color: T.text, fontWeight: 500 }}>{result.customerName}</div>
            </div>
            {result.property?.ownerSince && (
              <div>
                <div style={{ color: T.dim, fontSize: 10, marginBottom: 1 }}>Owned Since</div>
                <div style={{ color: T.text, fontFamily: fonts.data }}>{result.property.ownerSince}</div>
              </div>
            )}
            {result.property?.propertyType && (
              <div>
                <div style={{ color: T.dim, fontSize: 10, marginBottom: 1 }}>Property Type</div>
                <div style={{ color: T.text }}>{result.property.propertyType}</div>
              </div>
            )}
            {result.property?.assessedValue && (
              <div>
                <div style={{ color: T.dim, fontSize: 10, marginBottom: 1 }}>Assessed Value</div>
                <div style={{ color: T.text, fontFamily: fonts.data }}>
                  ${(result.property.assessedValue / 1000).toFixed(0)}k
                </div>
              </div>
            )}
            {result.property?.yearBuilt && (
              <div>
                <div style={{ color: T.dim, fontSize: 10, marginBottom: 1 }}>Year Built</div>
                <div style={{ color: T.text, fontFamily: fonts.data }}>{result.property.yearBuilt}</div>
              </div>
            )}
          </div>
        )}

        {/* Mismatch warning */}
        {status.key === 'mismatch' && (
          <div style={{
            marginTop: 10, padding: '8px 10px', borderRadius: 6,
            background: T.redDim, border: `1px solid ${T.red}30`,
            fontSize: 12, color: T.red, lineHeight: 1.4,
          }}>
            <strong>Renter alert:</strong> The customer name does not match the property owner.
            The homeowner must be present to sign a solar agreement. Confirm ownership
            before the appointment.
          </div>
        )}

        {status.key === 'trust_llc' && (
          <div style={{
            marginTop: 10, padding: '8px 10px', borderRadius: 6,
            background: T.accentDim, border: `1px solid ${T.accent}30`,
            fontSize: 12, color: T.accent, lineHeight: 1.4,
          }}>
            <strong>Trust/LLC ownership:</strong> Property is held by an entity.
            The authorized signer must be present. May need additional documentation.
          </div>
        )}
      </div>
    );
  }

  return null;
}
