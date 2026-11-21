import styles from './Button.module.scss';

/**
 * variant: primary | accent | secondary | ghost | danger
 * size: lg | md | sm
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = [styles.button, styles[variant], styles[size], className].join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
