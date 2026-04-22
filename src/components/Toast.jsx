import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { T, fonts } from '../data/theme.js';

/**
 * Toast notification — auto-dismisses after `duration` ms.
 * Sits bottom-right of the viewport.
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, toast.duration ?? 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.success;

  return (
    <div style={{
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      zIndex: 3000,
      animation: 'toastSlideIn 0.25s ease-out',
    }}>
      <style>{toastCss}</style>
      <div style={{
        minWidth: '320px',
        maxWidth: '420px',
        background: T.surface,
        borderRadius: '8px',
        border: `1px solid ${variant.color}40`,
        borderLeft: `4px solid ${variant.color}`,
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontFamily: fonts.ui,
      }}>
        <div style={{ marginTop: '1px', color: variant.color, flexShrink: 0 }}>
          {variant.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <div style={{ fontSize: '13px', fontWeight: 600, color: T.text, marginBottom: '2px' }}>
              {toast.title}
            </div>
          )}
          <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.4 }}>
            {toast.message}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.muted, padding: '2px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const TOAST_VARIANTS = {
  success: { color: T.green,  icon: <CheckCircle2 size={16} /> },
  error:   { color: T.red,    icon: <XCircle      size={16} /> },
  info:    { color: T.cyan,   icon: <AlertCircle  size={16} /> },
  warning: { color: T.accent, icon: <AlertCircle  size={16} /> },
};

const toastCss = `
  @keyframes toastSlideIn {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
`;
