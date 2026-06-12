import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Users, TrendingUp, DollarSign, ChevronLeft, ChevronRight, ChevronDown, Star, Zap } from 'lucide-react';
import Flag from '../../components/ui/Flag';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import ClubLogo from '../../components/ui/ClubLogo';
import { useCountUp, EASE } from '../../components/dashboard/DS';
import { scoutingService } from '../../services/scouting.service';

const SPRING = { type: 'spring', stiffness: 260, damping: 24 };
const PAGE_SIZE = 12;

type Position = 'All' | 'GK' | 'CB' | 'LB' | 'RB' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';
type AgeRange = 'U21' | '21-25' | '26-30' | '30+';
type SortBy   = 'xG' | 'Rating' | 'Age' | 'Market Value';

interface Player {
  id: number; name: string; position: Position; club: string;
  rating: number; xG: number; xA: number; apps: number;
  age: number; nationality: string; avatarColor: string;
  playerId?: string;
}

const avatarInitials = (name: string) =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

function HeroStatPill() {
  const p  = useCountUp(247, 1400, 0);
  const l  = useCountUp(10,  1000, 0);
  const ac = useCountUp(87,  1200, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
      style={{
        background: 'rgba(26,101,211,0.12)', border: '1px solid rgba(26,101,211,0.35)',
        borderRadius: 14, padding: '10px 20px', backdropFilter: 'blur(16px)',
        display: 'flex', gap: 24,
      }}
    >
      {[
        { ref: p.ref, val: p.val,  suffix: '',  label: 'Players'  },
        { ref: l.ref, val: l.val,  suffix: '',  label: 'Leagues'  },
        { ref: ac.ref,val: ac.val, suffix: '%', label: 'Accuracy' },
      ].map(({ ref, val, suffix, label }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F2F2F2', lineHeight: 1 }}>
            <span ref={ref}>{val}</span>{suffix}
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#939A9E', marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </motion.div>
  );
}

function StatCard({
  label, value, suffix = '', prefix = '', caption, icon: Icon, iconBg, delay,
}: {
  label: string; value: number; suffix?: string; prefix?: string;
  caption: string; icon: React.ElementType; iconBg: string; delay: number;
}) {
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0;
  const { ref, val } = useCountUp(value, 1300, decimals);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25, ease: EASE } }}
      style={{
        position: 'relative', background: 'var(--surface-card)', border: '1px solid #000000',
        borderRadius: 16, padding: '20px 22px', overflow: 'hidden', cursor: 'default',
        isolation: 'isolate',
      }}
      className="group"
    >
      <motion.div
        initial={{ x: '-120%' }}
        whileHover={{ x: '120%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
          borderRadius: '0 0 4px 4px',
          background: 'linear-gradient(90deg, transparent, #1A65D3, transparent)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ color: '#939A9E', fontSize: 13, fontWeight: 500 }}>{label}</p>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color="#fff" />
        </div>
      </div>
      <p style={{ color: '#F2F2F2', fontSize: 30, fontWeight: 900, marginBottom: 4 }}>
        {prefix}<span ref={ref}>{val}</span>{suffix}
      </p>
      <p style={{ fontSize: 11, fontWeight: 700, color: iconBg, letterSpacing: '0.04em' }}>{caption}</p>
    </motion.div>
  );
}

function PlayerCard({ player, index }: { player: Player; index: number }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const profilePath = (() => {
    const n = player.name.toLowerCase();
    if (n.includes('haaland')) return '/player-profile/haaland';
    if (n.includes('saka'))    return '/player-profile/saka';
    return '/player-profile';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.08 * index }}
      whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.28, ease: EASE } }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: 'relative', background: 'var(--surface-card)', border: `1px solid ${hovered ? 'rgba(26,101,211,0.55)' : '#000000'}`,
        borderRadius: 18, padding: '20px 22px', overflow: 'hidden', cursor: 'pointer',
        boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.5), 0 0 32px rgba(26,101,211,0.12)' : 'none',
        transition: 'border-color 280ms ease, box-shadow 280ms ease',
        isolation: 'isolate',
      }}
    >
      <motion.div
        initial={{ x: '-120%' }}
        animate={{ x: hovered ? '120%' : '-120%' }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
        }}
      />
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: 2,
        borderRadius: '0 0 4px 4px',
        background: 'linear-gradient(90deg, transparent, #1A65D3, transparent)',
        opacity: hovered ? 1 : 0, transition: 'opacity 280ms ease',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <motion.div
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{
            borderRadius: '50%', flexShrink: 0,
            boxShadow: hovered ? `0 0 0 3px rgba(26,101,211,0.4)` : '0 0 0 0px transparent',
            transition: 'box-shadow 280ms ease',
          }}
        >
          <PlayerAvatar name={player.name} playerId={player.playerId} size={48} />
        </motion.div>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 14, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</p>
          <span style={{
            background: 'var(--surface-card)', border: '1px solid #000000',
            color: '#939A9E', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
            letterSpacing: '0.06em',
          }}>{player.position}</span>
        </div>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.25)',
          borderRadius: 8, padding: '4px 9px',
        }}>
          <Star size={10} fill="#1A65D3" color="#1A65D3" />
          <span style={{ color: '#1A65D3', fontWeight: 900, fontSize: 13 }}>{player.rating.toFixed(1)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: '#939A9E', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}><ClubLogo club={player.club} size={18} className="mr-1.5" />{player.club}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
          background: 'rgba(26,101,211,0.12)', border: '1px solid rgba(26,101,211,0.28)', color: '#1A65D3',
          letterSpacing: '0.1em',
        }}>EPL</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: 1,
        background: '#000000', borderRadius: 12, overflow: 'hidden',
        border: '1px solid #000000', marginBottom: 14,
      }}>
        {[
          { label: 'xG',   value: player.xG.toFixed(2) },
          { label: 'xA',   value: player.xA.toFixed(2) },
          { label: 'Apps', value: String(player.apps)   },
        ].map(({ label, value }, i) => (
          <div key={label} style={{
            textAlign: 'center', padding: '10px 6px',
            borderRight: i < 2 ? '1px solid #000000' : 'none',
            background: hovered && i === 0 ? 'rgba(26,101,211,0.06)' : 'transparent',
            transition: 'background 300ms ease',
          }}>
            <p style={{ color: '#F2F2F2', fontWeight: 900, fontSize: 14 }}>{value}</p>
            <p style={{ color: '#939A9E', fontSize: 9, fontWeight: 600, marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#939A9E', fontSize: 11 }}>Age</span>
          <span style={{ color: '#939A9E', fontSize: 12, fontWeight: 700 }}>{player.age}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flag nationality={player.nationality} size={14} className="mr-1" />
          <span style={{ color: '#939A9E', fontSize: 11 }}>{player.nationality}</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(profilePath)}
        style={{
          width: '100%', minHeight: 32, borderRadius: 999, cursor: 'pointer',
          background: hovered ? '#ffffff' : 'transparent',
          border: `1px solid ${hovered ? 'transparent' : '#939A9E'}`,
          color: hovered ? '#000000' : '#939A9E', fontSize: 11, fontWeight: 700,
          fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background 220ms ease, border-color 220ms ease, color 220ms ease',
        }}
      >
        View Profile
      </motion.button>
    </motion.div>
  );
}

const POS_MAP: Record<string, Position> = {
  GK: 'GK', DF: 'CB', CB: 'CB', LB: 'LB', RB: 'RB',
  MF: 'CM', CM: 'CM', CAM: 'CAM', LW: 'LW', RW: 'RW',
  FW: 'ST', ST: 'ST', CF: 'ST',
};

function normalisePos(raw: string): Position {
  const upper = (raw ?? '').toUpperCase();
  for (const [k, v] of Object.entries(POS_MAP)) {
    if (upper.startsWith(k)) return v;
  }
  return 'CM';
}

export default function PlayerSearchPage() {
  const [searchQuery, setSearchQuery]       = useState('');
  const [activePosition, setActivePosition] = useState<Position>('All');
  const [activeAge, setActiveAge]           = useState<AgeRange | null>(null);
  const [sortBy, setSortBy]                 = useState<SortBy>('Rating');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [allPlayers, setAllPlayers]         = useState<Player[]>([]);
  const [page, setPage]                     = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);

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
    const el = heroRef.current;
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
  }, [rawX, rawY, rawRotX, rawRotY]);

  useEffect(() => {
    scoutingService.getCurrent({ limit: 500 }).then(data => {
      const mapped: Player[] = data.map((p, i) => ({
        id: i + 1,
        name: p.Player ?? p.player_squad?.split('_')[0] ?? '—',
        position: normalisePos(p.Pos ?? ''),
        club: p.Squad ?? '—',
        rating: parseFloat(scoutingService.rating(p).toFixed(1)),
        xG: parseFloat((p.xG ?? 0).toString()),
        xA: parseFloat((p.xAG ?? 0).toString()),
        apps: Math.round(p['90s'] ?? 0),
        age: p.Age ?? 0,
        nationality: p.citizenship ?? '—',
        avatarColor: '#1A65D3',
        playerId: (p as any).player_id ?? (p as any).playerId,
      }));
      setAllPlayers(mapped);
    }).catch(() => {});
  }, []);

  const positions: Position[] = ['All', 'GK', 'CB', 'LB', 'RB', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  const ageRanges: AgeRange[] = ['U21', '21-25', '26-30', '30+'];
  const sortOptions: SortBy[] = ['xG', 'Rating', 'Age', 'Market Value'];

  const filtered = allPlayers
    .filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.club.toLowerCase().includes(q) && !p.nationality.toLowerCase().includes(q)) return false;
      }
      if (activePosition !== 'All' && p.position !== activePosition) return false;
      if (activeAge === 'U21'   && p.age >= 21) return false;
      if (activeAge === '21-25' && (p.age < 21 || p.age > 25)) return false;
      if (activeAge === '26-30' && (p.age < 26 || p.age > 30)) return false;
      if (activeAge === '30+'   && p.age <= 30) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'xG')           return b.xG - a.xG;
      if (sortBy === 'Age')          return a.age - b.age;
      if (sortBy === 'Market Value') return b.rating - a.rating;
      return b.rating - a.rating;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePageIdx = Math.min(page, totalPages - 1);
  const pagePlayers = filtered.slice(safePageIdx * PAGE_SIZE, (safePageIdx + 1) * PAGE_SIZE);

  return (
    <div className="h-full">


      <div className="sticky top-0 z-40 bg-bg-black/80 backdrop-blur-sm border-b border-border-dark px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <h1 className="text-white font-black text-xl">Player Search</h1>
            <p className="text-text-dark-gray text-xs mt-0.5">
              Home &rsaquo; <span className="text-text-gray">Player Search</span>
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(26,101,211,0.07)', border: '1px solid rgba(26,101,211,0.15)',
              borderRadius: 999, padding: '5px 12px',
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A65D3', display: 'inline-block' }}
            />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#1A65D3', letterSpacing: '0.12em' }}>Live Data</span>
          </motion.div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-8 md:py-6 space-y-5">

        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.05 }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: searchFocused ? '#1A65D3' : '#939A9E',
                transition: 'color 200ms ease', pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search players by name, club or nationality..."
              style={{
                width: '100%', background: 'var(--surface-card)',
                border: `1px solid ${searchFocused ? 'rgba(26,101,211,0.6)' : '#000000'}`,
                borderRadius: 14, paddingLeft: 44, paddingRight: 20, height: 52,
                color: '#F2F2F2', fontSize: 14, outline: 'none',
                boxShadow: searchFocused ? '0 0 0 3px rgba(26,101,211,0.12)' : 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
                fontFamily: 'inherit',
              }}
              className="placeholder-text-dark-gray"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.12 }}
          style={{
            background: 'var(--surface-card)', border: '1px solid #000000',
            borderRadius: 16, padding: '14px 18px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#939A9E', fontWeight: 700, marginRight: 4 }}>Position</span>
            <div style={{ display: 'flex', gap: 3, background: '#000000', borderRadius: 999, padding: 4, flexWrap: 'wrap' }}>
              {positions.map(pos => (
                <motion.button
                  key={pos}
                  onClick={() => setActivePosition(pos)}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    background: activePosition === pos ? '#1A65D3' : 'transparent',
                    color: activePosition === pos ? '#F2F2F2' : '#939A9E',
                  }}
                  transition={{ duration: 0.18 }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
                    border: 'none', cursor: 'pointer',
                    boxShadow: activePosition === pos ? '0 4px 14px rgba(26,101,211,0.4)' : 'none',
                    letterSpacing: '0.04em',
                  }}
                >
                  {pos}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: '#000000' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#939A9E', fontWeight: 700, marginRight: 4 }}>Age</span>
            <div style={{ display: 'flex', gap: 3, background: '#000000', borderRadius: 999, padding: 4 }}>
              {ageRanges.map(ar => (
                <motion.button
                  key={ar}
                  onClick={() => setActiveAge(activeAge === ar ? null : ar)}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    background: activeAge === ar ? '#1A65D3' : 'transparent',
                    color: activeAge === ar ? '#F2F2F2' : '#939A9E',
                  }}
                  transition={{ duration: 0.18 }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
                    border: 'none', cursor: 'pointer',
                    boxShadow: activeAge === ar ? '0 4px 14px rgba(26,101,211,0.4)' : 'none',
                  }}
                >
                  {ar}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: '#000000' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#939A9E', fontWeight: 700 }}>Sort by</span>
            <div style={{ position: 'relative' }}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                style={{
                  appearance: 'none', background: '#000000', border: '1px solid #000000',
                  color: '#939A9E', fontSize: 11, fontWeight: 700, padding: '6px 28px 6px 12px',
                  borderRadius: 999, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {sortOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#939A9E', pointerEvents: 'none' }} />
            </div>
          </div>
        </motion.div>

        <div className="dash-grid-3">
          <StatCard label="Players Found"    value={allPlayers.length || 247} suffix="" prefix="" caption="Premier League"        icon={Users}      iconBg="#1A65D3" delay={0.18} />
          <StatCard label="Avg Age"          value={allPlayers.length ? parseFloat((allPlayers.reduce((s,p)=>s+p.age,0)/allPlayers.length).toFixed(1)) : 24.3} suffix="" prefix="" caption="Squad average" icon={TrendingUp} iconBg="#1A65D3" delay={0.26} />
          <StatCard label="Avg Rating"       value={allPlayers.length ? parseFloat((allPlayers.reduce((s,p)=>s+p.rating,0)/allPlayers.length).toFixed(1)) : 7.8} suffix="" prefix="" caption="Composite z-score" icon={DollarSign} iconBg="#1A65D3" delay={0.34} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ color: '#939A9E', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
              {filtered.length} players found
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {pagePlayers.map((player, i) => (
              <PlayerCard key={player.id} player={player} index={i} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 16 }}
        >
          <motion.button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePageIdx === 0}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface-card)', border: '1px solid #000000',
              color: safePageIdx === 0 ? '#939A9E' : '#939A9E',
              fontSize: 11, fontWeight: 700, padding: '7px 14px',
              borderRadius: 50, cursor: safePageIdx === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            <ChevronLeft size={13} /> Prev
          </motion.button>

          <div style={{
            background: 'var(--surface-card)', border: '1px solid #000000',
            color: '#939A9E', fontSize: 11, fontWeight: 600, padding: '8px 20px', borderRadius: 50,
          }}>
            Page <span style={{ color: '#F2F2F2', fontWeight: 900 }}>{safePageIdx + 1}</span> of{' '}
            <span style={{ color: '#F2F2F2', fontWeight: 900 }}>{totalPages}</span>
          </div>

          <motion.button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePageIdx >= totalPages - 1}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface-card)', border: '1px solid #000000',
              color: safePageIdx >= totalPages - 1 ? '#939A9E' : '#939A9E',
              fontSize: 11, fontWeight: 700, padding: '8px 18px',
              borderRadius: 50, cursor: safePageIdx >= totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Next <ChevronRight size={13} />
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
