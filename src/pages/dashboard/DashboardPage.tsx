import Spinner from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Target, TrendingUp, Users, Activity, Star } from 'lucide-react';
import PageHero from '../../components/dashboard/PageHero';
import RoleHeroBanner from '../../components/dashboard/RoleHeroBanner';
import { DBtn } from '../../components/dashboard/DS';
import ClubLogo from '../../components/ui/ClubLogo';
import { matchesService, type MatchPrediction } from '../../services/matches.service';
import { injuriesService, type InjuryPrediction } from '../../services/injuries.service';
import { playerStatsService, type PlayerStat } from '../../services/playerStats.service';
import { scoutingService } from '../../services/scouting.service';
import { useAuth } from '../../hooks/useAuth';

const EASE = [0.16, 1, 0.3, 1] as const;

const riskColor:  Record<string, string> = { High: '#1A65D3', Medium: '#5A8FA8', Low: '#939A9E' };
const riskBorder: Record<string, string> = { High: 'rgba(26,101,211,0.3)', Medium: 'rgba(90,143,168,0.3)', Low: 'rgba(147,154,158,0.3)' };
const riskBg:     Record<string, string> = { High: 'rgba(26,101,211,0.12)', Medium: 'rgba(90,143,168,0.12)', Low: 'rgba(147,154,158,0.12)' };
const confColor:  Record<string, string> = { High: '#1A65D3', Med: '#5A8FA8', Low: '#939A9E' };
const confBorder: Record<string, string> = { High: 'rgba(26,101,211,0.3)', Med: 'rgba(90,143,168,0.3)', Low: 'rgba(147,154,158,0.3)' };
const confBg:     Record<string, string> = { High: 'rgba(26,101,211,0.12)', Med: 'rgba(90,143,168,0.12)', Low: 'rgba(147,154,158,0.12)' };

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} style={{ color: i <= count ? '#1A65D3' : 'rgba(255,255,255,0.1)', fill: i <= count ? '#1A65D3' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, trend, trendColor, icon: Icon, iconBg, iconColor, delay, onClick }: {
  label: string; value: string; trend: string; trendColor: string;
  icon: React.ElementType; iconBg: string; iconColor: string; delay: number;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      whileHover={{ y: -6, scale: 1.012 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18,
        padding: '22px 24px', position: 'relative', overflow: 'hidden', isolation: 'isolate',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <motion.div
        initial={{ x: '-120%' }}
        animate={{ x: hovered ? '120%' : '-120%' }}
        transition={{ duration: 0.65, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)' }}
      />
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, borderRadius: '0 0 4px 4px', background: 'linear-gradient(90deg, transparent, #1A65D3, transparent)', opacity: hovered ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <p style={{ color: '#939A9E', fontSize: 12 }}>{label}</p>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
      </div>
      <p style={{ fontSize: 34, fontWeight: 900, color: '#F2F2F2', lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>{trend}</p>
    </motion.div>
  );
}

function confLevel(m: MatchPrediction): 'High' | 'Med' | 'Low' {
  const home = parseFloat(m.home_win_pct) || 0;
  const away = parseFloat(m.away_win_pct) || 0;
  const max  = Math.max(home, away);
  if (max >= 55) return 'High';
  if (max >= 45) return 'Med';
  return 'Low';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const favClub = user?.favoriteClub?.toLowerCase() ?? '';

  const [matches,        setMatches]       = useState<MatchPrediction[]>([]);
  const [injuryPlayers,  setInjuryPlayers] = useState<InjuryPrediction[]>([]);
  const [topPerformers,  setTopPerformers] = useState<PlayerStat[]>([]);
  const [scoutPlayers,   setScoutPlayers]  = useState<any[]>([]);

  useEffect(() => {
    matchesService.getAllPredictions()
      .then(d => {
        const sorted = favClub
          ? [...d].sort((a, b) => {
              const aFav = a.home_team.toLowerCase().includes(favClub) || a.away_team.toLowerCase().includes(favClub) ? 1 : 0;
              const bFav = b.home_team.toLowerCase().includes(favClub) || b.away_team.toLowerCase().includes(favClub) ? 1 : 0;
              return bFav - aFav;
            })
          : d;
        setMatches(sorted.slice(0, 3));
      })
      .catch(() => {});

    injuriesService.getPredictions(100)
      .then(data => {
        const byPlayer = new Map<string, InjuryPrediction>();
        for (const row of data) {
          const ex = byPlayer.get(row.player_name);
          if (!ex || row.match_date > ex.match_date) byPlayer.set(row.player_name, row);
        }
        let pool = [...byPlayer.values()];
        if (user?.role === 'coach' && favClub) {
          pool = pool.filter(p => p.team.toLowerCase().includes(favClub));
        }
        const sorted = pool
          .sort((a, b) => injuriesService.riskPct(b) - injuriesService.riskPct(a))
          .slice(0, 4);
        setInjuryPlayers(sorted);
      })
      .catch(() => {});

    playerStatsService.getAll({ limit: 50 })
      .then(data => {
        const sorted = [...data].sort((a, b) => (b.xg_per_90 ?? 0) - (a.xg_per_90 ?? 0));
        setTopPerformers(sorted.slice(0, 5));
      })
      .catch(() => {});

    scoutingService.getCurrent({ limit: 100 })
      .then(data => {
        const sorted = [...data].sort((a, b) => scoutingService.rating(b) - scoutingService.rating(a));
        setScoutPlayers(sorted.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  const highInjury = injuryPlayers.filter(p => injuriesService.riskLevel(p) === 'High').length;

  const statCards = [
    { label: 'Match Predictions', value: matches.length ? String(matches.length) + '+' : '…', trend: 'Premier League fixtures', trendColor: '#1A65D3', icon: Target,     iconBg: 'rgba(26,101,211,0.18)', iconColor: '#1A65D3', path: '/match-predictions' },
    { label: 'Avg Prediction Accuracy', value: '87%',  trend: '+2.1% this week', trendColor: '#1A65D3', icon: TrendingUp, iconBg: 'rgba(26,101,211,0.18)', iconColor: '#1A65D3', path: '/table-predictions' },
    { label: 'Players Monitored', value: topPerformers.length ? '611' : '…', trend: '● Live PL data', trendColor: '#1A65D3', icon: Users, iconBg: 'rgba(26,101,211,0.18)', iconColor: '#1A65D3', path: '/player-stats' },
    { label: 'Injury Alerts',     value: highInjury ? String(highInjury) : '—', trend: highInjury ? `${highInjury} high risk flagged` : '—', trendColor: '#1A65D3', icon: Activity, iconBg: 'rgba(26,101,211,0.18)', iconColor: '#1A65D3', path: '/injury-risk' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageHero
        eyebrow="PLAI Analytics"
        title="DASHBOARD"
        stats={[
          { value: matches.length ? String(matches.length) + '+' : '…', label: 'Predictions' },
          { value: '87%',   label: 'Accuracy'  },
          { value: '611',   label: 'Players'   },
        ]}
        badge="Live"
      />

      <div className="dash-topbar-sticky">
        <div>
          <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.26em', marginBottom: 4 }}>Overview</div>
          <h1 style={{ fontFamily: 'Miguer Sans, sans-serif', textTransform: 'uppercase', fontSize: 22, color: '#F2F2F2', fontWeight: 900, margin: 0 }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(26,101,211,0.07)', border: '1px solid rgba(26,101,211,0.15)', borderRadius: 999, padding: '5px 12px' }}>
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A65D3', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#1A65D3', letterSpacing: '0.12em' }}>Live</span>
          </div>
          <DBtn style={{ position: 'relative', padding: '6px 10px' }}><Bell size={14} /></DBtn>
          <DBtn style={{ padding: '6px 10px' }}><Search size={14} /></DBtn>
        </div>
      </div>

      <div className="dash-page-content">

        <RoleHeroBanner />

        <div className="dash-grid-4">
          {statCards.map((c, i) => (
            <StatCard key={c.label} {...c} delay={i * 0.05} onClick={() => navigate(c.path)} />
          ))}
        </div>

        <div className="dash-grid-2">

          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.2 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.26em', marginBottom: 4 }}>AI-Powered</div>
                <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', textTransform: 'uppercase', fontSize: 18, fontWeight: 700, color: '#F2F2F2', margin: '0 0 4px' }}>Live Match Predictions</h2>
                <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Premier League fixtures</p>
              </div>
              <DBtn variant="ghost" onClick={() => navigate('/match-predictions')}>View All</DBtn>
            </div>

            {matches.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Spinner size={24} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matches.map(m => {
                  const home = Math.round(parseFloat(m.home_win_pct) || 33);
                  const draw = Math.round(parseFloat(m.draw_pct)     || 33);
                  const away = 100 - home - draw;
                  const conf = confLevel(m);
                  const predScore = `${m.pred_home ?? '?'}-${m.pred_away ?? '?'}`;
                  return (
                    <div key={`${m.home_team}-${m.away_team}`} onClick={() => navigate('/match-predictions')} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ClubLogo club={m.home_team} size={18} />
                          <span style={{ color: '#F2F2F2', fontSize: 13, fontWeight: 700 }}>{m.home_team}</span>
                          <span style={{ color: '#939A9E', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>VS</span>
                          <span style={{ color: '#F2F2F2', fontSize: 13, fontWeight: 700 }}>{m.away_team}</span>
                          <ClubLogo club={m.away_team} size={18} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: confBg[conf], border: `1px solid ${confBorder[conf]}`, color: confColor[conf], fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{conf}</span>
                          <span style={{ color: '#F2F2F2', fontSize: 12, fontWeight: 900, padding: '2px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>{predScore}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', height: 5, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
                        <div style={{ width: `${home}%`, background: '#1A65D3', borderRadius: '6px 0 0 6px' }} />
                        <div style={{ width: `${draw}%`, background: 'rgba(255,255,255,0.15)' }} />
                        <div style={{ width: `${Math.max(0,away)}%`, background: 'rgba(255,255,255,0.28)', borderRadius: '0 6px 6px 0' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontWeight: 700 }}>
                        <span style={{ color: '#1A65D3' }}>Home {home}%</span>
                        <span style={{ color: '#939A9E' }}>Draw {draw}%</span>
                        <span style={{ color: '#939A9E' }}>Away {Math.max(0,away)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.25 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.26em', marginBottom: 4 }}>Monitoring</div>
                <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', textTransform: 'uppercase', fontSize: 18, fontWeight: 700, color: '#F2F2F2', margin: '0 0 4px' }}>Injury Risk</h2>
                <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Flagged players</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {highInjury > 0 && (
                  <span style={{ background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.25)', color: '#1A65D3', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{highInjury} High</span>
                )}
                <DBtn variant="ghost" onClick={() => navigate('/injury-risk')}>View All</DBtn>
              </div>
            </div>

            {injuryPlayers.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Spinner size={24} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {injuryPlayers.map(p => {
                  const risk = injuriesService.riskLevel(p);
                  const pct  = injuriesService.riskPct(p);
                  return (
                    <div key={p.player_name} onClick={() => navigate('/injury-risk')} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <p style={{ color: '#F2F2F2', fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>{p.player_name}</p>
                          <p style={{ color: '#939A9E', fontSize: 10, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ClubLogo club={p.team} size={14} />{p.team}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: riskBg[risk], border: `1px solid ${riskBorder[risk]}`, color: riskColor[risk], fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{risk}</span>
                          <span style={{ color: riskColor[risk], fontSize: 12, fontWeight: 900 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 5 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: riskColor[risk], borderRadius: 6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        <div className="dash-two-col-grid">

          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.3 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', isolation: 'isolate', cursor: 'pointer' }}
            onClick={() => navigate('/player-stats')}
          >
            <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.26em', marginBottom: 4 }}>xG Leaders</div>
            <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', textTransform: 'uppercase', fontSize: 18, fontWeight: 700, color: '#F2F2F2', margin: '0 0 4px' }}>Top Performers</h2>
            <p style={{ color: '#939A9E', fontSize: 12, margin: '0 0 20px' }}>By xG per 90</p>

            {topPerformers.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Spinner size={24} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topPerformers.map((p, i) => {
                  const xg = typeof p.xg_per_90 === 'number' ? p.xg_per_90 : parseFloat(String(p.xg_per_90)) || 0;
                  return (
                    <div key={p.player} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#939A9E', fontSize: 11, fontWeight: 700, width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: '#F2F2F2', fontSize: 12, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.player}</span>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 5, width: 70, flexShrink: 0 }}>
                        <div style={{ width: `${Math.min(100, xg * 100)}%`, height: '100%', background: '#1A65D3', borderRadius: 6 }} />
                      </div>
                      <span style={{ color: '#1A65D3', fontSize: 11, fontWeight: 900, width: 36, textAlign: 'right', flexShrink: 0 }}>{xg.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.35 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.26em', marginBottom: 4 }}>Scouting</div>
                <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', textTransform: 'uppercase', fontSize: 18, fontWeight: 700, color: '#F2F2F2', margin: '0 0 4px' }}>Top Scouted Players</h2>
                <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Highest rated</p>
              </div>
              <DBtn variant="ghost" onClick={() => navigate('/scout-results')}>View All</DBtn>
            </div>

            {scoutPlayers.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Spinner size={24} /></div>
            ) : (
              <div className="table-scroll-x">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                  <thead>
                    <tr>
                      {['Player', 'Pos', 'Club', 'Rating', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: '#939A9E', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, paddingBottom: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scoutPlayers.map((p: any) => {
                      const name     = p.Player ?? p.player_squad?.split('_')[0] ?? '—';
                      const pos      = p.Pos ?? '—';
                      const club     = p.Squad ?? '—';
                      const rating   = scoutingService.rating(p);
                      const stars    = Math.round(Math.min(5, rating / 2));
                      const slugName = name.toLowerCase().replace(/\s+/g, '-');
                      return (
                        <tr key={p.player_squad ?? name} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }} onClick={() => navigate(`/player-profile/${slugName}`)}>
                          <td style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 13, padding: '10px 0' }}>{name}</td>
                          <td style={{ padding: '10px 8px 10px 0' }}>
                            <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{pos}</span>
                          </td>
                          <td style={{ padding: '10px 8px 10px 0' }}>
                            <span style={{ color: '#939A9E', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><ClubLogo club={club} size={14} />{club}</span>
                          </td>
                          <td style={{ padding: '10px 8px 10px 0' }}><Stars count={stars} /></td>
                          <td style={{ padding: '10px 0' }}>
                            <DBtn variant="ghost" onClick={() => navigate(`/player-profile/${slugName}`)}>View</DBtn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.75, ease: EASE, delay: 0.4 }}
          onClick={() => navigate('/table-predictions')}
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px', position: 'relative', overflow: 'hidden', isolation: 'isolate', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.26em', marginBottom: 4 }}>Monte Carlo Simulations</div>
              <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', textTransform: 'uppercase', fontSize: 18, fontWeight: 700, color: '#F2F2F2', margin: '0 0 4px' }}>League Table Predictions</h2>
              <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Season outcome probabilities — 10,000 simulations</p>
            </div>
            <DBtn variant="ghost" onClick={() => navigate('/table-predictions')}>Full Table</DBtn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', color: '#939A9E', fontSize: 12 }}>
            Click to view full season predictions →
          </div>
        </motion.div>

      </div>
    </div>
  );
}
