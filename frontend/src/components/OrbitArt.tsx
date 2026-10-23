import styles from './OrbitArt.module.css';
/** Dos señales forman una conexión nueva: símbolo visual de Nexo. */
export function OrbitArt({ small = false }: { small?: boolean }) {
  return (
    <div className={`${styles.orbit} ${small ? styles.small : ''}`} aria-hidden="true" data-depth>
      <svg viewBox="0 0 420 420" fill="none">
        <circle cx="210" cy="210" r="178" stroke="currentColor" strokeDasharray="2 10" />
        <g className={styles.signal}>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse
              key={i}
              cx="210"
              cy="210"
              rx="70"
              ry="151"
              transform={`rotate(${i * 15} 210 210)`}
              stroke="#e5ff55"
              strokeWidth="2"
            />
          ))}
        </g>
        <circle cx="210" cy="210" r="39" fill="#ff623c" />
        <path d="M191 210h38m-19-19v38" stroke="#191921" strokeWidth="5" />
        <path d="M40 60h36m-18-18v36M344 348h36m-18-18v36" stroke="currentColor" />
        <circle cx="342" cy="106" r="13" fill="#f4f0e6" />
        <path d="M83 325l22-22m-22 0h22v22" stroke="#ff623c" strokeWidth="4" />
      </svg>
      <span className={styles.caption}>SEÑALES DISTINTAS. UN NEXO.</span>
    </div>
  );
}
