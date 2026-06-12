import Spinner from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Eye, FileText, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageBanner from '../../components/dashboard/PageBanner';
import { DBtn } from '../../components/dashboard/DS';
import Flag from '../../components/ui/Flag';
import ClubLogo from '../../components/ui/ClubLogo';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import { scoutingService } from '../../services/scouting.service';

const E = [0.16, 1, 0.3, 1] as const;

type ResultPlayer = { id: number; name: string; position: string; club: string; nationality: string; age: number; rating: number; xg: number; xa: number; apps: number; matchScore: number; goals: number; assists: number; minutesPlayed: number };


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
  const navigate = useNavigate();

  useEffect(() => {
    scoutingService.getCurrent({ limit: 200 })
      .then(data => {
        const sorted = [...data].sort((a, b) => scoutingService.rating(b) - scoutingService.rating(a));
        const mapped: ResultPlayer[] = sorted.slice(0, 50).map((p, i) => ({
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
          matchScore: Math.round(scoutingService.rating(p) * 10),
          goals: p.Gls ?? 0,
          assists: p.Ast ?? 0,
          minutesPlayed: p.Min ?? 0,
        }));
        setAllPlayers(mapped);
      })
      .catch(() => {});
  }, []);

  const player = allPlayers[idx];
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(allPlayers.length - 1, i + 1));

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={300} label="Scouting data" />
      </div>
    );
  }

  const matchColor = '#1A65D3';

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Scouting"
        title="Scout"
        titleAccent="Results"
        stats={[
          { value: String(allPlayers.length), label: 'Matched' },
          { value: '3',                        label: 'Shortlisted' },
          { value: '8.4',                       label: 'Avg Rating' },
        ]}
        badge="Live Results"
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={prev} disabled={idx === 0}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2F2F2' }}
            ><ChevronLeft size={16} /></button>
            <button
              onClick={next} disabled={idx === allPlayers.length - 1}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: idx === allPlayers.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === allPlayers.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2F2F2' }}
            ><ChevronRight size={16} /></button>
          </div>
          <span style={{ fontSize: 12, color: '#939A9E', fontWeight: 600 }}>{idx + 1} of {allPlayers.length}</span>
          <DBtn variant="outline">Modify Filters</DBtn>
        </div>

        <AnimatePresence mode="wait">
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
                #{idx + 1}
              </div>

              <PlayerAvatar name={player.name} size={88} style={{ borderRadius: 24, border: '2px solid rgba(26,101,211,0.3)' }} />

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

              <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Match Score</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: matchColor, lineHeight: 1 }}>{player.matchScore}</span>
                  <span style={{ fontSize: 16, color: '#939A9E', fontWeight: 700 }}>%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${player.matchScore}%` }}
                    transition={{ duration: 0.7, ease: E }}
                    style={{ height: '100%', background: matchColor, borderRadius: 99 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => navigate('/scout-report', { state: { player } })} style={{ width: '100%', height: 40, borderRadius: 999, background: '#1A65D3', color: '#F2F2F2', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FileText size={13} /> Scout Report
                </button>
                <button style={{ width: '100%', height: 40, borderRadius: 999, background: 'transparent', color: '#939A9E', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Star size={13} /> Shortlist
                </button>
              </div>
            </div>

            <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Season 2024/25</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatPill label="Rating"  value={player.rating.toFixed(1)} accent />
                  <StatPill label="Goals"   value={String(player.goals)} />
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
                  {player.matchScore >= 90
                    ? `Elite match. ${player.name} profiles align exceptionally well — top ${100 - player.matchScore + 4}% across all scouted criteria this season.`
                    : player.matchScore >= 75
                    ? `Strong candidate. ${player.name} meets ${player.matchScore}% of target criteria. Minor gaps in positional coverage worth monitoring.`
                    : `Emerging profile. ${player.name} shows potential but currently matches ${player.matchScore}% of criteria. Monitor for next 4–6 weeks.`
                  }
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={{ marginTop: 20, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {allPlayers.map((p, i) => (
            <motion.button
              key={p.id}
              onClick={() => setIdx(i)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              style={{
                flexShrink: 0, width: 88, padding: '10px 12px', borderRadius: 14,
                background: i === idx ? 'rgba(26,101,211,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i === idx ? 'rgba(26,101,211,0.4)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', textAlign: 'center', transition: 'all 160ms ease',
              }}
            >
              <PlayerAvatar name={p.name} size={32} style={{ borderRadius: 10, margin: '0 auto 6px' }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: i === idx ? '#F2F2F2' : '#939A9E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name.split(' ').pop()}</div>
              <div style={{ fontSize: 9, color: i === idx ? '#1A65D3' : '#939A9E', fontWeight: 700, marginTop: 2 }}>{p.matchScore}%</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
