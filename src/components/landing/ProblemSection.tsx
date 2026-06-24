import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChartLine, MagnifyingGlass, User, Heartbeat, ListBullets } from '@phosphor-icons/react';
import { useReveal } from '../../hooks/useReveal';
import { useAuth } from '../../hooks/useAuth';

const ROLES = ['Head Coaches', 'Analysts', 'Scouts', 'Physios', 'Sporting Directors'];
const EASE = [0.16, 1, 0.3, 1] as const;

function CyclingPill({ words, color }: { words: string[]; color: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, [words.length]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', margin: '0 6px' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: color === 'dark' ? 'rgba(255,255,255,0.08)' : '#1A65D3',
            border: `1px solid ${color === 'dark' ? 'rgba(255,255,255,0.18)' : 'transparent'}`,
            color: '#fff', borderRadius: 999, padding: '4px 18px 4px 14px',
            fontWeight: 900, fontSize: 'inherit',
            letterSpacing: '-0.01em', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function ProblemSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const headRef = useRef<HTMLDivElement>(null);
  const btnsRef = useRef<HTMLDivElement>(null);
  useReveal(headRef as React.RefObject<HTMLElement>, 0.2);
  useReveal(btnsRef as React.RefObject<HTMLElement>, 0.2);

  return (
    <section className="lproblem-v2" id="problem" style={{ background: '#000000' }}>

      <div className="lproblem-v2__head" style={{ textAlign: 'center' }}>

        <div
          ref={headRef}
          className="lreveal"
          style={{ '--reveal-y': '36px', '--reveal-blur': '8px', '--reveal-delay': '0ms' } as React.CSSProperties}
        >
          <h2 style={{
            fontFamily: 'Miguer Sans, sans-serif', fontWeight: 900, fontSize: 'var(--fs-h2)',
            lineHeight: 1.12, letterSpacing: '-0.02em', color: '#fff',
            textTransform: 'uppercase', textAlign: 'center', maxWidth: 1100, margin: '0 auto',
          }}>
            Your rivals are already ahead.{' '}
            <CyclingPill words={ROLES} color="accent" />
          </h2>
        </div>

        <div
          ref={btnsRef}
          className="lreveal"
          style={{ '--reveal-y': '24px', '--reveal-blur': '6px', '--reveal-delay': '150ms', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 40 } as React.CSSProperties}
        >
          {isAuthenticated ? (
            <>
              {([
                { Icon: ChartLine,      label: 'Match Predictions', path: '/match-predictions' },
                { Icon: MagnifyingGlass, label: 'Scout Search',     path: '/scout-search'      },
                { Icon: User,           label: 'Player Stats',      path: '/player-stats'      },
                { Icon: Heartbeat,      label: 'Injury Risk',       path: '/injury-risk'       },
                { Icon: ListBullets,    label: 'Table Predictions', path: '/table-predictions' },
              ] as const).map(({ Icon, label, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '10px 18px', borderRadius: 999,
                    background: 'rgba(26,101,211,0.12)',
                    border: '1px solid rgba(26,101,211,0.3)',
                    color: '#F2F2F2', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    cursor: 'pointer', transition: 'background 150ms, transform 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,101,211,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,101,211,0.12)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <Icon size={15} weight="bold" color="#1A65D3" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </>
          ) : (
            <>
              <button className="lbtn" onClick={() => { navigate('/signup'); window.scrollTo(0, 0); }}>Signup</button>
              <button className="lbtn lbtn--outline" onClick={() => { navigate('/features'); window.scrollTo(0, 0); }}>Explore</button>
            </>
          )}
        </div>

      </div>

    </section>
  );
}
