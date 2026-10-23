import { Link } from 'react-router-dom';
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? 'brand-inverse' : ''}`} to="/" aria-label="Nexo, inicio">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M7 24V8h7l11 16h-7L7 8"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M25 8v16" stroke="currentColor" strokeWidth="4" />
      </svg>
      <span>
        nexo<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
