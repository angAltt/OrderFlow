import { ORDER_STATUSES } from '@/lib/orderStatus';
import styles from './Dashboard.module.scss';

/** One stacked bar with the share of orders in each status. */
export default function StatusBreakdown({ ordersByStatus, total }) {
  return (
    <section className={styles.panel} aria-labelledby="status-title">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="status-title" className={styles.panelTitle}>
            Orders by status
          </h2>
          <p className={styles.panelNote}>{total} orders in total</p>
        </div>
      </header>

      <div className={styles.breakdown}>
        <div className={styles.stack} aria-hidden="true">
          {ORDER_STATUSES.map((status) =>
            ordersByStatus[status] > 0 ? (
              <span
                key={status}
                className={`${styles.segment} ${styles[`segment${status}`]}`}
                style={{ flexGrow: ordersByStatus[status] }}
              />
            ) : null,
          )}
        </div>

        <ul className={styles.legend}>
          {ORDER_STATUSES.map((status) => (
            <li key={status}>
              <span
                className={`${styles.swatch} ${styles[`segment${status}`]}`}
                aria-hidden="true"
              />
              <span className={styles.legendLabel}>{status}</span>
              <span className={styles.legendValue}>{ordersByStatus[status]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
