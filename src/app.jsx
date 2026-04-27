import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, MapPin, Users, Zap, Plus, TrendingUp, TrendingDown, AlertTriangle, Link as LinkIcon, BarChart3, Search, Printer, Undo2, HelpCircle } from 'lucide-react';
import { T, fonts, TERRITORIES } from './data/theme.js';
import { mockAppointments, getAppointmentsForDate, getRegionStats, getTodayString, formatDateDisplay, formatDateFull, getWeekStart, getWeekDates, getConsultantName } from './data/mockData.js';
import { getPartnerBySlug } from './data/partners.js';
import DayView from './components/DayView.jsx';
import DraggableDayView from './components/DraggableDayView.jsx';
import WeekView from './components/WeekView.jsx';
import CalendarNav from './components/CalendarNav.jsx';
import TerritoryFilter from './components/TerritoryFilter.jsx';
import AppointmentDetail from './components/AppointmentDetail.jsx';
import NewAppointmentModal from './components/NewAppointmentModal.jsx';
import BookingPage from './components/BookingPage.jsx';
import PartnerBookingPage from './components/PartnerBookingPage.jsx';
import PartnerLinks from './components/PartnerLinks.jsx';
import ForecastPanel from './components/ForecastPanel.jsx';
import AvailableSlotsView from './components/AvailableSlotsView.jsx';
import RepView from './components/RepView.jsx';
import DepthChartView from './components/DepthChartView.jsx';
import MonthView from './components/MonthView.jsx';
import SwimlaneView from './components/SwimlaneView.jsx';
import StateView from './components/StateView.jsx';
import TeamView from './components/TeamView.jsx';
import AnalyticsView from './components/AnalyticsView.jsx';
import LeaderboardView from './components/LeaderboardView.jsx';
import Toast from './components/Toast.jsx';
import QuickAddBar from './components/QuickAddBar.jsx';
import ReschedulePage from './components/ReschedulePage.jsx';
import SearchBar from './components/SearchBar.jsx';
import CancelReasonModal from './components/CancelReasonModal.jsx';
import { BulkActions, RepIsOutButton } from './components/BulkActions.jsx';
import { PrintButton } from './components/PrintView.jsx';
import CustomerBookingPage from './components/CustomerBookingPage.jsx';
import HelpPanel from './components/HelpPanel.jsx';
import useIsMobile from './hooks/useIsMobile.js';
import { forecastAllTerritories, predictSitRate, getSitRateTrend, RAW_DATA } from './data/forecastEngine.js';
import { sendConfirmation, scheduleReminders } from './data/notificationService.js';
import { logAction } from './data/auditLog.js';
import { pushUndo, undo, canUndo, peekUndo } from './data/undoService.js';
import { checkBufferConflict } from './data/bufferService.js';
import { sendSlackAlert } from './data/slackAlerts.js';

// Simple hash-based router: #/book/greenwatt → booking page
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();

  // Public customer booking page: #/book (no slug)
  if (hash === '#/book') {
    return (
      <CustomerBookingPage
        onSubmit={(data) => {
          mockAppointments.push({
            id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            status: 'scheduled', type: 'appointment', isPlaceholder: false,
            isVirtual: false, ...data,
          });
          window.location.hash = '';
        }}
        onBack={() => { window.location.hash = ''; }}
      />
    );
  }

  // Check for booking route: #/book/:slug
  const bookingMatch = hash.match(/^#\/book\/([a-z0-9-]+)$/);
  if (bookingMatch) {
    const partner = getPartnerBySlug(bookingMatch[1]);
    if (partner) {
      return (
        <PartnerBookingPage
          partner={partner}
          onSubmit={(data) => {
            const apt = {
              id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              status: 'scheduled', type: 'appointment', isPlaceholder: false,
              isVirtual: false, ...data,
            };
            mockAppointments.push(apt);
            // Fire-and-forget SFDC sync
            fetch('/api/sfdc/appointment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apt),
            }).catch(() => {});
          }}
          onBack={() => { window.location.hash = ''; }}
        />
      );
    }
  }

  // Salesforce deep-link from Opportunity: #/schedule?opp=OPPID&name=...&address=...&zip=...&tsrf=...&source=...
  // Salesforce deep-link from Lead:        #/schedule?lead=LEADID&name=...&phone=...&email=...&address=...&zip=...&source=...
  // Launched from custom buttons on the SFDC Opportunity or Lead page
  const scheduleMatch = hash.match(/^#\/schedule\?(.+)$/);
  if (scheduleMatch) {
    const params = new URLSearchParams(scheduleMatch[1]);
    return (
      <Dashboard
        sfdcDefaults={{
          customer: params.get('name') || '',
          address: params.get('address') || '',
          zipCode: params.get('zip') || '',
          phone: params.get('phone') || '',
          email: params.get('email') || '',
          tsrf: params.get('tsrf') ? Number(params.get('tsrf')) : null,
          leadSource: params.get('source') || 'paid',
          sfdcOppId: params.get('opp') || '',
          sfdcLeadId: params.get('lead') || '',
          autoOpen: true,
        }}
      />
    );
  }

  // Customer-facing reschedule route: #/reschedule/:token
  const rescheduleMatch = hash.match(/^#\/reschedule\/([^/]+)$/);
  if (rescheduleMatch) {
    return (
      <ReschedulePage
        token={rescheduleMatch[1]}
        onReschedule={({ appointmentId, newDate, newTime }) => {
          const apt = mockAppointments.find(a => a.id === appointmentId);
          if (apt) {
            apt.date = newDate;
            apt.time = newTime;
            apt.status = 'scheduled';
            sendConfirmation(apt).catch(() => {});
          }
        }}
        onBack={() => { window.location.hash = ''; }}
      />
    );
  }

  return <Dashboard />;
}

function Dashboard({ sfdcDefaults } = {}) {
  const today = getTodayString();
  const isMobile = useIsMobile();

  // Core state
  const [viewMode, setViewMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedRegions, setSelectedRegions] = useState(Object.keys(TERRITORIES));
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalDefaults, setModalDefaults] = useState(null); // pre-filled form for quick-add handoff
  const [sidebarTab, setSidebarTab] = useState('forecast'); // forecast | insights | partners
  const [toast, setToast] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // appointment to cancel/no-show
  const [selectedBulk, setSelectedBulk] = useState([]); // multi-select for bulk ops

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Cmd+/ or Ctrl+/ → open search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowSearch(v => !v);
      }
      // Cmd+Z → undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo() && !showNewModal && !showSearch) {
          e.preventDefault();
          const result = undo();
          if (result) {
            const { entry } = result;
            // Restore the before state
            const idx = mockAppointments.findIndex(a => a.id === entry.appointmentId);
            if (idx >= 0 && entry.before) {
              mockAppointments[idx] = { ...mockAppointments[idx], ...entry.before };
              refresh();
              setToast({ type: 'info', title: 'Undone', message: `Reverted: ${entry.action}` });
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showNewModal, showSearch]);

  // Auto-open modal if arriving from Salesforce deep-link
  useEffect(() => {
    if (sfdcDefaults?.autoOpen) {
      setModalDefaults(sfdcDefaults);
      setShowNewModal(true);
    }
  }, []);
  const [, forceRefresh] = useState(0);
  const refresh = () => forceRefresh(n => n + 1);

  // ─── Appointment persistence (mock layer) ─────────────────────────
  // In mock mode we mutate mockAppointments in place; a refresh counter
  // re-renders views that read from it.
  const commitAppointment = (data, { isUpdate = false } = {}) => {
    if (isUpdate) {
      const idx = mockAppointments.findIndex(a => a.id === data.id);
      if (idx >= 0) mockAppointments[idx] = { ...mockAppointments[idx], ...data };
    } else {
      const id = data.id || `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const apt = {
        id,
        status: 'scheduled',
        type: 'appointment',
        isPlaceholder: false,
        isVirtual: false,
        leadSource: 'paid',
        ...data,
      };
      mockAppointments.push(apt);
      return apt;
    }
    return data;
  };

  // Sync appointment to Salesforce Appointment__c (fire-and-forget)
  const syncAppointmentToSFDC = async (apt, isUpdate = false) => {
    try {
      if (isUpdate && apt.sfdcAppointmentId) {
        // Update existing SFDC record
        const updateFields = {};
        if (apt.date) updateFields.Scheduled_Date__c = apt.date;
        if (apt.time) updateFields.Scheduled_Time__c = apt.time;
        if (apt.status) updateFields.Status__c = apt.status;
        if (apt.consultant) updateFields.Assigned_Consultant__c = apt.consultant;
        if (apt.cancelReason) updateFields.Cancel_Reason__c = apt.cancelReason;
        await fetch(`/api/sfdc/appointment/${apt.sfdcAppointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateFields),
        });
      } else if (!isUpdate) {
        // If booking from a Lead, auto-convert to Opportunity first
        if (apt.sfdcLeadId && !apt.sfdcOppId) {
          try {
            const convertRes = await fetch(`/api/sfdc/lead/${apt.sfdcLeadId}/convert`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ convertedStatus: 'Qualified' }),
            });
            if (convertRes.ok) {
              const result = await convertRes.json();
              apt.sfdcOppId = result.opportunityId || '';
              // Update the local record with the new Opp ID
              const idx = mockAppointments.findIndex(a => a.id === apt.id);
              if (idx >= 0) mockAppointments[idx].sfdcOppId = apt.sfdcOppId;
            }
          } catch (e) { console.warn('Lead convert failed (non-blocking):', e); }
        }
        // Create new SFDC Appointment__c record
        const res = await fetch('/api/sfdc/appointment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apt),
        });
        if (res.ok) {
          const result = await res.json();
          // Store the SFDC record ID back on the local appointment
          const idx = mockAppointments.findIndex(a => a.id === apt.id);
          if (idx >= 0) mockAppointments[idx].sfdcAppointmentId = result.sfdcAppointmentId;
        }
      }
    } catch (err) {
      console.warn('SFDC sync (non-blocking):', err.message);
    }
  };

  const handleCreateAppointment = (data) => {
    const apt = commitAppointment(data);
    refresh();
    const repName = getConsultantName(apt.consultant) || 'Unassigned';
    logAction({ appointmentId: apt.id, action: 'create', field: null, oldValue: null, newValue: `${apt.customer} at ${apt.time}` });
    setToast({
      type: 'success',
      title: 'Appointment scheduled',
      message: `${apt.customer} — ${formatDateFull(apt.date)} at ${apt.time} with ${repName}`,
    });
    // Check buffer conflicts
    if (apt.consultant && apt.zipCode) {
      const bufferCheck = checkBufferConflict(apt.consultant, apt.date, apt.time, apt.zipCode);
      if (!bufferCheck.ok && bufferCheck.conflicts.length > 0) {
        const c = bufferCheck.conflicts[0];
        setTimeout(() => setToast({
          type: 'warning', title: 'Travel buffer warning',
          message: `Only ${c.gap}min gap to ${c.appointment.customer} (need ${c.required}min)`,
        }), 2000);
      }
    }
    sendConfirmation(apt).catch(() => {});
    scheduleReminders(apt).catch(() => {});
    // Sync to Salesforce Appointment__c (fire-and-forget, non-blocking)
    syncAppointmentToSFDC(apt, false);
    // Slack alert for new booking
    sendSlackAlert('new_booking', {
      customer: apt.customer, date: apt.date, time: apt.time,
      leadSource: apt.leadSource, territory: apt.territory,
    });
    return apt;
  };

  const handleReschedule = (apt, { newDate, newTime, preview }) => {
    pushUndo({ action: 'reschedule', appointmentId: apt.id, before: { date: apt.date, time: apt.time }, after: { date: newDate, time: newTime } });
    logAction({ appointmentId: apt.id, action: 'reschedule', field: 'time', oldValue: `${apt.date} ${apt.time}`, newValue: `${newDate} ${newTime}` });
    commitAppointment({ id: apt.id, date: newDate, time: newTime }, { isUpdate: true });
    refresh();
    const repName = getConsultantName(apt.consultant) || 'Unassigned';
    const deltaNote = preview && preview.kind === 'scored' && typeof preview.deltaPct === 'number'
      ? ` (P(close) ${preview.deltaPct >= 0 ? '+' : ''}${preview.deltaPct}%)`
      : '';
    setToast({
      type: preview?.blocked || preview?.conflict ? 'warning' : 'success',
      title: 'Rescheduled',
      message: `${apt.customer} → ${formatDateFull(newDate)} at ${newTime} with ${repName}${deltaNote}`,
    });
    const updated = mockAppointments.find(a => a.id === apt.id);
    if (updated) sendConfirmation(updated).catch(() => {});
  };

  const handleQuickAdd = (fields) => {
    // Enter with a complete parse → create directly
    handleCreateAppointment(fields);
  };

  const handleQuickAddReview = (fields) => {
    // Cmd+Enter or incomplete parse → open modal pre-filled
    setModalDefaults(fields);
    setShowNewModal(true);
  };

  // Computed
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const regionStats = useMemo(() => getRegionStats(currentDate), [currentDate]);
  const todayAppointments = useMemo(() => getAppointmentsForDate(currentDate, selectedRegions).filter(a => !a.isPlaceholder), [currentDate, selectedRegions]);

  // Navigation
  const navigate = (direction) => {
    const d = new Date(currentDate + 'T12:00:00');
    const offset = viewMode === 'week' ? 7 : 1;
    d.setDate(d.getDate() + (direction * offset));
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const goToday = () => setCurrentDate(today);

  const weekRangeLabel = `${formatDateDisplay(weekDates[0])} — ${formatDateDisplay(weekDates[6])}`;
  const navLabel = viewMode === 'day' ? formatDateFull(currentDate)
                 : viewMode === 'month' ? new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                 : viewMode === 'depth' ? 'All Reps'
                 : viewMode === 'swimlane' ? `Pipeline — ${weekRangeLabel}`
                 : viewMode === 'state' ? `By State — ${weekRangeLabel}`
                 : viewMode === 'team' ? `By Team — ${weekRangeLabel}`
                 : viewMode === 'analytics' ? 'Analytics'
                 : viewMode === 'leaderboard' ? 'Leaderboard'
                 : weekRangeLabel;

  // Stats
  const totalToday = todayAppointments.length;
  const confirmedToday = todayAppointments.filter(a => a.status === 'confirmed').length;
  const completionRate = totalToday > 0 ? ((confirmedToday / totalToday) * 100).toFixed(1) : '0.0';
  const activeRegions = Object.values(regionStats).filter(v => v > 0).length;

  // Data-driven insights from forecast engine
  const insights = useMemo(() => {
    const result = [];
    try {
      const allTerr = forecastAllTerritories(currentDate);
      const sitTrend = getSitRateTrend();

      // Find hottest territory
      if (allTerr.peakTerritory) {
        const peak = allTerr.territories[allTerr.peakTerritory];
        result.push({
          title: 'Peak Demand',
          message: `${TERRITORIES[allTerr.peakTerritory]?.name} expects ~${peak.expected} appointments today — highest across all regions`,
          type: 'suggestion',
        });
      }

      // Sit rate trend
      if (sitTrend.direction === 'improving') {
        result.push({
          title: 'Sit Rate Improving',
          message: `Overall sit rate is ${sitTrend.current}%, up ${sitTrend.trend}pp over 6 months. Get-the-Referral leads convert at 46.9%`,
          type: 'positive',
        });
      } else if (sitTrend.direction === 'declining') {
        result.push({
          title: 'Sit Rate Declining',
          message: `Overall sit rate dropped to ${sitTrend.current}% (${sitTrend.trend}pp over 6 months). Review lead quality.`,
          type: 'warning',
        });
      }

      // Seasonal context
      const month = new Date(currentDate + 'T12:00:00').getMonth() + 1;
      const seasonal = RAW_DATA.SEASONALITY[month];
      if (seasonal > 1.15) {
        result.push({ title: 'Peak Season', message: `This month runs ${((seasonal - 1) * 100).toFixed(0)}% above annual average — ensure full staffing`, type: 'positive' });
      } else if (seasonal < 0.85) {
        result.push({ title: 'Low Season', message: `Demand is ${((1 - seasonal) * 100).toFixed(0)}% below average this month — good time for training`, type: 'suggestion' });
      }

      // Territory trend warnings
      for (const [terr, trendVal] of Object.entries(RAW_DATA.RECENT_TREND)) {
        if (trendVal < -0.2 && selectedRegions.includes(terr)) {
          result.push({
            title: `${TERRITORIES[terr]?.name} Declining`,
            message: `90-day demand down ${Math.abs(Math.round(trendVal * 100))}% vs prior period — review lead pipeline`,
            type: 'warning',
          });
          break;
        }
      }
    } catch (e) {
      result.push({ title: 'Forecast Engine', message: 'Loading demand predictions...', type: 'suggestion' });
    }
    return result;
  }, [currentDate, selectedRegions]);

  return (
    <div style={{
      background: T.bg,
      minHeight: '100vh',
      fontFamily: fonts.ui,
      color: T.text,
      padding: isMobile ? '12px' : '20px',
      paddingBottom: isMobile ? '88px' : '20px', // room for bottom action bar
    }}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: isMobile ? '12px' : '20px',
        flexWrap: 'wrap',
        gap: isMobile ? '8px' : '12px',
      }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px' }}>
          <img
            src="/logo-white.png"
            alt="Venture Home"
            style={{
              height: isMobile ? '28px' : '36px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h1 style={{ margin: '0 0 2px 0', fontSize: isMobile ? '18px' : '22px', fontWeight: '600' }}>
              Scheduling
            </h1>
            <p style={{ margin: 0, color: T.muted, fontSize: isMobile ? '11px' : '13px' }}>
              {isMobile
                ? `${Object.keys(TERRITORIES).length} regions`
                : `Intelligent appointment management across ${Object.keys(TERRITORIES).length} regions`}
            </p>
          </div>
        </div>

        {/* On desktop: show the big primary button in the header.
            On mobile: move it to a fixed bottom action bar. */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowSearch(true)}
              title="Search (Cmd+/)"
              style={{
                background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px',
                padding: '8px 12px', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: fonts.ui, fontSize: '13px',
              }}
            >
              <Search size={14} /> Search
            </button>
            <button
              onClick={() => setShowHelp(true)}
              title="Help & Training"
              style={{
                background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '6px',
                padding: '8px 12px', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: fonts.ui, fontSize: '13px',
              }}
            >
              <HelpCircle size={14} /> Help
            </button>
            <PrintButton dateString={currentDate} selectedRegions={selectedRegions} />
            <RepIsOutButton
              onReassign={(repId, date) => {
                const repAppts = mockAppointments.filter(a => a.consultant === repId && a.date === date && !a.isPlaceholder);
                repAppts.forEach(apt => {
                  logAction({ appointmentId: apt.id, action: 'reassign', field: 'consultant', oldValue: repId, newValue: 'auto' });
                });
                refresh();
                setToast({ type: 'success', title: 'Rep marked out', message: `${repAppts.length} appointments flagged for reassignment` });
              }}
              weekDates={weekDates}
              selectedRegions={selectedRegions}
            />
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                background: T.accent, border: 'none', borderRadius: '6px',
                padding: '10px 20px', color: T.bg, fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: fonts.ui,
              }}
            >
              <Plus size={16} />
              Smart Schedule
            </button>
          </div>
        )}
      </div>

      {/* ─── Quick Add ──────────────────────────────────────────── */}
      <QuickAddBar onCreate={handleQuickAdd} onOpenModal={handleQuickAddReview} />

      {/* ─── Metrics Bar ────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        // Mobile: 2-up compact, Desktop: auto-fit with min 180
        gridTemplateColumns: isMobile
          ? 'repeat(2, minmax(0, 1fr))'
          : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: isMobile ? '8px' : '12px',
        marginBottom: isMobile ? '12px' : '20px',
      }}>
        <MetricCard icon={<Calendar size={isMobile ? 16 : 18} color={T.accent} />} label="Today" value={totalToday} compact={isMobile} />
        <MetricCard icon={<TrendingUp size={isMobile ? 16 : 18} color={T.green} />} label="Confirmed" value={`${completionRate}%`} compact={isMobile} />
        <MetricCard icon={<MapPin size={isMobile ? 16 : 18} color={T.accent} />} label="Regions" value={`${activeRegions}/${Object.keys(TERRITORIES).length}`} compact={isMobile} />
        <MetricCard icon={<Zap size={isMobile ? 16 : 18} color={T.green} />} label="This Week" value={mockAppointments.filter(a => !a.isPlaceholder).length} compact={isMobile} />
      </div>

      {/* ─── Main Layout ────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
        gap: isMobile ? '12px' : '20px',
      }}>

        {/* Left: Calendar */}
        <div style={{
          background: T.surface,
          borderRadius: '8px',
          padding: isMobile ? '12px' : '20px',
          border: `1px solid ${T.border}`,
          minWidth: 0, // let grid children shrink
        }}>
          <CalendarNav
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
            onToday={goToday}
            label={navLabel}
          />
          <div style={{ marginBottom: '16px' }}>
            <TerritoryFilter selectedRegions={selectedRegions} onChange={setSelectedRegions} />
          </div>

          {viewMode === 'day' && (
            <DraggableDayView
              dateString={currentDate}
              selectedRegions={selectedRegions}
              onSelectAppointment={setSelectedAppointment}
              onReschedule={handleReschedule}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              weekDates={weekDates}
              selectedRegions={selectedRegions}
              onSelectAppointment={setSelectedAppointment}
              onSelectDate={(date) => { setCurrentDate(date); setViewMode('day'); }}
            />
          )}
          {viewMode === 'slots' && (
            <AvailableSlotsView
              weekDates={weekDates}
              selectedRegions={selectedRegions}
              onSelectDate={(date) => { setCurrentDate(date); setViewMode('day'); }}
              onCellClick={({ date, slot }) => {
                setCurrentDate(date);
                setShowNewModal(true);
              }}
            />
          )}
          {viewMode === 'rep' && (
            <RepView
              weekDates={weekDates}
              selectedRegions={selectedRegions}
              onSelectAppointment={setSelectedAppointment}
            />
          )}
          {viewMode === 'depth' && (
            <DepthChartView selectedRegions={selectedRegions} />
          )}
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              selectedRegions={selectedRegions}
              onSelectDate={(date) => { setCurrentDate(date); setViewMode('day'); }}
            />
          )}
          {viewMode === 'swimlane' && (
            <SwimlaneView
              weekDates={weekDates}
              selectedRegions={selectedRegions}
              onSelectAppointment={setSelectedAppointment}
            />
          )}
          {viewMode === 'state' && (
            <StateView
              weekDates={weekDates}
              selectedRegions={selectedRegions}
              onSelectAppointment={setSelectedAppointment}
            />
          )}
          {viewMode === 'team' && (
            <TeamView
              weekDates={weekDates}
              selectedRegions={selectedRegions}
              onSelectAppointment={setSelectedAppointment}
            />
          )}
          {viewMode === 'analytics' && (
            <AnalyticsView selectedRegions={selectedRegions} />
          )}
          {viewMode === 'leaderboard' && (
            <LeaderboardView selectedRegions={selectedRegions} />
          )}
        </div>

        {/* Right: Sidebar
            Desktop: always visible as a column.
            Mobile: collapsed by default behind a "Forecast & Insights" toggle. */}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(v => !v)}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              padding: '12px 14px',
              color: T.text,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: fonts.ui,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <span>{mobileSidebarOpen ? 'Hide' : 'Show'} forecast & insights</span>
            <BarChart3 size={14} color={T.muted} />
          </button>
        )}
        <div style={{
          display: (isMobile && !mobileSidebarOpen) ? 'none' : 'flex',
          flexDirection: 'column',
          gap: isMobile ? '12px' : '16px',
          minWidth: 0,
        }}>

          {/* Sidebar tab toggle */}
          <div style={{
            display: 'flex', background: T.bg, borderRadius: '6px',
            border: `1px solid ${T.border}`, overflow: 'hidden',
          }}>
            {[
              { key: 'forecast', label: 'Forecast', icon: <BarChart3 size={12} /> },
              { key: 'insights', label: 'Insights' },
              { key: 'partners', label: 'Partners', icon: <LinkIcon size={12} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                style={{
                  flex: 1, padding: '8px', border: 'none',
                  background: sidebarTab === tab.key ? T.accent : 'transparent',
                  color: sidebarTab === tab.key ? T.bg : T.muted,
                  fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                  fontFamily: fonts.ui, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '4px',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {sidebarTab === 'forecast' && (
            <ForecastPanel currentDate={currentDate} selectedRegions={selectedRegions} />
          )}

          {sidebarTab === 'insights' && (
            <>
              <SidebarCard title="Smart Insights">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {insights.map((insight, i) => (
                    <div key={i} style={{
                      padding: '10px', borderRadius: '6px', background: T.bg, border: `1px solid ${T.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {insight.type === 'positive' && <TrendingUp size={13} color={T.green} />}
                        {insight.type === 'warning' && <AlertTriangle size={13} color={T.accent} />}
                        {insight.type === 'suggestion' && <Zap size={13} color={T.accent} />}
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{insight.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: T.muted, lineHeight: 1.4 }}>
                        {insight.message}
                      </p>
                    </div>
                  ))}
                </div>
              </SidebarCard>

              <SidebarCard title="Regional Load">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.values(TERRITORIES).map(region => (
                    <div key={region.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: region.color }} />
                        <span style={{ fontSize: '13px' }}>{region.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: fonts.data, color: T.muted }}>
                        {regionStats[region.code] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </SidebarCard>
            </>
          )}

          {sidebarTab === 'partners' && (
            <PartnerLinks onPreview={(slug) => { window.location.hash = `/book/${slug}`; }} />
          )}

          {/* Quick Actions — always visible */}
          <SidebarCard title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['Emergency reschedule', 'Add placeholder slots', 'Optimize routes'].map(action => (
                <button key={action} style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: T.text,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: fonts.ui,
                }}>
                  {action}
                </button>
              ))}
            </div>
          </SidebarCard>
        </div>
      </div>

      {/* ─── Mobile bottom action bar ─────────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          padding: 'calc(env(safe-area-inset-bottom, 0px) + 10px) 12px 10px 12px',
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          zIndex: 900,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <button
            onClick={() => setShowHelp(true)}
            title="Help"
            style={{
              background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '8px',
              padding: '14px', color: T.muted, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              background: T.accent,
              border: 'none',
              borderRadius: '8px',
              padding: '14px 20px',
              color: T.bg,
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: fonts.ui,
              flex: 1,
            }}
          >
            <Plus size={18} />
            Smart Schedule
          </button>
        </div>
      )}

      {/* ─── Overlays ───────────────────────────────────────────── */}
      {selectedAppointment && (
        <AppointmentDetail
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onCancel={(apt) => {
            setSelectedAppointment(null);
            setCancelTarget(apt);
          }}
          onReassign={(apt, newRepId) => {
            commitAppointment({ id: apt.id, consultant: newRepId }, { isUpdate: true });
            refresh();
            const newRepName = getConsultantName(newRepId) || 'Unknown';
            setToast({
              type: 'success',
              title: 'Rep reassigned',
              message: `${apt.customer} → ${newRepName}`,
            });
            setSelectedAppointment({ ...apt, consultant: newRepId });
          }}
        />
      )}

      {showNewModal && (
        <NewAppointmentModal
          defaultDate={modalDefaults?.date || currentDate}
          defaultForm={modalDefaults || undefined}
          onClose={() => { setShowNewModal(false); setModalDefaults(null); }}
          onSave={(data) => {
            handleCreateAppointment(data);
            setModalDefaults(null);
          }}
        />
      )}

      {/* ─── Search Overlay ─────────────────────────────────── */}
      {showSearch && (
        <SearchBar
          onSelectAppointment={(apt) => {
            setShowSearch(false);
            setSelectedAppointment(apt);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* ─── Cancel / No-Show Modal ──────────────────────────── */}
      {cancelTarget && (
        <CancelReasonModal
          appointment={cancelTarget}
          onConfirm={({ reason, details, status }) => {
            const prev = cancelTarget.status;
            pushUndo({ action: status === 'no-show' ? 'no-show' : 'cancel', appointmentId: cancelTarget.id, before: { status: prev }, after: { status } });
            logAction({ appointmentId: cancelTarget.id, action: 'status_change', field: 'status', oldValue: prev, newValue: `${status} — ${reason}${details ? ': ' + details : ''}` });
            commitAppointment({ id: cancelTarget.id, status, cancelReason: reason, cancelDetails: details }, { isUpdate: true });
            refresh();
            setToast({ type: 'warning', title: status === 'no-show' ? 'No-show recorded' : 'Appointment canceled', message: `${cancelTarget.customer} — ${reason}` });
            // Fire Slack alert
            sendSlackAlert(status === 'no-show' ? 'no_show' : 'cancel', {
              customer: cancelTarget.customer, rep: getConsultantName(cancelTarget.consultant),
              date: cancelTarget.date, time: cancelTarget.time, territory: cancelTarget.territory,
              reason, note: details,
            });
            setCancelTarget(null);
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* ─── Bulk Actions Toolbar ────────────────────────────── */}
      <BulkActions
        selectedAppointments={selectedBulk}
        onClearSelection={() => setSelectedBulk([])}
        onBulkReassign={(aptIds, newRepId) => {
          aptIds.forEach(id => {
            const apt = mockAppointments.find(a => a.id === id);
            if (apt) {
              logAction({ appointmentId: id, action: 'reassign', field: 'consultant', oldValue: apt.consultant, newValue: newRepId });
              commitAppointment({ id, consultant: newRepId }, { isUpdate: true });
            }
          });
          refresh();
          setSelectedBulk([]);
          setToast({ type: 'success', title: 'Bulk reassign', message: `${aptIds.length} appointments reassigned` });
        }}
        onBulkCancel={(aptIds) => {
          aptIds.forEach(id => {
            logAction({ appointmentId: id, action: 'status_change', field: 'status', oldValue: 'scheduled', newValue: 'canceled' });
            commitAppointment({ id, status: 'canceled' }, { isUpdate: true });
          });
          refresh();
          setSelectedBulk([]);
          setToast({ type: 'warning', title: 'Bulk cancel', message: `${aptIds.length} appointments canceled` });
        }}
        onBulkReschedule={(aptIds) => {
          // For now, open the first appointment in the detail drawer for manual reschedule
          const first = mockAppointments.find(a => a.id === aptIds[0]);
          if (first) setSelectedAppointment(first);
          setSelectedBulk([]);
        }}
        weekDates={weekDates}
        selectedRegions={selectedRegions}
      />

      {/* ─── Help & Training Panel ─────────────────────────── */}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────

function MetricCard({ icon, label, value, compact }) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: '8px',
      padding: compact ? '10px 12px' : '16px',
      border: `1px solid ${T.border}`,
      minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px',
        marginBottom: compact ? '4px' : '6px',
      }}>
        {icon}
        <span style={{
          fontSize: compact ? '11px' : '12px', color: T.muted,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: compact ? '18px' : '22px',
        fontWeight: '600', fontFamily: fonts.data,
      }}>
        {value}
      </div>
    </div>
  );
}

function SidebarCard({ title, children }) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: '8px',
      padding: '16px',
      border: `1px solid ${T.border}`,
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>{title}</h3>
      {children}
    </div>
  );
}
