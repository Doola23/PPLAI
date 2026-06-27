import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  House, Target, Trophy, Heartbeat, MagnifyingGlass, User,
  ChartBar, Binoculars, ListBullets, FileText, Shield, Users,
  Gear, SignOut, Plus, List, CaretRight,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User as UserType } from '../../types/auth.types';
import Logo from '../ui/Logo';
import { prewarmScouting } from '../scouting/ScoutLab';

const W_COLLAPSED = 64;
const W_EXPANDED  = 220;

const glass: React.CSSProperties = {
  background: 'rgba(0,0,0,0.96)',
  backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
};

const EASE = [0.32, 0.72, 0, 1] as const;

interface NavItem { label: string; icon: React.ElementType; path: string; }

const primaryNav: NavItem[] = [
  { label: 'Dashboard', icon: House, path: '/dashboard' },
];
const analyticsNav: NavItem[] = [
  { label: 'Match Predictions', icon: Target,         path: '/match-predictions' },
  { label: 'Table Predictions', icon: Trophy,         path: '/table-predictions' },
  { label: 'Injury Risk',       icon: Heartbeat,      path: '/injury-risk'       },
];
const playersNav: NavItem[] = [];
const scoutingNav: NavItem[] = [
  { label: 'Scout Search',  icon: Binoculars,  path: '/scout-search'  },
  { label: 'Scout Results', icon: ListBullets, path: '/scout-results' },
];
const adminNav: NavItem[] = [
  { label: 'Admin Panel',     icon: Shield, path: '/admin'           },
  { label: 'User Management', icon: Users,  path: '/user-management' },
  { label: 'System',          icon: Gear,   path: '/system'          },
];

interface SidebarProps { user: UserType | null; onLogout: () => void; }

function NavRow({
  item, active, expanded, onClick,
}: { item: NavItem; active: boolean; expanded: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const showTooltip = hovered && !expanded;

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: expanded ? 'flex-start' : 'center', width: '100%' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: expanded ? '100%' : 40,
          height: 36,
          borderRadius: 10,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: expanded ? '0 10px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.32,0.72,0,1)',
          background: active
            ? 'rgba(26,101,211,0.2)'
            : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          boxShadow: active ? 'inset 0 0 0 1px rgba(26,101,211,0.28)' : 'none',
          color: active ? '#1A65D3' : hovered ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.38)',
          flexShrink: 0,
        }}
      >
        <Icon size={17} weight={active ? 'fill' : 'regular'} style={{ flexShrink: 0 }} />
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: EASE }}
              style={{
                fontSize: 12, fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap', overflow: 'hidden',
                letterSpacing: '0.01em',
              }}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', left: 'calc(100% + 10px)', top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.82)',
              whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Divider({ expanded }: { expanded: boolean }) {
  return (
    <div style={{
      height: 1,
      background: 'rgba(255,255,255,0.06)',
      margin: expanded ? '6px 4px' : '6px auto',
      width: expanded ? 'calc(100% - 8px)' : 28,
      borderRadius: 999,
      transition: 'all 280ms cubic-bezier(0.32,0.72,0,1)',
    }} />
  );
}

function SectionLabel({ label, expanded }: { label: string; expanded: boolean }) {
  return (
    <AnimatePresence>
      {expanded && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)',
            padding: '8px 10px 2px', margin: 0,
          }}
        >
          {label}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function SidebarContent({
  user, onLogout, expanded, onClose,
}: SidebarProps & { expanded: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin  = user?.role === 'admin' || user?.role === 'coach';
  const [logoutHovered, setLogoutHovered] = useState(false);

  const go = (path: string) => { navigate(path); onClose?.(); };
  const active = (path: string) => location.pathname === path;

  const renderGroup = (items: NavItem[]) => items.map(item => (
    <NavRow key={item.path} item={item} active={active(item.path)} expanded={expanded} onClick={() => go(item.path)} />
  ));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', padding: expanded ? '14px 10px' : '14px 0',
      gap: 2, overflow: 'hidden',
      transition: 'padding 280ms cubic-bezier(0.32,0.72,0,1)',
    }}>

      <div style={{
        display: 'flex', alignItems: 'center',
        width: '100%', justifyContent: expanded ? 'flex-start' : 'center',
        padding: expanded ? '4px 6px 10px' : '4px 0 10px',
        transition: 'all 280ms cubic-bezier(0.32,0.72,0,1)',
      }}>
        <Logo height={16} />
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: expanded ? 'flex-start' : 'center', marginBottom: 4 }}>
        <button
          onClick={() => go('/dashboard')}
          style={{
            width: expanded ? '100%' : 40, height: 36, borderRadius: 10, border: 'none',
            background: '#1A65D3', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center',
            padding: expanded ? '0 10px' : '0',
            gap: 10,
            transition: 'all 280ms cubic-bezier(0.32,0.72,0,1)',
            boxShadow: '0 2px 12px rgba(26,101,211,0.22)',
            marginBottom: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
        >
          <Plus size={17} weight="bold" color="#F2F2F2" style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16, ease: EASE }}
                style={{ fontSize: 12, fontWeight: 700, color: '#F2F2F2', whiteSpace: 'nowrap' }}
              >
                Quick Access
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {renderGroup(primaryNav)}
      <Divider expanded={expanded} />

      <SectionLabel label="Analytics" expanded={expanded} />
      {renderGroup(analyticsNav)}
      <Divider expanded={expanded} />

      <SectionLabel label="Players" expanded={expanded} />
      {renderGroup(playersNav)}
      <Divider expanded={expanded} />

      <SectionLabel label="Scouting" expanded={expanded} />
      {renderGroup(scoutingNav)}

      {isAdmin && (
        <>
          <Divider expanded={expanded} />
          <SectionLabel label="Admin" expanded={expanded} />
          {renderGroup(adminNav)}
        </>
      )}

      <div style={{ flex: 1 }} />
      <Divider expanded={expanded} />

      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: expanded ? 'flex-start' : 'center' }}>
        <button
          onClick={onLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            width: expanded ? '100%' : 40, height: 36, borderRadius: 10, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center',
            padding: expanded ? '0 10px' : '0',
            gap: 10, cursor: 'pointer', transition: 'all 150ms',
            background: logoutHovered ? 'rgba(255,59,48,0.1)' : 'transparent',
            color: logoutHovered ? 'rgba(255,80,70,0.85)' : 'rgba(255,255,255,0.25)',
          }}
        >
          <SignOut size={17} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16 }}
                style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                Log out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <div style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: expanded ? 'flex-start' : 'center',
        gap: 10, padding: expanded ? '4px 6px' : '4px 0',
        transition: 'all 280ms cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'rgba(26,101,211,0.2)',
          boxShadow: 'inset 0 0 0 1.5px rgba(26,101,211,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#1A65D3', fontSize: 13, fontWeight: 900 }}>
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </span>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.16 }}
              style={{ overflow: 'hidden', minWidth: 0 }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.78)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name ?? 'User'}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', margin: '1px 0 0', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {user?.role ?? 'analyst'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const prewarmed = useRef(false);

  useEffect(() => {
    // Fire scouting API calls in the background as soon as the sidebar mounts
    // so scout-search data is ready (or in-flight) before the user clicks
    if (!prewarmed.current) {
      prewarmed.current = true;
      prewarmScouting();
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w',
      expanded ? `${W_EXPANDED}px` : `${W_COLLAPSED}px`
    );
  }, [expanded]);

  return (
    <>
      <motion.aside
        className="sidebar-desktop"
        animate={{ width: expanded ? W_EXPANDED : W_COLLAPSED }}
        transition={{ duration: 0.28, ease: EASE }}
        style={{
          ...glass,
          position: 'fixed', top: 0, left: 0, bottom: 0,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.45)',
          zIndex: 50, overflow: 'visible',
        }}
      >
        <SidebarContent user={user} onLogout={onLogout} expanded={expanded} />

        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            position: 'absolute', top: '50%', right: -12,
            transform: 'translateY(-50%)',
            width: 24, height: 24, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.97)',
            color: 'rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 60,
            boxShadow: '2px 0 12px rgba(0,0,0,0.4)',
            transition: 'color 150ms, border-color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1A65D3'; e.currentTarget.style.borderColor = 'rgba(26,101,211,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.28, ease: EASE }}>
            <CaretRight size={11} weight="bold" />
          </motion.div>
        </button>
      </motion.aside>

      <header className="sidebar-topbar" style={{
        ...glass,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <List size={18} />
        </button>
        <Logo height={16} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(26,101,211,0.2)',
            boxShadow: 'inset 0 0 0 1.5px rgba(26,101,211,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#1A65D3', fontSize: 12, fontWeight: 900 }}>
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <button
            onClick={onLogout}
            style={{
              width: 32, height: 32, borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SignOut size={14} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 59,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              }}
            />
            <motion.div
              initial={{ x: -W_EXPANDED }}
              animate={{ x: 0 }}
              exit={{ x: -W_EXPANDED }}
              transition={{ duration: 0.28, ease: EASE }}
              style={{
                ...glass,
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: W_EXPANDED, zIndex: 60,
                borderRight: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '8px 0 40px rgba(0,0,0,0.6)',
                overflow: 'hidden',
              }}
            >
              <SidebarContent
                user={user} onLogout={onLogout}
                expanded={true}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
