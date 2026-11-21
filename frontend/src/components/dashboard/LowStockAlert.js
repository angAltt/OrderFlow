import Link from 'next/link';
import StockBadge from '@/components/ui/StockBadge';
import { EmptyState, ErrorNotice, LoadingRows } from '@/components/ui/States';
import table from '@/components/ui/Table.module.scss';
import styles from './Dashboard.module.scss';

export default function LowStockAlert({ products, threshold, loading, failed, onRetry }) {
  return (
    <section className={styles.alertPanel} aria-labelledby="low-stock-title">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="low-stock-title" className={styles.panelTitle}>
            Running low
          </h2>
          <p className={styles.panelNote}>
            Products with fewer than {threshold} units. Restock these first.
          </p>
        </div>
        <Link href="/inventory" className={styles.panelLink}>
          Open inventory
        </Link>
      </header>

      {failed && products.length === 0 ? (
        <div className={styles.panelBody}>
          <ErrorNotice message="Stock levels could not be loaded." onRetry={onRetry} />
        </div>
      ) : !loading && products.length === 0 ? (
        <EmptyState
          title="Every product is well stocked"
          message={`Products will show up here when they drop under ${threshold} units.`}
        />
      ) : (
        <div className={styles.tableScroll}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">SKU</th>
                <th scope="col">Units left</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows rows={4} columns={4} />
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <span className={table.primary}>{product.name}</span>
                      <span className={table.secondary}>{product.category}</span>
                    </td>
                    <td className={table.code}>{product.sku}</td>
                    <td>
                      <div className={styles.meter}>
                        <span className={styles.meterValue}>{product.stock}</span>
                        <span className={styles.meterTrack} aria-hidden="true">
                          <span
                            className={styles.meterFill}
                            style={{
                              width: `${Math.min(100, (product.stock / threshold) * 100)}%`,
                            }}
                          />
                        </span>
                      </div>
                    </td>
                    <td>
                      <StockBadge stock={product.stock} threshold={threshold} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
