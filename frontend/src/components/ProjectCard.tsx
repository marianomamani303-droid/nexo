import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useAction } from '../hooks/useAction';
import { mutate, projectSchema } from '../services/rest-social-api';
import type { z } from 'zod';
import { Modal } from './Modal';
import { ActionError } from './ActionError';

type ProjectDocument = z.infer<typeof projectSchema>;
export function ProjectEditor({
  project,
  onSaved,
}: {
  project?: ProjectDocument;
  onSaved: () => void;
}) {
  const action = useAction();
  return (
    <form
      className="social-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void action.run(async () => {
          await mutate(
            project ? '/projects/' + project.id : '/projects',
            project ? 'PATCH' : 'POST',
            {
              title: form.get('title'),
              description: form.get('description'),
              status: form.get('status'),
              visibility: form.get('visibility'),
            },
          );
          onSaved();
        });
      }}
    >
      <label>
        Título
        <input name="title" required maxLength={160} defaultValue={project?.title} />
      </label>
      <label>
        Descripción
        <textarea
          name="description"
          required
          maxLength={20000}
          defaultValue={project?.description}
        />
      </label>
      <label>
        Estado
        <select name="status" defaultValue={project?.status || 'draft'}>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </select>
      </label>
      <label>
        Visibilidad
        <select name="visibility" defaultValue={project?.visibility || 'public'}>
          <option value="public">Público</option>
          <option value="followers">Seguidores</option>
        </select>
      </label>
      <ActionError error={action.error} />
      <button className="button primary" disabled={action.pending}>
        {action.pending ? 'Guardando…' : 'Guardar proyecto'}
      </button>
    </form>
  );
}
export function ProjectCard({ project }: { project: ProjectDocument }) {
  const { user } = useSession();
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <article className="card project-card">
      <h3>{project.title}</h3>
      <p className="post-content">{project.description}</p>
      <small>
        {project.status === 'draft'
          ? 'Borrador privado'
          : project.status === 'archived'
            ? 'Archivado'
            : project.visibility === 'followers'
              ? 'Solo seguidores'
              : 'Publicado'}
      </small>
      {user?.id === project.authorId && (
        <div className="inline-actions">
          <button onClick={() => setEditing(true)}>Editar proyecto</button>
          <button
            disabled={action.pending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              void action.run(() => mutate('/projects/' + project.id, 'DELETE'));
            }}
          >
            {confirmDelete ? 'Confirmar eliminación' : 'Eliminar proyecto'}
          </button>
        </div>
      )}
      <ActionError error={action.error} />
      <Modal title="Editar proyecto" open={editing} onClose={() => setEditing(false)}>
        <ProjectEditor project={project} onSaved={() => setEditing(false)} />
      </Modal>
    </article>
  );
}
