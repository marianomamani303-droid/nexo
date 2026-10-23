import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAction } from '../hooks/useAction';
import { mutate } from '../services/rest-social-api';
import { ActionError } from '../components/ActionError';

export function CreateCommunity() {
  const action = useAction();
  const navigate = useNavigate();
  return (
    <section className="card text-panel">
      <h1>Crear comunidad</h1>
      <form
        className="social-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void action.run(async () => {
            const result = z.object({ id: z.string() }).parse(
              await mutate('/communities', 'POST', {
                name: form.get('name'),
                slug: form.get('slug'),
                description: form.get('description'),
                visibility: form.get('visibility'),
                category: form.get('category') || undefined,
              }),
            );
            navigate('/comunidades/' + result.id);
          });
        }}
      >
        <label>
          Nombre
          <input name="name" required minLength={2} maxLength={120} />
        </label>
        <label>
          Identificador público
          <input
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9_-]{1,79}"
            maxLength={80}
            placeholder="mi-comunidad"
          />
        </label>
        <label>
          Descripción
          <textarea name="description" required maxLength={5000} />
        </label>
        <label>
          Categoría
          <input name="category" maxLength={80} />
        </label>
        <label>
          Privacidad
          <select name="visibility">
            <option value="public">Pública</option>
            <option value="private">Privada</option>
          </select>
        </label>
        <ActionError error={action.error} />
        <button className="button primary" disabled={action.pending}>
          Crear comunidad
        </button>
      </form>
    </section>
  );
}
