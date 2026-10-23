import { useId, useRef, useState } from 'react';
import { Smile, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { ActionError } from './ActionError';
import { useAction } from '../hooks/useAction';
import { useSession } from '../hooks/useSession';
import { useNotice } from '../hooks/useNotice';
import { socialActions } from '../services/rest-social-api';
import styles from './Composer.module.css';

export function Composer({
  expanded = false,
  communityId,
  onCreated,
}: {
  expanded?: boolean;
  communityId?: string;
  onCreated?: () => void;
}) {
  const { user } = useSession();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [category, setCategory] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const action = useAction();
  const notify = useNotice();
  if (!user)
    return (
      <p className="card text-panel">
        <Link to="/login">Iniciá sesión</Link> para compartir una publicación.
      </p>
    );
  return (
    <form
      className={`${styles.composer} ${expanded ? styles.expanded : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        void action.run(async () => {
          await socialActions.createPost({
            content: content.trim(),
            communityId,
            visibility: communityId ? 'community' : visibility,
            category: category || undefined,
          });
          setContent('');
          notify('Publicación guardada.');
          onCreated?.();
        });
      }}
    >
      <div className={styles.inputRow}>
        <Avatar user={user} />
        <div className={styles.inputWrap}>
          <label htmlFor={id} className="sr-only">
            Contenido de la publicación
          </label>
          <textarea
            id={id}
            ref={textarea}
            placeholder="Compartí una idea…"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={3000}
            required
            rows={expanded ? 6 : 2}
          />
        </div>
      </div>
      {expanded && (
        <div className="form-grid">
          <label>
            Categoría
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={80}
            />
          </label>
          {!communityId && (
            <label>
              Visibilidad
              <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                <option value="public">Pública</option>
                <option value="followers">Solo seguidores</option>
              </select>
            </label>
          )}
        </div>
      )}
      <ActionError error={action.error} />
      <div className={styles.footer}>
        <button
          className="icon-button"
          type="button"
          aria-label="Agregar emoji"
          onClick={() => {
            setContent((value) => (value + ' ✨').slice(0, 3000));
            textarea.current?.focus();
          }}
        >
          <Smile size={17} />
        </button>
        <span className={styles.counter}>{content.length} / 3000</span>
        <button className="button primary" disabled={!content.trim() || action.pending}>
          {action.pending ? 'Publicando…' : 'Publicar'}
          <ArrowUpRight size={15} />
        </button>
      </div>
    </form>
  );
}
