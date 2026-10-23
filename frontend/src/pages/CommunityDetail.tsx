import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users, MessageSquare } from 'lucide-react';
import { useCommunity, useFeed, useMembers, useResource } from '../hooks/useSocialData';
import { useSession } from '../hooks/useSession';
import { useAction } from '../hooks/useAction';
import { mutate, read, pageSchema, userSchema } from '../services/rest-social-api';
import type { Community } from '../types';
import { Composer } from '../components/Composer';
import { MembershipButton } from '../components/MembershipButton';
import { ResourceView } from '../components/ResourceView';
import { EmptyState } from '../components/EmptyState';
import { PostCard } from '../components/PostCard';
import { PeopleList } from '../components/PeopleList';
import { ActionError } from '../components/ActionError';
import { Tabs } from '../components/Tabs';

export function CommunityDetail() {
  const { id = '' } = useParams();
  const community = useCommunity(id);
  const posts = useFeed({ kind: 'discover', communityId: id });
  const members = useMembers(id);
  const [tab, setTab] = useState('posts');
  const action = useAction();
  return (
    <>
      <Link className="back-link" to="/comunidades">
        ← Todas las comunidades
      </Link>
      <ResourceView
        resource={community}
        isEmpty={(data) => !data}
        empty={<h1>Comunidad no disponible</h1>}
      >
        {(data) =>
          data && (
            <>
              <section className="card text-panel">
                <span className="eyebrow">
                  {data.visibility === 'private' ? 'Comunidad privada' : 'Comunidad pública'}
                </span>
                <h1>{data.name}</h1>
                <p>{data.description}</p>
                <p>{data.memberCount} miembros</p>
                <MembershipButton community={data} />
              </section>
              <Tabs
                label="Contenido de la comunidad"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'posts', label: 'Publicaciones' },
                  { value: 'members', label: 'Miembros' },
                  ...(['owner', 'moderator'].includes(data.memberRole || '')
                    ? [{ value: 'manage', label: 'Administrar' }]
                    : []),
                ]}
              />
              {tab === 'posts' && (
                <>
                  {data.memberRole && <Composer expanded communityId={id} />}
                  <ResourceView
                    resource={posts}
                    isEmpty={(page) => !page.items.length}
                    empty={
                      <EmptyState
                        icon={MessageSquare}
                        title="Todavía no hay publicaciones."
                        description="Compartí la primera conversación."
                      />
                    }
                  >
                    {(page) => (
                      <div className="post-list">
                        {page.items.map((post) => (
                          <div key={post.id}>
                            <PostCard post={post} />
                            {['owner', 'moderator'].includes(data.memberRole || '') && (
                              <button
                                disabled={action.pending}
                                onClick={() =>
                                  void action.run(() => mutate('/posts/' + post.id, 'DELETE'))
                                }
                              >
                                Retirar publicación de la comunidad
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ResourceView>
                </>
              )}
              {tab === 'members' && (
                <ResourceView
                  resource={members}
                  isEmpty={(page) => !page.items.length}
                  empty={
                    <EmptyState
                      icon={Users}
                      title="No hay miembros disponibles."
                      description="Los miembros activos aparecerán acá."
                    />
                  }
                >
                  {(page) => <PeopleList users={page.items} />}
                </ResourceView>
              )}
              {tab === 'manage' && <ManageCommunity community={data} />}
              <ActionError error={action.error} />
            </>
          )
        }
      </ResourceView>
    </>
  );
}
function ManageCommunity({ community }: { community: Community }) {
  const action = useAction();
  const navigate = useNavigate();
  const { user } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const people = useResource(
    useCallback(
      (signal: AbortSignal) =>
        read(
          '/users?' + new URLSearchParams({ q: search, limit: '20' }),
          pageSchema(userSchema),
          signal,
        ),
      [search],
    ),
  );
  const members = useResource(
    useCallback(
      (signal: AbortSignal) =>
        read(
          `/communities/${community.id}/members`,
          pageSchema(userSchema.extend({ role: userSchema.shape.handle })),
          signal,
        ),
      [community.id],
    ),
  );
  return (
    <section className="card text-panel">
      <h2>Administrar comunidad</h2>
      {community.memberRole === 'owner' && (
        <form
          className="social-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void action.run(() =>
              mutate('/communities/' + community.id, 'PATCH', {
                name: form.get('name'),
                description: form.get('description'),
                visibility: form.get('visibility'),
              }),
            );
          }}
        >
          <label>
            Nombre
            <input
              name="name"
              defaultValue={community.name}
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Descripción
            <textarea
              name="description"
              defaultValue={community.description}
              required
              maxLength={5000}
            />
          </label>
          <label>
            Privacidad
            <select name="visibility" defaultValue={community.visibility}>
              <option value="public">Pública</option>
              <option value="private">Privada</option>
            </select>
          </label>
          <button className="button primary" disabled={action.pending}>
            Guardar comunidad
          </button>
        </form>
      )}
      <h3>Invitar miembros</h3>
      <label>
        Buscar personas
        <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} />
      </label>
      {search.length >= 2 &&
        people.state.status === 'ready' &&
        people.state.data.items
          .filter((person) => person.id !== user?.id)
          .map((person) => (
            <p key={person.id}>
              {person.name} (@{person.handle}){' '}
              <button
                disabled={action.pending}
                onClick={() =>
                  void action.run(() =>
                    mutate(`/communities/${community.id}/members/${person.id}`, 'PUT', {
                      role: 'member',
                    }),
                  )
                }
              >
                Agregar miembro
              </button>
            </p>
          ))}
      <h3>Roles y membresías</h3>
      {members.state.status === 'ready' &&
        members.state.data.items
          .filter((member) => member.id !== community.ownerId)
          .map((member) => (
            <div className="inline-actions" key={member.id}>
              <span>
                {member.name} · {member.role}
              </span>
              {community.memberRole === 'owner' && (
                <button
                  disabled={action.pending}
                  onClick={() =>
                    void action.run(() =>
                      mutate(`/communities/${community.id}/members/${member.id}`, 'PUT', {
                        role: member.role === 'moderator' ? 'member' : 'moderator',
                      }),
                    )
                  }
                >
                  {member.role === 'moderator' ? 'Quitar moderador' : 'Hacer moderador'}
                </button>
              )}
              <button
                disabled={action.pending}
                onClick={() =>
                  void action.run(() =>
                    mutate(`/communities/${community.id}/members/${member.id}`, 'DELETE'),
                  )
                }
              >
                Retirar miembro
              </button>
            </div>
          ))}
      {community.memberRole === 'owner' && (
        <button
          className="button secondary"
          disabled={action.pending}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            void action.run(async () => {
              await mutate('/communities/' + community.id, 'DELETE');
              navigate('/comunidades');
            });
          }}
        >
          {confirmDelete ? 'Confirmar eliminación' : 'Eliminar comunidad'}
        </button>
      )}
      <ActionError error={action.error} />
    </section>
  );
}
