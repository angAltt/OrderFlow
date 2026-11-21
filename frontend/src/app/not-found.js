import Link from 'next/link';
import styles from './not-found.module.scss';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1>This page does not exist</h1>
      <p>Check the address or go back to the dashboard.</p>
      <Link href="/dashboard" className={styles.link}>
        Go to the dashboard
      </Link>
    </main>
  );
}
