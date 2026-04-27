import React, { useState } from 'react';
import { T, fonts, TIME_SLOTS } from '../data/theme.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Self-service customer booking page
 * Multi-step form: customer info → slot selection → confirmation
 * Light, friendly customer-facing styling (not dark admin theme)
 */
export default function CustomerBookingPage({ onSubmit, onBack }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1); // 1=info, 2=slots, 3=confirm

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [selectedSlot, setSelectedSlot] = useState(null);

  // Available slots for next 7 days
  const availableSlots = (() => {
    const slots = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      TIME_SLOTS.forEach(time => {
        slots.push({
          date: dateStr,
          dateDisplay: dayName,
          time,
          available: Math.random() > 0.2, // 80% of slots available
        });
      });
    }
    return slots;
  })();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectSlot = (slot) => {
    if (slot.available) {
      setSelectedSlot(slot);
      setStep(3);
    }
  };

  const handleConfirm = () => {
    if (selectedSlot && formData.name && formData.phone && formData.email) {
      onSubmit({
        customer: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        date: selectedSlot.date,
        time: selectedSlot.time,
        leadSource: 'inbound',
      });
    }
  };

  // Light theme colors for customer-facing
  const lightBg = '#FFFFFF';
  const lightText = '#1A202C';
  const lightMuted = '#718096';
  const lightBorder = '#E2E8F0';
  const lightAccent = T.accent; // Keep amber

  return (
    <div style={{
      fontFamily: fonts.ui,
      backgroundColor: '#F7FAFC',
      color: lightText,
      minHeight: '100vh',
      padding: isMobile ? '16px' : '32px',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto 40px',
        paddingBottom: '20px',
        borderBottom: `4px solid ${lightAccent}`,
      }}>
        <h1 style={{
          fontSize: isMobile ? '24px' : '32px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          color: lightText,
        }}>
          Venture Home Solar
        </h1>
        <p style={{
          fontSize: '14px',
          color: lightMuted,
          margin: '0',
        }}>
          Schedule your free solar consultation
        </p>
      </div>

      {/* Main Form Container */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: lightBg,
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: isMobile ? '24px' : '40px',
      }}>
        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '40px',
          gap: '12px',
        }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: step >= s ? lightAccent : lightBorder,
                color: step >= s ? '#000' : lightMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                margin: '0 auto 8px',
              }}>
                {s}
              </div>
              <div style={{
                fontSize: '12px',
                color: step === s ? lightText : lightMuted,
                fontWeight: step === s ? '600' : '400',
              }}>
                {s === 1 ? 'Your Info' : s === 2 ? 'Pick Time' : 'Confirm'}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1: Customer Info */}
        {step === 1 && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '24px',
              color: lightText,
            }}>
              Tell us about yourself
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                { label: 'Full Name', field: 'name', type: 'text', required: true },
                { label: 'Phone Number', field: 'phone', type: 'tel', required: true },
                { label: 'Email Address', field: 'email', type: 'email', required: true },
                { label: 'Street Address', field: 'address', type: 'text', required: false },
                { label: 'City', field: 'city', type: 'text', required: false },
                { label: 'State', field: 'state', type: 'text', required: false },
                { label: 'ZIP Code', field: 'zipCode', type: 'text', required: false },
              ].map(input => (
                <div key={input.field}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: lightText,
                  }}>
                    {input.label} {input.required && <span style={{ color: '#E53E3E' }}>*</span>}
                  </label>
                  <input
                    type={input.type}
                    value={formData[input.field]}
                    onChange={e => handleInputChange(input.field, e.target.value)}
                    placeholder={input.label}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${lightBorder}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                      outline: 'none',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = lightAccent;
                      e.target.style.boxShadow = `0 0 0 3px rgba(240, 168, 48, 0.1)`;
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = lightBorder;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={onBack}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: `1px solid ${lightBorder}`,
                  backgroundColor: 'transparent',
                  color: lightText,
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.target.backgroundColor = '#F7FAFC';
                }}
                onMouseOut={e => {
                  e.target.backgroundColor = 'transparent';
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.phone || !formData.email}
                style={{
                  padding: '12px 32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: (!formData.name || !formData.phone || !formData.email) ? '#CBD5E0' : lightAccent,
                  color: '#000',
                  fontWeight: '600',
                  cursor: (!formData.name || !formData.phone || !formData.email) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  if (!(!formData.name || !formData.phone || !formData.email)) {
                    e.target.backgroundColor = '#E69500';
                    e.target.transform = 'scale(1.02)';
                  }
                }}
                onMouseOut={e => {
                  if (!(!formData.name || !formData.phone || !formData.email)) {
                    e.target.backgroundColor = lightAccent;
                    e.target.transform = 'scale(1)';
                  }
                }}
              >
                Choose Time
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Slot */}
        {step === 2 && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '24px',
              color: lightText,
            }}>
              Pick your appointment time
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '12px',
              maxHeight: '600px',
              overflowY: 'auto',
              paddingRight: '8px',
            }}>
              {availableSlots.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSlot(slot)}
                  disabled={!slot.available}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: `2px solid ${!slot.available ? lightBorder : lightAccent}`,
                    backgroundColor: !slot.available ? '#F7FAFC' : 'transparent',
                    color: !slot.available ? lightMuted : lightText,
                    fontWeight: '500',
                    cursor: slot.available ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    opacity: !slot.available ? 0.6 : 1,
                    textAlign: 'center',
                  }}
                  onMouseOver={e => {
                    if (slot.available) {
                      e.target.backgroundColor = 'rgba(240, 168, 48, 0.1)';
                    }
                  }}
                  onMouseOut={e => {
                    if (slot.available) {
                      e.target.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontSize: '12px', color: lightMuted, marginBottom: '4px' }}>
                    {slot.dateDisplay}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {slot.time}
                  </div>
                  {!slot.available && (
                    <div style={{ fontSize: '10px', marginTop: '4px', color: lightMuted }}>
                      Not Available
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: `1px solid ${lightBorder}`,
                  backgroundColor: 'transparent',
                  color: lightText,
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.target.backgroundColor = '#F7FAFC';
                }}
                onMouseOut={e => {
                  e.target.backgroundColor = 'transparent';
                }}
              >
                Back
              </button>
              <button
                onClick={() => handleSelectSlot(selectedSlot)}
                disabled={!selectedSlot}
                style={{
                  padding: '12px 32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !selectedSlot ? '#CBD5E0' : lightAccent,
                  color: '#000',
                  fontWeight: '600',
                  cursor: !selectedSlot ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  if (selectedSlot) {
                    e.target.backgroundColor = '#E69500';
                  }
                }}
                onMouseOut={e => {
                  if (selectedSlot) {
                    e.target.backgroundColor = lightAccent;
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedSlot && (
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '24px',
              color: lightText,
            }}>
              Confirm your appointment
            </h2>

            <div style={{
              backgroundColor: '#F7FAFC',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${lightBorder}`,
            }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: lightMuted, fontWeight: '500' }}>
                    Name
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
                    {formData.name}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: lightMuted, fontWeight: '500' }}>
                      Phone
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
                      {formData.phone}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: lightMuted, fontWeight: '500' }}>
                      Email
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
                      {formData.email}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: lightMuted, fontWeight: '500' }}>
                    Address
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
                    {formData.address}, {formData.city}, {formData.state} {formData.zipCode}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  backgroundColor: lightAccent,
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: '600',
                  textAlign: 'center',
                  fontSize: '18px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', opacity: '0.7' }}>
                    Scheduled for
                  </div>
                  {selectedSlot.dateDisplay} at {selectedSlot.time}
                </div>
              </div>
            </div>

            <p style={{
              fontSize: '13px',
              color: lightMuted,
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              We'll send a confirmation email and text message shortly. Looking forward to helping you go solar!
            </p>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'space-between',
            }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: `1px solid ${lightBorder}`,
                  backgroundColor: 'transparent',
                  color: lightText,
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.target.backgroundColor = '#F7FAFC';
                }}
                onMouseOut={e => {
                  e.target.backgroundColor = 'transparent';
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '12px 32px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: lightAccent,
                  color: '#000',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => {
                  e.target.backgroundColor = '#E69500';
                }}
                onMouseOut={e => {
                  e.target.backgroundColor = lightAccent;
                }}
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
