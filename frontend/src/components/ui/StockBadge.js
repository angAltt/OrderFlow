import { STOCK_LEVELS, getStockLevel } from '@/lib/stock';
import styles from './Badges.module.scss';

/** Color-coded stock level: in stock, low stock or out of stock. */
export default function StockBadge({ stock, threshold }) {
  const level = getStockLevel(stock, threshold);
  return (
    <span className={`${styles.stock} ${styles[`stock-${level}`]}`}>
      {STOCK_LEVELS[level].label}
    </span>
  );
}
