import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePreferences } from '../hooks/usePreferences';

gsap.registerPlugin(ScrollTrigger);
export function motionAllowed(mode: string) {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return (
    mode !== 'reduced' &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !(navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) &&
    !connection?.saveData
  );
}
/** Cada región gestiona sus tweens, listeners y ScrollTriggers, incluso en StrictMode. */
export function useEntrance<T extends HTMLElement>(identity: string): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { preferences } = usePreferences();
  useLayoutEffect(() => {
    if (!ref.current || !motionAllowed(preferences.motion)) return;
    const root = ref.current;
    const owned = (selector: string) =>
      Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => element.closest('[data-motion-scope]') === root,
      );
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const reveal = owned('[data-reveal]');
        if (reveal.length)
          gsap.fromTo(
            reveal,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.62,
              stagger: 0.065,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
            },
          );
        owned('[data-scroll]').forEach((element) => {
          gsap.fromTo(
            element,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
              scrollTrigger: { trigger: element, start: 'top 94%', once: true },
            },
          );
        });
        const interactive = owned('[data-hover]');
        const cleanups: (() => void)[] = [];
        if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
          interactive.forEach((element) => {
            const enter = () =>
              ctx.add(() => {
                gsap.to(element, { y: -3, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
              });
            const leave = () =>
              ctx.add(() => {
                gsap.to(element, { y: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
              });
            element.addEventListener('mouseenter', enter);
            element.addEventListener('mouseleave', leave);
            cleanups.push(() => {
              element.removeEventListener('mouseenter', enter);
              element.removeEventListener('mouseleave', leave);
            });
          });
        }
        return () => cleanups.forEach((cleanup) => cleanup());
      });
    }, root);
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [identity, preferences.motion]);
  return ref;
}
export function useDepth<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { preferences } = usePreferences();
  useLayoutEffect(() => {
    if (!ref.current || !motionAllowed(preferences.motion)) return;
    const element = ref.current;
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      mm.add(
        '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const art = element.querySelector('[data-depth]');
          if (!art) return;
          const x = gsap.quickTo(art, 'x', { duration: 0.8, ease: 'power3.out' });
          const y = gsap.quickTo(art, 'y', { duration: 0.8, ease: 'power3.out' });
          const move = (event: PointerEvent) => {
            const bounds = element.getBoundingClientRect();
            x((event.clientX - bounds.left - bounds.width / 2) * 0.025);
            y((event.clientY - bounds.top - bounds.height / 2) * 0.025);
          };
          const leave = () => {
            x(0);
            y(0);
          };
          element.addEventListener('pointermove', move);
          element.addEventListener('pointerleave', leave);
          return () => {
            element.removeEventListener('pointermove', move);
            element.removeEventListener('pointerleave', leave);
          };
        },
      );
    }, element);
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [preferences.motion]);
  return ref;
}
