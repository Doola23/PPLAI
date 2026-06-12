import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Activity, TrendingUp, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getClubCrest } from '../../utils/clubs';

const E = [0.16, 1, 0.3, 1] as const;

interface RolePlan {
  greeting: string;
  primaryAction: { label: string; path: string; icon: React.ElementType };
  secondaryActions: { label: string; path: string }[];
}

function getPlan(role: string, club: string | null, goal: string | null): RolePlan {
  const c = club ?? 'your club';
  switch (role) {
    case 'coach':
      return {
        greeting: `Check ${c}'s next fixture and squad health`,
        primaryAction: { label: 'View match predictions', path: '/match-predictions', icon: TrendingUp },
        secondaryActions: [
          { label: 'Injury risk for my squad', path: '/injury-risk' },
          { label: 'Player profiles', path: '/player-stats' },
        ],
      };
    case 'analyst':
      return {
        greeting: 'Deep stats and predictive models — ready to dig in',
        primaryAction: { label: 'Open player stats', path: '/player-stats', icon: Activity },
        secondaryActions: [
          { label: 'Table predictions', path: '/table-predictions' },
          { label: 'Match predictions', path: '/match-predictions' },
        ],
      };
    case 'scout':
      return {
        greeting: 'New scouting targets waiting for review',
        primaryAction: { label: 'Start scout search', path: '/scout-search', icon: Search },
        secondaryActions: [
          { label: 'Top scout results', path: '/scout-results' },
          { label: 'Player profiles', path: '/player-stats' },
        ],
      };
    case 'fan':
    default:
      return {
        greeting: goal === 'follow_team' ? `Latest on ${c}` : `Hot predictions and ${c} news`,
        primaryAction: { label: 'See table predictions', path: '/table-predictions', icon: Compass },
        secondaryActions: [
          { label: 'Match predictions', path: '/match-predictions' },
          { label: 'Top performers', path: '/player-stats' },
        ],
      };
  }
}

export default function RoleHeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!user) return null;

  const plan = getPlan(user.role, user.favoriteClub, user.primaryGoal);
  const crest = user.favoriteClub ? getClubCrest(user.favoriteClub.toLowerCase()) : '';
  const Icon = plan.primaryAction.icon;
  const firstName = user.name?.split(' ')[0] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: E }}
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate',
        background: 'linear-gradient(135deg, rgba(26,101,211,0.12) 0%, rgba(26,101,211,0.04) 60%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(26,101,211,0.2)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 20,
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
      }}
      className="role-hero"
    >
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,101,211,0.15) 0%, transparent 65%)', top: -180, right: -120, pointerEvents: 'none', zIndex: -1 }} />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {crest && <img src={crest} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />}
          <span style={{ fontSize: 10, fontWeight: 800, color: '#1A65D3', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {user.role} · {user.favoriteClub ?? 'No club selected'}
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 900, color: '#F2F2F2', margin: '0 0 6px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h2>
        <p style={{ fontSize: 14, color: '#939A9E', margin: '0 0 16px', lineHeight: 1.5 }}>
          {plan.greeting}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {plan.secondaryActions.map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              style={{
                fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#F2F2F2', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 150ms, border 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(plan.primaryAction.path)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
          background: '#1A65D3', border: 'none', borderRadius: 999, cursor: 'pointer',
          color: '#F2F2F2', fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
          boxShadow: '0 4px 24px rgba(26,101,211,0.4)', whiteSpace: 'nowrap',
        }}
      >
        <Icon size={15} />
        {plan.primaryAction.label}
        <ArrowRight size={14} />
      </motion.button>
    </motion.div>
  );
}
