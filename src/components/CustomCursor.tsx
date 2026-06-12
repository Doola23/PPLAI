import { useEffect, useRef } from 'react';

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export default function CustomCursor() {
  const reticleRef = useRef<HTMLDivElement>(null);
  const ringRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTouch) return;
    let mouseX = window.innerWidth  / 2;
    let mouseY = window.innerHeight / 2;
    let ringX  = mouseX;
    let ringY  = mouseY;
    let raf    = 0;

    const reticle = reticleRef.current!;
    const ring    = ringRef.current!;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      reticle.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnter = () => {
      ring.classList.add('cursor-ring--hover');
      reticle.classList.add('cursor-reticle--hover');
    };
    const onLeave = () => {
      ring.classList.remove('cursor-ring--hover');
      reticle.classList.remove('cursor-reticle--hover');
    };

    const onDown = () => reticle.classList.add('cursor-reticle--click');
    const onUp   = () => reticle.classList.remove('cursor-reticle--click');

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup',   onUp);

    const attach = () => {
      document.querySelectorAll('a, button, [role="button"], input, label, select, textarea')
        .forEach(el => {
          el.addEventListener('mouseenter', onEnter);
          el.addEventListener('mouseleave', onLeave);
        });
    };
    attach();

    const obs = new MutationObserver(attach);
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup',   onUp);
      obs.disconnect();
    };
  }, []);

  if (isTouch) return null;

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={reticleRef} className="cursor-reticle" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="14" y1="2"  x2="14" y2="9"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="14" y1="19" x2="14" y2="26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="2"  y1="14" x2="9"  y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="19" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="14" cy="14" r="2" fill="#1A65D3" />
        </svg>
      </div>
    </>
  );
}
