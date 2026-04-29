// SfdcAuthBanner.jsx
//
// Top-of-page indicator showing the rep's Salesforce auth status.
// - Calls /api/sfdc/whoami on mount; re-checks when window regains focus
//   (so a successful auth redirect updates the banner immediately).
// - Renders nothing when authed and the dismiss flag isn't set; renders a
//   compact "Connect Salesforce" CTA when not authed.
// - Click "Connect" → redirects to /auth/salesforce?return=<current path>.
//
// Dependencies: design tokens only. No state lib.

import React, { useEffect, useState, useCallback } from 'react';
import { Cloud, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { T, fonts } from '../data/theme.js';
import { prefetch as prefetchSfPerformance } from '../data/sfPerformance.js';

export default function SfdcAuthBanner() {
  const [state, setState] = useState({ status: 'loading', identity: null });

  const refresh = useCallback(() => {
    fetch('/api/sfdc/whoami')
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => {
        if (data.authenticated) {
          setState({ status: 'authed', identity: data });
          // Auth confirmed → warm the SF performance cache so the smart-pick
          // preview has real data ready when the user opens Smart Schedule.
          prefetchSfPerformance().catch(() => {});
        } else {
          setState({ status: 'unauthed', identity: null });
        }
      })
      .catch(() => setState({ status: 'unauthed', identity: null }));
  }, []);

  useEffect(() => {
    refresh();
    // Re-check when the tab regains focus — covers the OAuth redirect case
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const handleConnect = () => {
    const here = window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `/auth/salesforce?return=${encodeURIComponent(here)}`;
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/sfdc/logout', { method: 'POST' });
    } catch (e) { /* fall through */ }
    refresh();
  };

  // Loading: render nothing (avoid flash)
  if (state.status === 'loading') return null;

  // Authed: render a tiny status pill (subtle, not in the way)
  if (state.status === 'authed') {
    const who = state.identity.email || state.identity.displayName || 'connected';
    return (
      <div style={pillContainer}>
        <CheckCircle2 size={12} style={{ color: '#10B981' }} />
        <span style={{ color: T.muted }}>
          Salesforce: <span style={{ color: T.text }}>{who}</span>
        </span>
        <button onClick={handleLogout} style={iconButton} title="Sign out of Salesforce">
          <LogOut size={11} />
        </button>
      </div>
    );
  }

  // Unauthed: show a clear, non-blocking CTA
  return (
    <div style={bannerContainer}>
      <AlertCircle size={14} style={{ color: T.accent, flexShrink: 0 }} />
      <span style={{ color: T.text, fontSize: '13px' }}>
        Connect Salesforce to look up customers, view interaction history, and sync appointments.
      </span>
      <button onClick={handleConnect} style={connectButton}>
        <Cloud size={12} />
        Connect Salesforce
      </button>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const pillContainer = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '4px 10px', borderRadius: '12px',
  background: T.surface, border: `1px solid ${T.border}`,
  fontSize: '11px', fontFamily: fonts.ui, color: T.muted,
  whiteSpace: 'nowrap',
};

const iconButton = {
  background: 'transparent', border: 'none',
  color: T.muted, cursor: 'pointer',
  padding: '2px', display: 'flex', alignItems: 'center',
};

const bannerContainer = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '8px 14px',
  background: T.accentDim, border: `1px solid ${T.accent}`,
  borderRadius: '6px', fontFamily: fonts.ui,
};

const connectButton = {
  marginLeft: 'auto',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: T.accent, color: T.bg,
  border: 'none', borderRadius: '4px',
  padding: '6px 12px', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', fontFamily: fonts.ui, whiteSpace: 'nowrap',
};
