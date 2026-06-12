import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

function InlineSpinner({ size }: { size: number }) {
  return (
    <motion.img
      src="/logo-3d.png"
      alt="Loading"
      animate={{ y: [0, -10, 0], opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}

function CinematicSpinner({ size, label }: { size: number; label?: string }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
        <filter id="sp-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#sp-grain)" />
      </svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.15, 0.1], scale: [0.4, 1.5, 1.2] }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          width: size * 2.2, height: size * 2.2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,101,211,0.85) 0%, rgba(26,101,211,0.25) 40%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.06, 0.03], scale: [0.5, 2.0, 1.6] }}
        transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{
          position: 'absolute',
          width: size * 3.2, height: size * 3.2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,101,211,0.5) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <motion.img
        src="/logo-3d.png"
        alt="Loading"
        initial={{ opacity: 0, scale: 0.88, filter: 'blur(24px)' }}
        animate={{
          opacity:  [0, 1, 1, 1,   0.8, 1],
          scale:    [0.88, 1, 1, 1.03, 1,  1],
          filter:   ['blur(24px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
          y:        [0, 0, 0, -10, 0, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.06, 0.4, 0.6, 0.8, 1] }}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', position: 'relative', zIndex: 1 }}
      />

      {label && (
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', zIndex: 1,
            marginTop: 24,
            fontSize: 11, fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}

export default function Spinner({ size = 300, label }: SpinnerProps) {
  if (size >= 160) return <CinematicSpinner size={size} label={label} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <InlineSpinner size={size} />
      {label && (
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
