'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createOrder } from '@/store/slices/ordersSlice';
import { fetchProducts, selectProducts } from '@/store/slices/inventorySlice';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Field, { fieldStyles } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import styles from './Orders.module.scss';

const MAX_QUANTITY = 1000; // same limit as the API
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let lineKey = 0;
const newLine = () => ({ key: ++lineKey, productId: '', quantity: '1' });

export default function NewOrderModal({ onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const products = useSelector(selectProducts);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lines, setLines] = useState(() => [newLine()]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fresh stock numbers every time the form opens
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const total = lines.reduce((sum, line) => {
    const product = productById.get(Number(line.productId));
    return product ? sum + product.price * (Number(line.quantity) || 0) : sum;
  }, 0);

  const updateLine = (key, changes) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
    setErrors((current) => ({ ...current, [`line-${key}`]: undefined, items: undefined }));
  };

  const removeLine = (key) => setLines((current) => current.filter((line) => line.key !== key));

  const validate = () => {
    const found = {};
    if (!customerName.trim()) found.customerName = 'Enter the customer name';
    if (customerEmail.trim() && !EMAIL_REGEX.test(customerEmail.trim())) {
      found.customerEmail = 'Enter a valid email or leave it empty';
    }

    const usedIds = new Set();
    lines.forEach((line) => {
      const product = productById.get(Number(line.productId));
      const quantity = Number(line.quantity);
      if (!product) found[`line-${line.key}`] = 'Choose a product';
      else if (usedIds.has(product.id))
        found[`line-${line.key}`] = 'This product is already in the order';
      else if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        found[`line-${line.key}`] = `Quantity must be between 1 and ${MAX_QUANTITY}`;
      } else if (quantity > product.stock) {
        found[`line-${line.key}`] = `Only ${product.stock} units left`;
      }
      if (product) usedIds.add(product.id);
    });
    if (lines.length === 0) found.items = 'Add at least one product';
    return found;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const order = await dispatch(
        createOrder({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          items: lines.map((line) => ({
            productId: Number(line.productId),
            quantity: Number(line.quantity),
          })),
        }),
      ).unwrap();
      toast.success(`Order ${order.order_number} created. Stock updated.`);
      dispatch(fetchProducts());
      onClose();
    } catch (error) {
      // 409 from the API: someone else took the stock first, the whole order was rolled back
      const insufficient = error.details?.insufficient;
      setFormError(
        insufficient
          ? `Not enough stock: ${insufficient
              .map((item) => `${item.name} (${item.available} left)`)
              .join(', ')}. Nothing was saved.`
          : error.message,
      );
      dispatch(fetchProducts());
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title="New order"
      size="lg"
      footer={
        <>
          <span className={styles.footerTotal}>
            Total <strong>{formatCurrency(total)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="order-form" loading={saving}>
            Create order
          </Button>
        </>
      }
    >
      <form id="order-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <div className={styles.formRow}>
          <Field id="customerName" label="Customer name" error={errors.customerName}>
            {(props) => (
              <input
                {...props}
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setErrors((c) => ({ ...c, customerName: undefined }));
                }}
              />
            )}
          </Field>
          <Field id="customerEmail" label="Email (optional)" error={errors.customerEmail}>
            {(props) => (
              <input
                {...props}
                type="email"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  setErrors((c) => ({ ...c, customerEmail: undefined }));
                }}
              />
            )}
          </Field>
        </div>

        <fieldset className={styles.lines}>
          <legend>Products</legend>
          {lines.map((line, index) => {
            const product = productById.get(Number(line.productId));
            const error = errors[`line-${line.key}`];
            return (
              <div key={line.key} className={styles.line}>
                <div className={styles.lineProduct}>
                  <label htmlFor={`product-${line.key}`} className="visually-hidden">
                    Product {index + 1}
                  </label>
                  <select
                    id={`product-${line.key}`}
                    className={`${fieldStyles.control} ${error ? fieldStyles.invalid : ''}`}
                    value={line.productId}
                    onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `line-error-${line.key}` : undefined}
                  >
                    <option value="">Choose a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stock === 0}>
                        {`${p.name}, ${formatCurrency(p.price)} (${p.stock === 0 ? 'out of stock' : `${p.stock} left`})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.lineQuantity}>
                  <label htmlFor={`quantity-${line.key}`} className="visually-hidden">
                    Quantity for product {index + 1}
                  </label>
                  <input
                    id={`quantity-${line.key}`}
                    className={fieldStyles.control}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={product?.stock || MAX_QUANTITY}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  />
                </div>
                <span className={styles.lineSubtotal}>
                  {product ? formatCurrency(product.price * (Number(line.quantity) || 0)) : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  aria-label={`Remove product ${index + 1}`}
                >
                  Remove
                </Button>
                {error && (
                  <p id={`line-error-${line.key}`} className={styles.lineError}>
                    {error}
                  </p>
                )}
              </div>
            );
          })}
          {errors.items && <p className={styles.lineError}>{errors.items}</p>}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLines((current) => [...current, newLine()])}
            disabled={lines.length >= products.length}
          >
            Add another product
          </Button>
        </fieldset>
      </form>
    </Modal>
  );
}
