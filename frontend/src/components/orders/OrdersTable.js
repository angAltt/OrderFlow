import StatusBadge from '@/components/ui/StatusBadge';
import { LoadingRows } from '@/components/ui/States';
import { formatCurrency, formatDate } from '@/lib/format';
import { isFinalStatus } from '@/lib/orderStatus';
import table from '@/components/ui/Table.module.scss';
import StatusSelect from './StatusSelect';

export default function OrdersTable({
  orders,
  loading,
  refreshing,
  isAdmin,
  updatingIds,
  onStatusChange,
}) {
  // While another status filter loads, the old rows fade so they are not taken as results
  return (
    <div className={`${table.wrap} ${refreshing ? table.refreshing : ''}`} aria-busy={refreshing}>
      <table className={table.table}>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Customer</th>
            <th scope="col">Date</th>
            <th scope="col" className={table.num}>
              Units
            </th>
            <th scope="col" className={table.num}>
              Total
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRows rows={6} columns={6} />
          ) : (
            orders.map((order) => (
              <tr key={order.id}>
                <td className={table.code}>{order.order_number}</td>
                <td>
                  <span className={table.primary}>{order.customer_name}</span>
                  {order.customer_email && (
                    <span className={table.secondary}>{order.customer_email}</span>
                  )}
                </td>
                <td>
                  <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                </td>
                <td className={table.num}>{order.total_units}</td>
                <td className={`${table.num} ${table.primary}`}>
                  {formatCurrency(order.total_amount)}
                </td>
                <td>
                  {isAdmin && !isFinalStatus(order.status) ? (
                    <StatusSelect
                      order={order}
                      disabled={Boolean(updatingIds[order.id])}
                      onChange={onStatusChange}
                    />
                  ) : (
                    <StatusBadge status={order.status} />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
