import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Zap } from 'lucide-react';

export const EASE = [0.16, 1, 0.3, 1] as const;

export function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      done.current = true;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(parseFloat((ease * target).toFixed(decimals)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, decimals]);
  return { ref, val };
}

export function DCard({
  children, delay = 0, style = {}, onClick,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      whileHover={{ y: -6, scale: 1.012, transition: { duration: 0.25, ease: EASE } }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative', background: 'rgba(26,101,211,0.38)',
        border: `1px solid ${hovered ? 'rgba(26,101,211,0.5)' : '#000000'}`,
        borderRadius: 18, padding: '22px 24px', overflow: 'hidden',
        isolation: 'isolate', cursor: onClick ? 'pointer' : 'default',
        boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.5), 0 0 28px rgba(26,101,211,0.1)' : 'none',
        transition: 'border-color 280ms ease, box-shadow 280ms ease',
        ...style,
      }}
    >
      <motion.div
        initial={{ x: '-120%' }}
        animate={{ x: hovered ? '120%' : '-120%' }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)',
        }}
      />
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: 2,
        borderRadius: '0 0 4px 4px',
        background: 'linear-gradient(90deg, transparent, #1A65D3, transparent)',
        opacity: hovered ? 1 : 0, transition: 'opacity 280ms ease',
      }} />
      {children}
    </motion.div>
  );
}

export function DStatCard({
  label, value, suffix = '', prefix = '', caption, captionColor = '#1A65D3',
  icon: Icon, iconBg, delay = 0,
}: {
  label: string; value: number; suffix?: string; prefix?: string;
  caption: string; captionColor?: string;
  icon: LucideIcon; iconBg: string; delay?: number;
}) {
  const decimals = value % 1 !== 0 ? (String(value).split('.')[1]?.length ?? 1) : 0;
  const { ref, val } = useCountUp(value, 1300, decimals);
  return (
    <DCard delay={delay}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500, letterSpacing: '0.01em' }}>{label}</p>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={16} color="#fff" />
        </div>
      </div>
      <p style={{ color: '#fff', fontSize: 34, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>
        {prefix}<span ref={ref}>{val}</span>{suffix}
      </p>
      <p style={{ fontSize: 11, fontWeight: 700, color: captionColor, letterSpacing: '0.04em' }}>{caption}</p>
    </DCard>
  );
}

export function DTopBar({
  eyebrow, title, badge, right,
}: {
  eyebrow: string; title: string; badge?: string; right?: React.ReactNode;
}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(10,10,10,0.85)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(26,101,211,0.25)',
      padding: '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <p style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 3 }}>
          {eyebrow}
        </p>
        <h1 style={{ color: '#fff', fontFamily: 'Miguer Sans, sans-serif', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1 }}>
          {title}
        </h1>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        {badge && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.22)',
            borderRadius: 999, padding: '6px 12px',
          }}>
            <Zap size={12} color="#1A65D3" />
            <span style={{ fontSize: 11, color: '#1A65D3', fontWeight: 700, letterSpacing: '0.08em' }}>{badge}</span>
          </div>
        )}
        {right}
      </motion.div>
    </div>
  );
}

export function DFilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      animate={{
        background: active ? '#1A65D3' : 'transparent',
        color: active ? '#F2F2F2' : 'rgba(255,255,255,0.38)',
        boxShadow: active ? '0 2px 10px rgba(26,101,211,0.3)' : 'none',
      }}
      transition={{ duration: 0.18 }}
      style={{
        fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
        border: `1px solid ${active ? 'rgba(26,101,211,0.5)' : 'transparent'}`,
        cursor: 'pointer', letterSpacing: '0.04em', fontFamily: 'inherit',
      }}
    >
      {label}
    </motion.button>
  );
}

export function DFilterGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 999, padding: '3px', flexWrap: 'wrap',
    }}>
      {children}
    </div>
  );
}

export function DInner({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#000000', border: '1px solid #000000', borderRadius: 12, padding: '14px 16px', ...style }}>
      {children}
    </div>
  );
}

export function DBtn({
  children, onClick, variant = 'ghost', type = 'button', style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'outline' | 'primary';
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
    minHeight: 32, cursor: 'pointer', letterSpacing: '0.06em',
    fontFamily: 'inherit', transition: 'all 160ms ease', whiteSpace: 'nowrap',
  };
  const variants: Record<string, React.CSSProperties> = {
    ghost:   { border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.45)' },
    outline: { border: '1px solid rgba(26,101,211,0.3)', background: 'transparent', color: '#1A65D3' },
    primary: { border: 'none', background: '#1A65D3', color: '#F2F2F2' },
  };
  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget;
    if (variant === 'ghost')   { b.style.borderColor = 'rgba(255,255,255,0.18)'; b.style.color = 'rgba(255,255,255,0.75)'; }
    if (variant === 'outline') { b.style.background = 'rgba(26,101,211,0.1)'; }
    if (variant === 'primary') { b.style.filter = 'brightness(1.12)'; b.style.boxShadow = '0 4px 14px rgba(26,101,211,0.4)'; }
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget;
    if (variant === 'ghost')   { b.style.borderColor = 'rgba(255,255,255,0.09)'; b.style.color = 'rgba(255,255,255,0.45)'; }
    if (variant === 'outline') { b.style.background = 'transparent'; }
    if (variant === 'primary') { b.style.filter = ''; b.style.boxShadow = ''; }
  };
  return (
    <button type={type} onClick={onClick} style={{ ...base, ...variants[variant], ...style }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
    </button>
  );
}

export function DPill({
  children, color = 'rgba(26,101,211,0.15)', textColor = '#1A65D3', borderColor = 'rgba(26,101,211,0.25)',
}: {
  children: React.ReactNode; color?: string; textColor?: string; borderColor?: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: color, border: `1px solid ${borderColor}`, color: textColor,
      fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}
