'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAdmin } from '@/store/slices/authSlice';
import { fetchProducts } from '@/store/slices/inventorySlice';
import {
  fetchOrders,
  orderSearchChanged,
  selectOrdersState,
  selectVisibleOrders,
  statusFilterChanged,
  updateOrderStatus,
} from '@/store/slices/ordersSlice';
import { ORDER_STATUSES } from '@/lib/orderStatus';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import { EmptyState, ErrorNotice } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import NewOrderModal from './NewOrderModal';
import OrdersTable from './OrdersTable';
import styles from './Orders.module.scss';

const FILTERS = ['All', ...ORDER_STATUSES];

export default function OrdersView() {
  const dispatch = useDispatch();
  const toast = useToast();
  const isAdmin = useSelector(selectIsAdmin);
  const { items, status, error, statusFilter, search, updatingIds } =
    useSelector(selectOrdersState);
  const orders = useSelector(selectVisibleOrders);

  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    dispatch(fetchOrders(statusFilter));
  }, [dispatch, statusFilter]);

  const applyStatus = async (order, nextStatus) => {
    try {
      await dispatch(updateOrderStatus({ id: order.id, status: nextStatus })).unwrap();
      toast.success(`${order.order_number} marked as ${nextStatus}`);
      // Cancelling puts the units back in stock
      if (nextStatus === 'Cancelled') dispatch(fetchProducts());
    } catch (err) {
      toast.error(`${order.order_number} was not updated: ${err.message}`);
    }
  };

  const handleStatusChange = (order, nextStatus) => {
    if (nextStatus === order.status) return;
    // Cancelling cannot be undone, so it asks first
    if (nextStatus === 'Cancelled') setCancelling(order);
    else applyStatus(order, nextStatus);
  };

  const loading = status === 'loading';

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          isAdmin
            ? 'Track every order and move it forward from the status column.'
            : 'You are signed in as a viewer, so statuses are read only.'
        }
        actions={isAdmin && <Button onClick={() => setCreating(true)}>New order</Button>}
      />

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Filter by status">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={statusFilter === filter}
              className={statusFilter === filter ? styles.tabActive : ''}
              onClick={() => dispatch(statusFilterChanged(filter))}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className={styles.search}>
          <label htmlFor="order-search" className="visually-hidden">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            placeholder="Order number, customer or email"
            value={search}
            onChange={(e) => dispatch(orderSearchChanged(e.target.value))}
            autoComplete="off"
          />
        </div>
      </div>

      {error && <ErrorNotice message={error} onRetry={() => dispatch(fetchOrders(statusFilter))} />}

      {!loading && !error && orders.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            title={
              search
                ? 'No orders match your search'
                : statusFilter === 'All'
                  ? 'No orders yet'
                  : `No ${statusFilter.toLowerCase()} orders`
            }
            message={
              search
                ? 'Try an order number like ORD-1001 or part of a customer name.'
                : statusFilter === 'All'
                  ? 'Orders show up here as soon as they are created.'
                  : 'Orders with this status will show up here.'
            }
          />
        </div>
      ) : (
        !error && (
          <>
            <OrdersTable
              orders={orders}
              loading={loading && items.length === 0}
              refreshing={loading && items.length > 0}
              isAdmin={isAdmin}
              updatingIds={updatingIds}
              onStatusChange={handleStatusChange}
            />
            {!loading && (
              <p className={styles.resultCount}>
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </p>
            )}
          </>
        )
      )}

      {creating && <NewOrderModal onClose={() => setCreating(false)} />}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={cancelling ? `Cancel ${cancelling.order_number}?` : ''}
        message="The units go back to stock and the order cannot be reopened."
        confirmLabel="Cancel order"
        onConfirm={() => {
          applyStatus(cancelling, 'Cancelled');
          setCancelling(null);
        }}
        onCancel={() => setCancelling(null)}
      />
    </>
  );
}
