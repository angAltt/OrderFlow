const ORDER_STATUSES = Object.freeze(['Pending', 'Shipped', 'Delivered', 'Cancelled']);

/**
 * Allowed status transitions. Delivered and Cancelled are final states.
 */
const STATUS_TRANSITIONS = Object.freeze({
  Pending: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'], // goods already left the warehouse, so no cancel
  Delivered: [],
  Cancelled: [],
});

/**
 * Input limits. String lengths match the column sizes in schema.sql, so invalid
 * input is rejected with a clear 400 before it ever reaches MySQL.
 */
const LIMITS = Object.freeze({
  SKU: 50,
  PRODUCT_NAME: 150,
  CATEGORY: 80,
  DESCRIPTION: 2000,
  CUSTOMER_NAME: 120,
  EMAIL: 150,
  MAX_PRICE: 999999.99,
  MAX_STOCK: 1000000,
  MAX_QUANTITY: 1000,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value, maxLength = Infinity) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

const isPositiveInt = (value, max = Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(value) && value > 0 && value <= max;

const isNonNegativeInt = (value, max = Number.MAX_SAFE_INTEGER) =>
  Number.isInteger(value) && value >= 0 && value <= max;

const isValidPrice = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= LIMITS.MAX_PRICE;

const isValidEmail = (value) =>
  typeof value === 'string' && value.length <= LIMITS.EMAIL && EMAIL_REGEX.test(value);

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Builds a "contains" pattern for LIKE. Escapes %, _ and \ so a search for "50%"
 * matches that text instead of acting as a wildcard.
 */
const toLikePattern = (value) => `%${value.trim().replace(/[\\%_]/g, '\\$&')}%`;

module.exports = {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  LIMITS,
  isNonEmptyString,
  isPositiveInt,
  isNonNegativeInt,
  isValidPrice,
  isValidEmail,
  parseId,
  toLikePattern,
};
