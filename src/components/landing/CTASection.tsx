import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChartLine, MagnifyingGlass, User, Heartbeat, ListBullets } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';

function addRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const el = document.createElement('span');
  el.className = 'lripple-el';
  el.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(el);
  setTimeout(() => el.remove(), 620);
}

const ROLES = ['Coach', 'Analyst', 'Scout', 'Admin'];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CTASection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [role, setRole]       = useState('Coach');
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 32, filter: 'blur(5px)' },
    animate: visible ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {},
    transition: { duration: 0.72, ease: EASE, delay },
  });

  return (
    <section ref={ref} className="lcta2" id="cta">

      <div className="lcta2__noise" aria-hidden="true" />


      <div className="lcta2__inner lcta2__inner--centered">


        <motion.h2 {...fadeUp(0.1)} className="lcta2__title" style={{ textAlign: 'center' }}>
          Sharper data. Faster decisions. Smarter teams.
        </motion.h2>


        <motion.p {...fadeUp(0.32)} className="lcta2__sub" style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
          Coaches, analysts, and scouts worldwide build sharper edges with PLAI. Which role fits you?
        </motion.p>

        <motion.div {...fadeUp(0.4)} className="lcta2__roles" style={{ justifyContent: 'center' }}>
          {ROLES.map((r, i) => (
            <motion.button
              key={r}
              className="lrole"
              aria-pressed={role === r ? 'true' : 'false'}
              onClick={() => setRole(r)}
              initial={{ opacity: 0, y: 16, scale: 0.93 }}
              animate={visible ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: EASE, delay: 0.44 + i * 0.07 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.95 }}
            >
              {r}
            </motion.button>
          ))}
        </motion.div>

        {isAuthenticated ? (
          <motion.div {...fadeUp(0.56)} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {([
              { icon: ChartLine,     label: 'Match Predictions', path: '/match-predictions' },
              { icon: MagnifyingGlass, label: 'Scout Search',    path: '/scout-search'      },
              { icon: User,          label: 'Player Stats',      path: '/player-stats'      },
              { icon: Heartbeat,     label: 'Injury Risk',       path: '/injury-risk'       },
              { icon: ListBullets,   label: 'Table Predictions', path: '/table-predictions' },
            ] as const).map(({ icon: Icon, label, path }, i) => (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={visible ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.4, ease: EASE, delay: 0.56 + i * 0.06 }}
                whileHover={{ y: -2, scale: 1.04, transition: { duration: 0.14 } }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 18px', borderRadius: 999,
                  background: 'rgba(26,101,211,0.10)',
                  border: '1px solid rgba(26,101,211,0.28)',
                  color: '#F2F2F2', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <Icon size={15} weight="bold" color="#1A65D3" aria-hidden="true" />
                {label}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div {...fadeUp(0.56)} className="lcta2__btns" style={{ justifyContent: 'center' }}>
            <button className="lbtn" onClick={() => navigate('/signup')}>Signup</button>
            <button className="lbtn lbtn--outline" onClick={() => { navigate('/features'); window.scrollTo(0, 0); }}>Explore</button>
          </motion.div>
        )}

        <motion.p {...fadeUp(0.68)} className="lcta2__footnote" style={{ textAlign: 'center' }}>
          No card required · Cancel anytime
        </motion.p>

      </div>
    </section>
  );
}
