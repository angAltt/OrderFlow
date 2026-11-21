import styles from './Field.module.scss';

/**
 * Label + control + error message. The control is passed as a render function
 * so it receives the id and the aria attributes that link it to the error.
 */
export default function Field({ id, label, error, hint, className = '', children }) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        className: `${styles.control} ${error ? styles.invalid : ''}`,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export { styles as fieldStyles };
