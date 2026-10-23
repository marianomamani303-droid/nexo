import { ArrowUpRight, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './EmptyState.module.css';
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; to?: string; onClick?: () => void };
  compact?: boolean;
  variant?: 'feed' | 'default';
}
export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  compact = false,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <section className={`${styles.empty} ${compact ? styles.compact : ''}`} data-reveal>
      <div className={styles.art} aria-hidden="true">
        {variant === 'feed' && (
          <>
            <span className={styles.paperBack} />
            <span className={styles.paper}>
              <i />
              <i />
              <i />
            </span>
          </>
        )}
        <span className={styles.symbol}>
          <Icon size={26} strokeWidth={1.35} />
        </span>
        <span className={styles.star}>✳</span>
      </div>
      <span className="eyebrow">
        {variant === 'feed' ? 'EL COMIENZO DE ALGO BUENO' : 'ESPACIO PARA LO QUE VIENE'}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action &&
        (action.to ? (
          <Link className="button secondary" to={action.to} data-hover>
            {action.label}
            <ArrowUpRight size={15} />
          </Link>
        ) : (
          <button className="button secondary" onClick={action.onClick} data-hover>
            {action.label}
            <ArrowUpRight size={15} />
          </button>
        ))}
    </section>
  );
}
