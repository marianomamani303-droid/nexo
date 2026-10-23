import { useCallback, useEffect, useRef, useState } from 'react';
import { useResource } from './useSocialData';
import type { Page, Resource } from '../types';

export function usePageResource<T extends { id: string }>(
  load: ((signal: AbortSignal, cursor?: string) => Promise<Page<T>>) | null,
): Resource<Page<T>> {
  const first = useCallback((signal: AbortSignal) => load!(signal), [load]);
  const base = useResource(load ? first : null);
  const source = base.state.status === 'ready' ? base.state.data : null;
  const [extra, setExtra] = useState<{ source: Page<T>; page: Page<T> }>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState('');
  const controller = useRef<AbortController | undefined>(undefined);
  const page = source && extra?.source === source ? extra.page : source;
  useEffect(() => {
    controller.current?.abort();
    setLoadingMore(false);
    setPaginationError('');
    return () => controller.current?.abort();
  }, [source]);
  const loadMore = async () => {
    if (
      !load ||
      !source ||
      !page?.nextCursor ||
      loadingMore ||
      (controller.current && !controller.current.signal.aborted)
    )
      return;
    const pending = new AbortController();
    controller.current = pending;
    setLoadingMore(true);
    setPaginationError('');
    try {
      const next = await load(pending.signal, page.nextCursor);
      if (pending.signal.aborted) return;
      const ids = new Set(page.items.map((item) => item.id));
      setExtra({
        source,
        page: {
          items: [...page.items, ...next.items.filter((item) => !ids.has(item.id))],
          nextCursor: next.nextCursor,
        },
      });
    } catch (error) {
      if (!pending.signal.aborted)
        setPaginationError(error instanceof Error ? error.message : 'No se pudo cargar la página.');
    } finally {
      pending.abort();
      if (controller.current === pending) setLoadingMore(false);
    }
  };
  return {
    ...base,
    state: base.state.status === 'ready' && page ? { status: 'ready', data: page } : base.state,
    loadMore: page?.nextCursor ? () => void loadMore() : undefined,
    loadingMore,
    paginationError,
  };
}
