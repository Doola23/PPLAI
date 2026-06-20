import Spinner from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap, BarChart2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ClubLogo from '../../components/ui/ClubLogo';
import Flag from '../../components/ui/Flag';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import PageBanner from '../../components/dashboard/PageBanner';
import { scoutingService } from '../../services/scouting.service';
import { playerStatsService, type PlayerStat } from '../../services/playerStats.service';

const E = [0.16, 1, 0.3, 1] as const;

export interface MatchRow  { date: string; opponent: string; result: string; score: string; goals: number; assists: number; rating: number; }
export interface Attribute  { name: string; value: number; }
export interface InjuryRow  { date: string; type: string; duration: string; status: 'Recovered' | 'Active'; }
export interface PlayerData {
  name: string; firstName: string; lastName: string;
  position: string; club: string; clubDisplay: string;
  nationality: string; flag: string;
  image: string; initials: string; playerId: string | null;
  age: string; height: string; foot: string; contract: string;
  overall: number; marketValue: string;
  seasonGoals: string; seasonAssists: string; xgPer90: string; minutesPlayed: string;
  heroRating: string; heroXG: string; heroXA: string; heroApps: string;
  matchHistory: MatchRow[];
  attributes: Attribute[];
  injuries: InjuryRow[];
}

function RadarChart({ attributes }: { attributes: Attribute[] }) {
  const SIZE = 200; const cx = SIZE / 2; const cy = SIZE / 2; const R = 80;
  const n = attributes.length;
  const angle = (i: number) => (i * (2 * Math.PI)) / n - Math.PI / 2;
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });
  const rings = [0.25, 0.5, 0.75, 1];
  const playerPoints = attributes.map((a, i) => pt(i, (a.value / 100) * R));
  const poly = playerPoints.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <svg width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
      {rings.map(r => (
        <polygon key={r} points={attributes.map((_, i) => { const p = pt(i, R * r); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      ))}
      {attributes.map((_, i) => { const p = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />; })}
      <motion.polygon points={poly} fill="rgba(26,101,211,0.18)" stroke="#1A65D3" strokeWidth={1.5} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: E, delay: 0.3 }} style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {playerPoints.map((p, i) => <motion.circle key={i} cx={p.x} cy={p.y} r={3} fill="#1A65D3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.06 }} />)}
      {attributes.map((a, i) => { const p = pt(i, R + 18); const anchor = p.x < cx - 4 ? 'end' : p.x > cx + 4 ? 'start' : 'middle'; return <text key={i} x={p.x} y={p.y + 4} textAnchor={anchor} style={{ fontSize: 9, fill: '#939A9E', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'inherit' }}>{a.name}</text>; })}
      {playerPoints.map((p, i) => <text key={`v${i}`} x={p.x} y={p.y - 7} textAnchor="middle" style={{ fontSize: 8, fill: '#1A65D3', fontWeight: 900, }}>{attributes[i].value}</text>)}
    </svg>
  );
}

const resultCfg: Record<string, [string, string]> = {
  W: ['rgba(26,101,211,0.15)', '#1A65D3'],
  D: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.4)'],
  L: ['rgba(26,101,211,0.15)', '#1A65D3'],
};
function ResultBadge({ result }: { result: string }) {
  const [bg, color] = resultCfg[result] ?? resultCfg.D;
  return <span style={{ background: bg, color, fontSize: 8, fontWeight: 800, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.1em' }}>{result}</span>;
}

function StatPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'rgba(26,101,211,0.12)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? 'rgba(26,101,211,0.28)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12, padding: '10px 18px', textAlign: 'center', minWidth: 80,
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ? '#1A65D3' : '#F2F2F2', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: accent ? 'rgba(26,101,211,0.6)' : '#939A9E', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  );
}

function clamp100(v: number, max: number): number {
  return Math.min(100, Math.round((v / max) * 100));
}

function statsToPlayerData(s: PlayerStat): PlayerData {
  const parts = (s.player ?? '').split(' ');
  const lastName  = parts.slice(1).join(' ') || parts[0];
  const firstName = parts[0];
  const xgPer90   = typeof s.xg_per_90 === 'number' ? s.xg_per_90 : (s.xg ?? 0) / Math.max(s.ninety_mins_played ?? 1, 1);
  const xagPer90  = typeof s.xag_per_90 === 'number' ? s.xag_per_90 : (s.xag ?? 0) / Math.max(s.ninety_mins_played ?? 1, 1);
  const age = s.born ? new Date().getFullYear() - Math.floor(s.born) : 0;
  const apps = Math.round(s.ninety_mins_played ?? s.mp ?? 0);
  const rating = parseFloat((5 + (xgPer90 + xagPer90) * 3).toFixed(1));

  return {
    name: s.player ?? '—',
    firstName,
    lastName,
    position: s.position ?? '—',
    club: (s.squad ?? '').toLowerCase().replace(/\s+/g, '-'),
    clubDisplay: s.squad ?? '—',
    nationality: s.nation ?? '—',
    flag: '',
    image: '',
    initials: parts.map(p => p[0]).slice(0, 2).join('').toUpperCase(),
    playerId: null,
    age: String(age),
    height: '—',
    foot: '—',
    contract: '—',
    overall: Math.min(99, Math.round(50 + (xgPer90 + xagPer90) * 25 + (s.goals ?? 0) * 0.5)),
    marketValue: '—',
    seasonGoals:   String(s.goals   ?? 0),
    seasonAssists: String(s.assists ?? 0),
    xgPer90:  xgPer90.toFixed(2),
    minutesPlayed: String(Math.round((s.mins_played ?? 0))),
    heroRating: rating.toFixed(1),
    heroXG:  xgPer90.toFixed(2),
    heroXA:  xagPer90.toFixed(2),
    heroApps: String(apps),
    matchHistory: [],
    attributes: [
      { name: 'Shooting',  value: clamp100(xgPer90,          0.9)  },
      { name: 'Passing',   value: clamp100(xagPer90,         0.6)  },
      { name: 'Carries',   value: clamp100(s.progressive_carries ?? 0, 120) },
      { name: 'Prog Pass', value: clamp100(s.progressive_passes  ?? 0, 150) },
      { name: 'Tackles',   value: clamp100(s.tackles ?? 0,   80)   },
      { name: 'Intercept', value: clamp100(s.interceptions ?? 0, 50) },
    ],
    injuries: [],
  };
}

const FALLBACK: PlayerData = {
  name: '—', firstName: '—', lastName: '—', position: '—',
  club: '—', clubDisplay: '—', nationality: '—', flag: '', image: '', initials: '—', playerId: null,
  age: '—', height: '—', foot: '—', contract: '—',
  overall: 0, marketValue: '—',
  seasonGoals: '0', seasonAssists: '0', xgPer90: '0.00', minutesPlayed: '0',
  heroRating: '—', heroXG: '0.00', heroXA: '0.00', heroApps: '0',
  matchHistory: [], attributes: [], injuries: [],
};

export default function PlayerProfilePage() {
  const navigate = useNavigate();
  const { name: nameParam } = useParams<{ name?: string }>();
  const [player, setPlayer] = useState<PlayerData>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [watchlisted, setWatchlisted] = useState(false);

  useEffect(() => {
    if (!nameParam) { setLoading(false); return; }
    const lookup = decodeURIComponent(nameParam).replace(/-/g, ' ');

    playerStatsService.getByName(lookup).then(stat => {
      if (stat) {
        setPlayer(statsToPlayerData(stat));
      } else {
        scoutingService.getCurrent({ limit: 500 }).then(scouts => {
          const match = scouts.find(s =>
            (s.Player ?? '').toLowerCase().includes(lookup.toLowerCase())
          );
          if (match) {
            const rating = scoutingService.rating(match);
            setPlayer({
              name: match.Player ?? '—',
              firstName: (match.Player ?? '—').split(' ')[0],
              lastName:  (match.Player ?? '—').split(' ').slice(1).join(' '),
              position:  match.Pos ?? '—',
              club:      (match.Squad ?? '').toLowerCase().replace(/\s+/g, '-'),
              clubDisplay: match.Squad ?? '—',
              nationality: match.citizenship ?? '—',
              flag: '', image: '',
              initials: (match.Player ?? '').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
              playerId: (match.img_url ?? '').match(/\/images\/players\/(\d+)\.(png|jpg)$/)?.[1] ?? null,
              age: String(match.Age ?? '—'),
              height: match.height ?? '—',
              foot: match.foot ?? '—',
              contract: match.contract_expires ?? '—',
              overall: Math.round(rating * 10),
              marketValue: match.market_value_eur ? `€${(match.market_value_eur / 1e6).toFixed(1)}M` : '—',
              seasonGoals:   String(match.Gls   ?? 0),
              seasonAssists: String(match.Ast   ?? 0),
              xgPer90:  (match.xG ?? 0).toString(),
              minutesPlayed: String(match.Min ?? 0),
              heroRating: rating.toFixed(1),
              heroXG:  (match.xG ?? 0).toFixed(2),
              heroXA:  (match.xAG ?? 0).toFixed(2),
              heroApps: String(Math.round(match['90s'] ?? 0)),
              matchHistory: [], attributes: [], injuries: [],
            });
          }
        }).catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [nameParam]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={300} label="Player" />
      </div>
    );
  }

  if (!nameParam || player.name === '—') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: '#939A9E', fontSize: 13, fontWeight: 600 }}>No player selected</div>
        <button onClick={() => navigate('/scout-results')} style={{ background: '#1A65D3', color: '#F2F2F2', border: 'none', borderRadius: 999, padding: '10px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Browse Players
        </button>
      </div>
    );
  }

  const wins   = player.matchHistory.filter(m => m.result === 'W').length;
  const draws  = player.matchHistory.filter(m => m.result === 'D').length;
  const losses = player.matchHistory.filter(m => m.result === 'L').length;
  const avgRating = player.matchHistory.length
    ? (player.matchHistory.reduce((s, m) => s + m.rating, 0) / player.matchHistory.length).toFixed(1)
    : '—';
  const matchScore = player.overall;
  const matchColor = '#1A65D3';

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Players"
        title={player.firstName}
        titleAccent={player.lastName}
        stats={[
          { value: player.heroRating, label: 'Rating' },
          { value: player.heroApps,   label: 'Apps'   },
          { value: player.marketValue, label: 'Value'  },
        ]}
        badge="Live Data"
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        <AnimatePresence mode="wait">
          <motion.div
            key={player.name}
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
            transition={{ duration: 0.42, ease: E }}
            className="layout-identity"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 24, overflow: 'hidden',
              minHeight: 400,
            }}
          >
            <div style={{
              background: 'rgba(26,101,211,0.06)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              padding: '36px 32px',
              display: 'flex', flexDirection: 'column', gap: 20,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 20, right: 20, background: '#1A65D3', color: '#F2F2F2', fontSize: 11, fontWeight: 900, padding: '4px 12px', borderRadius: 99, }}>
                {player.overall}
              </div>

              <PlayerAvatar name={player.name} playerId={player.playerId ?? undefined} size={88} style={{ borderRadius: 24, border: '2px solid rgba(26,101,211,0.3)' }} />

              <div>
                <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 28, fontWeight: 900, color: '#F2F2F2', margin: '0 0 6px', lineHeight: 1.1 }}>{player.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.3)', color: '#1A65D3', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, letterSpacing: '0.08em' }}>{player.position}</span>
                  <span style={{ fontSize: 12, color: '#939A9E' }}>Age {player.age}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClubLogo club={player.club} size={20} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2' }}>{player.clubDisplay}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flag nationality={player.nationality} size={16} className="inline" />
                  <span style={{ fontSize: 13, color: '#939A9E' }}>{player.nationality}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: 'Height',   value: player.height   },
                  { label: 'Foot',     value: player.foot     },
                  { label: 'Contract', value: player.contract },
                  { label: 'Value',    value: player.marketValue },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontSize: 8, color: '#939A9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#F2F2F2' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Last 10 Form</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {player.matchHistory.map((m, i) => {
                    const color = m.result === 'W' ? '#1A65D3' : m.result === 'D' ? 'rgba(255,255,255,0.3)' : '#1A65D3';
                    return (
                      <div key={i} title={`${m.opponent} ${m.score}`}
                        style={{ flex: 1, height: 26, borderRadius: 4, background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color, cursor: 'default' }}>
                        {m.result}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  {[{ label: `${wins}W`, color: '#1A65D3' }, { label: `${draws}D`, color: '#939A9E' }, { label: `${losses}L`, color: '#1A65D3' }].map(s => (
                    <span key={s.label} style={{ fontSize: 10, fontWeight: 800, color: s.color }}>{s.label}</span>
                  ))}
                  <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 600 }}>Avg {avgRating}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => navigate('/player-stats')}
                  style={{ width: '100%', height: 40, borderRadius: 999, background: '#1A65D3', color: '#F2F2F2', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <BarChart2 size={13} /> Player Stats
                </button>
                <button
                  onClick={() => setWatchlisted(w => !w)}
                  style={{ width: '100%', height: 40, borderRadius: 999, background: watchlisted ? 'rgba(26,101,211,0.12)' : 'transparent', color: watchlisted ? '#1A65D3' : 'rgba(255,255,255,0.5)', border: `1px solid ${watchlisted ? 'rgba(26,101,211,0.3)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Star size={13} fill={watchlisted ? '#1A65D3' : 'none'} /> {watchlisted ? 'Watchlisted' : 'Shortlist'}
                </button>
              </div>
            </div>

            <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

              <div>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Season 2024/25</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatPill label="Rating"  value={player.heroRating} accent />
                  <StatPill label="Goals"   value={player.seasonGoals} />
                  <StatPill label="Assists" value={player.seasonAssists} />
                  <StatPill label="Apps"    value={player.heroApps} />
                  <StatPill label="Minutes" value={player.minutesPlayed} />
                </div>
              </div>

              <div>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Expected Metrics</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'xG per 90', value: parseFloat(player.xgPer90), max: 1.2 },
                    { label: 'xA per 90', value: parseFloat(player.heroXA), max: 0.8 },
                  ].map(m => (
                    <div key={m.label} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 500 }}>{m.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#F2F2F2', }}>{m.value.toFixed(2)}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(m.value / m.max) * 100}%` }}
                          transition={{ duration: 0.9, ease: E }}
                          style={{ height: '100%', background: 'linear-gradient(90deg, #1A65D3, #1A65D3)', borderRadius: 99 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Performance Rating</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: matchColor, lineHeight: 1 }}>{matchScore}</span>
                  <span style={{ fontSize: 16, color: '#939A9E', fontWeight: 700 }}>/100</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${matchScore}%` }}
                    transition={{ duration: 0.7, ease: E }}
                    style={{ height: '100%', background: matchColor, borderRadius: 99 }}
                  />
                </div>
                <p style={{ fontSize: 10, color: '#939A9E', margin: '8px 0 0' }}>Blend of this season's per-90 output vs league average — not a comparison to any specific search.</p>
              </div>

              <div style={{ background: 'rgba(26,101,211,0.06)', border: '1px solid rgba(26,101,211,0.15)', borderRadius: 14, padding: '16px 18px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Zap size={12} style={{ color: '#1A65D3' }} />
                  <span style={{ fontSize: 9, color: '#1A65D3', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>PLAI Insight</span>
                </div>
                <p style={{ fontSize: 13, color: '#939A9E', lineHeight: 1.65, margin: 0 }}>
                  {player.name} recorded {player.seasonGoals} goals and {player.seasonAssists} assists this season
                  with an xG/90 of <strong style={{ color: '#1A65D3' }}>{player.xgPer90}</strong> and
                  xA/90 of <strong style={{ color: '#1A65D3' }}>{player.heroXA}</strong>.
                  Performance rating: <strong style={{ color: '#1A65D3' }}>{player.overall}/100</strong>.
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="layout-sidebar-sm" style={{ marginTop: 20 }}>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.2 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '24px 26px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: 8, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>2024 / 25</p>
                <h3 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 15, fontWeight: 900, color: '#F2F2F2', textTransform: 'uppercase', margin: 0 }}>Season Performance</h3>
              </div>
              <span style={{ fontSize: 9, color: '#939A9E' }}>Last 10 matches</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Opponent', 'Res', 'Score', 'G', 'A', 'Rtg'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0 8px 10px 0', color: '#939A9E', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {player.matchHistory.map((m, i) => {
                  const ratingColor = m.rating >= 8.5 ? '#1A65D3' : m.rating >= 7 ? 'rgba(255,255,255,0.7)' : '#1A65D3';
                  return (
                    <motion.tr
                      key={`${m.date}-${m.opponent}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, ease: E, delay: 0.3 + i * 0.04 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td style={{ padding: '9px 8px 9px 0', color: '#939A9E', fontSize: 10, whiteSpace: 'nowrap' }}>{m.date}</td>
                      <td style={{ padding: '9px 8px 9px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ClubLogo club={m.opponent.toLowerCase().replace(' ', '-')} size={14} />
                          <span style={{ color: '#F2F2F2', fontSize: 11, fontWeight: 600 }}>{m.opponent}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 8px 9px 0' }}><ResultBadge result={m.result} /></td>
                      <td style={{ padding: '9px 8px 9px 0', color: '#939A9E', fontSize: 11, fontWeight: 700 }}>{m.score}</td>
                      <td style={{ padding: '9px 8px 9px 0', color: '#F2F2F2', fontSize: 12, fontWeight: 900, }}>{m.goals}</td>
                      <td style={{ padding: '9px 8px 9px 0', color: '#F2F2F2', fontSize: 12, fontWeight: 900, }}>{m.assists}</td>
                      <td style={{ padding: '9px 0', fontWeight: 900, fontSize: 12, color: ratingColor }}>{m.rating.toFixed(1)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.28 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '24px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ width: '100%', marginBottom: 12 }}>
              <p style={{ fontSize: 8, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Breakdown</p>
              <h3 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 15, fontWeight: 900, color: '#F2F2F2', textTransform: 'uppercase', margin: 0 }}>Attributes</h3>
            </div>
            <RadarChart attributes={player.attributes} />
            <div style={{ width: '100%', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {player.attributes.map(a => (
                <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', flex: 1, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${a.value}%` }}
                      transition={{ duration: 0.8, ease: E, delay: 0.5 }}
                      style={{ height: '100%', background: a.value >= 80 ? '#1A65D3' : '#1A65D3', borderRadius: 99 }}
                    />
                  </div>
                  <span style={{ fontSize: 9, color: '#939A9E', width: 28, textAlign: 'right', fontWeight: 700 }}>{a.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: E, delay: 0.36 }}
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '24px 26px', marginTop: 16 }}
        >
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 8, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Medical</p>
            <h3 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 15, fontWeight: 900, color: '#F2F2F2', textTransform: 'uppercase', margin: 0 }}>Injury History</h3>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 11, top: 12, bottom: 12, width: 1, background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {player.injuries.map((inj, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: E, delay: 0.45 + i * 0.08 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A65D3' }} />
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ color: '#F2F2F2', fontSize: 12, fontWeight: 600, margin: '0 0 3px' }}>{inj.type}</p>
                      <p style={{ color: '#939A9E', fontSize: 10, margin: 0 }}>{inj.date} · {inj.duration}</p>
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 800, color: '#1A65D3', background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.22)', padding: '3px 9px', borderRadius: 999, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {inj.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
