import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import PageBanner from '../../components/dashboard/PageBanner';
import { DBtn, EASE } from '../../components/dashboard/DS';
import Spinner from '../../components/ui/Spinner';
import ClubLogo from '../../components/ui/ClubLogo';
import { matchesService, type MatchPrediction } from '../../services/matches.service';
import { GW_MAP, GW_DATE, MAX_GW } from '../../utils/gameweekMap';

type Confidence = 'High' | 'Medium' | 'Low';

interface Match {
  id: number;
  home: string; away: string;
  league: string; time: string;
  pick: string;
  homeProb: number; drawProb: number; awayProb: number;
  confidence: Confidence; confidencePct: number;
  keyFact: string;
  gameweek: number | null;
}

function mapPrediction(p: MatchPrediction, idx: number): Match {
  const key = `${p.home_team}_${p.away_team}`;
  const homeProb = Math.round(parseFloat(p.home_win_pct));
  const drawProb = Math.round(parseFloat(p.draw_pct));
  const awayProb = Math.round(parseFloat(p.away_win_pct));
  const maxProb = Math.max(homeProb, awayProb);
  const confidence: Confidence = maxProb >= 55 ? 'High' : maxProb >= 42 ? 'Medium' : 'Low';
  const pick = homeProb > awayProb ? p.home_team : awayProb > homeProb ? p.away_team : 'Draw';
  return {
    id: idx + 1,
    home: p.home_team, away: p.away_team,
    league: 'Premier League', time: GW_DATE[key] ?? '—',
    pick, homeProb, drawProb, awayProb,
    confidence, confidencePct: maxProb,
    keyFact: `Draw probability: ${Math.round(parseFloat(p.dc_draw_prob) * 100)}%`,
    // Real matchweek from the official 2024/25 schedule (see utils/gameweekMap.ts).
    gameweek: GW_MAP[key] ?? null,
  };
}

const confGlow: Record<Confidence, string>  = { High: '#1A65D3', Medium: '#5A8FA8', Low: '#939A9E' };
const confLabel: Record<Confidence, string> = { High: 'High Confidence', Medium: 'Medium', Low: 'Low' };
const confGroupLabel: Record<Confidence, string> = { High: 'High Confidence', Medium: 'Medium Confidence', Low: 'Low Confidence' };

function FixtureRow({ m, isActive, onClick }: { m: Match; isActive: boolean; onClick: () => void }) {
  const glow = confGlow[m.confidence];
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '13px 16px',
        borderRadius: 12,
        border: `1px solid ${isActive ? 'rgba(26,101,211,0.35)' : 'rgba(26,101,211,0.38)'}`,
        background: isActive ? 'rgba(26,101,211,0.08)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 130ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {isActive && (
        <div style={{
          position: 'absolute', left: 0, top: '18%', bottom: '18%',
          width: 3, background: '#1A65D3', borderRadius: 2,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <ClubLogo club={m.home} size={22} />
        <span style={{
          fontSize: 13, fontWeight: isActive ? 700 : 600,
          color: isActive ? '#F2F2F2' : '#F2F2F2',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{m.home}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1A65D3', marginLeft: 'auto', flexShrink: 0 }}>{m.homeProb}%</span>
      </div>

      <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>vs</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#939A9E', flexShrink: 0, marginRight: 'auto' }}>{m.awayProb}%</span>
        <span style={{
          fontSize: 13, fontWeight: isActive ? 700 : 600,
          color: '#F2F2F2',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right',
        }}>{m.away}</span>
        <ClubLogo club={m.away} size={22} />
      </div>

      <span style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        padding: '4px 10px', borderRadius: 999,
        background: `${glow}14`,
        color: glow,
        border: `1px solid ${glow}30`,
        letterSpacing: '0.03em',
      }}>{m.confidencePct}%</span>
    </div>
  );
}

function GroupHeader({
  label, conf, count, expanded, onToggle,
}: { label: string; conf: Confidence; count: number; expanded: boolean; onToggle: () => void }) {
  const glow = confGlow[conf];

  return (
    <motion.button
      onClick={onToggle}
      whileHover="hovered"
      initial="rest"
      animate="rest"
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        width: '100%', marginTop: 16,
        padding: 0, background: 'none',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: 14,
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <motion.div
        variants={{ rest: { opacity: 0.55 }, hovered: { opacity: 1 } }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(90deg, ${glow}20 0%, ${glow}0a 45%, transparent 72%)`,
        }}
      />

      <div style={{
        position: 'absolute', top: 0, left: 0, width: '55%', height: 1, pointerEvents: 'none',
        background: `linear-gradient(90deg, ${glow}, transparent)`,
      }} />

      <div style={{
        position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)',
        fontSize: 80, fontWeight: 900,
        color: `${glow}14`, lineHeight: 1, letterSpacing: '-0.05em',
        userSelect: 'none', pointerEvents: 'none',
      }}>
        {count}
      </div>

      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        gap: 14, padding: '18px 20px', width: '100%',
      }}>

        {conf === 'High' ? (
          <motion.span
            animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
              background: glow, boxShadow: `0 0 10px ${glow}`,
            }}
          />
        ) : (
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
            background: glow, opacity: 0.5,
          }} />
        )}

        <span style={{
          fontSize: 15, fontWeight: 900, color: '#F2F2F2',
          letterSpacing: '-0.01em', textTransform: 'uppercase', lineHeight: 1,
        }}>
          {label}
        </span>

        <span style={{
          width: 1, height: 18, background: `${glow}45`, flexShrink: 0, display: 'inline-block',
        }} />

        <span style={{
          fontSize: 13, fontWeight: 900, color: glow,
          background: `${glow}16`, border: `1px solid ${glow}32`,
          borderRadius: 999, padding: '4px 13px', letterSpacing: '0.01em', lineHeight: 1.4,
        }}>
          {count}
        </span>

        <div style={{ flex: 1 }} />

        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.22, ease: EASE }}
          style={{ flexShrink: 0, display: 'flex' }}
        >
          <CaretDown size={14} color={glow} style={{ opacity: 0.65 }} />
        </motion.div>
      </div>
    </motion.button>
  );
}

function DetailPanel({ selected }: { selected: Match }) {
  const glow = confGlow[selected.confidence];
  return (
    <motion.div
      key={selected.id}
      initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
      transition={{ duration: 0.3, ease: EASE }}
      style={{ background: 'rgba(26,101,211,0.38)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(26,101,211,0.55)', borderRadius: 20, overflow: 'hidden' }}
    >
      <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(26,101,211,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <ClubLogo club={selected.home} size={26} />
          <span style={{ color: '#939A9E', fontSize: 11, fontWeight: 600 }}>vs</span>
          <ClubLogo club={selected.away} size={26} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: `${glow}18`, border: `1px solid ${glow}38`, borderRadius: 99, padding: '3px 10px' }}>
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: '50%', background: glow, display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: glow }}>{confLabel[selected.confidence]}</span>
          </div>
        </div>
        <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 17, fontWeight: 900, color: '#F2F2F2', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          {selected.home} <span style={{ color: '#1A65D3' }}>vs</span> {selected.away}
        </h2>
        <p style={{ fontSize: 11, color: '#939A9E', margin: 0 }}>{selected.league} · {selected.time}</p>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>PLAI Pick</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.28)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected.pick !== 'Draw' && <ClubLogo club={selected.pick} size={28} />}
            <span style={{ fontSize: 14, fontWeight: 900, color: '#F2F2F2', textTransform: 'uppercase' }}>{selected.pick}</span>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#F2F2F2', lineHeight: 1 }}>{selected.confidencePct}%</div>
            <div style={{ fontSize: 10, color: '#939A9E', marginTop: 2 }}>confidence score</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Probability Breakdown</p>
        {[
          { label: `${selected.home} Win`, pct: selected.homeProb, color: '#1A65D3' },
          { label: 'Draw',                  pct: selected.drawProb, color: '#939A9E' },
          { label: `${selected.away} Win`,  pct: selected.awayProb, color: '#1A65D3' },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#939A9E', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.pct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                key={selected.id + s.label}
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 0.8, ease: EASE }}
                style={{ height: '100%', background: s.color, borderRadius: 99 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '13px 20px', background: 'rgba(26,101,211,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#1A65D3', marginTop: 5, flexShrink: 0, display: 'inline-block' }} />
          <p style={{ fontSize: 12, color: '#1A65D3', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{selected.keyFact}</p>
        </div>
      </div>
    </motion.div>
  );
}

const MATCH_STATS = [
  { value: 380, suffix: '',  label: 'Fixtures analysed' },
  { value: 79,  suffix: '%', label: 'Model accuracy'    },
  { value: 10,  suffix: 'K', label: 'Simulations run'   },
  { value: 3,   suffix: '',  label: 'Confidence tiers'  },
];

export default function MatchPredictionsPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'offline' | 'locked' | null>(null);
  const [selected, setSelected] = useState<Match | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<Confidence>>(new Set(['High']));
  const [gameweek, setGameweek] = useState(1);
  const [gwPickerOpen, setGwPickerOpen] = useState(false);
  const gwPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gwPickerRef.current && !gwPickerRef.current.contains(e.target as Node)) setGwPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    Promise.all([
      matchesService.getAllPredictions(),
      fixturesService.getPL().catch(() => null),
    ]).then(([predictions, pl]) => {
      const resolvedGwMap = pl ? { ...GW1_MAP, ...pl.gwMap } : GW1_MAP;
      if (pl) {
        setGwMap(resolvedGwMap);
        setMaxGW(pl.maxGW);
      }
      const mapped = predictions.map((p, i) => mapPrediction(p, i, resolvedGwMap));
      mapped.sort((a, b) => (GW1_ORDER[`${a.home}_${a.away}`] ?? 99) - (GW1_ORDER[`${b.home}_${b.away}`] ?? 99));
      setMatches(mapped);
      setSelected(mapped.find(m => m.gameweek === FALLBACK_GW) ?? mapped[0] ?? null);
    }).catch((err) => setError(err?.response?.status === 403 ? 'locked' : 'offline'))
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = (conf: Confidence) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(conf) ? next.delete(conf) : next.add(conf);
      return next;
    });
  };

  const allTeams = [...new Set(matches.flatMap(m => [m.home, m.away]))].sort();

  const selectTeam = (team: string | null) => {
    setSelectedTeam(team);
    setSearch('');
  };

  const filtered = matches.filter(m => {
    const matchesSearch = !search ||
      m.home.toLowerCase().includes(search.toLowerCase()) ||
      m.away.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = !selectedTeam || m.home === selectedTeam || m.away === selectedTeam;
    // When searching or filtering by team, span the whole season; otherwise show the chosen GW.
    const matchesGW = (search || selectedTeam) ? true : m.gameweek === gameweek;
    return matchesSearch && matchesTeam && matchesGW;
  });

  const groups = ([
    { conf: 'High'   as Confidence, items: filtered.filter(m => m.confidence === 'High')   },
    { conf: 'Medium' as Confidence, items: filtered.filter(m => m.confidence === 'Medium') },
    { conf: 'Low'    as Confidence, items: filtered.filter(m => m.confidence === 'Low')    },
  ] satisfies { conf: Confidence; items: Match[] }[]).filter(g => g.items.length > 0);

  const highCount = matches.filter(m => m.confidence === 'High').length;

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={300} label="Loading predictions…" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#939A9E', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>
        {error === 'locked' ? 'Feature not available on this account' : 'Backend offline — start the server to load predictions'}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="AI-Powered"
        title="Match"
        titleAccent="Predictions"
        description="Model-driven fixture picks across the full Premier League season — ranked by confidence"
        badge="Live"
        stats={[
          { value: loading ? '…' : String(matches.length), label: 'Fixtures'       },
          { value: '79%',                                    label: 'Avg confidence' },
          { value: loading ? '…' : String(highCount),        label: 'High picks'    },
        ]}
      />

      <div className="dash-topbar-sticky">
        <div ref={gwPickerRef} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, padding: '3px 4px' }}>
            <button
              onClick={() => setGameweek(gw => Math.max(1, gw - 1))}
              disabled={gameweek <= 1}
              style={{
                width: 30, height: 30, borderRadius: 999, border: 'none',
                background: 'transparent', color: gameweek <= 1 ? 'rgba(255,255,255,0.15)' : '#939A9E',
                cursor: gameweek <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, transition: '120ms',
              }}
            >‹</button>

            <button
              onClick={() => setGwPickerOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
                background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 999,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#939A9E', textTransform: 'uppercase' }}>Gameweek</span>
              <motion.span
                key={gameweek}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                style={{ fontSize: 13, fontWeight: 800, color: '#F2F2F2', letterSpacing: '-0.01em', minWidth: 20, textAlign: 'center' }}
              >{gameweek}</motion.span>
              <CaretDown size={10} color="rgba(255,255,255,0.3)" style={{ transform: gwPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '200ms' }} />
            </button>

            <button
              onClick={() => setGameweek(gw => Math.min(MAX_GW, gw + 1))}
              disabled={gameweek >= MAX_GW}
              style={{
                width: 30, height: 30, borderRadius: 999, border: 'none',
                background: 'transparent', color: gameweek >= MAX_GW ? 'rgba(255,255,255,0.15)' : '#939A9E',
                cursor: gameweek >= MAX_GW ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, transition: '120ms',
              }}
            >›</button>
          </div>

          <AnimatePresence>
            {gwPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(12,12,12,0.96)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, padding: 12,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  zIndex: 200,
                  display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
                  width: 280,
                }}
              >
                <div style={{ gridColumn: '1/-1', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#939A9E', padding: '2px 4px 6px' }}>
                  Select Gameweek
                </div>
                {Array.from({ length: MAX_GW }, (_, i) => i + 1).map(gw => {
                  const isActive = gw === gameweek;
                  return (
                    <button
                      key={gw}
                      onClick={() => { setGameweek(gw); setGwPickerOpen(false); }}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                        background: isActive ? '#1A65D3' : 'transparent',
                        color: isActive ? '#F2F2F2' : '#939A9E',
                        fontSize: 11, fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer', transition: '120ms',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      {gw}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="layout-main-split">

        <div style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)',
          borderRadius: 20, padding: 20, marginTop: 24,
          overflow: 'hidden',
        }}>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <MagnifyingGlass
              size={16}
              color="rgba(255,255,255,0.25)"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search team…"
              style={{
                width: '100%', padding: '11px 16px 11px 38px',
                borderRadius: 999, boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(26,101,211,0.55)',
                color: '#f2f2f2', fontSize: 14, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {!loading && allTeams.length > 0 && (
            <div style={{
              display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12,
              marginBottom: 12, scrollbarWidth: 'none',
            } as React.CSSProperties}>
              <button
                onClick={() => selectTeam(null)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  padding: '9px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                  border: `1px solid ${!selectedTeam ? 'rgba(26,101,211,0.5)' : 'rgba(255,255,255,0.09)'}`,
                  background: !selectedTeam ? 'rgba(26,101,211,0.14)' : 'transparent',
                  color: !selectedTeam ? '#1A65D3' : '#939A9E',
                  cursor: 'pointer', transition: 'all 130ms ease', fontFamily: 'inherit',
                  letterSpacing: '0.04em',
                }}
              >
                All
              </button>

              {allTeams.map(team => {
                const isActive = selectedTeam === team;
                const short = team.replace('Manchester', 'Man').replace('Newcastle United', 'Newcastle').replace('Nottingham', "Nott\'m");
                return (
                  <button
                    key={team}
                    onClick={() => selectTeam(isActive ? null : team)}
                    title={team}
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px 8px 10px', borderRadius: 999,
                      border: `1px solid ${isActive ? 'rgba(26,101,211,0.5)' : 'rgba(255,255,255,0.09)'}`,
                      background: isActive ? 'rgba(26,101,211,0.14)' : 'rgba(255,255,255,0.03)',
                      color: isActive ? '#1A65D3' : '#939A9E',
                      cursor: 'pointer', transition: 'all 130ms ease', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
                  >
                    <ClubLogo club={team} size={20} />
                    {short}
                  </button>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: 12, color: '#939A9E', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {loading ? '—' : `${filtered.length} fixture${filtered.length !== 1 ? 's' : ''}${selectedTeam ? ` · ${selectedTeam}` : search ? ' · Premier League' : ` · Gameweek ${gameweek}`}`}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 10, padding: '4px 16px', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Home</span>
            <span />
            <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>Away</span>
            <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right' }}>Conf</span>
          </div>

          {groups.map(group => {
            const isExpanded = expandedGroups.has(group.conf);
            return (
              <div key={group.conf}>
                <GroupHeader
                  label={confGroupLabel[group.conf]}
                  conf={group.conf}
                  count={group.items.length}
                  expanded={isExpanded}
                  onToggle={() => toggleGroup(group.conf)}
                />

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6 }}>
                        {group.items.map(m => (
                          <FixtureRow
                            key={m.id}
                            m={m}
                            isActive={selected?.id === m.id}
                            onClick={() => setSelected(m)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#939A9E', fontSize: 13 }}>
              {selectedTeam
                ? `No fixtures found for ${selectedTeam}`
                : search
                  ? `No fixtures match "${search}"`
                  : `No fixtures for Gameweek ${gameweek}.`}
            </div>
          )}

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <DBtn onClick={() => navigate('/table-predictions')}>Season Forecast <ArrowRight size={12} /></DBtn>
          </div>
        </div>

        <div style={{ paddingTop: 24, position: 'sticky', top: 56, height: 'fit-content', alignSelf: 'start' }}>
          <AnimatePresence mode="wait">
            {selected && <DetailPanel key={selected.id} selected={selected} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
