import { usePageResource } from './usePageResource';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SocialApi, FeedQuery } from '../services/api';
import type { Resource, ResourceState } from '../types';
import { useSession } from './useSession';

const ApiContext = createContext<SocialApi | null>(null);
export function ApiProvider({
  api = null,
  children,
}: {
  api?: SocialApi | null;
  children: ReactNode;
}) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
export function useResource<T>(load: ((signal: AbortSignal) => Promise<T>) | null): Resource<T> {
  const { user } = useSession();
  const identity = user?.id;
  const [snapshot, setSnapshot] = useState<{
    state: ResourceState<T>;
    identity?: string;
    load: typeof load;
  }>({ state: { status: 'unavailable' }, identity, load });
  const setState = (state: ResourceState<T>) => setSnapshot({ state, identity, load });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('nexo:data-changed', refresh);
    return () => window.removeEventListener('nexo:data-changed', refresh);
  }, []);
  useEffect(() => {
    if (!load) {
      setState({ status: 'unavailable' });
      return;
    }
    const controller = new AbortController();
    setSnapshot((previous) =>
      previous.load === load && previous.identity === identity && previous.state.status === 'ready'
        ? previous
        : { state: { status: 'loading' }, identity, load },
    );
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No pudimos cargar esta sección. Intentá nuevamente.',
          });
      },
    );
    return () => controller.abort();
  }, [load, revision, identity]);
  return {
    state: !load
      ? { status: 'unavailable' }
      : snapshot.identity !== identity || snapshot.load !== load
        ? { status: 'loading' }
        : snapshot.state,
    retry: useCallback(() => setRevision((v) => v + 1), []),
  };
}
export function useFeed(query: FeedQuery) {
  const api = useContext(ApiContext);
  const { kind, category, search, authorId, communityId, cursor } = query;
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getFeed(
        { kind, category, search, authorId, communityId, cursor: nextCursor || cursor },
        { signal, cursor: nextCursor },
      ),
    [api, kind, category, search, authorId, communityId, cursor],
  );
  return usePageResource(api ? load : null);
}
export function useProfile(id: string) {
  const api = useContext(ApiContext);
  const load = useCallback((signal: AbortSignal) => api!.getProfile(id, { signal }), [api, id]);
  return useResource(api ? load : null);
}
export function usePeople(search = '') {
  const api = useContext(ApiContext);
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getPeople(search, { signal, cursor: nextCursor }),
    [api, search],
  );
  return usePageResource(api ? load : null);
}
export function useProjects(id: string) {
  const api = useContext(ApiContext);
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getProjects(id, { signal, cursor: nextCursor }),
    [api, id],
  );
  return usePageResource(api ? load : null);
}
export function useCommunities(search = '', category = '') {
  const api = useContext(ApiContext);
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getCommunities({ search, category }, { signal, cursor: nextCursor }),
    [api, search, category],
  );
  return usePageResource(api ? load : null);
}
export function useCommunity(id: string) {
  const api = useContext(ApiContext);
  const load = useCallback((signal: AbortSignal) => api!.getCommunity(id, { signal }), [api, id]);
  return useResource(api ? load : null);
}
export function useMembers(id: string) {
  const api = useContext(ApiContext);
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getCommunityMembers(id, { signal, cursor: nextCursor }),
    [api, id],
  );
  return usePageResource(api ? load : null);
}
export function useNotifications(filter: 'all' | 'unread') {
  const api = useContext(ApiContext);
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getNotifications(filter, { signal, cursor: nextCursor }),
    [api, filter],
  );
  return usePageResource(api ? load : null);
}
export function useComments(id: string) {
  const api = useContext(ApiContext);
  const load = useCallback(
    (signal: AbortSignal, nextCursor?: string) =>
      api!.getComments(id, { signal, cursor: nextCursor }),
    [api, id],
  );
  return usePageResource(api ? load : null);
}
