// Mirrors STATUS_TRANSITIONS in backend/src/utils/validators.js.
// The API is the source of truth and rejects invalid changes with 409;
// this copy only decides which options the dropdown shows.
export const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

export const STATUS_TRANSITIONS = {
  Pending: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export const isFinalStatus = (status) => STATUS_TRANSITIONS[status]?.length === 0;
