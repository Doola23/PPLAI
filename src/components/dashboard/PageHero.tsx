import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
};

interface StatItem { value: string; label: string }

interface PageHeroProps {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  stats: StatItem[];
  image?: string;
  badge?: string;
  height?: number;
}

export default function PageHero({ eyebrow, title, titleAccent, stats, image, badge, height = 360 }: PageHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const imgY = useTransform(scrollY, [0, 500], [0, 70]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height, overflow: 'hidden', ...(!image ? GRID_BG : {}) }}>

      {image ? (
        <motion.img
          src={image}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '115%',
            objectFit: 'cover', objectPosition: 'center 20%',
            y: imgY,
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#000000' }} />
      )}

      <div style={{
        position: 'absolute', inset: 0,
        background: image
          ? 'linear-gradient(to bottom, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.45) 55%, rgba(10,10,10,1) 100%)'
          : 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.4) 70%, rgba(10,10,10,1) 100%)',
      }} />

      <div style={{
        position: 'absolute', bottom: 32, left: 32, right: 32,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      }}>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
          >
            <span style={{
              display: 'block', width: 20, height: 1,
              background: '#1A65D3', flexShrink: 0,
            }} />
            <span style={{
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#1A65D3', fontWeight: 600,
            }}>
              {eyebrow}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.18 }}
            style={{
              fontWeight: 900,
              fontSize: 'clamp(32px, 4.5vw, 52px)',
              color: '#fff', lineHeight: 1, letterSpacing: '-0.02em',
              textTransform: 'uppercase', margin: 0,
            }}
          >
            {title}
          </motion.h1>

          {titleAccent && (
            <motion.div
              initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.28 }}
              style={{
                fontWeight: 900,
                fontSize: 'clamp(32px, 4.5vw, 52px)',
                color: '#fff', lineHeight: 1,
                textTransform: 'uppercase', letterSpacing: '-0.02em',
              }}
            >
              {titleAccent}
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.45 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}
        >
          {badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(26,101,211,0.08)', border: '1px solid rgba(26,101,211,0.18)',
              borderRadius: 999, padding: '5px 12px',
            }}>
              <motion.span
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A65D3', display: 'inline-block' }}
              />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#1A65D3', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {badge}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 0 }}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  textAlign: 'right', paddingLeft: i > 0 ? 20 : 0,
                  marginLeft: i > 0 ? 20 : 0,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <div style={{
                  fontWeight: 900,
                  fontSize: 22, color: '#fff', lineHeight: 1, letterSpacing: '-0.01em',
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)', marginTop: 4, fontWeight: 600,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
