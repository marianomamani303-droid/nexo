import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { usePreferences } from '../hooks/usePreferences';
import { motionAllowed } from '../animations/useMotion';
import styles from './Modal.module.css';
import { focusableElements } from '../utils/focus';
export function Modal({
  open,
  onClose,
  title,
  children,
  drawer = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { preferences } = usePreferences();
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const ctx = gsap.context(() => {
      if (open) {
        if (!dialog.open) dialog.showModal();
        if (motionAllowed(preferences.motion)) {
          gsap.fromTo(
            dialog,
            { opacity: 0, x: drawer ? -35 : 0, y: drawer ? 0 : 20, scale: drawer ? 1 : 0.97 },
            {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.32,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
            },
          );
          if (drawer)
            gsap.fromTo(
              dialog.querySelectorAll('[data-drawer-item]'),
              { x: -12, opacity: 0 },
              {
                x: 0,
                opacity: 1,
                duration: 0.3,
                stagger: 0.04,
                delay: 0.08,
                clearProps: 'transform,opacity',
              },
            );
        }
      } else if (dialog.open) {
        if (motionAllowed(preferences.motion))
          gsap.to(dialog, {
            opacity: 0,
            x: drawer ? -30 : 0,
            y: drawer ? 0 : 12,
            duration: 0.2,
            onComplete: () => dialog.close(),
          });
        else dialog.close();
      }
    }, dialog);
    return () => ctx.revert();
  }, [open, drawer, preferences.motion]);
  useLayoutEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const elements = focusableElements(event.currentTarget);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className={`${styles.dialog} ${drawer ? styles.drawer : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          autoFocus
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar ventana"
        >
          <X size={19} />
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
