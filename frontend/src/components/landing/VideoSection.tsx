import { motion } from 'framer-motion';

const STATS = [
  { value: '500+',   label: 'Players tracked' },
  { value: '38',     label: 'Matchweeks modelled' },
  { value: '53.4%',  label: 'Prediction accuracy' },
  { value: '20',     label: 'PL Clubs' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function VideoSection() {
  return (
    <section className="lvideo">
      <div className="lvideo__overlay" aria-hidden="true" />

      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 40px',
        gap: 48,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: EASE }}
          viewport={{ once: true, amount: 0.4 }}
          style={{ textAlign: 'center' }}
        >
          <span className="eyebrow" style={{ justifyContent: 'center', marginBottom: 20, display: 'inline-flex' }}>By the numbers</span>
          <h2 style={{
            fontFamily: "'Miguer Sans', sans-serif",
            fontWeight: 900,
            fontSize: 'clamp(32px, 4vw, 56px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: '#f2f2f2',
            textTransform: 'uppercase',
          }}>
            Intelligence at scale.
          </h2>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
          width: '100%',
          maxWidth: 960,
        }} className="lvideo-stats">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
              viewport={{ once: true, amount: 0.4 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '32px 20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20,
              }}
            >
              <span style={{
                fontWeight: 900,
                fontSize: 'clamp(28px, 3vw, 44px)',
                letterSpacing: '-0.03em',
                color: '#1A65D3',
                lineHeight: 1,
              }}>{s.value}</span>
              <span style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}>{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
