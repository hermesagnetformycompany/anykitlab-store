'use client';

import {useEffect, useRef} from 'react';

export function MotionLayer() {
  const pointerFrame = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (reduced) {
      reveals.forEach((element) => element.dataset.visible = 'true');
      return;
    }

    document.documentElement.dataset.motion = 'ready';
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.visible = 'true';
        observer.unobserve(entry.target);
      });
    }, {rootMargin: '0px 0px -10% 0px', threshold: 0.12});
    reveals.forEach((element) => observer.observe(element));

    const stage = document.querySelector<HTMLElement>('.hero-stage');
    const handlePointer = (event: PointerEvent) => {
      if (!stage || coarse) return;
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = requestAnimationFrame(() => {
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        stage.style.setProperty('--pointer-x', x.toFixed(3));
        stage.style.setProperty('--pointer-y', y.toFixed(3));
      });
    };
    stage?.addEventListener('pointermove', handlePointer);
    stage?.addEventListener('pointerleave', () => {
      stage.style.setProperty('--pointer-x', '0');
      stage.style.setProperty('--pointer-y', '0');
    });

    return () => {
      observer.disconnect();
      stage?.removeEventListener('pointermove', handlePointer);
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true"/>;
}
