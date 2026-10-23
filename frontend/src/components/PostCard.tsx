import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Send } from 'lucide-react';
import type { Comment, Post } from '../types';
import { Avatar } from './Avatar';
import { useComments } from '../hooks/useSocialData';
import { useAction } from '../hooks/useAction';
import { useSession } from '../hooks/useSession';
import { useNotice } from '../hooks/useNotice';
import { socialActions } from '../services/rest-social-api';
import { ResourceView } from './ResourceView';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { ActionError } from './ActionError';
import { formatCount, formatDate } from '../utils/format';

export function PostCard({ post }: { post: Post }) {
  const { user } = useSession();
  const action = useAction();
  const notify = useNotice();
  const [comments, setComments] = useState(false);
  const [options, setOptions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <article className="card post-card" data-post-id={post.id}>
      <header className="post-header">
        <Link to={`/perfil/${post.author.id}`}>
          <Avatar user={post.author} />
        </Link>
        <div>
          <Link className="author-name" to={`/perfil/${post.author.id}`}>
            {post.author.name}
          </Link>
          <p>
            @{post.author.handle} ·{' '}
            <Link to={`/publicacion/${post.id}`}>
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </Link>
          </p>
        </div>
        <button
          className="icon-button post-more"
          aria-label="Opciones de publicación"
          onClick={() => setOptions(true)}
        >
          <MoreHorizontal size={19} />
        </button>
      </header>
      <p className="post-content">{post.content}</p>
      {post.media.map((media) => (
        <img className="post-image" src={media.url} alt={media.alt} loading="lazy" key={media.id} />
      ))}
      <div className="post-actions">
        <button
          disabled={action.pending}
          aria-pressed={!!post.viewerReaction}
          onClick={() =>
            void action.run(() => socialActions.reaction(post.id, !post.viewerReaction))
          }
          aria-label="Me gusta"
        >
          <Heart size={18} fill={post.viewerReaction ? 'currentColor' : 'none'} />
          {formatCount(post.likeCount || 0)}
        </button>
        <button
          onClick={() => setComments(!comments)}
          aria-expanded={comments}
          aria-label="Ver comentarios"
        >
          <MessageCircle size={18} />
          {formatCount(post.commentCount || 0)}
        </button>
        <button
          onClick={() =>
            void action.run(async () => {
              await navigator.clipboard.writeText(
                `${window.location.origin}/publicacion/${post.id}`,
              );
              notify('Enlace copiado.');
            })
          }
          aria-label="Compartir publicación"
        >
          <Repeat2 size={18} />
        </button>
        <button
          disabled={action.pending}
          aria-pressed={!!post.bookmarked}
          onClick={() => void action.run(() => socialActions.bookmark(post.id, !post.bookmarked))}
          aria-label="Guardar publicación"
        >
          <Bookmark size={18} fill={post.bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <ActionError error={action.error} />
      {comments && <Comments postId={post.id} postAuthorId={post.author.id} />}
      <Modal
        title="Opciones de publicación"
        open={options}
        onClose={() => {
          setOptions(false);
          setConfirmDelete(false);
        }}
      >
        <div className="option-list">
          <Link to={`/publicacion/${post.id}`}>Abrir publicación</Link>
          {user?.id === post.author.id && (
            <>
              <button
                onClick={() => {
                  setEditing(true);
                  setOptions(false);
                }}
              >
                Editar publicación
              </button>
              <button
                disabled={action.pending}
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  void action.run(async () => {
                    await socialActions.deletePost(post.id);
                    setOptions(false);
                  });
                }}
              >
                {confirmDelete ? 'Confirmar eliminación' : 'Eliminar publicación'}
              </button>
            </>
          )}
        </div>
        <ActionError error={action.error} />
      </Modal>
      <Modal title="Editar publicación" open={editing} onClose={() => setEditing(false)}>
        <form
          className="social-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              await socialActions.updatePost(post.id, content);
              setEditing(false);
            });
          }}
        >
          <label>
            Contenido
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              maxLength={3000}
            />
          </label>
          <ActionError error={action.error} />
          <button className="button primary" disabled={action.pending}>
            Guardar cambios
          </button>
        </form>
      </Modal>
    </article>
  );
}

function Comments({ postId, postAuthorId }: { postId: string; postAuthorId: string }) {
  const resource = useComments(postId);
  const { user } = useSession();
  const action = useAction();
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState<string>();
  return (
    <section className="comments-panel" aria-label="Comentarios">
      <ResourceView
        resource={resource}
        isEmpty={(data) => !data.items.length}
        empty={
          <EmptyState
            compact
            icon={MessageCircle}
            title="La conversación está por empezar"
            description="Compartí la primera respuesta."
          />
        }
      >
        {(data) =>
          data.items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canDelete={user?.id === comment.author.id || user?.id === postAuthorId}
              onReply={() => {
                setParentId(comment.id);
              }}
            />
          ))
        }
      </ResourceView>
      {parentId && (
        <p>
          Respondiendo a un comentario{' '}
          <button onClick={() => setParentId(undefined)}>Cancelar respuesta</button>
        </p>
      )}
      {user ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              await socialActions.comment(postId, content, parentId);
              setContent('');
              setParentId(undefined);
            });
          }}
        >
          <input
            aria-label="Escribir comentario"
            placeholder="Sumá tu perspectiva…"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1000}
            required
          />
          <button className="icon-button" disabled={action.pending} aria-label="Enviar comentario">
            <Send size={16} />
          </button>
        </form>
      ) : (
        <Link to="/login">Iniciá sesión para comentar</Link>
      )}
      <ActionError error={action.error} />
    </section>
  );
}

function CommentItem({
  comment,
  canDelete,
  onReply,
}: {
  comment: Comment;
  canDelete: boolean;
  onReply: () => void;
}) {
  const { user } = useSession();
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  return (
    <div className="comment">
      <Avatar user={comment.author} />
      <div>
        <Link to={`/perfil/${comment.author.id}`}>
          <strong>{comment.author.name}</strong>
        </Link>
        {comment.parentId && <small>Respuesta a un comentario</small>}
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                await socialActions.updateComment(comment.id, content);
                setEditing(false);
              });
            }}
          >
            <input
              aria-label="Editar comentario"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              maxLength={1000}
            />
            <button disabled={action.pending}>Guardar</button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </form>
        ) : (
          <p>{comment.content}</p>
        )}
        <div className="inline-actions">
          <button
            disabled={action.pending}
            aria-pressed={!!comment.viewerReaction}
            onClick={() =>
              void action.run(() => socialActions.reactComment(comment.id, !comment.viewerReaction))
            }
          >
            Me gusta ({comment.reactionsCount || 0})
          </button>
          <button onClick={onReply}>Responder</button>
          {user?.id === comment.author.id && (
            <button onClick={() => setEditing(true)}>Editar</button>
          )}
          {canDelete && (
            <button
              disabled={action.pending}
              onClick={() => void action.run(() => socialActions.deleteComment(comment.id))}
            >
              Eliminar comentario
            </button>
          )}
        </div>
        <ActionError error={action.error} />
      </div>
    </div>
  );
}
