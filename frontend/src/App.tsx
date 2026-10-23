import { SessionProvider } from './hooks/useSession';
import { RequireSession } from './components/RequireSession';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { NoticeProvider } from './hooks/useNotice';
import { PreferencesProvider } from './hooks/usePreferences';
import { ApiProvider } from './hooks/useSocialData';
import type { SocialApi } from './services/api';
import { Layout } from './layouts/Layout';
import { Feed } from './pages/Feed';
import { Explore } from './pages/Explore';
import { Communities } from './pages/Communities';
import { CommunityDetail } from './pages/CommunityDetail';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CreatePost } from './pages/CreatePost';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import { CreateCommunity } from './pages/CreateCommunity';
import { Bookmarks, PostDetail, Projects } from './pages/Collections';
import { Messages } from './pages/Messages';
const titles: Record<string, string> = {
  '/': 'Tu inicio',
  '/explorar': 'Explorar',
  '/comunidades': 'Comunidades',
  '/notificaciones': 'Notificaciones',
  '/perfil': 'Tu perfil',
  '/crear': 'Crear publicación',
  '/configuracion': 'Configuración',
  '/login': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
};
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${titles[pathname] || 'Tu espacio'} · Nexo`;
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
export default function App({ api = null }: { api?: SocialApi | null }) {
  return (
    <SessionProvider>
      <PreferencesProvider>
        <ApiProvider api={api}>
          <BrowserRouter>
            <NoticeProvider>
              <RouteEffects />
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Feed />} />
                  <Route path="explorar" element={<Explore />} />
                  <Route path="comunidades" element={<Communities />} />
                  <Route path="publicacion/:id" element={<PostDetail />} />
                  <Route path="proyectos" element={<Projects />} />
                  <Route element={<RequireSession />}>
                    <Route path="comunidades/nueva" element={<CreateCommunity />} />
                    <Route path="guardados" element={<Bookmarks />} />
                    <Route path="mensajes" element={<Messages />} />
                  </Route>
                  <Route path="comunidades/:id" element={<CommunityDetail />} />
                  <Route element={<RequireSession />}>
                    <Route path="perfil" element={<Profile />} />
                  </Route>
                  <Route path="perfil/:id" element={<Profile />} />
                  <Route element={<RequireSession />}>
                    <Route path="notificaciones" element={<Notifications />} />
                  </Route>
                  <Route element={<RequireSession />}>
                    <Route path="crear" element={<CreatePost />} />
                  </Route>
                  <Route element={<RequireSession />}>
                    <Route path="configuracion" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route path="login" element={<Login />} />
                <Route path="registro" element={<Register />} />
              </Routes>
            </NoticeProvider>
          </BrowserRouter>
        </ApiProvider>
      </PreferencesProvider>
    </SessionProvider>
  );
}
