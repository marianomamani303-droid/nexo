import { useId, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { useSession } from '../hooks/useSession';
import styles from '../layouts/AuthLayout.module.css';

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setemail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const id = useId();
  const { register, user } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  if (user) return <Navigate to="/" replace />;

  return (
    <AuthLayout
      identity="register"
      eyebrow="TU PRÓXIMA CONEXIÓN EMPIEZA ACÁ"
      title={
        <>
          Hacé espacio
          <br />
          para <em>algo nuevo.</em>
        </>
      }
      description="Sumá tu perspectiva. Cada idea cuenta."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (password !== confirmation) {
            setError('Las contraseñas no coinciden.');
            return;
          }
          if (pending) return;
          setError('');
          setPending(true);
          try {
            await register(name, email, password);
            navigate('/', { replace: true });
          } catch (error) {
            setError(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor={id + 'name'}>
          Nombre completo
          <input
            id={id + 'name'}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Tu nombre y apellido"
            required
            minLength={2}
            maxLength={80}
          />
        </label>
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
            onChange={(event) => {
              setemail(event.target.value);
              setError('');
            }}
          />
        </label>
        <label htmlFor={id + 'password'}>Contraseña</label>
        <div className={styles.passwordField}>
          <input
            id={id + 'password'}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Al menos 8 caracteres"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
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
        <label htmlFor={id + 'confirm'}>
          Repetí tu contraseña
          <input
            id={id + 'confirm'}
            name="passwordConfirmation"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Una vez más"
            required
            maxLength={128}
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError('');
            }}
            aria-invalid={!!error}
            aria-describedby={error ? id + 'error' : undefined}
          />
        </label>
        {error && (
          <p className="form-error" id={id + 'error'} role="alert">
            {error}
          </p>
        )}
        <button disabled={pending} type="submit" className={`button primary ${styles.submit}`}>
          {pending ? 'Creando cuenta…' : 'Crear mi cuenta'}
          <ArrowUpRight size={16} />
        </button>
      </form>
      <p className={styles.switch}>
        ¿Ya tenés cuenta?
        <Link to="/login">
          Iniciá sesión
          <ArrowUpRight size={13} />
        </Link>
      </p>
    </AuthLayout>
  );
}
