import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { T, fonts, TIME_SLOTS, APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from '../data/theme.js';
import { getAppointmentsForDate, formatDateFull, consultants, getConsultantName } from '../data/mockData.js';
import { getSlotAvailability } from '../data/calendarService.js';
import { scoreRepSlot } from '../data/slotSuggestionEngine.js';
import { getTsrfTier } from '../data/tsrf.js';
import TsrfBadge from './TsrfBadge.jsx';

/**
 * Day view with HTML5 drag-and-drop for rescheduling appointments.
 *
 * While dragging an appointment card, every slot row becomes a drop target.
 * As the cursor enters a slot, we synchronously compute:
 *   - P(close) for (existing rep × new slot)
 *   - Δ vs. the original slot (+x.y% / -x.y%)
 *   - Hard-conflict flags (rep busy? weekend 7pm? closer-only?)
 * …and render a small floating preview anchored to the hovered slot.
 *
 * On drop, we fire `onReschedule(apt, { newDate, newTime, preview })`.
 * The parent decides whether to commit or open a confirm dialog.
 */
export default function DraggableDayView({
  dateString,
  selectedRegions,
  onSelectAppointment,
  onReschedule,
  appointmentRenderer,
}) {
  const appointments = getAppointmentsForDate(dateString, selectedRegions);
  const [busyData, setBusyData] = useState(null);
  const [dragging, setDragging] = useState(null);       // the apt being dragged
  const [hoverSlot, setHoverSlot] = useState(null);      // slot currently under cursor
  const [preview, setPreview] = useState(null);         // live scored preview
  const containerRef = useRef(null);

  // Fetch availability for all consultants in selected regions
  useEffect(() => {
    const regionConsultants = consultants
      .filter(c => selectedRegions.includes(c.territory))
      .map(c => c.id);
    if (regionConsultants.length === 0) { setBusyData(null); return; }
    getSlotAvailability(dateString, regionConsultants).then(setBusyData).catch(() => setBusyData(null));
  }, [dateString, selectedRegions.join(',')]);

  const getSlotSummary = (slot) => {
    if (!busyData) return null;
    const ids = Object.keys(busyData);
    const total = ids.length;
    const busy = ids.filter(id => !busyData[id]?.[slot]?.available).length;
    return { total, busy, available: total - busy };
  };

  // Recompute preview when hoverSlot / dragging changes
  useEffect(() => {
    if (!dragging || !hoverSlot) { setPreview(null); return; }

    // Skip if same slot as original
    if (hoverSlot === dragging.time) { setPreview({ kind: 'same' }); return; }

    const rep = consultants.find(c => c.id === dragging.consultant);
    if (!rep) { setPreview({ kind: 'no-rep' }); return; }

    // Score new slot (same rep, same date — within-day reschedule)
    const newScored = scoreRepSlot({
      rep, dateString, timeSlot: hoverSlot,
      leadSource: dragging.leadSource || 'paid',
      customerZip: dragging.zipCode || '',
      isVirtual: dragging.isVirtual,
      tsrf: dragging.tsrf,
    });

    const oldScored = scoreRepSlot({
      rep, dateString, timeSlot: dragging.time,
      leadSource: dragging.leadSource || 'paid',
      customerZip: dragging.zipCode || '',
      isVirtual: dragging.isVirtual,
      tsrf: dragging.tsrf,
    });

    // Rep busy at new slot? (ignore the dragged apt itself)
    const repAvail = busyData?.[rep.id]?.[hoverSlot];
    const conflict =
      repAvail && repAvail.available === false
        ? 'Rep is already booked at this time'
        : null;

    const pNew = newScored.score;
    const pOld = oldScored.score || 1e-9;
    const deltaPct = ((pNew - pOld) / pOld) * 100;

    setPreview({
      kind: 'scored',
      blocked: newScored.blocked,
      reasons: newScored.reasons,
      pCloseNew: Math.round(pNew * 1000) / 10,
      pCloseOld: Math.round(pOld * 1000) / 10,
      deltaPct: Math.round(deltaPct * 10) / 10,
      conflict,
    });
  }, [dragging?.id, hoverSlot, busyData, dateString]);

  // ── Drag handlers ──
  const handleDragStart = (e, apt) => {
    setDragging(apt);
    try { e.dataTransfer.setData('text/plain', apt.id); } catch (_) {}
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd = () => {
    setDragging(null);
    setHoverSlot(null);
    setPreview(null);
  };
  const handleDragOverSlot = (e, slot) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoverSlot !== slot) setHoverSlot(slot);
  };
  const handleDropSlot = (e, slot) => {
    e.preventDefault();
    if (!dragging || !onReschedule) { handleDragEnd(); return; }
    if (slot === dragging.time) { handleDragEnd(); return; }
    onReschedule(dragging, { newDate: dateString, newTime: slot, preview });
    handleDragEnd();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 500, fontFamily: fonts.ui }}>
        {formatDateFull(dateString)}
        {dragging && (
          <span style={{
            marginLeft: 12, fontSize: 12, color: T.accent,
            fontWeight: 400, fontFamily: fonts.ui,
          }}>
            Drop on a slot to reschedule — Esc to cancel
          </span>
        )}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TIME_SLOTS.map(slot => {
          const slotAppointments = appointments.filter(a => a.time === slot);
          const summary = getSlotSummary(slot);
          const isHoveredDrop = dragging && hoverSlot === slot && slot !== dragging.time;

          return (
            <div
              key={slot}
              onDragOver={(e) => handleDragOverSlot(e, slot)}
              onDrop={(e) => handleDropSlot(e, slot)}
              style={{
                display: 'flex',
                minHeight: 80,
                borderBottom: `1px solid ${T.border}`,
                background: isHoveredDrop
                  ? (preview?.blocked || preview?.conflict ? 'rgba(248,113,113,0.06)' : T.accentDim)
                  : 'transparent',
                borderRadius: isHoveredDrop ? 6 : 0,
                outline: isHoveredDrop
                  ? `1px dashed ${preview?.blocked || preview?.conflict ? T.red : T.accent}`
                  : 'none',
                transition: 'background 0.1s',
                position: 'relative',
              }}
            >
              {/* Time + availability */}
              <div style={{ width: 80, paddingTop: 12, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.muted, fontFamily: fonts.data }}>
                  {slot}
                </div>
                {summary && (
                  <div style={{
                    marginTop: 4, fontSize: 10,
                    color: summary.available === 0 ? T.red : summary.available <= 2 ? T.accent : T.dim,
                    fontFamily: fonts.data,
                  }}>
                    {summary.available}/{summary.total} free
                  </div>
                )}
              </div>

              {/* Appointments */}
              <div style={{ flex: 1, padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slotAppointments.length > 0 ? (
                  slotAppointments.map(apt => {
                    const draggable = !apt.isPlaceholder;
                    const rendered = appointmentRenderer ? appointmentRenderer(apt) : (
                      <DefaultCard appointment={apt} />
                    );
                    return (
                      <div
                        key={apt.id}
                        draggable={draggable}
                        onDragStart={(e) => draggable && handleDragStart(e, apt)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectAppointment?.(apt)}
                        style={{
                          opacity: dragging?.id === apt.id ? 0.4 : 1,
                          cursor: draggable ? 'grab' : 'pointer',
                        }}
                      >
                        {rendered}
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '12px 16px',
                    color: summary && summary.available === 0 ? T.red : T.dim,
                    fontSize: 13, fontStyle: 'italic', borderRadius: 6,
                    border: `1px dashed ${summary && summary.available === 0 ? 'rgba(248,113,113,0.3)' : T.border}`,
                    background: summary && summary.available === 0 ? 'rgba(248,113,113,0.05)' : 'transparent',
                  }}>
                    {summary && summary.available === 0 ? 'All reps busy' : 'Available slot'}
                  </div>
                )}
              </div>

              {/* Hover preview */}
              {isHoveredDrop && preview && (
                <ConflictPreview preview={preview} draggingApt={dragging} toSlot={slot} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Floating preview card (anchored inside the slot row) ─────────
function ConflictPreview({ preview, draggingApt, toSlot }) {
  if (preview.kind === 'same' || preview.kind === 'no-rep') return null;

  const isBad = preview.blocked || preview.conflict;
  const deltaPositive = preview.deltaPct > 0;

  return (
    <div style={{
      position: 'absolute', right: 8, top: 6,
      background: T.surface, border: `1px solid ${isBad ? T.red + '60' : T.accent}`,
      borderRadius: 6, padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', gap: 4,
      fontFamily: fonts.ui, fontSize: 11, minWidth: 200, maxWidth: 260, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted }}>
        {draggingApt.time} <ArrowRight size={10} /> {toSlot}
      </div>

      {preview.conflict && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.red, fontWeight: 500 }}>
          <AlertTriangle size={11} /> {preview.conflict}
        </div>
      )}
      {preview.blocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.red, fontWeight: 500 }}>
          <AlertTriangle size={11} /> {preview.reasons?.[0] || 'Slot blocked'}
        </div>
      )}

      {!preview.blocked && !preview.conflict && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: fonts.data }}>
            <span style={{ color: T.text, fontWeight: 600 }}>{preview.pCloseNew}% close</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              color: deltaPositive ? T.green : T.red,
              fontSize: 10, fontWeight: 600,
            }}>
              {deltaPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {deltaPositive ? '+' : ''}{preview.deltaPct}%
            </span>
            <span style={{ color: T.muted, fontSize: 10 }}>vs. {preview.pCloseOld}%</span>
          </div>
          {preview.reasons && preview.reasons.length > 0 && (
            <div style={{ color: T.muted, fontSize: 10, lineHeight: 1.3 }}>
              {preview.reasons.slice(0, 2).join(' · ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Default card fallback — used if the parent doesn't supply a renderer.
function DefaultCard({ appointment }) {
  const typeInfo = APPOINTMENT_TYPES[appointment.type] || {};
  const statusInfo = APPOINTMENT_STATUSES[appointment.status] || {};
  const consultantName = getConsultantName(appointment.consultant);
  const color = appointment.status === 'confirmed' ? typeInfo.color : statusInfo.color;
  const tsrfTier = getTsrfTier(appointment.tsrf);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: 12, borderRadius: 6, background: T.bg,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', gap: 2, alignSelf: 'stretch', flexShrink: 0 }}>
        <div style={{ width: 4, background: color, borderRadius: 2 }} />
        <div
          style={{ width: 3, background: tsrfTier.color, borderRadius: 2, opacity: 0.9 }}
          title={`TSRF ${appointment.tsrf ?? '—'} · ${tsrfTier.label}`}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{appointment.customer}</span>
          <TsrfBadge tsrf={appointment.tsrf} variant="compact" />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
          {consultantName || 'Unassigned'}
        </div>
      </div>
    </div>
  );
}
