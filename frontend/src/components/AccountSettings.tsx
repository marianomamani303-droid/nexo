import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useAction } from '../hooks/useAction';
import { request } from '../services/http-client';
import { ActionError } from './ActionError';

export function AccountSettings() {
  const session = useSession();
  const action = useAction();
  return (
    <section className="card settings-section">
      <h2>Tu cuenta</h2>
      <p>
        {session.user?.name} · {session.user?.email}
      </p>
      <Link className="button secondary" to="/perfil">
        Editar perfil
      </Link>
      <h3>Cambiar contraseña</h3>
      <p>El cambio cierra todas tus sesiones. Tendrás que iniciar sesión nuevamente.</p>
      <form
        className="social-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void action.run(async () => {
            if (form.get('newPassword') !== form.get('confirmation'))
              throw new Error('Las contraseñas no coinciden.');
            await request('/auth/password', {
              currentPassword: form.get('currentPassword'),
              newPassword: form.get('newPassword'),
            });
            session.retry();
          });
        }}
      >
        <label>
          Contraseña actual
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <label>
          Nueva contraseña
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
          />
        </label>
        <label>
          Repetir nueva contraseña
          <input
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
          />
        </label>
        <ActionError error={action.error} />
        <button className="button primary" disabled={action.pending}>
          Cambiar contraseña
        </button>
      </form>
      <Link to="/notificaciones">Ver y administrar notificaciones</Link>
    </section>
  );
}
