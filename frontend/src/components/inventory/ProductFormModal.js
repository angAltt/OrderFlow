'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createProduct, selectCategories, updateProduct } from '@/store/slices/inventorySlice';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import styles from './Inventory.module.scss';

// Same limits as the API (backend/src/utils/validators.js)
const LIMITS = {
  sku: 50,
  name: 150,
  category: 80,
  description: 2000,
  price: 999999.99,
  stock: 1000000,
};

const toForm = (product) => ({
  sku: product?.sku ?? '',
  name: product?.name ?? '',
  category: product?.category ?? '',
  price: product ? String(product.price) : '',
  stock: product ? String(product.stock) : '',
  description: product?.description ?? '',
});

function validate(form) {
  const errors = {};
  const price = Number(form.price);
  const stock = Number(form.stock);

  if (!form.sku.trim()) errors.sku = 'Enter a SKU';
  else if (form.sku.trim().length > LIMITS.sku)
    errors.sku = `Use ${LIMITS.sku} characters or fewer`;

  if (!form.name.trim()) errors.name = 'Enter a product name';
  else if (form.name.trim().length > LIMITS.name)
    errors.name = `Use ${LIMITS.name} characters or fewer`;

  if (form.category.trim().length > LIMITS.category) {
    errors.category = `Use ${LIMITS.category} characters or fewer`;
  }

  if (form.price === '' || Number.isNaN(price)) errors.price = 'Enter a price';
  else if (price < 0 || price > LIMITS.price)
    errors.price = 'Price must be between 0 and 999,999.99';

  if (form.stock === '' || !Number.isInteger(stock)) errors.stock = 'Enter a whole number';
  else if (stock < 0 || stock > LIMITS.stock)
    errors.stock = 'Stock must be between 0 and 1,000,000';

  if (form.description.length > LIMITS.description) {
    errors.description = `Use ${LIMITS.description} characters or fewer`;
  }

  return errors;
}

function toPayload(form) {
  return {
    sku: form.sku.trim().toUpperCase(),
    name: form.name.trim(),
    // Same default as the products.category column in schema.sql
    category: form.category.trim() || 'General',
    price: Number(form.price),
    stock: Number(form.stock),
    description: form.description.trim() || null,
  };
}

/** Only the fields that changed are sent in the PATCH request. */
function diff(payload, product) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key, value]) => value !== undefined && value !== (product[key] ?? null),
    ),
  );
}

export default function ProductFormModal({ product, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const categories = useSelector(selectCategories);
  const isEdit = Boolean(product);

  const [form, setForm] = useState(() => toForm(product));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const setField = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    const payload = toPayload(form);
    const changes = isEdit ? diff(payload, product) : payload;
    if (isEdit && Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const saved = isEdit
        ? await dispatch(updateProduct({ id: product.id, changes })).unwrap()
        : await dispatch(createProduct(changes)).unwrap();
      toast.success(isEdit ? `${saved.name} updated` : `${saved.name} added to inventory`);
      onClose();
    } catch (error) {
      // Field errors from the API (400) go next to each field
      if (error.details && typeof error.details === 'object') setErrors(error.details);
      setFormError(error.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title={isEdit ? `Edit ${product.name}` : 'Add a product'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <div className={styles.formRow}>
          <Field id="sku" label="SKU" error={errors.sku} hint="Unique code, for example ACC-010">
            {(props) => (
              <input {...props} value={form.sku} onChange={setField('sku')} autoComplete="off" />
            )}
          </Field>
          <Field
            id="category"
            label="Category"
            error={errors.category}
            hint="Leave it empty to use General"
          >
            {(props) => (
              <>
                <input
                  {...props}
                  list="category-options"
                  value={form.category}
                  onChange={setField('category')}
                  autoComplete="off"
                />
                <datalist id="category-options">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>

        <Field id="name" label="Product name" error={errors.name}>
          {(props) => <input {...props} value={form.name} onChange={setField('name')} />}
        </Field>

        <div className={styles.formRow}>
          <Field id="price" label="Price (USD)" error={errors.price}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.price}
                onChange={setField('price')}
              />
            )}
          </Field>
          <Field id="stock" label="Units in stock" error={errors.stock}>
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.stock}
                onChange={setField('stock')}
              />
            )}
          </Field>
        </div>

        <Field id="description" label="Description" error={errors.description}>
          {(props) => (
            <textarea {...props} value={form.description} onChange={setField('description')} />
          )}
        </Field>
      </form>
    </Modal>
  );
}
