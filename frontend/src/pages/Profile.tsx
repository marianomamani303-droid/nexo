import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PenLine, Users, Layers3 } from 'lucide-react';
import { useProfile, useFeed, useProjects, useResource } from '../hooks/useSocialData';
import { useSession } from '../hooks/useSession';
import { useAction } from '../hooks/useAction';
import { mutate, read, pageSchema, userSchema } from '../services/rest-social-api';
import type { User } from '../types';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { FollowButton } from '../components/FollowButton';
import { PeopleList } from '../components/PeopleList';
import { ProjectCard, ProjectEditor } from '../components/ProjectCard';
import { ResourceView } from '../components/ResourceView';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { ActionError } from '../components/ActionError';
import { Tabs } from '../components/Tabs';
import { safeWebsite } from '../utils/format';

export function Profile() {
  const { id = 'me' } = useParams();
  const profile = useProfile(id);
  const posts = useFeed({ kind: 'discover', authorId: id });
  const projects = useProjects(id);
  const [tab, setTab] = useState('content');
  const [creatingProject, setCreatingProject] = useState(false);
  const { user } = useSession();
  const own = id === 'me' || user?.id === id;
  const actualId = profile.state.status === 'ready' ? profile.state.data?.id : undefined;
  return (
    <>
      <ResourceView
        resource={profile}
        isEmpty={(data) => !data}
        empty={<h1>Perfil no encontrado</h1>}
      >
        {(data) => data && <ProfileHeader user={data} onRelations={setTab} />}
      </ResourceView>
      <Tabs
        label="Contenido del perfil"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'content', label: 'Publicaciones' },
          { value: 'projects', label: 'Proyectos' },
          { value: 'followers', label: 'Seguidores' },
          { value: 'following', label: 'Siguiendo' },
        ]}
      />
      <div className="results-region">
        {tab === 'content' && (
          <ResourceView
            resource={posts}
            isEmpty={(page) => !page.items.length}
            empty={
              <EmptyState
                icon={PenLine}
                title="Todavía no hay publicaciones."
                description="Las publicaciones visibles de este perfil aparecerán acá."
              />
            }
          >
            {(page) => (
              <div className="post-list">
                {page.items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </ResourceView>
        )}
        {tab === 'projects' && (
          <>
            {own && (
              <button className="button primary" onClick={() => setCreatingProject(true)}>
                Crear proyecto
              </button>
            )}
            <ResourceView
              resource={projects}
              isEmpty={(page) => !page.items.length}
              empty={
                <EmptyState
                  icon={Layers3}
                  title="Todavía no hay proyectos."
                  description="Creá un borrador o compartí un proyecto publicado."
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
          </>
        )}
        {(tab === 'followers' || tab === 'following') && actualId && (
          <Relations id={actualId} kind={tab} />
        )}
      </div>
      <Modal
        title="Crear proyecto"
        open={creatingProject}
        onClose={() => setCreatingProject(false)}
      >
        <ProjectEditor onSaved={() => setCreatingProject(false)} />
      </Modal>
    </>
  );
}
function Relations({ id, kind }: { id: string; kind: 'followers' | 'following' }) {
  const resource = useResource(
    useCallback(
      (signal: AbortSignal) => read(`/users/${id}/${kind}`, pageSchema(userSchema), signal),
      [id, kind],
    ),
  );
  return (
    <ResourceView
      resource={resource}
      isEmpty={(page) => !page.items.length}
      empty={
        <EmptyState
          icon={Users}
          title="Todavía no hay conexiones."
          description="Las conexiones aparecerán acá."
        />
      }
    >
      {(page) => (
        <PeopleList
          users={page.items.map((user) => ({
            id: user.id,
            name: user.name,
            handle: user.handle,
            followed: user.followed,
          }))}
        />
      )}
    </ResourceView>
  );
}
function ProfileHeader({ user, onRelations }: { user: User; onRelations: (tab: string) => void }) {
  const session = useSession();
  const own = session.user?.id === user.id;
  const [editing, setEditing] = useState(false);
  const action = useAction();
  const website = safeWebsite(user.website);
  return (
    <section className="card profile-card">
      <div className="profile-cover">
        <div className="profile-cover-grid" />
        <span>
          Una perspectiva única.
          <br />
          <em>La tuya.</em>
        </span>
      </div>
      <div className="profile-details">
        <div className="profile-top">
          <Avatar user={user} large />
          {own ? (
            <button className="button secondary small" onClick={() => setEditing(true)}>
              Editar perfil
            </button>
          ) : (
            <FollowButton user={user} />
          )}
        </div>
        <h1>{user.name}</h1>
        <span className="profile-handle">@{user.handle}</span>
        <p className="profile-bio">
          {user.bio || 'Este perfil todavía no agregó una presentación.'}
        </p>
        <div className="profile-meta">
          {user.location && <span>{user.location}</span>}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer">
              {new URL(website).hostname}
            </a>
          )}
        </div>
        <div className="profile-stats">
          <button onClick={() => onRelations('followers')}>
            {user.followerCount || 0} Seguidores
          </button>
          <button onClick={() => onRelations('following')}>
            {user.followingCount || 0} Siguiendo
          </button>
        </div>
        {!own && session.user && (
          <Link className="button secondary small" to={'/mensajes?usuario=' + user.id}>
            Enviar mensaje
          </Link>
        )}
      </div>
      <Modal title="Editar perfil" open={editing} onClose={() => setEditing(false)}>
        <form
          className="social-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void action.run(async () => {
              await mutate('/users/me', 'PATCH', {
                name: form.get('name'),
                handle: form.get('handle'),
                bio: form.get('bio') || null,
                location: form.get('location') || null,
                website: form.get('website') || null,
              });
              setEditing(false);
              session.retry();
            });
          }}
        >
          <label>
            Nombre completo
            <input name="name" defaultValue={user.name} required minLength={2} maxLength={80} />
          </label>
          <label>
            Nombre de usuario
            <input
              name="handle"
              defaultValue={user.handle}
              required
              pattern="[a-zA-Z0-9_]{3,30}"
              maxLength={30}
            />
          </label>
          <label>
            Presentación
            <textarea name="bio" defaultValue={user.bio} maxLength={1000} />
          </label>
          <label>
            Ubicación
            <input name="location" defaultValue={user.location} maxLength={160} />
          </label>
          <label>
            Sitio web
            <input name="website" type="url" defaultValue={user.website} maxLength={2048} />
          </label>
          <ActionError error={action.error} />
          <button className="button primary" disabled={action.pending}>
            Guardar perfil
          </button>
        </form>
      </Modal>
    </section>
  );
}
