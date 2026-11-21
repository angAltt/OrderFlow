'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

const SLOW_AFTER_MS = 3000;

/**
 * Reads GET /api/health once. Returns:
 * - api: 'checking' | 'waking' | 'ready' | 'offline'
 *   ('waking' means the API is taking long to answer, which is normal on
 *   free hosting plans that put the server to sleep when nobody uses it)
 * - demo info: whether demo mode is on and the minutes left until the next reset
 */
export default function useDemoStatus() {
  const [api, setApi] = useState('checking');
  const [demo, setDemo] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    const slowTimer = setTimeout(() => setApi('waking'), SLOW_AFTER_MS);

    apiRequest('/health', { signal: controller.signal })
      .then(({ data }) => {
        setDemo(data.demo);
        setApi('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setApi('offline');
      })
      .finally(() => clearTimeout(slowTimer));

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!demo?.enabled) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [demo]);

  if (!demo?.enabled || !demo.nextResetAt) {
    return { api, enabled: false, minutesLeft: null, intervalMinutes: null };
  }

  // The API resets on a fixed interval, so once a reset time has passed the
  // next one is one interval later. This keeps the countdown right without
  // asking the API again.
  const intervalMs = demo.resetIntervalMinutes * 60000;
  let nextReset = new Date(demo.nextResetAt).getTime();
  if (now > nextReset && intervalMs > 0) {
    nextReset += Math.ceil((now - nextReset) / intervalMs) * intervalMs;
  }

  return {
    api,
    enabled: true,
    minutesLeft: Math.max(1, Math.ceil((nextReset - now) / 60000)),
    intervalMinutes: demo.resetIntervalMinutes,
  };
}
