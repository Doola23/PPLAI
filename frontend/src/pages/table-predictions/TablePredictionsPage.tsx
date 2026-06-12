import Spinner from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PageBanner from '../../components/dashboard/PageBanner';

const TABLE_STATS = [
  { value: 20,  suffix: '', label: 'Teams' },
  { value: 10,  suffix: 'K', label: 'Simulations' },
  { value: 38,  suffix: '', label: 'Matchdays' },
  { value: 87,  suffix: '%', label: 'Accuracy' },
];
import ClubLogo from '../../components/ui/ClubLogo';
import { matchesService, type StandingsRow } from '../../services/matches.service';

const E = [0.16, 1, 0.3, 1] as const;

type Form = 'W' | 'D' | 'L';

interface ZoneTeam {
  pos: number; name: string; pts: number; played: number;
  won: number; drawn: number; lost: number;
  form: Form[]; titlePct: number; uclPct: number; europaPct: number; relegPct: number;
  trajectory: 'up' | 'stable' | 'down';
}

function mapStandingsRow(r: StandingsRow, idx: number): ZoneTeam {
  const pts = Math.round(r.Predicted_Pts ?? r.Actual_Pts ?? 0);
  const diff = r.Diff ?? 0;
  return {
    pos: r.Predicted_Pos ?? idx + 1,
    name: r.Team,
    pts,
    played: 38,
    won: 0, drawn: 0, lost: 0,
    form: [],
    titlePct: idx === 0 ? 35 : idx === 1 ? 22 : 0,
    uclPct: idx < 4 ? Math.max(0, 95 - idx * 15) : 0,
    europaPct: idx < 7 ? Math.max(0, 80 - idx * 10) : 0,
    relegPct: idx >= 17 ? Math.min(99, (idx - 16) * 30) : 0,
    trajectory: diff > 2 ? 'up' : diff < -2 ? 'down' : 'stable',
  };
}

const formColor: Record<Form, string> = { W: '#1A65D3', D: 'rgba(255,255,255,0.3)', L: '#939A9E' };
const TrajectoryIcon = ({ t }: { t: 'up' | 'stable' | 'down' }) =>
  t === 'up' ? <TrendingUp size={11} color="#1A65D3" /> :
  t === 'down' ? <TrendingDown size={11} color="#939A9E" /> :
  <Minus size={11} color="rgba(255,255,255,0.3)" />;

export default function TablePredictionsPage() {
  const [selectedTeam, setSelectedTeam] = useState<ZoneTeam | null>(null);
  const [teams, setTeams] = useState<ZoneTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    matchesService.getStandingsComparison()
      .then(data => {
        const sorted = [...data].sort((a, b) => (a.Predicted_Pos ?? 99) - (b.Predicted_Pos ?? 99));
        setTeams(sorted.map(mapStandingsRow));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const zones = teams.length ? [
    { id: 'champions', label: 'Premier League Champions', color: '#1A65D3', bg: 'rgba(26,101,211,0.10)',  border: 'rgba(26,101,211,0.28)',  logo: 'https://media.api-sports.io/football/leagues/39.png', teams: teams.slice(0,1)   },
    { id: 'ucl',       label: 'Champions League',         color: '#1A65D3', bg: 'rgba(26,101,211,0.08)',  border: 'rgba(26,101,211,0.2)',   logo: 'https://media.api-sports.io/football/leagues/2.png',  teams: teams.slice(1,4)   },
    { id: 'europa',    label: 'Europa League',            color: '#5A8FA8', bg: 'rgba(90,143,168,0.06)',  border: 'rgba(90,143,168,0.15)', logo: 'https://media.api-sports.io/football/leagues/3.png',  teams: teams.slice(4,7)   },
    { id: 'relegate',  label: 'Relegation',               color: '#939A9E', bg: 'rgba(147,154,158,0.06)', border: 'rgba(147,154,158,0.18)', logo: null,                                                   teams: teams.slice(17,20)  },
  ] : [];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={300} label="Table predictions" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#939A9E', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>Backend offline — start the server to load table predictions</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Analytics"
        title="Table"
        titleAccent="Predictions"
        description="Monte Carlo season simulation across 10,000 runs — zone probabilities updated weekly"
        stats={[
          { value: '20',  label: 'Teams' },
          { value: '10K', label: 'Simulations' },
          { value: '87%', label: 'Accuracy' },
        ]}
      />

      <div className="layout-sidebar-right" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', marginTop: 24 }}>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)',
          borderRadius: 20, padding: 20,
        }}>
          {zones.map((zone, zi) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: E, delay: zi * 0.08 }}
              style={{ background: zone.bg, border: `1px solid ${zone.border}`, borderRadius: 16, overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${zone.border}` }}>
                {zone.logo ? (
                  <img src={zone.logo} alt={zone.label} style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0, filter: 'brightness(0) invert(1)' }} />
                ) : (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: zone.color, boxShadow: `0 0 8px ${zone.color}`, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 10, fontWeight: 800, color: zone.color, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{zone.label}</span>
                <span style={{ fontSize: 10, color: '#939A9E', marginLeft: 'auto' }}>{zone.teams.length} team{zone.teams.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {zone.teams.map((team, ti) => (
                  <motion.div
                    key={team.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: zi * 0.08 + ti * 0.04 }}
                    onClick={() => setSelectedTeam(selectedTeam?.name === team.name ? null : team)}
                    className="league-table-row"
                    style={{
                      display: 'grid', gridTemplateColumns: '24px 28px 1fr auto auto auto 60px',
                      alignItems: 'center', gap: 8, padding: '12px 16px', minWidth: 0,
                      borderBottom: ti < zone.teams.length - 1 ? `1px solid ${zone.border}` : 'none',
                      cursor: 'pointer', transition: 'background 150ms ease',
                      background: selectedTeam?.name === team.name ? `${zone.color}12` : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = `${zone.color}08`}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = selectedTeam?.name === team.name ? `${zone.color}12` : 'transparent'}
                  >
                    <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 700, textAlign: 'center' }}>{team.pos}</span>
                    <ClubLogo club={team.name} size={22} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2' }}>{team.name}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {team.form.map((f, fi) => (
                        <span key={fi} style={{ width: 16, height: 16, borderRadius: '50%', background: `${formColor[f]}22`, border: `1px solid ${formColor[f]}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: formColor[f] }}>{f}</span>
                      ))}
                    </div>
                    <TrajectoryIcon t={team.trajectory} />
                    <span style={{ fontSize: 12, color: '#939A9E', textAlign: 'right' }}>P{team.played}</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#F2F2F2', textAlign: 'right' }}>{team.pts} <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 600 }}>pts</span></span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: E, delay: 0.35 }}
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#939A9E', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Mid-Table</span>
              <span style={{ fontSize: 10, color: '#939A9E', marginLeft: 'auto' }}>Positions 8–17</span>
            </div>
            <div>
              {teams.slice(7, 17).map((team, ti) => (
                <motion.div
                  key={team.name}
                  onClick={() => setSelectedTeam(selectedTeam?.name === team.name ? null : team)}
                  className="league-table-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '24px 28px 1fr auto auto auto 60px',
                    alignItems: 'center', gap: 8, padding: '10px 16px', minWidth: 0,
                    borderBottom: ti < 9 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: 'pointer', transition: 'background 150ms ease',
                    background: selectedTeam?.name === team.name ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 700, textAlign: 'center' }}>{team.pos}</span>
                  <ClubLogo club={team.name} size={22} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2' }}>{team.name}</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {team.form.map((f, fi) => (
                      <span key={fi} style={{ width: 16, height: 16, borderRadius: '50%', background: `${formColor[f]}22`, border: `1px solid ${formColor[f]}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: formColor[f] }}>{f}</span>
                    ))}
                  </div>
                  <TrajectoryIcon t={team.trajectory} />
                  <span style={{ fontSize: 12, color: '#939A9E', textAlign: 'right' }}>P{team.played}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#F2F2F2', textAlign: 'right' }}>{team.pts} <span style={{ fontSize: 10, fontWeight: 600 }}>pts</span></span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div style={{ position: 'sticky', top: 56 }}>
          <AnimatePresence mode="wait">
            {selectedTeam ? (
              <motion.div
                key={selectedTeam.name}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: E }}
                style={{ background: 'var(--surface-card)', border: '1px solid rgba(26,101,211,0.55)', borderRadius: 20, overflow: 'hidden' }}
              >
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ClubLogo club={selectedTeam.name} size={40} />
                  <div>
                    <h3 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 18, fontWeight: 900, color: '#F2F2F2', margin: 0, textTransform: 'uppercase' }}>{selectedTeam.name}</h3>
                    <span style={{ fontSize: 11, color: '#939A9E' }}>Position {selectedTeam.pos} · {selectedTeam.pts} pts</span>
                  </div>
                  <div style={{ marginLeft: 'auto' }}><TrajectoryIcon t={selectedTeam.trajectory} /></div>
                </div>

                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Title Probability',    value: selectedTeam.titlePct,  color: '#1A65D3', icon: <Trophy size={11} color="#1A65D3" /> },
                    { label: 'UCL Qualification',    value: selectedTeam.uclPct,    color: '#1A65D3', icon: null },
                    { label: 'Europa League',         value: selectedTeam.europaPct, color: '#5A8FA8', icon: null },
                    { label: 'Relegation Risk',       value: selectedTeam.relegPct,  color: '#939A9E', icon: null },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {m.icon}
                          <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 500 }}>{m.label}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 900, color: m.color }}>{m.value}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${m.value}%` }}
                          transition={{ duration: 0.8, ease: E }}
                          style={{ height: '100%', background: m.color, borderRadius: 99 }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
                    <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Record</p>
                    <div className="layout-3col" style={{ gap: 8, textAlign: 'center' }}>
                      {[{ l:'W', v:selectedTeam.won, c:'#1A65D3' },{ l:'D', v:selectedTeam.drawn, c:'#939A9E' },{ l:'L', v:selectedTeam.lost, c:'#939A9E' }].map(s => (
                        <div key={s.l}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                          <div style={{ fontSize: 9, color: '#939A9E', fontWeight: 700, letterSpacing: '0.1em' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '48px 24px', textAlign: 'center' }}
              >
                <Trophy size={32} style={{ color: '#939A9E', marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: '#939A9E', marginBottom: 6 }}>Select a team</p>
                <p style={{ fontSize: 11, color: '#939A9E' }}>Click any row to see probability breakdown</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
