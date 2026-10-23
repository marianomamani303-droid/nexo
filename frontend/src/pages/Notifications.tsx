import { useState } from 'react';
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Users } from 'lucide-react';
import { useNotifications } from '../hooks/useSocialData';
import { useAction } from '../hooks/useAction';
import { socialActions } from '../services/rest-social-api';
import { ActionError } from '../components/ActionError';
import { Link } from 'react-router-dom';
import { ResourceView } from '../components/ResourceView';
import { EmptyState } from '../components/EmptyState';
import { PageHeading } from '../components/PageHeading';
import { AnimatedRegion } from '../components/AnimatedRegion';
import { Avatar } from '../components/Avatar';
import { Tabs } from '../components/Tabs';
import { formatDate } from '../utils/format';
export function Notifications() {
  const [tab, setTab] = useState('all');
  const [kind, setKind] = useState('all');
  const resource = useNotifications(tab === 'unread' ? 'unread' : 'all');
  const action = useAction();
  const filters = [
    { value: 'all', label: 'Toda la actividad' },
    { value: 'comment', label: 'Conversaciones' },
    { value: 'follow', label: 'Conexiones' },
  ];
  return (
    <AnimatedRegion identity="notifications">
      <PageHeading
        eyebrow="LO QUE PASA EN TU MUNDO"
        title={
          <>
            Cada conexión <em>cuenta.</em>
          </>
        }
        description="Un espacio para seguir las conversaciones que te importan."
        action={
          <button
            className="icon-button heading-action"
            aria-label="Marcar todas como leídas"
            disabled={action.pending}
            onClick={() => void action.run(() => socialActions.readNotifications())}
          >
            <CheckCheck size={20} />
          </button>
        }
      />
      <ActionError error={action.error} />
      <div className="notification-toolbar" data-reveal>
        <Tabs
          label="Estado de notificaciones"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'unread', label: 'Sin leer' },
          ]}
        />
        <span className="quiet-label">
          <Bell size={13} />
          TU ACTIVIDAD
        </span>
      </div>
      <div className="chips" data-reveal>
        {filters.map((filter) => (
          <button
            key={filter.value}
            aria-pressed={kind === filter.value}
            onClick={() => setKind(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <AnimatedRegion identity={tab + kind}>
        <ResourceView
          resource={resource}
          isEmpty={(data) =>
            !data.items.some((notification) => kind === 'all' || notification.kind === kind)
          }
          empty={
            <EmptyState
              icon={Bell}
              title="Por ahora, todo en calma."
              description="Tus notificaciones aparecerán aquí. Nuevas conexiones, respuestas y conversaciones, en un solo lugar."
              action={{ label: 'Explorar nuevas perspectivas', to: '/explorar' }}
            />
          }
        >
          {(data) => (
            <section className="card notification-list">
              {data.items
                .filter((notification) => kind === 'all' || notification.kind === kind)
                .map((notification) => {
                  const Icon =
                    notification.kind === 'like'
                      ? Heart
                      : notification.kind === 'comment'
                        ? MessageCircle
                        : notification.kind === 'follow'
                          ? UserPlus
                          : Users;
                  return (
                    <article
                      className={`notification-row ${notification.read ? '' : 'unread'}`}
                      key={notification.id}
                    >
                      <div className="notification-avatar">
                        <Avatar user={notification.actor} />
                        <span>
                          <Icon size={11} />
                        </span>
                      </div>
                      <div>
                        <p>
                          {notification.href ? (
                            <Link to={notification.href}>{notification.text}</Link>
                          ) : (
                            notification.text
                          )}
                        </p>
                        {!notification.read && (
                          <button
                            disabled={action.pending}
                            onClick={() =>
                              void action.run(() =>
                                socialActions.readNotifications(notification.id),
                              )
                            }
                          >
                            Marcar como leída
                          </button>
                        )}
                        <time dateTime={notification.createdAt}>
                          {formatDate(notification.createdAt)}
                        </time>
                      </div>
                      {!notification.read && <span className="unread-dot" />}
                    </article>
                  );
                })}
            </section>
          )}
        </ResourceView>
      </AnimatedRegion>
      <p className="section-footnote">
        <span />
        La conexión empieza con una buena conversación.
      </p>
    </AnimatedRegion>
  );
}
