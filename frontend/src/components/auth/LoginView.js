'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { login, selectAuth } from '@/store/slices/authSlice';
import { DEMO_ACCOUNTS } from '@/lib/config';
import useDemoStatus from '@/hooks/useDemoStatus';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Logo from '@/components/layout/Logo';
import styles from './LoginView.module.scss';

export default function LoginView() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token, hydrated, status, error, sessionExpired } = useSelector(selectAuth);
  const demo = useDemoStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // form | admin | viewer

  // Already signed in (or just signed in): go to the dashboard
  useEffect(() => {
    if (hydrated && token) router.replace('/dashboard');
  }, [hydrated, token, router]);

  const signIn = async (credentials, action) => {
    setPendingAction(action);
    await dispatch(login(credentials));
    setPendingAction(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    signIn({ email, password }, 'form');
  };

  const loading = status === 'loading';

  // A stored session is on its way to the dashboard: don't flash the form
  if (hydrated && token) return null;

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.brand}>
          <Logo size={32} />
          <span>OrderFlow</span>
        </div>

        <div className={styles.pitch}>
          <h1>Know what to restock and what to ship today.</h1>
          <p>
            OrderFlow tracks products, stock levels and orders for a small online store. Creating an
            order takes the units out of stock, and the dashboard flags products that are about to
            run out.
          </p>
        </div>

        <dl className={styles.roles}>
          <div>
            <dt>Admin</dt>
            <dd>Adds and edits products, creates orders and updates shipping status.</dd>
          </div>
          <div>
            <dt>Viewer</dt>
            <dd>Sees everything, changes nothing.</dd>
          </div>
        </dl>

        <div className={styles.tape} aria-hidden="true" />
      </section>

      <section className={styles.panel}>
        <div className={styles.card}>
          <h2 className={styles.title}>Try the live demo</h2>
          <p className={styles.subtitle}>No sign up needed. One click and you are in.</p>

          <Button
            variant="accent"
            size="lg"
            className={styles.demoButton}
            onClick={() => signIn(DEMO_ACCOUNTS.admin, 'admin')}
            loading={pendingAction === 'admin'}
            disabled={loading}
          >
            Demo Access (Admin)
          </Button>
          <button
            type="button"
            className={styles.viewerLink}
            onClick={() => signIn(DEMO_ACCOUNTS.viewer, 'viewer')}
            disabled={loading}
          >
            {pendingAction === 'viewer' ? 'Signing in...' : 'Or look around as a read-only viewer'}
          </button>

          {demo.api === 'waking' && (
            <p className={styles.serverNote} role="status">
              The server is waking up. On the free hosting plan the first request can take up to a
              minute, then everything runs at normal speed.
            </p>
          )}
          {demo.api === 'offline' && (
            <p className={styles.serverNote} role="status">
              The API is not answering right now. Try again in a minute.
            </p>
          )}
          {demo.enabled && (
            <p className={styles.demoNote}>
              Demo data goes back to its original state every {demo.intervalMinutes} minutes.
            </p>
          )}

          <div className={styles.divider}>
            <span>or sign in with email</span>
          </div>

          {sessionExpired && !error && (
            <p className={styles.notice} role="status">
              Your session expired. Sign in again to continue.
            </p>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Field id="email" label="Email">
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field id="password" label="Password">
              {(props) => (
                <input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </Field>
            <Button
              type="submit"
              variant="secondary"
              loading={pendingAction === 'form'}
              disabled={loading || !email || !password}
            >
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
