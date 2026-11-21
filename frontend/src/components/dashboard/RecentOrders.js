import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import table from '@/components/ui/Table.module.scss';
import styles from './Dashboard.module.scss';

export default function RecentOrders({ orders }) {
  return (
    <section className={styles.panel} aria-labelledby="recent-orders-title">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="recent-orders-title" className={styles.panelTitle}>
            Recent orders
          </h2>
          <p className={styles.panelNote}>The latest {orders.length} orders, newest first.</p>
        </div>
        <Link href="/orders" className={styles.panelLink}>
          See all orders
        </Link>
      </header>

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" message="New orders will show up here." />
      ) : (
        <div className={styles.tableScroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Date</th>
                <th scope="col" className={table.num}>
                  Total
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={table.code}>{order.order_number}</td>
                  <td className={table.primary}>{order.customer_name}</td>
                  <td>
                    <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                  </td>
                  <td className={table.num}>{formatCurrency(order.total_amount)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
