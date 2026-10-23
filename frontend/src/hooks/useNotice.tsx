import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from 'react';
import { X, Clock3 } from 'lucide-react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { usePreferences } from './usePreferences';
import { motionAllowed } from '../animations/useMotion';
const NoticeContext = createContext<(message?: string) => void>(() => {});
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement>(document.body);
  const { preferences } = usePreferences();
  const notify = useCallback((message = 'Esta función todavía no está disponible.') => {
    setMessage(message);
    setVisible(true);
    setRevision((value) => value + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    // Mantiene los avisos dentro del diálogo modal activo, que vuelve inerte al resto del documento.
    const updateContainer = () => {
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
      setContainer(dialogs[dialogs.length - 1] || document.body);
    };
    const observer = new MutationObserver(updateContainer);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    updateContainer();
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!visible || !ref.current) return;
    if (!motionAllowed(preferences.motion)) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
      );
    }, ref);
    return () => ctx.revert();
  }, [visible, revision, preferences.motion, container]);
  return (
    <NoticeContext.Provider value={notify}>
      {children}
      {createPortal(
        <div className="notice-announcer" aria-live="polite" aria-atomic="true">
          {visible && (
            <div className="toast" role="status" ref={ref}>
              <Clock3 size={17} />
              <div>
                <strong>Aviso</strong>
                <span>{message}</span>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar aviso"
                onClick={() => {
                  clearTimeout(timer.current);
                  setVisible(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>,
        container,
      )}
    </NoticeContext.Provider>
  );
}
export const useNotice = () => useContext(NoticeContext);
