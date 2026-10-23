import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
export function RequireSession() {
  const { user, loading, error, retry } = useSession();
  const location = useLocation();
  if (loading) return <p role="status">Comprobando tu sesión…</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button onClick={retry}>Reintentar</button>
      </div>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  );
}
