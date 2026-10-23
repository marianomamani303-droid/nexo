import type { ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import type { Resource } from '../types';
export function ResourceView<T>({
  resource,
  empty,
  isEmpty,
  children,
}: {
  resource: Resource<T>;
  empty: ReactNode;
  isEmpty: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  const { state, retry } = resource;
  if (state.status === 'loading')
    return (
      <div className="resource-loading" role="status" aria-label="Cargando contenido">
        <span className="sr-only">Cargando contenido</span>
        {[0, 1].map((key) => (
          <div className="skeleton-card" key={key} aria-hidden="true">
            <div className="skeleton-avatar" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
            <div className="skeleton-media" />
          </div>
        ))}
      </div>
    );
  if (state.status === 'error')
    return (
      <section className="error-state" role="alert">
        <AlertCircle size={26} />
        <h2>Necesitamos otro intento</h2>
        <p>{state.message}</p>
        <button className="button secondary" onClick={retry}>
          <RotateCw size={15} />
          Reintentar
        </button>
      </section>
    );
  if (state.status === 'unavailable' || isEmpty(state.data)) return <>{empty}</>;
  return (
    <>
      {children(state.data)}
      {resource.paginationError && (
        <p role="alert" className="form-error">
          {resource.paginationError}
        </p>
      )}
      {resource.loadMore && (
        <button
          className="button secondary load-more"
          disabled={resource.loadingMore}
          onClick={resource.loadMore}
        >
          {resource.loadingMore ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </>
  );
}
