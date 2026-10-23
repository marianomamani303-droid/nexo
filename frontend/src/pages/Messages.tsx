import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { usePeople, useResource } from '../hooks/useSocialData';
import { useSession } from '../hooks/useSession';
import { useAction } from '../hooks/useAction';
import {
  conversationSchema,
  messageSchema,
  mutate,
  pageSchema,
  read,
} from '../services/rest-social-api';
import { ActionError } from '../components/ActionError';
import { MessageSquare } from 'lucide-react';
import { PageHeading } from '../components/PageHeading';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/format';

export function Messages() {
  const [params, setParams] = useSearchParams();
  const id = params.get('conversacion') || '';
  const target = params.get('usuario');
  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [replyToId, setReplyToId] = useState<string>();
  const { user } = useSession();
  const action = useAction();
  const people = usePeople(search);
  const conversations = useResource(
    useCallback(
      (signal: AbortSignal) => read('/conversations', pageSchema(conversationSchema), signal),
      [],
    ),
  );
  const messages = useResource(
    useCallback(
      (signal: AbortSignal) =>
        id
          ? read(`/conversations/${id}/messages`, pageSchema(messageSchema), signal)
          : Promise.resolve({ items: [], nextCursor: null }),
      [id],
    ),
  );
  const start = async (userId: string) => {
    const result = z
      .object({ id: z.string() })
      .parse(await mutate('/conversations/direct', 'POST', { userId }));
    setParams({ conversacion: result.id });
    setSearch('');
  };
  useEffect(() => {
    if (target) void action.run(() => start(target));
  }, [target]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        conversations.retry();
        messages.retry();
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [conversations.retry, messages.retry]);
  useEffect(() => {
    setReplyToId(undefined);
    setContent('');
  }, [id]);
  return (
    <>
      <PageHeading
        eyebrow="SEÑALES DIRECTAS"
        title={
          <>
            De voz <em>a voz.</em>
          </>
        }
        description="Tus conversaciones tienen su propio espacio."
      />
      <section className="card text-panel">
        <label>
          Buscar persona para conversar
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
          />
        </label>
        {search.length >= 2 &&
          people.state.status === 'ready' &&
          people.state.data.items
            .filter((person) => person.id !== user?.id)
            .map((person) => (
              <button
                className="button secondary small"
                disabled={action.pending}
                key={person.id}
                onClick={() => void action.run(() => start(person.id))}
              >
                {person.name} · @{person.handle}
              </button>
            ))}
        {conversations.state.status === 'loading' && <p role="status">Cargando conversaciones…</p>}
        {conversations.state.status === 'error' && (
          <>
            <ActionError error={conversations.state.message} />
            <button className="button secondary" onClick={conversations.retry}>
              Reintentar conversaciones
            </button>
          </>
        )}
        {conversations.state.status === 'ready' && (
          <nav className="conversation-list" aria-label="Conversaciones">
            {!conversations.state.data.items.length && <p>Todavía no hay conversaciones.</p>}
            {conversations.state.data.items.map((conversation) => (
              <button
                className="button secondary"
                aria-pressed={id === conversation.id}
                key={conversation.id}
                onClick={() => setParams({ conversacion: conversation.id })}
              >
                {conversation.participantName}
                {conversation.unreadCount > 0 && ` (${conversation.unreadCount} sin leer)`}
              </button>
            ))}
          </nav>
        )}
      </section>
      {!id && (
        <EmptyState
          icon={MessageSquare}
          title="Abrí una conversación."
          description="Buscá una persona arriba o elegí un chat para seguir compartiendo ideas."
        />
      )}
      {id && (
        <section className="card text-panel">
          <h2>Conversación</h2>
          <button
            disabled={action.pending}
            onClick={() => void action.run(() => mutate(`/conversations/${id}/read`, 'PUT'))}
          >
            Marcar conversación como leída
          </button>
          {messages.state.status === 'error' && <ActionError error={messages.state.message} />}
          {messages.state.status === 'loading' && <p role="status">Cargando mensajes…</p>}
          {messages.state.status === 'ready' && (
            <div className="message-list">
              {!messages.state.data.items.length && <p>Escribí el primer mensaje.</p>}
              {messages.state.data.items
                .slice()
                .reverse()
                .map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    own={message.senderId === user?.id}
                    onReply={() => setReplyToId(message.id)}
                  />
                ))}
            </div>
          )}
          {replyToId && (
            <p>
              Respondiendo a un mensaje{' '}
              <button onClick={() => setReplyToId(undefined)}>Cancelar respuesta</button>
            </p>
          )}
          <form
            className="social-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                await mutate(`/conversations/${id}/messages`, 'POST', { content, replyToId });
                setContent('');
                setReplyToId(undefined);
              });
            }}
          >
            <label>
              Mensaje
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={10000}
                required
              />
            </label>
            <button className="button primary" disabled={action.pending}>
              Enviar mensaje
            </button>
          </form>
        </section>
      )}
      <ActionError error={action.error} />
    </>
  );
}
function MessageItem({
  message,
  own,
  onReply,
}: {
  message: z.infer<typeof messageSchema>;
  own: boolean;
  onReply: () => void;
}) {
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(message.content || '');
  return (
    <article className={`message-item ${own ? 'own-message' : ''}`}>
      <strong>{own ? 'Vos' : 'Tu contacto'}</strong>
      <time>{formatDate(message.createdAt)}</time>
      {message.replyToId && <small>Respuesta a un mensaje</small>}
      {editing ? (
        <form
          className="social-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              await mutate('/messages/' + message.id, 'PATCH', { content });
              setEditing(false);
            });
          }}
        >
          <label>
            Editar mensaje
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={10000}
              required
            />
          </label>
          <button disabled={action.pending}>Guardar mensaje</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <p className="post-content">{message.content}</p>
      )}
      <div className="inline-actions">
        <button onClick={onReply}>Responder</button>
        {own && (
          <>
            <button onClick={() => setEditing(true)}>Editar mensaje</button>
            <button
              disabled={action.pending}
              onClick={() => void action.run(() => mutate('/messages/' + message.id, 'DELETE'))}
            >
              Eliminar mensaje
            </button>
          </>
        )}
      </div>
      <ActionError error={action.error} />
    </article>
  );
}
