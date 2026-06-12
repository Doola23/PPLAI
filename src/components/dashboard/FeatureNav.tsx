import { useNavigate, useLocation } from 'react-router-dom';
import { Target, Heartbeat, Trophy, Binoculars } from '@phosphor-icons/react';

const FEATURES = [
  { label: 'Match Predictions', shortLabel: 'Predictions', path: '/match-predictions', icon: Target,     desc: 'AI fixture picks' },
  { label: 'Injury Risk',       shortLabel: 'Injury Risk', path: '/injury-risk',       icon: Heartbeat,  desc: 'Squad fitness radar' },
  { label: 'Table Predictions', shortLabel: 'Table',       path: '/table-predictions', icon: Trophy,     desc: 'Season forecast' },
  { label: 'Scout Search',      shortLabel: 'Scout',       path: '/scout-search',      icon: Binoculars, desc: 'Player discovery' },
] as const;

export default function FeatureNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: 0,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    } as React.CSSProperties}>

      {FEATURES.map(({ label, shortLabel, path, icon: Icon, desc }) => {
        const isActive = pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            title={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? '#1A65D3' : 'transparent'}`,
              cursor: 'pointer',
              color: isActive ? '#1A65D3' : 'rgba(255,255,255,0.32)',
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.01em',
              transition: 'color 140ms ease, border-color 140ms ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: 'inherit',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.12)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.32)';
                e.currentTarget.style.borderBottomColor = 'transparent';
              }
            }}
          >
            <Icon
              size={13}
              weight={isActive ? 'fill' : 'regular'}
              style={{ flexShrink: 0 }}
            />
            <span className="feature-nav-label">{label}</span>
            <span className="feature-nav-short" style={{ display: 'none' }}>{shortLabel}</span>
          </button>
        );
      })}

    </div>
  );
}
