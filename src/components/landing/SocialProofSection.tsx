import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReveal } from '../../hooks/useReveal';
import ClubLogo from '../ui/ClubLogo';

const TESTIMONIALS = [
  { text: "The pre-match opposition pack used to take my analyst 14 hours. Now the gaffer has it before the morning briefing.", name: 'James Whitfield', role: 'Head of Analysis', club: 'arsenal', image: 'https://picsum.photos/seed/jwhitfield/80/80' },
  { text: 'PLAI flagged three hamstring risks two weeks before our medical department noticed anything. Changed how we manage the squad.', name: "Ciarán O'Sullivan", role: 'Head Physio', club: 'chelsea', image: 'https://picsum.photos/seed/cosullivan/80/80' },
  { text: 'I showed the head coach the press trigger data before Saturday. He changed the press shape in the warm-up. We won 3-0.', name: 'Priya Nambiar', role: 'First-Team Analyst', club: 'tottenham', image: 'https://picsum.photos/seed/pnambiar/80/80' },
  { text: "87% prediction accuracy over two seasons. The board stopped second-guessing the coaching staff's decisions.", name: 'Daniel Ashworth', role: 'Sporting Director', club: 'man utd', image: 'https://picsum.photos/seed/dashworth/80/80' },
  { text: 'Set-piece data from PLAI directly changed our corner routine in the cup run. We scored three times from it.', name: 'Tom Harrison', role: 'Assistant Head Coach', club: 'aston villa', image: 'https://picsum.photos/seed/tharrison/80/80' },
  { text: "The scout engine found our January signing in 40 minutes. He's now worth four times what we paid.", name: 'Marcus Reid', role: 'Chief Scout', club: 'newcastle', image: 'https://picsum.photos/seed/mreid/80/80' },
  { text: "We managed a 38-game season with zero long-term muscular injuries. The workload monitoring changed everything for us.", name: 'Oliver Banks', role: 'Head of Sports Science', club: 'liverpool', image: 'https://picsum.photos/seed/obanks/80/80' },
  { text: 'The opposition dashboard is the first screen I open on matchday. The coaching staff trust it completely now.', name: 'Sarah Keane', role: 'First-Team Coach', club: 'man city', image: 'https://picsum.photos/seed/skeane/80/80' },
  { text: "Replaced three tools we were paying for separately. The whole coaching staff is now working from one screen.", name: 'Ryan Fletcher', role: 'Performance Analyst', club: 'west ham', image: 'https://picsum.photos/seed/rfletcher/80/80' },
];

const STATS = [
  { value: '20',    label: 'PL Clubs' },
  { value: '1',     label: 'League' },
  { value: '87.2%', label: 'Accuracy' },
  { value: '500+',  label: 'Players tracked' },
];

function TestimonialsColumn({ testimonials, duration = 15, className = '' }: { testimonials: typeof TESTIMONIALS; duration?: number; className?: string }) {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className={`overflow-hidden ${className}`} style={{ maxHeight: 740 }}>
      <motion.div
        animate={prefersReduced ? {} : { translateY: '-50%' }}
        transition={{ duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
        className="flex flex-col gap-4 pb-4"
      >
        {[0, 1].map((_, idx) => (
          <React.Fragment key={idx}>
            {testimonials.map(({ text, image, name, role, club }, i) => (
              <div key={`${idx}-${i}`} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, maxWidth: 300, width: '100%', textAlign: 'left' }}>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.65, margin: 0, textAlign: 'left' }}>"{text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                  <img src={image} alt={name} width={36} height={36} style={{ borderRadius: '50%', width: 36, height: 36, objectFit: 'cover', border: '1px solid rgba(26,101,211,0.2)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <ClubLogo club={club} size={14} />
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.4 }}>{role}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

const firstColumn  = TESTIMONIALS.slice(0, 3);
const secondColumn = TESTIMONIALS.slice(3, 6);
const thirdColumn  = TESTIMONIALS.slice(6, 9);

function RevealEl({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref as React.RefObject<HTMLElement>, 0.2);
  return (
    <div
      ref={ref}
      className="lreveal"
      style={{ '--reveal-delay': `${delay}ms`, '--reveal-y': '36px', '--reveal-blur': '8px', ...style } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({
  value,
  countDelay = 0,
  valRef,
  barRef,
}: {
  value: string;
  countDelay?: number;
  valRef: React.RefObject<HTMLSpanElement>;
  barRef: React.RefObject<HTMLDivElement>;
}) {
  const match   = value.match(/^([\d.]+)(.*)$/);
  const num     = match ? parseFloat(match[1]) : null;
  const suffix  = match ? match[2] : '';
  const isDec   = match ? match[1].includes('.') : false;
  const spanRef = useRef<HTMLSpanElement>(null);
  const done    = useRef(false);

  const expoOut = (p: number) => p === 1 ? 1 : 1 - Math.pow(2, -10 * p);

  useEffect(() => {
    const span = spanRef.current;
    if (!span || num === null || done.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      done.current = true;
      io.disconnect();

      if (prefersReduced) {
        span.textContent = isDec ? num.toFixed(1) : String(num);
        return;
      }

      const dur       = 2200;
      const startTime = performance.now() + countDelay;

      const tick = (now: number) => {
        if (now < startTime) { requestAnimationFrame(tick); return; }
        const p       = Math.min((now - startTime) / dur, 1);
        const eased   = expoOut(p);
        const current = eased * num;

        span.textContent = isDec ? current.toFixed(1) : String(Math.round(current));

        if (barRef.current) barRef.current.style.width = `${eased * 100}%`;

        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          if (valRef.current) {
            valRef.current.classList.add('glow');
            setTimeout(() => valRef.current?.classList.remove('glow'), 600);
          }
        }
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.25 });

    io.observe(span);
    return () => io.disconnect();
  }, [num, countDelay]);

  if (num === null) return <>{value}</>;
  return <><span ref={spanRef}>0</span>{suffix}</>;
}

function StatItem({ value, label, index }: { value: string; label: string; index: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const valRef  = useRef<HTMLSpanElement>(null);
  const barRef  = useRef<HTMLDivElement>(null);
  useReveal(wrapRef as React.RefObject<HTMLElement>, 0.35);

  const entranceDelay = index * 80;
  const countDelay    = index * 160;

  return (
    <div
      ref={wrapRef}
      className="lproof-v2__stat lreveal"
      style={{ '--reveal-delay': `${entranceDelay}ms`, '--reveal-y': '32px', '--reveal-blur': '8px' } as React.CSSProperties}
    >
      <span className="lproof-v2__stat-val" ref={valRef}>
        <AnimatedNumber value={value} countDelay={countDelay} valRef={valRef} barRef={barRef} />
      </span>
      <span className="lproof-v2__stat-label">{label}</span>
      <div className="lproof-v2__stat-bar" ref={barRef} />
    </div>
  );
}

export default function SocialProofSection() {
  return (
    <section className="lproof-v2" id="proof">

      <RevealEl delay={0}>
        <div className="lproof-v2__head">
          <h2 className="lproof-v2__title">
            Prepare better.<br />Win more.
          </h2>
        </div>
      </RevealEl>

      <RevealEl delay={100} style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)', maxHeight: 740, overflow: 'hidden' }}>
          <TestimonialsColumn testimonials={firstColumn} duration={16} />
          <TestimonialsColumn testimonials={secondColumn} duration={20} className="hidden md:block" />
          <TestimonialsColumn testimonials={thirdColumn} duration={18} className="hidden lg:block" />
        </div>
      </RevealEl>

      <RevealEl delay={0}>
        <p className="lproof-v2__numbers-label">PLAI in Numbers</p>
      </RevealEl>

      <div className="lproof-v2__stats" style={{ marginTop: 24 }}>
        {STATS.map((s, i) => (
          <StatItem key={s.label} value={s.value} label={s.label} index={i} />
        ))}
      </div>

    </section>
  );
}
