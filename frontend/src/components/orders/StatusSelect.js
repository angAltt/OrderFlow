'use client';

import { STATUS_TRANSITIONS } from '@/lib/orderStatus';
import styles from './Orders.module.scss';

/**
 * Quick status dropdown. It only lists the current status and the ones it can
 * move to, so invalid changes are not even offered.
 */
export default function StatusSelect({ order, disabled, onChange }) {
  const options = [order.status, ...STATUS_TRANSITIONS[order.status]];

  return (
    <div className={`${styles.statusSelect} ${styles[order.status.toLowerCase()]}`}>
      <label htmlFor={`status-${order.id}`} className="visually-hidden">
        Status of order {order.order_number}
      </label>
      <select
        id={`status-${order.id}`}
        value={order.status}
        disabled={disabled}
        onChange={(event) => onChange(order, event.target.value)}
      >
        {options.map((status) => (
          <option key={status} value={status}>
            {status === order.status ? status : `Mark as ${status}`}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </div>
  );
}
