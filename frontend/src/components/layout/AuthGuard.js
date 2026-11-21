'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectAuth } from '@/store/slices/authSlice';
import styles from './AppShell.module.scss';

/**
 * Protects the private pages. The token lives in localStorage, so the check
 * runs in the browser once the session has been restored.
 */
export default function AuthGuard({ children }) {
  const router = useRouter();
  const { hydrated, token } = useSelector(selectAuth);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className={styles.boot} role="status">
        <span className={styles.bootMark} aria-hidden="true" />
        <span className="visually-hidden">Loading your session</span>
      </div>
    );
  }

  return children;
}
