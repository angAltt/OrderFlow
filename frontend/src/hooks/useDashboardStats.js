'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest } from '@/lib/api';
import { selectToken } from '@/store/slices/authSlice';

/**
 * Loads GET /api/dashboard/stats. The metrics are only used by the dashboard,
 * so they live in local state instead of a global slice.
 */
export default function useDashboardStats() {
  const token = useSelector(selectToken);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    apiRequest('/dashboard/stats', { token, signal: controller.signal })
      .then(({ data }) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => controller.abort();
  }, [token, attempt]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
