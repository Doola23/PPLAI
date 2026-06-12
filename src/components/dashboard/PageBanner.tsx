import { motion } from 'framer-motion';

const E = [0.16, 1, 0.3, 1] as const;

interface PageBannerProps {
  title: string;
  titleAccent?: string;
  description?: string;
  titleLayoutId?: string;
  eyebrow?: string;
  badge?: string;
  stats?: { value: string; label: string }[];
  accentColor?: string;
}

export default function PageBanner({ title, titleAccent, description, titleLayoutId }: PageBannerProps) {
  return (
    <div style={{ position: 'relative', background: '#000000', overflow: 'hidden' }}>

      <div style={{
        position: 'absolute', top: '-60%', left: '50%', transform: 'translateX(-50%)',
        width: '70%', height: '280%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(26,101,211,0.08) 0%, transparent 58%)',
      }} />

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(
          -55deg,
          transparent 0px, transparent 58px,
          rgba(255,255,255,0.005) 58px, rgba(255,255,255,0.005) 59px
        )`,
      }} />

      <div className="page-banner-inner" style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
        padding: '64px 48px 56px',
      }}>

        <motion.h1
          layoutId={titleLayoutId}
          layout={!!titleLayoutId}
          initial={titleLayoutId ? false : { opacity: 0, y: 18, filter: 'blur(8px)' }}
          animate={titleLayoutId ? {} : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: E }}
          style={{
            fontWeight: 900,
            fontSize: 'clamp(34px, 4.2vw, 52px)',
            lineHeight: 0.9, letterSpacing: '-0.025em',
            textTransform: 'uppercase', color: '#ffffff', margin: 0,
          }}
        >
          {title}{titleAccent ? ` ${titleAccent}` : ''}
        </motion.h1>

        {description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            style={{
              fontSize: 12, color: 'rgba(255,255,255,0.28)',
              margin: '16px 0 0', maxWidth: 560, lineHeight: 1.7,
              fontWeight: 500, letterSpacing: '0.01em',
            }}
          >
            {description}
          </motion.p>
        )}
      </div>

    </div>
  );
}
