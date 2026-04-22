import React from 'react';
import { MapPin, Users, Video } from 'lucide-react';
import { T, fonts, APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from '../data/theme.js';
import { getConsultantName } from '../data/mockData.js';
import { getTsrfTier } from '../data/tsrf.js';
import TsrfBadge from './TsrfBadge.jsx';

export default function AppointmentCard({ appointment, compact = false, onClick }) {
  const typeInfo = APPOINTMENT_TYPES[appointment.type] || {};
  const statusInfo = APPOINTMENT_STATUSES[appointment.status] || {};
  const consultantName = getConsultantName(appointment.consultant);
  const designExpertName = getConsultantName(appointment.designExpert);

  const accentColor = appointment.status === 'confirmed' ? typeInfo.color : statusInfo.color;

  if (appointment.isPlaceholder) {
    return (
      <div
        onClick={onClick}
        style={{
          padding: compact ? '6px 8px' : '10px 12px',
          borderRadius: '6px',
          border: `1px dashed ${T.border}`,
          background: 'transparent',
          cursor: 'pointer',
          opacity: 0.5,
        }}
      >
        <span style={{ fontSize: '12px', color: T.dim, fontStyle: 'italic' }}>
          Placeholder slot
        </span>
      </div>
    );
  }

  const tsrfTier = getTsrfTier(appointment.tsrf);

  if (compact) {
    return (
      <div
        onClick={onClick}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          borderLeft: `3px solid ${accentColor}`,
          boxShadow: `inset 3px 0 0 ${tsrfTier.color}`,
          background: T.bg,
          cursor: 'pointer',
          fontSize: '12px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {appointment.customer}
          </span>
          <TsrfBadge tsrf={appointment.tsrf} variant="dot" />
        </div>
        <div style={{ color: T.muted, fontSize: '11px' }}>
          {consultantName || 'Unassigned'}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '6px',
        background: T.bg,
        border: `1px solid ${T.border}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderLight}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      {/* Accent bar — stacked: appointment status on the outer edge, TSRF tier just inside */}
      <div style={{ display: 'flex', gap: 2, alignSelf: 'stretch', flexShrink: 0 }}>
        <div style={{ width: '4px', background: accentColor, borderRadius: '2px' }} />
        <div
          style={{ width: '3px', background: tsrfTier.color, borderRadius: '2px', opacity: 0.9 }}
          title={`TSRF ${appointment.tsrf ?? '—'} · ${tsrfTier.label}`}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '500', fontSize: '14px' }}>{appointment.customer}</span>
          <TsrfBadge tsrf={appointment.tsrf} variant="compact" />
          <span style={{
            padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
            background: typeInfo.color, color: T.bg, fontWeight: '500',
          }}>
            {typeInfo.name}
          </span>
          {appointment.isVirtual && (
            <span style={{
              padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
              background: T.border, color: T.text, display: 'flex', alignItems: 'center', gap: '3px',
            }}>
              <Video size={10} /> Virtual
            </span>
          )}
        </div>

        {appointment.address && (
          <div style={{ fontSize: '13px', color: T.muted, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {appointment.address}
            </span>
          </div>
        )}

        <div style={{ fontSize: '13px', color: T.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Users size={12} style={{ flexShrink: 0 }} />
          {consultantName || 'Unassigned'}
          {designExpertName && <span> + {designExpertName}</span>}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500',
          background: statusInfo.color, color: T.bg,
        }}>
          {statusInfo.name}
        </div>
      </div>
    </div>
  );
}
