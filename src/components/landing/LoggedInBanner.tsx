import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { getClubCrest } from '../../utils/clubs';

const E = [0.16, 1, 0.3, 1] as const;

const ROLE_PITCH: Record<string, { primary: { label: string; path: string }; secondary: { label: string; path: string } }> = {
  coach:   { primary: { label: 'Open dashboard',        path: '/dashboard'         }, secondary: { label: 'Check injuries',      path: '/injury-risk'       } },
  analyst: { primary: { label: 'Player stats',          path: '/player-stats'      }, secondary: { label: 'Match predictions',   path: '/match-predictions' } },
  scout:   { primary: { label: 'Start scouting',        path: '/scout-search'      }, secondary: { label: 'Recent results',      path: '/scout-results'     } },
  fan:     { primary: { label: 'See predictions',       path: '/table-predictions' }, secondary: { label: 'Top performers',      path: '/player-stats'      } },
  admin:   { primary: { label: 'Admin panel',           path: '/admin'             }, secondary: { label: 'Dashboard',           path: '/dashboard'         } },
};

export default function LoggedInBanner() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return null;

  const firstName = user.name?.split(' ')[0] ?? 'there';
  const pitch = ROLE_PITCH[user.role] ?? ROLE_PITCH.fan;
  const crest = user.favoriteClub ? getClubCrest(user.favoriteClub.toLowerCase()) : '';
  const incomplete = !user.favoriteClub || !user.primaryGoal;

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: E, delay: 0.1 }}
      className="logged-in-banner"
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate',
        maxWidth: 1280, margin: '24px auto 0', padding: '20px 28px',
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(26,101,211,0.14) 0%, rgba(26,101,211,0.04) 60%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(26,101,211,0.25)',
        display: 'grid', gap: 24, alignItems: 'center',
        gridTemplateColumns: '1fr auto',
      }}
    >
      <motion.div
        animate={{ x: ['-20%', '15%', '-20%'] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: 480, height: 480, borderRadius: '50%',
          top: -260, right: -140,
          background: 'radial-gradient(circle, rgba(26,101,211,0.22) 0%, transparent 65%)',
          filter: 'blur(60px)', pointerEvents: 'none', zIndex: -1,
        }}
      />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          {crest
            ? <img src={crest} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            : <Sparkle size={16} weight="fill" style={{ color: '#1A65D3' }} />}
          <span style={{
            fontSize: 10, fontWeight: 800, color: '#1A65D3',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            {user.role}{user.favoriteClub ? ` · ${user.favoriteClub}` : ''}
          </span>
        </div>

        <h3 style={{
          fontFamily: 'Miguer Sans, sans-serif',
          fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 900,
          color: '#F2F2F2', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1,
        }}>
          Welcome back, {firstName}.
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
          {incomplete
            ? 'You can finish your setup any time to unlock a fully personalised home screen.'
            : 'Pick up where you left off — your dashboard is tuned to your club and role.'}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          <button
            onClick={() => navigate(pitch.secondary.path)}
            style={{
              fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#F2F2F2', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            {pitch.secondary.label}
          </button>
          {incomplete && (
            <button
              onClick={() => navigate('/onboarding')}
              style={{
                fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#F2F2F2', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              Finish setup
            </button>
          )}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(pitch.primary.path)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 22px', borderRadius: 999,
          background: '#1A65D3', border: 'none',
          color: '#F2F2F2', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
          cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 8px 28px rgba(26,101,211,0.34), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        {pitch.primary.label}
        <ArrowRight size={13} weight="bold" />
      </motion.button>
    </motion.section>
  );
}
