import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Leaf, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Brand';
import { OrbitArt } from '../components/OrbitArt';
import { useEntrance, useDepth } from '../animations/useMotion';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  identity: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
}

export function AuthLayout({ identity, eyebrow, title, description, children }: AuthLayoutProps) {
  const root = useEntrance<HTMLDivElement>(identity);
  const story = useDepth<HTMLElement>();

  return (
    <div className={styles.authPage} ref={root} data-motion-scope>
      <aside className={styles.story} ref={story}>
        <Brand inverse />
        <span className={styles.storyLabel}>PERSONAS FUERA DEL MOLDE</span>
        <div className={styles.storyContent} data-reveal>
          <span className="eyebrow">UN ESPACIO PARA LO QUE VIENE</span>
          <h1>
            Las voces
            <br />
            no vienen
            <br />
            <em>en serie.</em>
          </h1>
          <p>
            Compartí lo que te mueve.
            <br />
            Encontrá a quienes te inspiran.
          </p>
        </div>
        <div className={styles.art}>
          <OrbitArt />
        </div>
        <div className={styles.storyFooter}>
          <Leaf size={15} />
          <span>MENOS RUIDO. MÁS CONEXIÓN.</span>
          <span>NEXO © {new Date().getFullYear()}</span>
        </div>
      </aside>
      <main className={styles.main}>
        <Link className="back-link" to="/">
          <ArrowLeft size={15} />
          Volver a Nexo
        </Link>
        <div className={styles.formWrap} data-reveal>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {children}
          <div className={styles.notice}>
            <ShieldCheck size={17} />
            <p>Tu sesión se protege con una cookie HttpOnly. Nunca compartas tu contraseña.</p>
          </div>
        </div>
        <span className={styles.footer}>Diseñado para conectar. Preparado para crecer.</span>
      </main>
    </div>
  );
}
