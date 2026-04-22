import React, { useState } from 'react';
import { Link, Copy, Check, ExternalLink } from 'lucide-react';
import { T, fonts, TERRITORIES } from '../data/theme.js';
import { getAllActivePartners, getBookingUrl } from '../data/partners.js';

export default function PartnerLinks({ onPreview }) {
  const partners = getAllActivePartners();
  const [copiedSlug, setCopiedSlug] = useState(null);

  const copyLink = (slug) => {
    const url = getBookingUrl(slug);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div style={{
      background: T.surface,
      borderRadius: '8px',
      padding: '20px',
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
          Partner Booking Links
        </h3>
        <span style={{ fontSize: '12px', color: T.muted }}>
          {partners.length} active
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {partners.map(partner => (
          <div
            key={partner.slug}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: T.bg,
              border: `1px solid ${T.border}`,
            }}
          >
            {/* Color dot + name */}
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: partner.brandColor, flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>{partner.name}</div>
              <div style={{ fontSize: '12px', color: T.muted, marginTop: '2px' }}>
                {partner.territories.map(t => TERRITORIES[t]?.name).join(', ')}
              </div>
            </div>

            {/* URL display */}
            <div style={{
              fontSize: '12px', color: T.dim, fontFamily: fonts.data,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '200px',
            }}>
              /book/{partner.slug}
            </div>

            {/* Actions */}
            <button
              onClick={() => copyLink(partner.slug)}
              title="Copy link"
              style={{
                background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '4px',
                padding: '6px', cursor: 'pointer', color: copiedSlug === partner.slug ? T.green : T.muted,
                display: 'flex', alignItems: 'center',
              }}
            >
              {copiedSlug === partner.slug ? <Check size={14} /> : <Copy size={14} />}
            </button>

            <button
              onClick={() => onPreview && onPreview(partner.slug)}
              title="Preview booking page"
              style={{
                background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '4px',
                padding: '6px', cursor: 'pointer', color: T.muted,
                display: 'flex', alignItems: 'center',
              }}
            >
              <ExternalLink size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
