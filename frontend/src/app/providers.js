'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { expireSession, sessionRestored } from '@/store/slices/authSlice';
import { onUnauthorized } from '@/lib/api';
import { loadSession } from '@/lib/session';
import { ToastProvider } from '@/components/ui/Toast';

export default function Providers({ children }) {
  // Lazy initial state: the store is created once per browser session
  const [store] = useState(makeStore);

  useEffect(() => {
    // localStorage only exists in the browser, so the session is restored after mount
    store.dispatch(sessionRestored(loadSession()));
    onUnauthorized(() => store.dispatch(expireSession()));
    return () => onUnauthorized(null);
  }, [store]);

  return (
    <Provider store={store}>
      <ToastProvider>{children}</ToastProvider>
    </Provider>
  );
}
