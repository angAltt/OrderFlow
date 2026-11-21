'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAdmin } from '@/store/slices/authSlice';
import {
  categoryChanged,
  deleteProduct,
  fetchProducts,
  filtersCleared,
  searchChanged,
  selectCategories,
  selectFilteredProducts,
  selectInventory,
  stockLevelChanged,
} from '@/store/slices/inventorySlice';
import { getStockLevel } from '@/lib/stock';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import { EmptyState, ErrorNotice } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import ProductFormModal from './ProductFormModal';
import ProductTable from './ProductTable';
import styles from './Inventory.module.scss';

export default function InventoryView() {
  const dispatch = useDispatch();
  const toast = useToast();
  const isAdmin = useSelector(selectIsAdmin);
  const { items, status, error, filters, lowStockThreshold } = useSelector(selectInventory);
  const products = useSelector(selectFilteredProducts);
  const categories = useSelector(selectCategories);

  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const counts = useMemo(() => {
    const levels = items.map((p) => getStockLevel(p.stock, lowStockThreshold));
    return {
      low: levels.filter((level) => level !== 'ok').length,
      out: levels.filter((level) => level === 'out').length,
    };
  }, [items, lowStockThreshold]);

  const stockOptions = [
    { value: 'all', label: 'All', count: items.length },
    { value: 'low', label: 'Low stock', count: counts.low },
    { value: 'out', label: 'Out of stock', count: counts.out },
  ];

  const hasFilters =
    filters.search.trim() !== '' || filters.stockLevel !== 'all' || filters.category !== 'all';
  const loading = status === 'loading' && items.length === 0;

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await dispatch(deleteProduct(deleting.id)).unwrap();
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Inventory"
        description={
          isAdmin
            ? 'Search, add and edit products. Stock goes down on its own when an order is created.'
            : 'You are signed in as a viewer, so products are read only.'
        }
        actions={isAdmin && <Button onClick={() => setEditing('new')}>Add product</Button>}
      />

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <label htmlFor="product-search" className="visually-hidden">
            Search products
          </label>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M13.5 13.5L18 18" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            id="product-search"
            type="search"
            placeholder="Search by name, SKU or category"
            value={filters.search}
            onChange={(e) => dispatch(searchChanged(e.target.value))}
            autoComplete="off"
          />
        </div>

        <div className={styles.segmented} role="group" aria-label="Filter by stock level">
          {stockOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filters.stockLevel === option.value ? styles.segmentActive : ''}
              aria-pressed={filters.stockLevel === option.value}
              onClick={() => dispatch(stockLevelChanged(option.value))}
            >
              {option.label}
              <span className={styles.segmentCount}>{option.count}</span>
            </button>
          ))}
        </div>

        <label htmlFor="category-filter" className="visually-hidden">
          Category
        </label>
        <select
          id="category-filter"
          className={styles.select}
          value={filters.category}
          onChange={(e) => dispatch(categoryChanged(e.target.value))}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorNotice message={error} onRetry={() => dispatch(fetchProducts())} />}

      {!loading && !error && products.length === 0 ? (
        <div className={styles.emptyWrap}>
          {hasFilters ? (
            <EmptyState
              title="No products match these filters"
              message="Try another search term or clear the filters."
              action={
                <Button variant="secondary" size="sm" onClick={() => dispatch(filtersCleared())}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No products yet"
              message={isAdmin ? 'Add your first product to start tracking stock.' : undefined}
              action={isAdmin && <Button onClick={() => setEditing('new')}>Add product</Button>}
            />
          )}
        </div>
      ) : (
        !error && (
          <>
            <ProductTable
              products={products}
              threshold={lowStockThreshold}
              loading={loading}
              isAdmin={isAdmin}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
            {!loading && (
              <p className={styles.resultCount} aria-live="polite">
                Showing {products.length} of {items.length} products
                {hasFilters && (
                  <button type="button" onClick={() => dispatch(filtersCleared())}>
                    Clear filters
                  </button>
                )}
              </p>
            )}
          </>
        )
      )}

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this product?"
        message={
          deleting &&
          `${deleting.name} (${deleting.sku}) will be removed from inventory. Past orders keep their line items.`
        }
        confirmLabel="Delete product"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
