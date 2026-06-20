import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import Flag from '../ui/Flag';
import ClubLogo from '../ui/ClubLogo';

const players = [
  {
    id: 'salah',
    name: 'Mohamed Salah',
    nationality: 'egyptian',
    country: 'Egypt',
    club: 'Liverpool',
    color: '#1A65D3',
    zoneLeft: '2%',
    zoneWidth: '30%',
    href: '/player-profile',
  },
  {
    id: 'haaland',
    name: 'Erling Haaland',
    nationality: 'norwegian',
    country: 'Norway',
    club: 'Man City',
    color: '#1A65D3',
    zoneLeft: '34%',
    zoneWidth: '32%',
    href: '/player-profile/haaland',
  },
  {
    id: 'saka',
    name: 'Bukayo Saka',
    nationality: 'english',
    country: 'England',
    club: 'Arsenal',
    color: '#1A65D3',
    zoneLeft: '66%',
    zoneWidth: '32%',
    href: '/player-profile/saka',
  },
];

const SIDE_STATS = [
  { label: 'League', value: '1' },
  { label: 'PL Clubs', value: '20' },
  { label: 'Accuracy', value: '53.4%' },
];

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const rawX    = useMotionValue(0);
  const rawY    = useMotionValue(0);
  const rawRotX = useMotionValue(0);
  const rawRotY = useMotionValue(0);
  const cfg = { stiffness: 35, damping: 18, mass: 1.4 };
  const x    = useSpring(rawX,    cfg);
  const y    = useSpring(rawY,    cfg);
  const rotX = useSpring(rawRotX, cfg);
  const rotY = useSpring(rawRotY, cfg);

  useEffect(() => {
    if (reduceMotion) return;
    const el = sectionRef.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const cx = (e.clientX - left) / width  - 0.5;
      const cy = (e.clientY - top)  / height - 0.5;
      rawX.set(cx * 36);
      rawY.set(cy * 28);
      rawRotY.set(cx *  8);
      rawRotX.set(-cy *  6);
    };
    const handleLeave = () => {
      rawX.set(0); rawY.set(0);
      rawRotX.set(0); rawRotY.set(0);
    };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [rawX, rawY, rawRotX, rawRotY, reduceMotion]);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <section ref={sectionRef} className="lhero-cinema" id="top" aria-label="Hero — Built for Precision">

      <div className="lhero-cinema__bg" style={{ perspective: '900px', perspectiveOrigin: 'center center' }}>
        <div className={loaded ? 'lhero-cinema__img--reveal' : ''} style={{ position: 'absolute', left: '-6%', top: '-8%', width: '112%', height: '116%' }}>
          <motion.img
            src="/hero-1.jpg"
            alt=""
            style={{
              x, y,
              rotateX: rotX, rotateY: rotY,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center center',
              transformStyle: 'preserve-3d',
            }}
          />
        </div>
        <div className="lhero-cinema__overlay" />
      </div>

      <div className={`lhero-cinema__anchor ${loaded ? 'lhero-cinema__anchor--reveal' : ''}`}>
        <div className="lhero-cinema__anchor-inner">

          <div className="lhero-cinema__title-col">
            <h1
              className="lhero__title lhero-cinema__line"
              style={{ textAlign: 'center', '--reveal-delay': '0.3s' } as React.CSSProperties}
            >
              Win More.<br /><span className="accent">Guess Less.</span>
            </h1>
          </div>

        </div>
      </div>

      {players.map((p) => (
        <div
          key={p.id}
          className="lhero-player-zone"
          style={{ left: p.zoneLeft, width: p.zoneWidth }}
        >
          <div className="lhero-player-zone__glow" />
          <Link
            to={p.href}
            className="lhero-player-zone__pill lpill"
            style={{ '--player-color': p.color, textDecoration: 'none' } as React.CSSProperties}
          >
            <div className="lpill__bar" style={{ background: p.color }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Flag nationality={p.nationality} size={14} />
                <span className="lpill__label">{p.country}</span>
              </div>

              <div className="lpill__val">{p.name}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <ClubLogo club={p.club.toLowerCase()} size={14} />
                <span className="lpill__label" style={{ color: p.color }}>{p.club}</span>
              </div>

            </div>
          </Link>
        </div>
      ))}

    </section>
  );
}
