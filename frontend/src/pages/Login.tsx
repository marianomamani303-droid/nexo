import { useSession } from '../hooks/useSession';
import { useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { useNotice } from '../hooks/useNotice';
import styles from '../layouts/AuthLayout.module.css';

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();
  const notify = useNotice();

  const [email, setemail] = useState('');
  const [password, setpassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const { login, user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const destination =
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !from.startsWith('/login') &&
    !from.startsWith('/registro')
      ? from
      : '/';
  if (user) return <Navigate to={destination} replace />;

  return (
    <AuthLayout
      identity="login"
      eyebrow="HAY UN LUGAR PARA VOS"
      title={
        <>
          Volvé a lo que
          <br />
          te <em>conecta.</em>
        </>
      }
      description="Tu espacio de ideas y conexiones te espera."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          setPending(true);
          setError('');
          try {
            await login(email, password);
            navigate(destination, { replace: true });
          } catch (error) {
            setError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor={id + 'email'}>
          Correo electrónico
          <input
            id={id + 'email'}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vos@ejemplo.com"
            required
            maxLength={254}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setemail(e.target.value);
            }}
          />
        </label>
        <label htmlFor={id + 'password'}>Contraseña</label>
        <div className={styles.passwordField}>
          <input
            id={id + 'password'}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            minLength={1}
            maxLength={128}
            required
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setpassword(e.target.value);
            }}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <button className={styles.forgot} type="button" onClick={() => notify()}>
          ¿Olvidaste tu contraseña?
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button disabled={pending} type="submit" className={`button primary ${styles.submit}`}>
          {pending ? 'Ingresando…' : 'Iniciar sesión'}
          <ArrowUpRight size={16} />
        </button>
      </form>
      <p className={styles.switch}>
        ¿Todavía no tenés cuenta?
        <Link to="/registro">
          Creá la tuya
          <ArrowUpRight size={13} />
        </Link>
      </p>
    </AuthLayout>
  );
}
