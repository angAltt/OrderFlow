import Button from '@/components/ui/Button';
import StockBadge from '@/components/ui/StockBadge';
import { LoadingRows } from '@/components/ui/States';
import { formatCurrency, formatNumber } from '@/lib/format';
import table from '@/components/ui/Table.module.scss';

export default function ProductTable({ products, threshold, loading, isAdmin, onEdit, onDelete }) {
  const columns = isAdmin ? 6 : 5;

  return (
    <div className={table.wrap}>
      <table className={table.table}>
        <thead>
          <tr>
            <th scope="col">SKU</th>
            <th scope="col">Product</th>
            <th scope="col" className={table.num}>
              Price
            </th>
            <th scope="col" className={table.num}>
              Stock
            </th>
            <th scope="col">Status</th>
            {isAdmin && (
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRows rows={6} columns={columns} />
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td className={table.code}>{product.sku}</td>
                <td>
                  <span className={table.primary}>{product.name}</span>
                  <span className={table.secondary}>{product.category || 'No category'}</span>
                </td>
                <td className={table.num}>{formatCurrency(product.price)}</td>
                <td className={`${table.num} ${table.primary}`}>{formatNumber(product.stock)}</td>
                <td>
                  <StockBadge stock={product.stock} threshold={threshold} />
                </td>
                {isAdmin && (
                  <td>
                    <div className={table.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                        aria-label={`Edit ${product.name}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
