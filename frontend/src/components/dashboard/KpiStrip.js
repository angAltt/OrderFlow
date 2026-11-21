import { formatCurrencyRounded, formatNumber } from '@/lib/format';
import styles from './Dashboard.module.scss';

export default function KpiStrip({ stats }) {
  const activeOrders = stats.totalOrders - stats.ordersByStatus.Cancelled;

  const items = [
    {
      label: 'Total revenue',
      value: formatCurrencyRounded(stats.totalRevenue),
      note: `From ${formatNumber(activeOrders)} orders, cancelled ones not included`,
    },
    {
      label: 'Pending orders',
      value: formatNumber(stats.pendingOrders),
      note: 'Waiting to be shipped',
    },
    {
      label: 'Low-stock products',
      value: formatNumber(stats.lowStockCount),
      note: `Under ${stats.lowStockThreshold} units left`,
      alert: stats.lowStockCount > 0,
    },
    {
      label: 'Units in stock',
      value: formatNumber(stats.totalUnitsInStock),
      note: `Across ${formatNumber(stats.totalProducts)} products`,
    },
  ];

  return (
    <dl className={styles.kpis}>
      {items.map((item) => (
        <div key={item.label} className={`${styles.kpi} ${item.alert ? styles.kpiAlert : ''}`}>
          <dt className={styles.kpiLabel}>{item.label}</dt>
          <dd className={styles.kpiValue}>{item.value}</dd>
          <dd className={styles.kpiNote}>{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}
