import { useEffect, useRef, useState } from 'react';
import '../../styles/dashboard.css';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';

const E = [0.16, 1, 0.3, 1] as const;
const BLUE = '#1A65D3';
const TRACK = 'rgba(255,255,255,0.07)';
const SIZE = 220;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const GAP_DEG = 60;
const ARC_DEG = 360 - GAP_DEG;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function useCounting(target: number, duration: number, active: boolean) {
  const val = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    const ctrl = animate(val, target, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsub = val.on('change', v => setDisplay(Math.round(v)));
    return () => { ctrl.stop(); unsub(); };
  }, [active, target, duration]);
  return display;
}

interface DialProps {
  label: string;
  sublabel: string;
  value: number;
  maxValue: number;
  displaySuffix?: string;
  sideStats: { label: string; value: string }[];
  delay: number;
  active: boolean;
  ticks?: number;
}

function Dial({ label, sublabel, value, maxValue, displaySuffix = '', sideStats, delay, active, ticks = 36 }: DialProps) {
  const pct = value / maxValue;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const startDeg = 90 + GAP_DEG / 2;
  const endDeg = startDeg + ARC_DEG;

  const displayVal = useCounting(value, 1.4, active);

  const filledDeg = active ? startDeg + ARC_DEG * pct : startDeg;
  const trackPath = buildArcPath(cx, cy, R, startDeg, endDeg);
  const filledPath = buildArcPath(cx, cy, R, startDeg, Math.max(startDeg + 0.01, filledDeg));

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
      animate={active ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.7, ease: E, delay }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24, padding: '32px 28px 28px',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, alignSelf: 'flex-start' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, boxShadow: `0 0 8px ${BLUE}` }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: BLUE }}>
          {displayVal}{displaySuffix}
        </span>
      </div>

      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
          {Array.from({ length: ticks }).map((_, i) => {
            const tickDeg = startDeg + (ARC_DEG / (ticks - 1)) * i;
            const inner = polarToXY(cx, cy, R - STROKE / 2 - 4, tickDeg);
            const outer = polarToXY(cx, cy, R + STROKE / 2 + 3, tickDeg);
            const filled = i / (ticks - 1) <= pct && active;
            return (
              <line
                key={i}
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke={filled ? BLUE : 'rgba(255,255,255,0.12)'}
                strokeWidth={i % 6 === 0 ? 2 : 1}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.05s' }}
              />
            );
          })}

          <path d={trackPath} fill="none" stroke={TRACK} strokeWidth={STROKE} strokeLinecap="round" />

          <motion.path
            d={filledPath}
            fill="none"
            stroke={BLUE}
            strokeWidth={STROKE}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={active ? { pathLength: pct } : { pathLength: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: delay + 0.1 }}
            style={{ filter: `drop-shadow(0 0 6px ${BLUE}80)` }}
          />
        </svg>

        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingBottom: 20,
        }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: '#F2F2F2', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {displayVal}<span style={{ fontSize: 24, color: BLUE }}>{displaySuffix}</span>
          </span>
          <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            {sublabel}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
        {sideStats.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#F2F2F2' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#939A9E', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} style={{ padding: '80px 24px', maxWidth: 1160, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: E }}
        style={{ textAlign: 'center', marginBottom: 56 }}
      >
        <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: BLUE, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Platform Intelligence
        </span>
        <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 900, color: '#F2F2F2', margin: '12px 0 0', lineHeight: 1.05 }}>
          Built on real data
        </h2>
      </motion.div>

      <div className="layout-dials-3">
        <Dial
          label="Prediction Accuracy"
          sublabel="Win / Draw / Loss"
          value={53}
          maxValue={100}
          displaySuffix="%"
          sideStats={[{ label: '3-season avg', value: '53.4%' }, { label: 'Best season', value: '58.1%' }]}
          delay={0}
          active={inView}
        />
        <Dial
          label="Players Tracked"
          sublabel="Active Profiles"
          value={2168}
          maxValue={2200}
          displaySuffix="+"
          sideStats={[{ label: 'Leagues', value: '5' }, { label: 'Nations', value: '122' }]}
          delay={0.12}
          active={inView}
        />
        <Dial
          label="Matches Analysed"
          sublabel="This Season"
          value={380}
          maxValue={400}
          sideStats={[{ label: 'GW complete', value: '38' }, { label: 'Shots tracked', value: '43.8K' }]}
          delay={0.24}
          active={inView}
        />
      </div>
    </section>
  );
}
