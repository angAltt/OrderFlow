const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat('en-US');
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const formatCurrency = (value) => currency.format(Number(value) || 0);
export const formatCurrencyRounded = (value) => compactCurrency.format(Number(value) || 0);
export const formatNumber = (value) => integer.format(Number(value) || 0);
export const formatDate = (value) => (value ? shortDate.format(new Date(value)) : '');
