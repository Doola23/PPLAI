import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useScroll, useSpring, AnimatePresence, useReducedMotion } from 'framer-motion';
import '../../styles/landing.css';
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
import LoggedInBanner from '../../components/landing/LoggedInBanner';
import KineticStrip from '../../components/landing/KineticStrip';
import ProblemSection from '../../components/landing/ProblemSection';
import LogoCloud from '../../components/landing/LogoCloud';
import Footer from '../../components/landing/Footer';
import { useReveal } from '../../hooks/useReveal';

const SocialProofSection = lazy(() => import('../../components/landing/SocialProofSection'));
const FeatureTeaser      = lazy(() => import('../../components/landing/FeatureTeaser'));
const StatsSection       = lazy(() => import('../../components/landing/StatsSection'));

export default function LandingPage() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  const stripRef   = useRef<HTMLDivElement>(null);
  const footerRef  = useRef<HTMLDivElement>(null);

  const [intro, setIntro] = useState(!reduceMotion);
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setIntro(false), 1500);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  useReveal(stripRef  as React.RefObject<HTMLElement>, 0.2);
  useReveal(footerRef as React.RefObject<HTMLElement>, 0.05);

  useEffect(() => {
    const id = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [location.state]);

  return (
    <div className="bg-bg-black text-text-white min-h-screen" style={{ overflowX: 'clip' }}>

      <AnimatePresence>
        {intro && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none' }}>
              <filter id="grain">
                <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#grain)" />
            </svg>

            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.18, 0.12], scale: [0.4, 1.6, 1.3] }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                width: 600, height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(26,101,211,0.9) 0%, rgba(26,101,211,0.3) 40%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.08, 0.04], scale: [0.6, 2.2, 1.8] }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              style={{
                position: 'absolute',
                width: 900, height: 900,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(26,101,211,0.5) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />

            <motion.img
              src="/logo-3d.png"
              alt="PLAI"
              initial={{ opacity: 0, scale: 0.88, filter: 'blur(24px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
              style={{ width: 340, height: 340, objectFit: 'contain', display: 'block', position: 'relative', zIndex: 2 }}
            />

            <div style={{
              position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
              width: 180, height: 1.5,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 999, overflow: 'hidden',
            }}>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(26,101,211,0.6), #1A65D3)',
                  borderRadius: 999,
                  transformOrigin: '0%',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{
          scaleX,
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 4,
          background: 'linear-gradient(90deg, #0A3A8C 0%, #1A65D3 40%, #4D8FE8 70%, #7DB1F5 100%)',
          boxShadow: '0 0 12px rgba(26,101,211,0.8), 0 1px 4px rgba(26,101,211,0.5)',
          transformOrigin: '0%',
          zIndex: 99998,
          pointerEvents: 'none',
        }}
      />

      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />

      <main id="main-content">
        <HeroSection />
        <LoggedInBanner />

        <div
          ref={stripRef}
          className="lreveal"
          style={{ '--reveal-y': '20px', '--reveal-blur': '4px', '--reveal-delay': '0ms' } as React.CSSProperties}
        >
          <KineticStrip />
        </div>

        <ProblemSection />
        <LogoCloud />

        <Suspense fallback={null}>
          <FeatureTeaser />
        </Suspense>

        <Suspense fallback={null}>
          <StatsSection />
        </Suspense>

        <Suspense fallback={null}>
          <SocialProofSection />
        </Suspense>
      </main>

      <div
        ref={footerRef}
        className="lreveal"
        style={{ '--reveal-y': '32px', '--reveal-blur': '6px', '--reveal-delay': '0ms' } as React.CSSProperties}
      >
        <Footer />
      </div>
    </div>
  );
}
