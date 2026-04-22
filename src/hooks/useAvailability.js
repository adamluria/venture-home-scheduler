// React hooks for calendar availability data
// Wraps calendarService.js with useState/useEffect for component consumption

import { useState, useEffect, useCallback } from 'react';
import {
  getSlotAvailability,
  getTerritorySlotSummary,
  getConsultantDayEvents,
  checkConsultantSlot,
} from '../data/calendarService.js';

/**
 * Hook: slot availability for a set of consultants on a date.
 * Returns { data, loading, error, refresh }
 *
 * data shape: { [consultantId]: { [timeSlot]: { available, conflicts } } }
 */
export function useSlotAvailability(dateString, consultantIds) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!dateString) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getSlotAvailability(dateString, consultantIds);
      setData(result);
    } catch (err) {
      console.error('useSlotAvailability error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateString, consultantIds?.join(',')]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}

/**
 * Hook: territory-level slot summary for a date.
 * Returns { data, loading, error, refresh }
 *
 * data shape: { [timeSlot]: { total, available, consultants, blocked, reason? } }
 */
export function useTerritorySlots(dateString, territory) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!dateString || !territory) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTerritorySlotSummary(dateString, territory);
      setData(result);
    } catch (err) {
      console.error('useTerritorySlots error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateString, territory]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}

/**
 * Hook: all calendar events for a consultant on a date.
 * Includes both VH appointments and external calendar events (standups, lunches, etc.)
 *
 * data shape: [{ id, summary, start, end, status, isVHAppointment, isMandatory, meetLink }]
 */
export function useConsultantEvents(consultantId, dateString) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!consultantId || !dateString) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getConsultantDayEvents(consultantId, dateString);
      setData(result);
    } catch (err) {
      console.error('useConsultantEvents error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [consultantId, dateString]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}

/**
 * Imperative check — not a hook. Call directly when you need a one-shot
 * availability check (e.g. before confirming a booking).
 */
export { checkConsultantSlot };
