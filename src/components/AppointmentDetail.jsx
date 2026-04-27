import React, { useState, useEffect } from 'react';
import { X, MapPin, Users, Clock, Video, Phone, Mail, Tag, Sun, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { T, fonts, APPOINTMENT_TYPES, APPOINTMENT_STATUSES, TERRITORIES } from '../data/theme.js';
import { getConsultantName, getConsultant, consultants } from '../data/mockData.js';
import { rankRepsForSlot } from '../data/slotSuggestionEngine.js';
import { getRepOverallStats } from '../data/repPerformance.js';
import TsrfBadge from './TsrfBadge.jsx';
import OwnerBadge from './OwnerBadge.jsx';
import NotesPanel from './NotesPanel.jsx';
import AuditLogPanel from './AuditLogPanel.jsx';
import { mockLeadScore } from '../data/leadScoring.js';

export default function AppointmentDetail({ appointment, onClose, onReassign, onCancel }) {
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
            <OwnerBadge appointment={appointment} variant="chip" />
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

        {/* Best Rep recommendation */}
        <BestRepPanel appointment={appointment} onReassign={onReassign} />

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

        {/* Property owner verification */}
        {appointment.address && (
          <Section title="Property Owner">
            <OwnerBadge appointment={appointment} variant="detail" />
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
              Source: Property records lookup. Verify the customer is the homeowner
              before the appointment — renters cannot sign solar agreements.
            </div>
          </Section>
        )}

        {/* Lead Score */}
        <Section title="Lead Score">
          <LeadScorePanel appointment={appointment} />
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <NotesPanel appointmentId={appointment.id} />
        </Section>

        {/* Audit Log */}
        <Section title="Activity Log">
          <AuditLogPanel appointmentId={appointment.id} />
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
        {onCancel && (
          <button
            onClick={() => onCancel(appointment)}
            style={{
              flex: 1, padding: '10px', borderRadius: '6px',
              background: 'transparent', border: `1px solid rgba(248,113,113,0.4)`,
              color: '#f87171', fontSize: '13px', cursor: 'pointer', fontFamily: fonts.ui,
            }}
          >
            Cancel / No-Show
          </button>
        )}
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

function LeadScorePanel({ appointment }) {
  const result = mockLeadScore(appointment);
  const { score, grade, color, factors } = result;

  return (
    <div>
      {/* Score header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '10px',
          background: `${color}20`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: '700', fontFamily: fonts.data, color,
        }}>
          {grade}
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: fonts.data, color }}>
            {score}
            <span style={{ fontSize: '13px', color: T.muted, fontWeight: '400' }}> / 100</span>
          </div>
          <div style={{ fontSize: '11px', color: T.muted }}>
            {score >= 85 ? 'Hot lead — prioritize this appointment' :
             score >= 70 ? 'Strong lead — good close probability' :
             score >= 55 ? 'Average lead — standard approach' :
             score >= 40 ? 'Below average — may need extra prep' :
             'Low score — verify qualification before appointment'}
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {factors.map(f => (
          <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '110px', fontSize: '11px', color: T.muted, flexShrink: 0 }}>
              {f.label}
            </div>
            <div style={{
              flex: 1, height: '6px', background: T.border, borderRadius: '3px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${f.score}%`, borderRadius: '3px',
                background: f.score >= 70 ? T.green : f.score >= 40 ? T.accent : T.red,
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ width: '28px', fontSize: '11px', fontFamily: fonts.data, color: T.muted, textAlign: 'right' }}>
              {f.score}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '10px', color: T.dim, marginTop: '8px' }}>
        Composite score based on: roof quality, home value, utility spend, owner tenure, credit, lead source, engagement, and deal velocity.
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

function BestRepPanel({ appointment, onReassign }) {
  const [ranked, setRanked] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointment) return;
    setLoading(true);
    rankRepsForSlot({
      date: appointment.date,
      slot: appointment.time,
      territory: appointment.territory,
      leadSource: appointment.leadSource || 'paid',
      customerZip: appointment.zipCode || '',
      customerCity: '',
      customerState: '',
      isVirtual: appointment.isVirtual || false,
      topN: 5,
    }).then(results => {
      setRanked(results);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [appointment?.id, appointment?.date, appointment?.time]);

  if (loading) {
    return (
      <Section title="Best Rep for This Appointment">
        <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>Analyzing reps...</div>
      </Section>
    );
  }

  if (!ranked || ranked.length === 0) {
    return (
      <Section title="Best Rep for This Appointment">
        <div style={{ fontSize: 12, color: T.muted }}>No eligible reps found for this slot.</div>
      </Section>
    );
  }

  const currentRepId = appointment.consultant;
  const currentRank = ranked.findIndex(r => r.repId === currentRepId);
  const bestRep = ranked[0];
  const isAlreadyBest = currentRepId === bestRep.repId;

  return (
    <Section title="Best Rep for This Appointment">
      {/* Current assignment status */}
      {isAlreadyBest ? (
        <div style={{
          padding: '8px 12px', borderRadius: '6px',
          background: T.greenDim, border: `1px solid ${T.green}40`,
          fontSize: 12, color: T.green, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Star size={12} /> Current rep is the top pick for this slot
        </div>
      ) : (
        <div style={{
          padding: '8px 12px', borderRadius: '6px',
          background: T.accentDim, border: `1px solid ${T.accent}40`,
          fontSize: 12, color: T.accent,
        }}>
          A better closer is available for this slot
          {currentRank >= 0 ? ` (current rep is #${currentRank + 1} of ${ranked.length})` : ''}
        </div>
      )}

      {/* Ranked rep list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {ranked.map((rep, i) => {
          const isCurrent = rep.repId === currentRepId;
          const stats = getRepOverallStats(rep.repId);
          return (
            <div
              key={rep.repId}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                background: isCurrent ? T.surfaceHover : T.bg,
                border: `1px solid ${i === 0 ? T.green + '40' : isCurrent ? T.accent + '40' : T.border}`,
              }}
            >
              {/* Rank */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i === 0 ? T.green : i === 1 ? T.accent : T.dim,
                color: T.bg, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fonts.data, flexShrink: 0,
              }}>
                {i + 1}
              </div>

              {/* Rep info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {rep.repName}
                  {isCurrent && (
                    <span style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>(current)</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.muted, display: 'flex', gap: 8, marginTop: 1 }}>
                  <span style={{ fontFamily: fonts.data, color: T.green }}>
                    {stats.closeRate}% close
                  </span>
                  <span style={{ fontFamily: fonts.data }}>
                    {stats.sitRate}% sit
                  </span>
                  <span style={{ fontFamily: fonts.data }}>
                    P(close) {rep.breakdown?.pClose}%
                  </span>
                </div>
                {rep.reasons && rep.reasons.length > 0 && (
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                    {rep.reasons.slice(0, 2).join(' · ')}
                  </div>
                )}
              </div>

              {/* Assign button */}
              {!isCurrent && onReassign && (
                <button
                  onClick={() => onReassign(appointment, rep.repId)}
                  style={{
                    background: i === 0 ? T.green : T.accent,
                    color: T.bg, border: 'none', borderRadius: 4,
                    padding: '5px 10px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: fonts.ui, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <ArrowRight size={10} /> Assign
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
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
