import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from './useSession';

export function useAction(requireAuth = true) {
  const { user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const active = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function run(work: () => Promise<unknown>) {
    if (requireAuth && !user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    if (active.current) return;
    active.current = true;
    setPending(true);
    setError('');
    try {
      return await work();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos completar la operación.');
    } finally {
      active.current = false;
      setPending(false);
    }
  }
  return { run, pending, error, clearError: () => setError('') };
}
