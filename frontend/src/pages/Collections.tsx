import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bookmark, Layers3 } from 'lucide-react';
import { useResource } from '../hooks/useSocialData';
import { useSession } from '../hooks/useSession';
import { read, pageSchema, postSchema, postDto, projectSchema } from '../services/rest-social-api';
import { PostCard } from '../components/PostCard';
import { ProjectCard, ProjectEditor } from '../components/ProjectCard';
import { ResourceView } from '../components/ResourceView';
import { EmptyState } from '../components/EmptyState';
import { PageHeading } from '../components/PageHeading';
import { Modal } from '../components/Modal';

export function Bookmarks() {
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) => read('/posts/bookmarks', pageSchema(postSchema), signal),
      [],
    ),
  );
  return (
    <>
      <PageHeading
        eyebrow="TU ARCHIVO PERSONAL"
        title={
          <>
            Ideas que <em>se quedan.</em>
          </>
        }
        description="Volvé a las publicaciones que te movieron algo."
      />
      <ResourceView
        resource={resource}
        isEmpty={(page) => !page.items.length}
        empty={
          <EmptyState
            icon={Bookmark}
            title="Todavía no guardaste publicaciones."
            description="Usá el marcador de una publicación para encontrarla acá."
          />
        }
      >
        {(page) => (
          <div className="post-list">
            {page.items.map((row) => (
              <PostCard key={row.id} post={postDto(row)} />
            ))}
          </div>
        )}
      </ResourceView>
    </>
  );
}
export function PostDetail() {
  const { id = '' } = useParams();
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) => read('/posts/' + encodeURIComponent(id), postSchema, signal),
      [id],
    ),
  );
  return (
    <>
      <h1>Publicación</h1>
      <ResourceView resource={resource} isEmpty={() => false} empty={null}>
        {(post) => <PostCard post={postDto(post)} />}
      </ResourceView>
    </>
  );
}
export function Projects() {
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) =>
        read('/projects?' + new URLSearchParams({ q: search }), pageSchema(projectSchema), signal),
      [search],
    ),
  );
  return (
    <>
      <PageHeading
        eyebrow="DEL BOCETO AL MUNDO"
        title={
          <>
            Hacé que <em>pase.</em>
          </>
        }
        description="Proyectos, procesos y nuevas posibilidades."
      />
      <label>
        Buscar proyectos
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={100}
        />
      </label>
      {user && (
        <button className="button primary" onClick={() => setCreating(true)}>
          Crear proyecto
        </button>
      )}
      <ResourceView
        resource={resource}
        isEmpty={(page) => !page.items.length}
        empty={
          <EmptyState
            icon={Layers3}
            title="Todavía no hay proyectos visibles."
            description="Compartí un proyecto o prepará un borrador privado."
          />
        }
      >
        {(page) => (
          <div className="project-grid">
            {page.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </ResourceView>
      <Modal title="Crear proyecto" open={creating} onClose={() => setCreating(false)}>
        <ProjectEditor onSaved={() => setCreating(false)} />
      </Modal>
    </>
  );
}
