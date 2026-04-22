import React from 'react';
import { X, MapPin, Users, Clock, Video, Phone, Mail, Tag, Sun } from 'lucide-react';
import { T, fonts, APPOINTMENT_TYPES, APPOINTMENT_STATUSES, TERRITORIES } from '../data/theme.js';
import { getConsultantName, getConsultant } from '../data/mockData.js';
import TsrfBadge from './TsrfBadge.jsx';

export default function AppointmentDetail({ appointment, onClose }) {
  if (!appointment) return null;

  const typeInfo = APPOINTMENT_TYPES[appointment.type] || {};
  const statusInfo = APPOINTMENT_STATUSES[appointment.status] || {};
  const territory = TERRITORIES[appointment.territory] || {};
  const consultant = getConsultant(appointment.consultant);
  const designExpert = getConsultant(appointment.designExpert);

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: '400px',
      maxWidth: '100vw',
      background: T.surface,
      borderLeft: `1px solid ${T.border}`,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-8px 0 30px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            {appointment.customer}
          </h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
              background: typeInfo.color, color: T.bg, fontWeight: '500',
            }}>
              {typeInfo.name}
            </span>
            <span style={{
              padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
              background: statusInfo.color, color: T.bg, fontWeight: '500',
            }}>
              {statusInfo.name}
            </span>
            {appointment.isVirtual && (
              <span style={{
                padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
                background: T.border, color: T.text, display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <Video size={11} /> Virtual
              </span>
            )}
            <TsrfBadge tsrf={appointment.tsrf} variant="chip" />
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', color: T.muted,
            cursor: 'pointer', padding: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Schedule */}
        <Section title="Schedule">
          <DetailRow icon={<Clock size={14} />} label="Time" value={`${appointment.time} · ${typeInfo.duration || 90} min`} />
          <DetailRow icon={<Tag size={14} />} label="Territory" value={
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: territory.color, display: 'inline-block' }} />
              {territory.name} ({territory.code})
            </span>
          } />
        </Section>

        {/* Location */}
        {appointment.address && (
          <Section title="Location">
            <DetailRow icon={<MapPin size={14} />} label="Address" value={appointment.address} />
            <DetailRow icon={null} label="Zip Code" value={appointment.zipCode} mono />
          </Section>
        )}

        {/* Team */}
        <Section title="Assigned Team">
          <DetailRow icon={<Users size={14} />} label="Consultant" value={
            consultant ? (
              <span>
                {consultant.name}
                <span style={{ color: T.dim, fontSize: '12px', marginLeft: '6px' }}>
                  {consultant.position.replace(/_/g, ' ')}
                </span>
              </span>
            ) : 'Unassigned'
          } />
          {designExpert && (
            <DetailRow icon={<Users size={14} />} label="Design Expert" value={
              <span>
                {designExpert.name}
                {designExpert.isVirtualOnly && (
                  <span style={{ color: T.dim, fontSize: '12px', marginLeft: '6px' }}>virtual only</span>
                )}
              </span>
            } />
          )}
        </Section>

        {/* Google Meet link for virtual appointments */}
        {appointment.isVirtual && (
          <Section title="Virtual Meeting">
            <div style={{
              padding: '10px 12px', borderRadius: '6px',
              background: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.2)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <Video size={16} color="#4285F4" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: T.text }}>Google Meet</div>
                <div style={{ fontSize: '12px', color: T.muted, fontFamily: fonts.data }}>
                  meet.google.com/vh-{appointment.id}-mock
                </div>
              </div>
              <button
                onClick={() => {
                  const url = `https://meet.google.com/vh-${appointment.id}-mock`;
                  navigator.clipboard.writeText(url).catch(() => {});
                }}
                style={{
                  background: '#4285F4', border: 'none', borderRadius: '4px',
                  padding: '6px 12px', color: '#fff', fontSize: '12px',
                  fontWeight: '500', cursor: 'pointer', fontFamily: fonts.ui,
                }}
              >
                Copy link
              </button>
            </div>
          </Section>
        )}

        {/* Roof quality — Aurora TSRF */}
        <Section title="Roof Quality">
          <TsrfBadge tsrf={appointment.tsrf} variant="detail" />
          <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
            Source: Aurora project on the linked Salesforce opportunity.
            Higher TSRF = less shade, better economics, higher close probability.
          </div>
        </Section>

        {/* Lead info */}
        <Section title="Lead Info">
          <DetailRow icon={<Tag size={14} />} label="Source" value={appointment.leadSource || 'Unknown'} />
          <DetailRow icon={null} label="Appointment ID" value={appointment.id} mono />
        </Section>
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '16px 20px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        gap: '8px',
      }}>
        <button style={{
          flex: 1, padding: '10px', borderRadius: '6px',
          background: 'transparent', border: `1px solid ${T.border}`,
          color: T.text, fontSize: '13px', cursor: 'pointer', fontFamily: fonts.ui,
        }}>
          Reschedule
        </button>
        <button style={{
          flex: 1, padding: '10px', borderRadius: '6px',
          background: T.accent, border: 'none',
          color: T.bg, fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: fonts.ui,
        }}>
          Edit Details
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{
        margin: '0 0 10px 0', fontSize: '12px', fontWeight: '600',
        color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, mono = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      {icon && <span style={{ color: T.muted, marginTop: '2px', flexShrink: 0 }}>{icon}</span>}
      {!icon && <span style={{ width: '14px', flexShrink: 0 }} />}
      <div>
        <div style={{ fontSize: '11px', color: T.dim, marginBottom: '2px' }}>{label}</div>
        <div style={{
          fontSize: '14px', color: T.text,
          fontFamily: mono ? fonts.data : fonts.ui,
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}
