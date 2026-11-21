import Button from './Button';
import styles from './States.module.scss';

export function LoadingRows({ rows = 5, columns = 5 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={row} className={styles.loadingRow} aria-hidden="true">
      {Array.from({ length: columns }, (_, col) => (
        <td key={col}>
          <span className={styles.bar} />
        </td>
      ))}
    </tr>
  ));
}

export function EmptyState({ title, message, action }) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.message}>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }) {
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
