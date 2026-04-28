import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle, Sun, Users } from 'lucide-react';
import { T, fonts, TIME_SLOTS, TERRITORIES, APPOINTMENT_TYPES } from '../data/theme.js';
import { getAppointmentsForDate, getWeekDates, getWeekStart, formatDateDisplay, getTodayString, consultants } from '../data/mockData.js';
import { getTerritorySlotSummary } from '../data/calendarService.js';

export default function BookingPage({ partner, onSubmit, onBack }) {
  const [step, setStep] = useState('date'); // date → time → details → confirm
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    zipCode: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const today = getTodayString();
  const [weekOffset, setWeekOffset] = useState(0);

  // Get 2 weeks of dates starting from today
  const weekStart = useMemo(() => {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() + (weekOffset * 7));
    return getWeekStart(d.toISOString().split('T')[0]);
  }, [today, weekOffset]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Filter to only future dates (today or later)
  const availableDates = weekDates.filter(d => d >= today);

  // Get available time slots using the calendar availability service
  const [slotSummaries, setSlotSummaries] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDate) { setSlotSummaries({}); return; }
    setLoadingSlots(true);
    // Fetch availability for each of the partner's territories, then merge
    const fetchAll = async () => {
      const merged = {};
      for (const territory of partner.territories) {
        try {
          const summary = await getTerritorySlotSummary(selectedDate, territory);
          for (const [slot, info] of Object.entries(summary)) {
            if (!merged[slot]) merged[slot] = { total: 0, available: 0, consultants: [], blocked: false };
            merged[slot].total += info.total;
            merged[slot].available += info.available;
            merged[slot].consultants.push(...(info.consultants || []));
            if (info.blocked) merged[slot].blocked = true;
          }
        } catch { /* skip failed territory */ }
      }
      setSlotSummaries(merged);
      setLoadingSlots(false);
    };
    fetchAll();
  }, [selectedDate, partner.territories.join(',')]);

  const availableSlots = useMemo(() => {
    return TIME_SLOTS.filter(slot => {
      const info = slotSummaries[slot];
      if (!info) return false;
      if (info.blocked) return false;
      return info.available > 0;
    });
  }, [slotSummaries]);

  const handleSubmit = () => {
    const booking = {
      partner: partner.slug,
      partnerName: partner.name,
      date: selectedDate,
      time: selectedTime,
      ...form,
      territories: partner.territories,
      createdAt: new Date().toISOString(),
    };
    onSubmit && onSubmit(booking);
    setSubmitted(true);
  };

  const brandColor = partner.brandColor || T.accent;

  // ─── Confirmation Screen ────────────────────────────────────
  if (submitted) {
    return (
      <PageWrapper brandColor={brandColor} partner={partner}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircle size={56} color={T.green} style={{ marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '600', color: T.text }}>
            Appointment Booked
          </h2>
          <p style={{ color: T.muted, fontSize: '15px', margin: '0 0 24px 0' }}>
            {form.customerName} is scheduled for {formatDateDisplay(selectedDate)} at {selectedTime}
          </p>
          <div style={{
            background: T.bg, borderRadius: '8px', padding: '16px',
            border: `1px solid ${T.border}`, textAlign: 'left', maxWidth: '360px', margin: '0 auto',
          }}>
            <DetailLine label="Customer" value={form.customerName} />
            <DetailLine label="Date" value={formatDateDisplay(selectedDate)} />
            <DetailLine label="Time" value={selectedTime} />
            <DetailLine label="Address" value={form.address || '—'} />
            <DetailLine label="Phone" value={form.phone} />
            <DetailLine label="Email" value={form.email || '—'} />
            <DetailLine label="Partner" value={partner.name} />
          </div>
          <p style={{ color: T.dim, fontSize: '13px', marginTop: '20px' }}>
            A confirmation will be sent to the customer. The Venture Home team will assign a consultant.
          </p>
        </div>
      </PageWrapper>
    );
  }

  // ─── Main Booking Flow ──────────────────────────────────────
  return (
    <PageWrapper brandColor={brandColor} partner={partner} onBack={onBack}>
      {/* Step indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
        {['Date', 'Time', 'Details'].map((label, i) => {
          const stepIndex = { date: 0, time: 1, details: 2 }[step];
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: isDone ? brandColor : isActive ? brandColor : T.border,
                color: isDone || isActive ? T.bg : T.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '600',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '13px', fontWeight: isActive ? '600' : '400',
                color: isActive ? T.text : T.muted,
              }}>
                {label}
              </span>
              {i < 2 && <div style={{ width: '24px', height: '1px', background: T.border, margin: '0 4px' }} />}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1: Pick Date ─────────────────────────────────── */}
      {step === 'date' && (
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '500', color: T.text }}>
            Choose a date
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}
              style={{ ...navBtn, opacity: weekOffset === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '14px', color: T.muted }}>
              {formatDateDisplay(weekDates[0])} — {formatDateDisplay(weekDates[6])}
            </span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 3}
              style={{ ...navBtn, opacity: weekOffset >= 3 ? 0.3 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
            {weekDates.map(date => {
              const isPast = date < today;
              const isSelected = date === selectedDate;
              const dayOfWeek = new Date(date + 'T12:00:00').getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <button
                  key={date}
                  disabled={isPast}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${brandColor}` : `1px solid ${T.border}`,
                    background: isSelected ? `${brandColor}15` : isPast ? T.bg : T.surface,
                    color: isPast ? T.dim : T.text,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    fontFamily: fonts.ui,
                    opacity: isPast ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: '12px', color: isSelected ? brandColor : T.muted, fontWeight: '500' }}>
                    {formatDateDisplay(date).split(',')[0]}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: fonts.data, marginTop: '4px' }}>
                    {new Date(date + 'T12:00:00').getDate()}
                  </div>
                  {isWeekend && <div style={{ fontSize: '10px', color: T.dim, marginTop: '2px' }}>No 7pm</div>}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              disabled={!selectedDate}
              onClick={() => setStep('time')}
              style={{ ...primaryBtn(brandColor), opacity: selectedDate ? 1 : 0.4 }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Pick Time ─────────────────────────────────── */}
      {step === 'time' && (
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '500', color: T.text }}>
            Available times for {formatDateDisplay(selectedDate)}
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: T.muted }}>
            Showing availability in {partner.territories.map(t => TERRITORIES[t]?.name).join(', ')}
          </p>

          {loadingSlots ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: '14px' }}>
              Checking availability...
            </div>
          ) : availableSlots.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: '14px' }}>
              No available slots on this date. Please choose another day.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableSlots.map(slot => {
                const isSelected = slot === selectedTime;
                const info = slotSummaries[slot];
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px', borderRadius: '8px',
                      border: isSelected ? `2px solid ${brandColor}` : `1px solid ${T.border}`,
                      background: isSelected ? `${brandColor}15` : T.surface,
                      color: T.text, cursor: 'pointer', fontFamily: fonts.ui, textAlign: 'left',
                    }}
                  >
                    <Clock size={16} color={isSelected ? brandColor : T.muted} />
                    <span style={{ fontSize: '15px', fontWeight: isSelected ? '600' : '400', fontFamily: fonts.data }}>
                      {slot}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: T.dim, marginLeft: 'auto' }}>
                      {info && (
                        <>
                          <Users size={12} />
                          {info.available} available
                        </>
                      )}
                      <span style={{ marginLeft: '8px' }}>90 min</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={() => setStep('date')} style={secondaryBtn}>Back</button>
            <button
              disabled={!selectedTime}
              onClick={() => setStep('details')}
              style={{ ...primaryBtn(brandColor), opacity: selectedTime ? 1 : 0.4 }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Customer Details ──────────────────────────── */}
      {step === 'details' && (
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '500', color: T.text }}>
            Customer details
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: T.muted }}>
            {formatDateDisplay(selectedDate)} at {selectedTime}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormField label="Customer Name *" value={form.customerName}
              onChange={v => setForm({ ...form, customerName: v })} placeholder="Last name or family name" brandColor={brandColor} />
            <FormField label="Phone *" value={form.phone}
              onChange={v => setForm({ ...form, phone: v })} placeholder="(555) 123-4567" brandColor={brandColor} />
            <FormField label="Email" value={form.email}
              onChange={v => setForm({ ...form, email: v })} placeholder="customer@email.com" brandColor={brandColor} />
            <FormField label="Address" value={form.address}
              onChange={v => setForm({ ...form, address: v })} placeholder="Street address" brandColor={brandColor} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField label="Zip Code" value={form.zipCode}
                onChange={v => setForm({ ...form, zipCode: v })} placeholder="06851" brandColor={brandColor} />
              <div />
            </div>
            <FormField label="Notes" value={form.notes}
              onChange={v => setForm({ ...form, notes: v })} placeholder="Any additional info..." multiline brandColor={brandColor} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button onClick={() => setStep('time')} style={secondaryBtn}>Back</button>
            <button
              disabled={!form.customerName || !form.phone}
              onClick={handleSubmit}
              style={{ ...primaryBtn(brandColor), opacity: form.customerName && form.phone ? 1 : 0.4 }}
            >
              Book Appointment
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

// ─── Layout wrapper ──────────────────────────────────────────────

function PageWrapper({ children, brandColor, partner, onBack }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: fonts.ui,
      color: T.text,
      display: 'flex',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sun size={22} color={brandColor} />
            <span style={{ fontSize: '18px', fontWeight: '600' }}>Venture Home</span>
          </div>
          <div style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
            background: `${brandColor}20`, color: brandColor, fontSize: '13px', fontWeight: '500',
          }}>
            Booking via {partner.name}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: T.surface,
          borderRadius: '12px',
          border: `1px solid ${T.border}`,
          padding: '28px',
        }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'transparent', border: 'none', color: T.muted,
              fontSize: '13px', cursor: 'pointer', textDecoration: 'underline',
            }}>
              ← Back to dashboard
            </button>
          )}
          <p style={{ color: T.dim, fontSize: '11px', marginTop: '12px' }}>
            Powered by VH Solar Scheduling
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared form / style helpers ─────────────────────────────────

function FormField({ label, value, onChange, placeholder, multiline = false, brandColor }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: T.muted }}>
        {label}
      </label>
      <Tag
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '6px',
          background: T.bg, border: `1px solid ${T.border}`,
          color: T.text, fontSize: '14px', fontFamily: fonts.ui,
          outline: 'none', boxSizing: 'border-box', resize: multiline ? 'vertical' : 'none',
        }}
        onFocus={e => e.target.style.borderColor = brandColor}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: '13px', color: T.muted }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '500' }}>{value}</span>
    </div>
  );
}

const navBtn = {
  background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px',
  padding: '6px 8px', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center',
};

function primaryBtn(color) {
  return {
    padding: '10px 24px', borderRadius: '6px', border: 'none',
    background: color, color: T.bg, fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', fontFamily: fonts.ui,
  };
}

const secondaryBtn = {
  padding: '10px 20px', borderRadius: '6px',
  background: 'transparent', border: `1px solid ${T.border}`,
  color: T.text, fontSize: '14px', cursor: 'pointer', fontFamily: fonts.ui,
};
