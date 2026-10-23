import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type SessionUser } from '../services/auth-api';
import { HttpError } from '../services/http-client';
interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  error: string;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    authApi
      .session(controller.signal)
      .then(({ user }) => setUser(user))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setUser(null);
        if (!(error instanceof HttpError && error.status === 401))
          setError(error instanceof Error ? error.message : 'No se pudo comprobar la sesión.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const value: SessionContextValue = {
    user,
    loading,
    error,
    retry: () => setRevision((value) => value + 1),
    login: async (email, password) => {
      const result = await authApi.login(email, password);
      setUser(result.user);
      setError('');
    },
    register: async (name, email, password) => {
      const result = await authApi.register(name, email, password);
      setUser(result.user);
      setError('');
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
      setError('');
    },
  };
  return createElement(SessionContext.Provider, { value }, children);
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('Falta SessionProvider.');
  return value;
}
