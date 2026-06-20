import Spinner from '../../components/ui/Spinner';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, FileText, Zap, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageBanner from '../../components/dashboard/PageBanner';
import { DBtn } from '../../components/dashboard/DS';
import Flag from '../../components/ui/Flag';
import ClubLogo from '../../components/ui/ClubLogo';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import { scoutingService } from '../../services/scouting.service';

const E = [0.16, 1, 0.3, 1] as const;
const SHORTLIST_KEY = 'scoutlab_shortlist';

export type Shot = { m: number; xg: number; x: number; y: number; r: string; st: string; sit: string };
export type ShotMap = { ts: number; g: number; tm: string; n: string; lg: string; sh: Shot[] };
export type MatchLogRow = { ht: string; at: string; d: string; t: number; g: number; a: number; s: number; kp: number; xg: number; xa: number; r: string };

type ResultPlayer = {
  id: number; name: string; position: string; club: string; nationality: string; age: number;
  rating: number; xg: number; xa: number; apps: number; goals: number; assists: number;
  minutesPlayed: number; recentInjuries: number; recentDaysMissed: number; playerId: string | null;
};

// ScoutLab derives the same Transfermarkt numeric ID from img_url for its PlayerAvatar TM CDN
// fallback -- match that exactly so the two flows show the same real photos, not just initials.
function extractPlayerId(imgUrl?: string): string | null {
  const m = (imgUrl ?? '').match(/\/images\/players\/(\d+)\.(png|jpg)$/);
  return m ? m[1] : null;
}

function loadShortlist(): string[] {
  try { return JSON.parse(localStorage.getItem(SHORTLIST_KEY) || '[]'); } catch { return []; }
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

export default function ScoutResultsPage() {
  const [idx, setIdx] = useState(0);
  const [allPlayers, setAllPlayers] = useState<ResultPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortlist, setShortlist] = useState<string[]>(loadShortlist);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    scoutingService.getCurrent({ limit: 1000 })
      .then(data => {
        const mapped: ResultPlayer[] = data.map((p, i) => ({
          id: i + 1,
          name: p.Player ?? p.player_squad?.split('_')[0] ?? '—',
          position: p.Pos ?? '—',
          club: p.Squad ?? '—',
          nationality: p.citizenship ?? '—',
          age: p.Age ?? 0,
          rating: parseFloat(scoutingService.rating(p).toFixed(1)),
          xg: parseFloat((p.xG ?? 0).toString()),
          xa: parseFloat((p.xAG ?? 0).toString()),
          apps: Math.round(p['90s'] ?? 0),
          goals: p.Gls ?? 0,
          assists: p.Ast ?? 0,
          minutesPlayed: p.Min ?? 0,
          recentInjuries: p.recent_injuries ?? 0,
          recentDaysMissed: p.recent_days_missed ?? 0,
          playerId: extractPlayerId(p.img_url),
        }));
        setAllPlayers(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shortlisted = useMemo(
    () => [...allPlayers].filter(p => shortlist.includes(p.name)).sort((a, b) => b.rating - a.rating),
    [allPlayers, shortlist]
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allPlayers.filter(p => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [search, allPlayers]);

  const players = search.trim() ? searchResults : shortlisted;

  useEffect(() => { setIdx(0); }, [search, shortlist.length]);

  const safeIdx = Math.min(idx, Math.max(0, players.length - 1));
  const player = players[safeIdx];

  function toggleShortlist(name: string) {
    setShortlist(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
      localStorage.setItem(SHORTLIST_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={300} label="Scouting data" />
      </div>
    );
  }

  const totalGoals = players.reduce((s, p) => s + p.goals, 0);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(players.length - 1, i + 1));

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Scouting"
        title="Scout"
        titleAccent="Results"
        stats={[
          { value: String(allPlayers.length), label: 'Scouted'     },
          { value: String(shortlist.length),  label: 'Shortlisted' },
          { value: String(totalGoals),        label: 'Total Goals' },
        ]}
        badge="Live Results"
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search
            size={16}
            color="rgba(255,255,255,0.3)"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any scouted player…"
            style={{
              width: '100%', padding: '11px 14px 11px 38px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: '#F2F2F2', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {!search.trim() && shortlisted.length === 0 && (
          <p style={{ fontSize: 12, color: '#939A9E', margin: '0 0 20px' }}>
            No players shortlisted yet. Search for a player above, or star players from{' '}
            <button onClick={() => navigate('/scout-search')} style={{ background: 'none', border: 'none', color: '#1A65D3', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Scout Search</button>.
          </p>
        )}
        {search.trim() && searchResults.length === 0 && (
          <p style={{ fontSize: 12, color: '#939A9E', margin: '0 0 20px' }}>No players match "{search}".</p>
        )}

        {player && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={prev} disabled={safeIdx === 0}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: safeIdx === 0 ? 'not-allowed' : 'pointer', opacity: safeIdx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2F2F2' }}
            ><ChevronLeft size={16} /></button>
            <button
              onClick={next} disabled={safeIdx === players.length - 1}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: safeIdx === players.length - 1 ? 'not-allowed' : 'pointer', opacity: safeIdx === players.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2F2F2' }}
            ><ChevronRight size={16} /></button>
          </div>
          <span style={{ fontSize: 12, color: '#939A9E', fontWeight: 600 }}>{safeIdx + 1} of {players.length}</span>
          <DBtn variant="outline" onClick={() => navigate('/scout-search')}>Find More Players</DBtn>
        </div>
        )}

        <AnimatePresence mode="wait">
          {player && (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
            transition={{ duration: 0.38, ease: E }}
            className="layout-identity-lg"
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
                #{safeIdx + 1}
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2' }}>{player.club}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flag nationality={player.nationality} size={16} className="inline" />
                  <span style={{ fontSize: 13, color: '#939A9E' }}>{player.nationality}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                <button
                  onClick={() => navigate('/scout-report', { state: { player } })}
                  style={{ width: '100%', height: 40, borderRadius: 999, background: '#1A65D3', color: '#F2F2F2', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <FileText size={13} /> Scout Report
                </button>
                <button
                  onClick={() => toggleShortlist(player.name)}
                  style={{
                    width: '100%', height: 40, borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: shortlist.includes(player.name) ? 'rgba(250,204,21,0.12)' : 'transparent',
                    color: shortlist.includes(player.name) ? '#facc15' : '#939A9E',
                    border: `1px solid ${shortlist.includes(player.name) ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <Star size={13} fill={shortlist.includes(player.name) ? '#facc15' : 'none'} />
                  {shortlist.includes(player.name) ? 'Shortlisted' : 'Shortlist'}
                </button>
              </div>
            </div>

            <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Season 2024/25</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatPill label="Goals"   value={String(player.goals)} accent />
                  <StatPill label="Assists" value={String(player.assists)} />
                  <StatPill label="Apps"    value={String(player.apps)} />
                  <StatPill label="Minutes" value={`${(player.minutesPlayed/1000).toFixed(1)}K`} />
                </div>
              </div>

              <div>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Expected Metrics</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'xG per 90', value: player.xg, max: 1.2 },
                    { label: 'xA per 90', value: player.xa, max: 0.8 },
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

              <div style={{ background: 'rgba(26,101,211,0.06)', border: '1px solid rgba(26,101,211,0.15)', borderRadius: 14, padding: '16px 18px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Zap size={12} style={{ color: '#1A65D3' }} />
                  <span style={{ fontSize: 9, color: '#1A65D3', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>PLAI Insight</span>
                </div>
                <p style={{ fontSize: 13, color: '#939A9E', lineHeight: 1.65, margin: 0 }}>
                  {player.name} recorded {player.goals} goals and {player.assists} assists across {player.apps} appearances
                  this season, with xG/90 of <strong style={{ color: '#1A65D3' }}>{player.xg.toFixed(2)}</strong> and
                  xA/90 of <strong style={{ color: '#1A65D3' }}>{player.xa.toFixed(2)}</strong>.
                </p>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        {players.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {players.map((p, i) => (
            <motion.button
              key={p.id}
              onClick={() => setIdx(i)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              style={{
                flexShrink: 0, width: 88, padding: '10px 12px', borderRadius: 14,
                background: i === safeIdx ? 'rgba(26,101,211,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i === safeIdx ? 'rgba(26,101,211,0.4)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', textAlign: 'center', transition: 'all 160ms ease',
              }}
            >
              <PlayerAvatar name={p.name} playerId={p.playerId ?? undefined} size={32} style={{ borderRadius: 10, margin: '0 auto 6px' }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: i === safeIdx ? '#F2F2F2' : '#939A9E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name.split(' ').pop()}</div>
              <div style={{ fontSize: 9, color: i === safeIdx ? '#1A65D3' : '#939A9E', fontWeight: 700, marginTop: 2 }}>{p.goals}g {p.assists}a</div>
            </motion.button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
