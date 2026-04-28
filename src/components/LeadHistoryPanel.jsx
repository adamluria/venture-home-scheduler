// LeadHistoryPanel.jsx
//
// Renders the full Salesforce interaction history for a customer matched by
// phone number. Hits /api/sfdc/customer-history?phone=... and lays out:
//   - Top-level summary (X prior leads · Y opps · Z calls · first/last contact)
//   - Prior leads with description excerpt and status
//   - Opportunities with stage and outcome
//   - Calls (Tasks where Type='Call' or has CallDurationInSeconds) — the
//     "transcripts" surface; SF Task.Description holds the call notes
//   - Other Tasks (non-call activities)
//   - Events (meetings)
//   - Notes (ContentNote + legacy Note)
//
// Used inline by LeadPicker (expanded result row). Self-loads on mount.

import React, { useEffect, useState, useMemo } from 'react';
import {
  Phone, Mail, MapPin, Calendar, FileText, User, Briefcase,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { T, fonts } from '../data/theme.js';

export default function LeadHistoryPanel({ phone, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!phone) return;
    setLoading(true);
    setError(null);
    fetch(`/api/sfdc/customer-history?phone=${encodeURIComponent(phone)}`)
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) throw new Error('Connect Salesforce to view full history');
          if (r.status === 400) throw new Error('Phone number too short');
          throw new Error(`Lookup failed (${r.status})`);
        }
        return r.json();
      })
      .then(setData)
      .catch(err => setError(err.message || 'Lookup failed'))
      .finally(() => setLoading(false));
  }, [phone]);

  if (loading) {
    return <Container><Muted>Loading customer history…</Muted></Container>;
  }
  if (error) {
    return (
      <Container>
        <Row><AlertCircle size={14} style={{ color: '#EF4444' }} /><span style={{ color: '#EF4444', fontSize: '13px' }}>{error}</span></Row>
      </Container>
    );
  }
  if (!data) return null;

  const { summary, leads, opportunities, tasks, events, notes } = data;
  const calls = tasks.filter(t => t.isCall);
  const otherTasks = tasks.filter(t => !t.isCall);

  // Empty state — phone matched zero records in SF
  if (summary.leadCount === 0 && summary.contactCount === 0) {
    return (
      <Container>
        <Muted>No prior Salesforce records found for this phone.</Muted>
      </Container>
    );
  }

  return (
    <Container>
      <SummaryBar summary={summary} />

      {leads.length > 0 && (
        <Section title={`Prior Leads (${leads.length})`} icon={User}>
          {leads.map(l => <LeadRow key={l.id} lead={l} />)}
        </Section>
      )}

      {opportunities.length > 0 && (
        <Section title={`Opportunities (${opportunities.length})`} icon={Briefcase}>
          {opportunities.map(o => <OppRow key={o.id} opp={o} />)}
        </Section>
      )}

      {calls.length > 0 && (
        <Section title={`Calls (${calls.length})`} icon={Phone}>
          {calls.slice(0, 8).map(t => <TaskRow key={t.id} task={t} />)}
          {calls.length > 8 && <Muted>+ {calls.length - 8} older calls</Muted>}
        </Section>
      )}

      {events.length > 0 && (
        <Section title={`Meetings (${events.length})`} icon={Calendar}>
          {events.slice(0, 6).map(e => <EventRow key={e.id} event={e} />)}
          {events.length > 6 && <Muted>+ {events.length - 6} older meetings</Muted>}
        </Section>
      )}

      {notes.length > 0 && (
        <Section title={`Notes (${notes.length})`} icon={FileText}>
          {notes.slice(0, 6).map(n => <NoteRow key={n.id} note={n} />)}
          {notes.length > 6 && <Muted>+ {notes.length - 6} older notes</Muted>}
        </Section>
      )}

      {otherTasks.length > 0 && (
        <Section title={`Other Activity (${otherTasks.length})`} icon={Clock}>
          {otherTasks.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}
    </Container>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sections / rows
// ═══════════════════════════════════════════════════════════════════

function SummaryBar({ summary }) {
  const chips = [
    summary.leadCount    && `${summary.leadCount} lead${summary.leadCount === 1 ? '' : 's'}`,
    summary.oppCount     && `${summary.oppCount} opp${summary.oppCount === 1 ? '' : 's'}`,
    summary.callCount    && `${summary.callCount} call${summary.callCount === 1 ? '' : 's'}`,
    summary.eventCount   && `${summary.eventCount} meeting${summary.eventCount === 1 ? '' : 's'}`,
    summary.noteCount    && `${summary.noteCount} note${summary.noteCount === 1 ? '' : 's'}`,
  ].filter(Boolean);

  return (
    <div style={{
      padding: '10px 12px', borderRadius: '6px',
      background: T.accentDim, marginBottom: '12px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{
        fontSize: '13px', fontWeight: 600, color: T.accent, fontFamily: fonts.ui,
        display: 'flex', flexWrap: 'wrap', gap: '8px',
      }}>
        {chips.map((c, i) => (
          <span key={i}>{c}{i < chips.length - 1 ? ' ·' : ''}</span>
        ))}
      </div>
      {(summary.firstContact || summary.lastContact) && (
        <div style={{ fontSize: '11px', color: T.muted, fontFamily: fonts.mono }}>
          {summary.firstContact && <>First contact: {fmtDate(summary.firstContact)}</>}
          {summary.firstContact && summary.lastContact && ' · '}
          {summary.lastContact && <>Last contact: {fmtDate(summary.lastContact)} ({relativeAgo(summary.lastContact)})</>}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 600, color: T.text,
          fontFamily: fonts.ui, textTransform: 'uppercase', letterSpacing: '0.5px',
          cursor: 'pointer', userSelect: 'none', padding: '4px 0',
        }}
      >
        {Icon && <Icon size={12} style={{ color: T.muted }} />}
        <span style={{ flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={12} style={{ color: T.muted }} /> : <ChevronDown size={12} style={{ color: T.muted }} />}
      </div>
      {open && <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>}
    </div>
  );
}

function LeadRow({ lead }) {
  const status = (lead.status || '').toLowerCase();
  const statusColor = lead.isConverted ? '#10B981'
                    : status.includes('lost') || status.includes('disqualif') ? '#EF4444'
                    : status.includes('working') || status.includes('contact') ? T.accent
                    : T.muted;
  return (
    <RowCard>
      <RowHeader
        left={<>{fmtDate(lead.createdDate)} · {lead.source || 'unknown source'}</>}
        right={<Pill color={statusColor}>{lead.isConverted ? 'CONVERTED' : (lead.status || '—').toUpperCase()}</Pill>}
      />
      {lead.ownerName && <RowMeta>Owner: {lead.ownerName}</RowMeta>}
      {lead.description && <RowBody>{lead.description}</RowBody>}
    </RowCard>
  );
}

function OppRow({ opp }) {
  const stage = (opp.stage || '').toLowerCase();
  const stageColor = opp.isWon ? '#10B981'
                   : opp.isClosed ? '#EF4444'
                   : stage.includes('proposal') || stage.includes('negotiation') ? T.accent
                   : T.muted;
  return (
    <RowCard>
      <RowHeader
        left={
          <>
            {fmtDate(opp.createdDate)}
            {opp.amount != null && <> · ${Math.round(opp.amount).toLocaleString()}</>}
          </>
        }
        right={<Pill color={stageColor}>{opp.isWon ? 'WON' : opp.isClosed ? 'LOST' : (opp.stage || '—').toUpperCase()}</Pill>}
      />
      <RowMeta>{opp.name}{opp.ownerName ? ` · Owner: ${opp.ownerName}` : ''}</RowMeta>
      {opp.description && <RowBody>{opp.description}</RowBody>}
    </RowCard>
  );
}

function TaskRow({ task }) {
  const isCall = task.isCall;
  const subject = task.subject || (isCall ? 'Call' : 'Task');
  const dur = task.callDurationSeconds ? `${Math.round(task.callDurationSeconds / 60)} min` : null;
  return (
    <RowCard>
      <RowHeader
        left={
          <>
            {fmtDate(task.activityDate || task.createdDate)}
            {dur && <> · {dur}</>}
            {task.callDisposition && <> · {task.callDisposition}</>}
          </>
        }
        right={task.ownerName ? <RowMeta>{task.ownerName}</RowMeta> : null}
      />
      <RowMeta>{subject}{task.callType ? ` · ${task.callType}` : ''}</RowMeta>
      {task.description && <RowBody>{task.description}</RowBody>}
    </RowCard>
  );
}

function EventRow({ event }) {
  return (
    <RowCard>
      <RowHeader
        left={fmtDateTime(event.activityDateTime || event.activityDate)}
        right={event.ownerName ? <RowMeta>{event.ownerName}</RowMeta> : null}
      />
      <RowMeta>{event.subject || 'Meeting'}{event.location ? ` · ${event.location}` : ''}</RowMeta>
      {event.description && <RowBody>{event.description}</RowBody>}
    </RowCard>
  );
}

function NoteRow({ note }) {
  return (
    <RowCard>
      <RowHeader
        left={fmtDate(note.createdDate)}
        right={note.ownerName ? <RowMeta>{note.ownerName}</RowMeta> : null}
      />
      <RowMeta style={{ fontWeight: 600 }}>{note.title || 'Untitled note'}</RowMeta>
      {note.preview && <RowBody>{note.preview}</RowBody>}
    </RowCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tiny presentational primitives
// ═══════════════════════════════════════════════════════════════════

function Container({ children }) {
  return (
    <div style={{
      padding: '10px 12px', background: T.bg,
      borderTop: `1px solid ${T.border}`,
      maxHeight: '480px', overflowY: 'auto',
      fontFamily: fonts.ui,
    }}>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{children}</div>;
}

function Muted({ children }) {
  return <div style={{ fontSize: '12px', color: T.muted, fontFamily: fonts.ui, padding: '2px 0' }}>{children}</div>;
}

function RowCard({ children }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: '4px',
      background: T.surface, border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: '3px',
    }}>
      {children}
    </div>
  );
}

function RowHeader({ left, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <div style={{ fontSize: '11px', color: T.muted, fontFamily: fonts.mono }}>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function RowMeta({ children, style }) {
  return <div style={{ fontSize: '12px', color: T.text, fontFamily: fonts.ui, ...(style || {}) }}>{children}</div>;
}

function RowBody({ children }) {
  return (
    <div style={{
      fontSize: '12px', color: T.muted, fontFamily: fonts.ui,
      lineHeight: '1.4', marginTop: '2px',
      display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

function Pill({ color, children }) {
  return (
    <span style={{
      fontSize: '9px', fontFamily: fonts.ui, fontWeight: 600,
      color, background: 'transparent', border: `1px solid ${color}`,
      padding: '1px 6px', borderRadius: '8px',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Date helpers
// ═══════════════════════════════════════════════════════════════════

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function relativeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
