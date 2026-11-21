'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import {
  fetchProducts,
  selectInventory,
  selectLowStockProducts,
} from '@/store/slices/inventorySlice';
import useDashboardStats from '@/hooks/useDashboardStats';
import PageHeader from '@/components/ui/PageHeader';
import { ErrorNotice } from '@/components/ui/States';
import KpiStrip from './KpiStrip';
import LowStockAlert from './LowStockAlert';
import RecentOrders from './RecentOrders';
import StatusBreakdown from './StatusBreakdown';
import styles from './Dashboard.module.scss';

export default function DashboardView() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { status: inventoryStatus, lowStockThreshold } = useSelector(selectInventory);
  const lowStockProducts = useSelector(selectLowStockProducts);
  const { data: stats, loading, error, reload } = useDashboardStats();

  // Always refresh stock when the dashboard opens, so alerts are current
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : 'Dashboard'}
        description="Sales, orders waiting to ship and products that need restocking."
      />

      {error && <ErrorNotice message={error} onRetry={reload} />}

      {loading && !stats && <div className={styles.kpiPlaceholder} aria-hidden="true" />}
      {stats && <KpiStrip stats={stats} />}

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <LowStockAlert
            products={lowStockProducts}
            threshold={lowStockThreshold}
            loading={inventoryStatus === 'loading' && lowStockProducts.length === 0}
            failed={inventoryStatus === 'failed'}
            onRetry={() => dispatch(fetchProducts())}
          />
        </div>
        <div className={styles.sideColumn}>
          {stats && (
            <StatusBreakdown ordersByStatus={stats.ordersByStatus} total={stats.totalOrders} />
          )}
        </div>
      </div>

      {stats && <RecentOrders orders={stats.recentOrders} />}
    </>
  );
}
