export const STOCK_LEVELS = {
  out: { label: 'Out of stock' },
  low: { label: 'Low stock' },
  ok: { label: 'In stock' },
};

export function getStockLevel(stock, threshold) {
  if (stock <= 0) return 'out';
  if (stock < threshold) return 'low';
  return 'ok';
}
