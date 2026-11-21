import styles from './Badges.module.scss';

/** Order status shown as a small shipping tag. */
export default function StatusBadge({ status }) {
  return <span className={`${styles.tag} ${styles[status?.toLowerCase()]}`}>{status}</span>;
}
