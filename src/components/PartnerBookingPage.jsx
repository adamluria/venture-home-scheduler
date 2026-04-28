import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle, Users, Search, Loader } from 'lucide-react';
import { fonts, TIME_SLOTS, TERRITORIES } from '../data/theme.js';
import { getAppointmentsForDate, getWeekDates, getWeekStart, formatDateDisplay, getTodayString } from '../data/mockData.js';
import { getTerritorySlotSummary } from '../data/calendarService.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Partner lead booking page — light customer-facing theme with partner branding.
 * Designed to be easy to duplicate: just add a new entry to partners.js.
 * Includes optional Salesforce lookup by phone/email.
 *
 * Route: #/book/:partner-slug
 */

// ─── Light theme tokens ─────────────────────────────────────────────
const L = {
  bg: '#F7FAFC',
  surface: '#FFFFFF',
  text: '#1A202C',
  muted: '#718096',
  dim: '#A0AEC0',
  border: '#E2E8F0',
  danger: '#E53E3E',
};

export default function PartnerBookingPage({ partner, onSubmit, onBack }) {
  const isMobile = useIsMobile();
  const brandColor = partner.brandColor || '#F0A830';

  const [step, setStep] = useState('info'); // info → date → time → confirm
  const [form, setForm] = useState({
    customerName: '', phone: '', email: '',
    address: '', city: '', state: '', zipCode: '', notes: '',
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // SFDC lookup state
  const [sfdcMatch, setSfdcMatch] = useState(null); // { type: 'lead'|'contact', id, ... }
  const [sfdcSearching, setSfdcSearching] = useState(false);
  const [sfdcSearchDone, setSfdcSearchDone] = useState(false);

  // Date navigation
  const today = getTodayString();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() + (weekOffset * 7));
    return getWeekStart(d.toISOString().split('T')[0]);
  }, [today, weekOffset]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Slot availability
  const [slotSummaries, setSlotSummaries] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDate) { setSlotSummaries({}); return; }
    setLoadingSlots(true);
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

  // ─── SFDC Lookup ────────────────────────────────────────────────
  const doSfdcLookup = async () => {
    if (!form.phone && !form.email) return;
    setSfdcSearching(true);
    setSfdcSearchDone(false);
    try {
      const params = new URLSearchParams();
      if (form.phone) params.set('phone', form.phone);
      if (form.email) params.set('email', form.email);
      const res = await fetch(`/api/sfdc/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        // Prefer Lead match, fall back to Contact
        const match = (data.leads && data.leads[0]) || (data.contacts && data.contacts[0]) || null;
        if (match) {
          setSfdcMatch(match);
          // Auto-fill form fields from SFDC match
          setForm(prev => ({
            ...prev,
            customerName: match.name || prev.customerName,
            phone: match.phone || prev.phone,
            email: match.email || prev.email,
            address: match.address || prev.address,
            city: match.city || prev.city,
            state: match.state || prev.state,
            zipCode: match.zip || prev.zipCode,
          }));
        } else {
          setSfdcMatch(null);
        }
      }
    } catch (err) {
      console.warn('SFDC lookup failed (non-blocking):', err);
    } finally {
      setSfdcSearching(false);
      setSfdcSearchDone(true);
    }
  };

  // ─── Submit ─────────────────────────────────────────────────────
  const handleSubmit = () => {
    const booking = {
      partner: partner.slug,
      partnerName: partner.name,
      customer: form.customerName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      notes: form.notes,
      date: selectedDate,
      time: selectedTime,
      territories: partner.territories,
      leadSource: partner.slug,
      sfdcLeadId: sfdcMatch?.type === 'lead' ? sfdcMatch.id : '',
      sfdcContactId: sfdcMatch?.type === 'contact' ? sfdcMatch.id : '',
      createdAt: new Date().toISOString(),
    };
    onSubmit && onSubmit(booking);
    setSubmitted(true);
  };

  const canProceedFromInfo = form.customerName && form.phone;

  // ─── Confirmation Screen ────────────────────────────────────────
  if (submitted) {
    return (
      <PageShell partner={partner} brandColor={brandColor} isMobile={isMobile}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircle size={56} color="#38A169" style={{ marginBottom: '16px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '600', color: L.text }}>
            Appointment Booked!
          </h2>
          <p style={{ color: L.muted, fontSize: '15px', margin: '0 0 24px' }}>
            {form.customerName} is scheduled for {formatDateDisplay(selectedDate)} at {selectedTime}
          </p>
          <SummaryCard form={form} selectedDate={selectedDate} selectedTime={selectedTime} partner={partner} brandColor={brandColor} />
          <p style={{ color: L.dim, fontSize: '13px', marginTop: '20px' }}>
            A confirmation will be sent to the customer. The Venture Home team will assign a consultant.
          </p>
        </div>
      </PageShell>
    );
  }

  // ─── Step indicators ────────────────────────────────────────────
  const steps = ['Info', 'Date', 'Time', 'Confirm'];
  const stepIndex = { info: 0, date: 1, time: 2, confirm: 3 }[step];

  return (
    <PageShell partner={partner} brandColor={brandColor} isMobile={isMobile} onBack={onBack}>
      {/* Step indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {steps.map((label, i) => {
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: isDone ? brandColor : isActive ? brandColor : L.border,
                color: isDone || isActive ? '#fff' : L.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '600',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              {!isMobile && (
                <span style={{
                  fontSize: '13px', fontWeight: isActive ? '600' : '400',
                  color: isActive ? L.text : L.muted,
                }}>
                  {label}
                </span>
              )}
              {i < steps.length - 1 && <div style={{ width: '16px', height: '1px', background: L.border, margin: '0 2px' }} />}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1: Customer Info ────────────────────────────── */}
      {step === 'info' && (
        <div>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: L.text }}>
            Customer Information
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <LightField label="Customer Name" required value={form.customerName}
              onChange={v => setForm({ ...form, customerName: v })} placeholder="Full name" />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
              <LightField label="Phone" required value={form.phone}
                onChange={v => setForm({ ...form, phone: v })} placeholder="(555) 123-4567" type="tel" />
              <LightField label="Email" value={form.email}
                onChange={v => setForm({ ...form, email: v })} placeholder="customer@email.com" type="email" />
            </div>
            <LightField label="Address" value={form.address}
              onChange={v => setForm({ ...form, address: v })} placeholder="Street address" />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '14px' }}>
              <LightField label="City" value={form.city}
                onChange={v => setForm({ ...form, city: v })} placeholder="City" />
              <LightField label="State" value={form.state}
                onChange={v => setForm({ ...form, state: v })} placeholder="ST" />
              <LightField label="ZIP" value={form.zipCode}
                onChange={v => setForm({ ...form, zipCode: v })} placeholder="06851" />
            </div>
            <LightField label="Notes" value={form.notes}
              onChange={v => setForm({ ...form, notes: v })} placeholder="Any additional info..." multiline />
          </div>

          {/* SFDC Lookup Section */}
          <div style={{
            marginTop: '20px', padding: '14px', borderRadius: '8px',
            background: '#EBF8FF', border: '1px solid #BEE3F8',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Search size={14} color="#3182CE" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#2B6CB0' }}>Salesforce Lookup</span>
            </div>
            {sfdcSearching ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: L.muted }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Searching Salesforce...
              </div>
            ) : sfdcMatch ? (
              <div style={{ fontSize: '13px', color: '#2B6CB0' }}>
                Found: <strong>{sfdcMatch.name}</strong> ({sfdcMatch.type === 'lead' ? 'Lead' : 'Contact'})
                {sfdcMatch.source && <span> — Source: {sfdcMatch.source}</span>}
              </div>
            ) : sfdcSearchDone ? (
              <div style={{ fontSize: '13px', color: L.muted }}>
                No existing record found. A new Lead will be created.
              </div>
            ) : (
              <button
                onClick={doSfdcLookup}
                disabled={!form.phone && !form.email}
                style={{
                  padding: '6px 14px', borderRadius: '4px', fontSize: '13px',
                  background: (form.phone || form.email) ? '#3182CE' : L.border,
                  color: (form.phone || form.email) ? '#fff' : L.muted,
                  border: 'none', cursor: (form.phone || form.email) ? 'pointer' : 'not-allowed',
                  fontFamily: fonts.ui,
                }}
              >
                Search by phone/email
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            {onBack ? (
              <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
            ) : <div />}
            <button
              disabled={!canProceedFromInfo}
              onClick={() => { if (!sfdcSearchDone && (form.phone || form.email)) doSfdcLookup(); setStep('date'); }}
              style={{ ...primaryBtnStyle(brandColor), opacity: canProceedFromInfo ? 1 : 0.4 }}
            >
              Choose Date
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Pick Date ────────────────────────────────── */}
      {step === 'date' && (
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600', color: L.text }}>
            Choose a date
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}
              style={{ ...navBtnStyle, opacity: weekOffset === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '14px', color: L.muted }}>
              {formatDateDisplay(weekDates[0])} — {formatDateDisplay(weekDates[6])}
            </span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 3}
              style={{ ...navBtnStyle, opacity: weekOffset >= 3 ? 0.3 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {weekDates.map(date => {
              const isPast = date < today;
              const isSelected = date === selectedDate;
              const dayOfWeek = new Date(date + 'T12:00:00').getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <button key={date} disabled={isPast} onClick={() => setSelectedDate(date)}
                  style={{
                    padding: '14px 8px', borderRadius: '8px',
                    border: isSelected ? `2px solid ${brandColor}` : `1px solid ${L.border}`,
                    background: isSelected ? `${brandColor}15` : isPast ? L.bg : L.surface,
                    color: isPast ? L.dim : L.text,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    textAlign: 'center', fontFamily: fonts.ui, opacity: isPast ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: '12px', color: isSelected ? brandColor : L.muted, fontWeight: '500' }}>
                    {formatDateDisplay(date).split(',')[0]}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', fontFamily: fonts.data, marginTop: '4px' }}>
                    {new Date(date + 'T12:00:00').getDate()}
                  </div>
                  {isWeekend && <div style={{ fontSize: '10px', color: L.dim, marginTop: '2px' }}>No 7pm</div>}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={() => setStep('info')} style={secondaryBtnStyle}>Back</button>
            <button disabled={!selectedDate} onClick={() => setStep('time')}
              style={{ ...primaryBtnStyle(brandColor), opacity: selectedDate ? 1 : 0.4 }}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Pick Time ────────────────────────────────── */}
      {step === 'time' && (
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '600', color: L.text }}>
            Available times for {formatDateDisplay(selectedDate)}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: L.muted }}>
            Showing availability in {partner.territories.map(t => TERRITORIES[t]?.name || t).join(', ')}
          </p>

          {loadingSlots ? (
            <div style={{ padding: '24px', textAlign: 'center', color: L.muted, fontSize: '14px' }}>
              Checking availability...
            </div>
          ) : availableSlots.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: L.muted, fontSize: '14px' }}>
              No available slots on this date. Please choose another day.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableSlots.map(slot => {
                const isSelected = slot === selectedTime;
                const info = slotSummaries[slot];
                return (
                  <button key={slot} onClick={() => setSelectedTime(slot)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px', borderRadius: '8px',
                      border: isSelected ? `2px solid ${brandColor}` : `1px solid ${L.border}`,
                      background: isSelected ? `${brandColor}15` : L.surface,
                      color: L.text, cursor: 'pointer', fontFamily: fonts.ui, textAlign: 'left',
                    }}
                  >
                    <Clock size={16} color={isSelected ? brandColor : L.muted} />
                    <span style={{ fontSize: '15px', fontWeight: isSelected ? '600' : '400', fontFamily: fonts.data }}>
                      {slot}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: L.dim, marginLeft: 'auto' }}>
                      {info && (<><Users size={12} /> {info.available} available</>)}
                      <span style={{ marginLeft: '8px' }}>90 min</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={() => setStep('date')} style={secondaryBtnStyle}>Back</button>
            <button disabled={!selectedTime} onClick={() => setStep('confirm')}
              style={{ ...primaryBtnStyle(brandColor), opacity: selectedTime ? 1 : 0.4 }}>
              Review & Confirm
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Review & Confirm ─────────────────────────── */}
      {step === 'confirm' && (
        <div>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: L.text }}>
            Confirm Appointment
          </h3>
          <SummaryCard form={form} selectedDate={selectedDate} selectedTime={selectedTime} partner={partner} brandColor={brandColor} />

          {sfdcMatch && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '6px',
              background: '#EBF8FF', border: '1px solid #BEE3F8', fontSize: '13px', color: '#2B6CB0',
            }}>
              Linked to Salesforce {sfdcMatch.type === 'lead' ? 'Lead' : 'Contact'}: <strong>{sfdcMatch.name}</strong>
            </div>
          )}

          <p style={{ color: L.muted, fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>
            A confirmation will be sent to the customer. The Venture Home team will assign the best consultant.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep('time')} style={secondaryBtnStyle}>Back</button>
            <button onClick={handleSubmit} style={primaryBtnStyle(brandColor)}>
              Book Appointment
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── Page shell — light theme wrapper with partner branding ─────────

function PageShell({ children, partner, brandColor, isMobile, onBack }) {
  return (
    <div style={{
      fontFamily: fonts.ui, backgroundColor: L.bg, color: L.text,
      minHeight: '100vh', padding: isMobile ? '16px' : '32px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center', marginBottom: '28px', paddingBottom: '20px',
          borderBottom: `4px solid ${brandColor}`,
        }}>
          <img
            src="/logo-black.jpg"
            alt="Venture Home"
            style={{ height: isMobile ? '40px' : '50px', marginBottom: '8px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '20px',
            background: `${brandColor}20`, color: brandColor, fontSize: '13px', fontWeight: '600',
            marginTop: '8px',
          }}>
            {partner.logo && (
              <img src={partner.logo} alt="" style={{ height: '14px', marginRight: '6px', verticalAlign: 'middle' }} />
            )}
            Booking via {partner.name}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: L.surface, borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: isMobile ? '24px' : '32px',
        }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'transparent', border: 'none', color: L.muted,
              fontSize: '13px', cursor: 'pointer', textDecoration: 'underline',
            }}>
              ← Back to dashboard
            </button>
          )}
          <p style={{ color: L.dim, fontSize: '11px', marginTop: '12px' }}>
            Powered by Venture Home Scheduling
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Summary card (used in confirm + confirmation screens) ──────────

function SummaryCard({ form, selectedDate, selectedTime, partner, brandColor }) {
  return (
    <div style={{
      background: L.bg, borderRadius: '8px', padding: '16px',
      border: `1px solid ${L.border}`,
    }}>
      <Row label="Customer" value={form.customerName} />
      <Row label="Phone" value={form.phone} />
      {form.email && <Row label="Email" value={form.email} />}
      {form.address && <Row label="Address" value={[form.address, form.city, form.state, form.zipCode].filter(Boolean).join(', ')} />}
      <Row label="Partner" value={partner.name} />
      <div style={{
        marginTop: '12px', padding: '14px', borderRadius: '6px',
        background: brandColor, color: '#fff', textAlign: 'center', fontWeight: '600',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '500', opacity: 0.8, marginBottom: '2px' }}>Scheduled for</div>
        {formatDateDisplay(selectedDate)} at {selectedTime}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${L.border}` }}>
      <span style={{ fontSize: '13px', color: L.muted }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '500', color: L.text }}>{value}</span>
    </div>
  );
}

// ─── Shared form helpers ────────────────────────────────────────────

function LightField({ label, value, onChange, placeholder, type = 'text', required = false, multiline = false }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: L.text }}>
        {label} {required && <span style={{ color: L.danger }}>*</span>}
      </label>
      <Tag
        type={multiline ? undefined : type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '6px',
          background: L.surface, border: `1px solid ${L.border}`,
          color: L.text, fontSize: '14px', fontFamily: fonts.ui,
          outline: 'none', boxSizing: 'border-box',
          resize: multiline ? 'vertical' : 'none',
        }}
        onFocus={e => { e.target.style.borderColor = '#3182CE'; e.target.style.boxShadow = '0 0 0 3px rgba(49,130,206,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = L.border; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function primaryBtnStyle(color) {
  return {
    padding: '10px 24px', borderRadius: '6px', border: 'none',
    background: color, color: '#fff', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', fontFamily: fonts.ui,
  };
}

const secondaryBtnStyle = {
  padding: '10px 20px', borderRadius: '6px',
  background: 'transparent', border: `1px solid ${L.border}`,
  color: L.text, fontSize: '14px', cursor: 'pointer', fontFamily: fonts.ui,
};

const navBtnStyle = {
  background: 'transparent', border: `1px solid ${L.border}`, borderRadius: '6px',
  padding: '6px 8px', color: L.muted, cursor: 'pointer', display: 'flex', alignItems: 'center',
};
