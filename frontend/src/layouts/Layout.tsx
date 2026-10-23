import { useSession } from '../hooks/useSession';
import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Home,
  Compass,
  Users,
  UserRound,
  Plus,
  ArrowUpRight,
  Menu,
  Settings2,
  ArrowRight,
  Leaf,
  CircleHelp,
  MessageSquare,
  Layers3,
  LogIn,
  Bookmark,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import { Modal } from '../components/Modal';
import { Composer } from '../components/Composer';
import { usePreferences } from '../hooks/usePreferences';
import { useNotice } from '../hooks/useNotice';
import { useEntrance } from '../animations/useMotion';
import styles from './Layout.module.css';
const links = [
  { to: '/', label: 'Tu inicio', icon: Home },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/comunidades', label: 'Comunidades', icon: Users },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { to: '/perfil', label: 'Mi perfil', icon: UserRound },
  { to: '/mensajes', label: 'Mensajes', icon: MessageSquare },
  { to: '/guardados', label: 'Guardados', icon: Bookmark },
  { to: '/proyectos', label: 'Proyectos', icon: Layers3 },
];
const sectionTitles: Record<string, string> = {
  '/': 'Tu inicio',
  '/explorar': 'Explorar',
  '/comunidades': 'Comunidades',
  '/notificaciones': 'Notificaciones',
  '/perfil': 'Mi perfil',
  '/crear': 'Crear publicación',
  '/configuracion': 'Configuración',
  '/mensajes': 'Mensajes',
  '/proyectos': 'Proyectos',
  '/guardados': 'Guardados',
};
export function Layout() {
  const { user, logout } = useSession();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [composer, setComposer] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState('');
  const { preferences, update } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const search = useRef<HTMLInputElement>(null);
  const notify = useNotice();
  const shell = useEntrance<HTMLDivElement>('shell');
  useEffect(() => {
    setMobile(false);
    setComposer(false);
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [location.pathname]);
  const navigation = (
    <>
      <nav className={styles.navigation} aria-label="Navegación principal">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            data-drawer-item
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Icon size={19} strokeWidth={1.6} />
            <span>{label}</span>
            <ChevronRight size={13} className={styles.navArrow} />
          </NavLink>
        ))}
      </nav>
      <button
        className={`button accent ${styles.create}`}
        onClick={() => {
          if (mobile) {
            setMobile(false);
            navigate('/crear');
          } else setComposer(true);
        }}
        data-hover
        data-drawer-item
      >
        <Plus size={17} />
        Crear publicación
        <ArrowUpRight size={16} />
      </button>
      <div className={styles.sidebarLine} />
      <span className={styles.sidebarLabel}>TUS CONEXIONES</span>
      <p className={styles.sidebarEmpty}>
        Las comunidades que sigas
        <br />
        encontrarán su lugar acá.
      </p>
      <Link className={styles.sidebarDiscover} to="/comunidades" data-drawer-item>
        Encontrá tu comunidad
        <ArrowUpRight size={13} />
      </Link>
    </>
  );
  return (
    <div className={styles.shell} ref={shell} data-motion-scope>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className={styles.sidebar}>
        <Brand inverse />
        <div className={styles.spaceLabel}>
          <span />
          SEÑALES HUMANAS / NEXO
        </div>
        {navigation}
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarNote}>
            <Leaf size={19} />
            <p>
              Las buenas ideas
              <br />
              merecen compañía.
            </p>
            <span>Hacé espacio para lo que viene.</span>
          </div>
          <NavLink
            to="/configuracion"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Settings2 size={18} />
            Configuración
          </NavLink>
          <button className={styles.help} onClick={() => setHelp(true)}>
            <CircleHelp size={16} />
            Acerca de Nexo
            <ArrowUpRight size={13} />
          </button>
          <Link
            className={styles.guest}
            to={user ? '/perfil' : '/login'}
            aria-label={user ? 'Abrir mi perfil' : 'Iniciar sesión para conectar'}
          >
            <span className={styles.guestAvatar}>
              <UserRound size={18} />
            </span>
            <span>
              {user ? user.name : 'Tu espacio personal'}
              <small>{user ? 'Abrir mi perfil' : 'Iniciá sesión para conectar'}</small>
            </span>
            <LogIn size={17} />
          </Link>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={`icon-button ${styles.mobileToggle}`}
            aria-label="Abrir navegación"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className={styles.mobileBrand}>
            <Brand />
          </div>
          <div className={styles.breadcrumb}>
            Tu espacio
            <ChevronRight size={12} />
            <strong>
              {sectionTitles[location.pathname] ||
                (location.pathname.startsWith('/comunidades/') ? 'Comunidad' : 'Perfil')}
            </strong>
          </div>
          <form
            className={styles.search}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/explorar?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <Search size={16} />
            <input
              ref={search}
              aria-label="Buscar en Nexo"
              placeholder="Buscá algo que te inspire…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className={styles.topActions}>
            <button
              className="icon-button"
              aria-label="Cambiar tema"
              onClick={() =>
                update({
                  theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
                })
              }
            >
              {preferences.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link className="icon-button" aria-label="Ver notificaciones" to="/notificaciones">
              <Bell size={19} />
            </Link>
            <span className={styles.topDivider} />
            {user ? (
              <>
                <Link className={styles.loginLink} to="/perfil">
                  {user.name}
                </Link>
                <button
                  className={styles.loginLink}
                  disabled={loggingOut}
                  onClick={async () => {
                    setLoggingOut(true);
                    setLogoutError('');
                    try {
                      await logout();
                      navigate('/login');
                    } catch (error) {
                      setLogoutError(
                        error instanceof Error ? error.message : 'No se pudo cerrar la sesión.',
                      );
                    } finally {
                      setLoggingOut(false);
                    }
                  }}
                >
                  {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
                </button>
              </>
            ) : (
              <Link className={styles.loginLink} to="/login">
                Ingresar
                <ArrowUpRight size={15} />
              </Link>
            )}
            {logoutError && <p role="alert">{logoutError}</p>}
          </div>
        </header>
        <div className={styles.contentGrid}>
          <main className={styles.main} id="main-content" tabIndex={-1}>
            <Outlet />
          </main>
          <aside className={styles.context} aria-label="Panel contextual">
            <section className={styles.contextIntro} data-reveal>
              <span className="eyebrow">FUERA DEL MOLDE</span>
              <h2>
                Un lugar para
                <br />
                tu próxima <em>idea.</em>
              </h2>
              <p>Personas, proyectos y conversaciones que abren posibilidades.</p>
              <div className={styles.contextSymbol} aria-hidden="true">
                ✳
              </div>
              <Link to="/explorar" className={styles.contextLink}>
                Dejá que la curiosidad te guíe
                <ArrowUpRight size={15} />
              </Link>
            </section>
            <section className={styles.contextSection} data-reveal>
              <div className={styles.contextTitle}>
                <span>EN TU RADAR</span>
                <Compass size={16} />
              </div>
              <h3>Todo empieza explorando.</h3>
              <p>Las recomendaciones y tendencias aparecerán cuando haya actividad.</p>
              <Link to="/explorar" className={styles.simpleLink}>
                Explorar Nexo
                <ArrowRight size={14} />
              </Link>
            </section>
            <section className={styles.contextSection} data-reveal>
              <div className={styles.contextTitle}>
                <span>ENCONTRÁ TU GENTE</span>
                <Users size={16} />
              </div>
              <div className={styles.emptyCircles} aria-hidden="true">
                <span>
                  <Plus size={15} />
                </span>
                <span />
                <span />
              </div>
              <h3>Hay espacio para conectar.</h3>
              <p>Descubrí comunidades, compartí intereses y encontrá nuevas perspectivas.</p>
              <Link to="/comunidades" className={styles.simpleLink}>
                Descubrir comunidades
                <ArrowRight size={14} />
              </Link>
            </section>
            <div className={styles.contextFooter}>
              <span>MENOS RUIDO. MÁS CONEXIÓN.</span>
              <p>
                Nexo © {new Date().getFullYear()}
                <button onClick={() => setHelp(true)}>Acerca de</button>
              </p>
              <small>Ideas propias. Conexiones reales.</small>
            </div>
          </aside>
        </div>
        <footer className={styles.mobileNav} aria-label="Accesos rápidos">
          {links.slice(0, 4).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => (isActive ? styles.mobileActive : '')}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          <button aria-label="Crear publicación" onClick={() => setComposer(true)}>
            <Plus size={23} />
            <span>Crear</span>
          </button>
        </footer>
      </div>
      <Modal title="Tu espacio" open={mobile} onClose={() => setMobile(false)} drawer>
        {navigation}
        <Link className={styles.drawerSetting} to="/configuracion">
          <Settings2 size={17} />
          Configuración
        </Link>
        <Link className={styles.drawerSetting} to="/login">
          <LogIn size={17} />
          Iniciar sesión
        </Link>
      </Modal>
      <Modal title="Dale lugar a una idea" open={composer} onClose={() => setComposer(false)}>
        {composer && <Composer expanded onCreated={() => setComposer(false)} />}
      </Modal>
      <Modal title="Esto es Nexo" open={help} onClose={() => setHelp(false)}>
        <div className="about-nexo">
          <Brand />
          <h3>Menos ruido. Más conexión.</h3>
          <p>
            Nexo es un espacio para compartir ideas, proyectos y conocimiento. Un punto de encuentro
            para voces distintas.
          </p>
          <p>
            Explorá comunidades, publicá tus ideas y conversá con otras personas. Personalizá tu
            espacio desde Configuración.
          </p>
          <button
            className="button primary"
            onClick={() => {
              setHelp(false);
              notify();
            }}
          >
            <MessageSquare size={16} />
            Compartir una sugerencia
          </button>
          <span>
            <Layers3 size={14} />
            Diseñado para crecer, conexión a conexión.
          </span>
        </div>
      </Modal>
    </div>
  );
}
