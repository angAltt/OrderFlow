'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '@/store/slices/authSlice';
import {
  fetchProducts,
  selectInventory,
  selectLowStockProducts,
} from '@/store/slices/inventorySlice';
import useDemoStatus from '@/hooks/useDemoStatus';
import Logo from './Logo';
import styles from './AppShell.module.scss';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/orders', label: 'Orders' },
];

export default function AppShell({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector(selectUser);
  const { status: inventoryStatus } = useSelector(selectInventory);
  const lowStockCount = useSelector(selectLowStockProducts).length;
  const demo = useDemoStatus();

  // Products are loaded once for the whole app so the low-stock count in the
  // navigation is always available, whatever page the user opens first.
  useEffect(() => {
    if (inventoryStatus === 'idle') dispatch(fetchProducts());
  }, [inventoryStatus, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/login');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.brand}>
          <Logo />
          <span>OrderFlow</span>
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
                {href === '/inventory' && lowStockCount > 0 && (
                  <span
                    className={styles.alertCount}
                    title={`${lowStockCount} products are low on stock`}
                  >
                    {lowStockCount}
                    <span className="visually-hidden"> low-stock products</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          {user && (
            <div className={styles.user}>
              <p className={styles.userName}>{user.name}</p>
              <p className={styles.userRole}>
                {user.role === 'admin' ? 'Admin, full access' : 'Viewer, read only'}
              </p>
            </div>
          )}
          {demo.enabled && (
            <p className={styles.demo}>
              Demo data resets in {demo.minutesLeft} min. Feel free to change anything.
            </p>
          )}
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
