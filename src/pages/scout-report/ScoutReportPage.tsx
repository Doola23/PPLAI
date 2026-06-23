import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, DownloadSimple, ShareNetwork, Shield,
  ChartLineUp, Warning, CheckCircle, Lightning, CaretLeft, Star, Crosshair,
} from '@phosphor-icons/react';
import PageBanner from '../../components/dashboard/PageBanner';
import Flag from '../../components/ui/Flag';
import ClubLogo from '../../components/ui/ClubLogo';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import api from '../../services/api';
import type { ShotMap, MatchLogRow } from '../scout-results/ScoutResultsPage';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function AttributeBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, (value / 10) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: '#939A9E', fontSize: 11, width: 112, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          style={{ height: '100%', borderRadius: 99, background: '#1A65D3' }}
        />
      </div>
      <span style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 11, width: 28, textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  );
}

function StatHex({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRadius: 16, border: '1px solid rgba(26,101,211,0.3)', background: 'rgba(26,101,211,0.05)',
      padding: 16, aspectRatio: '1',
    }}>
      <span style={{ fontSize: 22, fontWeight: 900, color: '#F2F2F2' }}>{value}</span>
      <span style={{ fontSize: 9, color: '#939A9E', marginTop: 4, textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

const SHOT_COLOR: Record<string, string> = { G: '#1A65D3', S: '#939A9E', M: 'rgba(147,154,158,0.45)', B: '#2B4C5E', P: '#facc15' };
const SHOT_LABEL: Record<string, string> = { G: 'Goal', S: 'Saved', M: 'Missed', B: 'Blocked', P: 'Post' };

function ShotMapView({ shotMap, loading }: { shotMap: ShotMap | null; loading: boolean }) {
  if (loading) return <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Loading shot map…</p>;
  if (!shotMap || shotMap.sh.length === 0) return <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>No shot data available for this player.</p>;

  const shots = shotMap.sh;
  const goals = shots.filter(s => s.r === 'G').length;
  const totalXg = shots.reduce((a, s) => a + s.xg, 0);
  const conversion = shots.length ? ((goals / shots.length) * 100).toFixed(1) : '0';

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <StatHex label="Shots" value={String(shotMap.ts)} />
        <StatHex label="Goals" value={String(goals)} />
        <StatHex label="Conv %" value={conversion} />
        <StatHex label="Total xG" value={totalXg.toFixed(1)} />
      </div>

      <div style={{
        position: 'relative', width: '100%', height: 200, borderRadius: 10,
        background: 'rgba(26,101,211,0.05)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        {/* Goal mouth on the right edge -- shots are recorded as x closer to 1 = closer to goal */}
        <div style={{ position: 'absolute', right: -2, top: '37%', height: '26%', width: 4, background: 'rgba(255,255,255,0.25)' }} />
        {shots.map((s, i) => (
          <div
            key={i}
            title={`${SHOT_LABEL[s.r] ?? s.r} · min ${s.m} · xG ${s.xg.toFixed(2)}`}
            style={{
              position: 'absolute',
              left: `${Math.min(98, s.x * 100)}%`, top: `${Math.min(96, s.y * 100)}%`,
              width: s.r === 'G' ? 9 : 6, height: s.r === 'G' ? 9 : 6,
              borderRadius: '50%', background: SHOT_COLOR[s.r] ?? '#939A9E',
              transform: 'translate(-50%, -50%)', cursor: 'default',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {Object.entries(SHOT_LABEL).map(([k, l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: SHOT_COLOR[k], display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#939A9E' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchLogTable({ matchLog, loading, club }: { matchLog: MatchLogRow[] | null; loading: boolean; club: string }) {
  if (loading) return <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Loading match log…</p>;
  if (!matchLog || matchLog.length === 0) return <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>No match log available for this player.</p>;

  const rows = [...matchLog].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 12);

  return (
    <div className="table-scroll-x">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: '#939A9E', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Date', 'Opponent', 'Result', 'Min', 'G', 'A', 'Sh', 'KP', 'xG', 'xA'].map(h => (
              <th key={h} style={{ padding: '6px 10px', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => {
            const opponent = m.ht.toLowerCase() === club.toLowerCase() ? `vs ${m.at}` : `@ ${m.ht}`;
            return (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '7px 10px', color: '#939A9E', whiteSpace: 'nowrap' }}>{m.d}</td>
                <td style={{ padding: '7px 10px', color: '#F2F2F2', whiteSpace: 'nowrap' }}>{opponent}</td>
                <td style={{ padding: '7px 10px', color: m.r === 'W' ? '#1A65D3' : m.r === 'L' ? '#939A9E' : '#F2F2F2', fontWeight: 700 }}>{m.r}</td>
                <td style={{ padding: '7px 10px', color: '#F2F2F2' }}>{m.t}</td>
                <td style={{ padding: '7px 10px', color: '#F2F2F2' }}>{m.g}</td>
                <td style={{ padding: '7px 10px', color: '#F2F2F2' }}>{m.a}</td>
                <td style={{ padding: '7px 10px', color: '#F2F2F2' }}>{m.s}</td>
                <td style={{ padding: '7px 10px', color: '#F2F2F2' }}>{m.kp}</td>
                <td style={{ padding: '7px 10px', color: '#939A9E' }}>{m.xg.toFixed(2)}</td>
                <td style={{ padding: '7px 10px', color: '#939A9E' }}>{m.xa.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ResultPlayer = {
  name: string; position: string; club: string; nationality: string; age: number;
  rating: number; xg: number; xa: number; apps: number;
  goals: number; assists: number; minutesPlayed: number;
  recentInjuries?: number; recentDaysMissed?: number; playerId?: string | null;
};

function clamp10(v: number, max: number) {
  return Math.min(10, Math.round((v / max) * 100) / 10);
}

function buildAttributes(p: ResultPlayer) {
  return [
    { label: 'Goals',       value: clamp10(p.goals,   30)  },
    { label: 'Assists',     value: clamp10(p.assists,  20)  },
    { label: 'xG/90',       value: clamp10(p.xg,       1.2) },
    { label: 'xA/90',       value: clamp10(p.xa,       0.8) },
    { label: 'Appearances', value: clamp10(p.apps,     38)  },
    { label: 'Overall',     value: Math.min(10, p.rating)   },
  ];
}

function buildStrengths(p: ResultPlayer): string[] {
  const s: string[] = [];
  if (p.goals >= 15)      s.push(`Prolific finisher — ${p.goals} goals this season`);
  if (p.assists >= 10)    s.push(`Creative threat — ${p.assists} assists this season`);
  if (p.xg >= 0.5)        s.push(`High xG output — ${p.xg.toFixed(2)} per 90`);
  if (p.xa >= 0.3)        s.push(`Chance creator — ${p.xa.toFixed(2)} xA per 90`);
  if (p.apps >= 25)       s.push(`Consistent starter — ${p.apps} appearances`);
  if (p.rating >= 8)      s.push(`Elite season-long output (${p.rating.toFixed(1)}/10)`);
  if (s.length === 0)     s.push('Competitive profile across key metrics');
  return s.slice(0, 5);
}

function buildWeaknesses(p: ResultPlayer): string[] {
  const w: string[] = [];
  if (p.goals < 5)        w.push('Goal contribution below average for position');
  if (p.assists < 3)      w.push('Limited creative output — monitor assist rate');
  if (p.apps < 15)        w.push(`Limited appearances (${p.apps}) — fitness concern`);
  if (p.rating < 5)       w.push(`Below-average season output (${p.rating.toFixed(1)}/10)`);
  if (w.length === 0)     w.push('No significant concerns identified at this stage');
  return w.slice(0, 3);
}

function recommendation(p: ResultPlayer): string {
  if (p.rating >= 8)   return 'Highly Recommended';
  if (p.rating >= 6.5) return 'Recommended';
  if (p.rating >= 5)   return 'Monitor';
  return 'Further Assessment';
}

function injuryRisk(p: ResultPlayer): string {
  if ((p.recentInjuries ?? 0) >= 3 || (p.recentDaysMissed ?? 0) > 60) return 'Elevated';
  if ((p.recentInjuries ?? 0) >= 1 || (p.recentDaysMissed ?? 0) > 14) return 'Monitor';
  return 'Low';
}

type NavState = { player?: ResultPlayer };

export default function ScoutReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as NavState | null) ?? {};
  const player = navState.player ?? null;

  const [shotMap, setShotMap] = useState<ShotMap | null>(null);
  const [matchLog, setMatchLog] = useState<MatchLogRow[] | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    setExtrasLoading(true);
    const name = encodeURIComponent(player.name);
    Promise.all([
      api.get(`/api/scouting/shot-maps/${name}`),
      api.get(`/api/scouting/match-logs/${name}`),
    ]).then(([sm, ml]) => {
      setShotMap(sm.data?.items?.[0]?.shots ?? null);
      setMatchLog(ml.data?.items?.[0]?.logs?.m ?? null);
    }).catch(() => {}).finally(() => setExtrasLoading(false));
  }, [player?.name]);

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: '#939A9E', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>No player selected — go back and click Scout Report</div>
        <button onClick={() => navigate('/scout-results')} style={{ borderRadius: 999, background: '#1A65D3', color: '#F2F2F2', border: 'none', padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CaretLeft size={13} /> Back to Results
        </button>
      </div>
    );
  }

  const attrs      = buildAttributes(player);
  const strengths  = buildStrengths(player);
  const weaknesses = buildWeaknesses(player);
  const rec        = recommendation(player);
  const overallRating = Math.min(10, player.rating).toFixed(1);

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Scouting"
        title="Scout"
        titleAccent="Report"
        description="Full AI-generated scouting report — attributes, strengths, shot map and match log"
        stats={[
          { value: overallRating,       label: 'Rating'   },
          { value: String(player.apps), label: 'Apps'     },
          { value: player.position,     label: 'Position' },
        ]}
        badge="Scout Report"
      />

      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <p style={{ color: '#939A9E', fontSize: 9, fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Home › Scout Results › Report
          </p>
          <h1 style={{ color: '#F2F2F2', fontFamily: 'Miguer Sans, sans-serif', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' }}>
            {player.name}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/scout-results')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}>
            <CaretLeft size={13} /> Back
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ShareNetwork size={13} /> Share
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1A65D3', color: '#F2F2F2', fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <DownloadSimple size={13} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                <PlayerAvatar name={player.name} playerId={player.playerId ?? undefined} size={64} style={{ borderRadius: 16 }} />
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h2 style={{ color: '#F2F2F2', fontWeight: 900, fontSize: 22, margin: 0 }}>{player.name}</h2>
                    <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{player.position}</span>
                    <span style={{ background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.3)', color: '#1A65D3', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{rec}</span>
                  </div>
                  <p style={{ color: '#939A9E', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClubLogo club={player.club} size={14} /> {player.club} · <Flag nationality={player.nationality} size={13} /> {player.nationality} · Age {player.age}
                  </p>
                </div>
              </div>
              <div className="layout-3col" style={{ gap: 16, flexShrink: 0 }}>
                {[
                  { label: 'Rating',  value: overallRating,             color: '#F2F2F2' },
                  { label: 'Apps',    value: String(player.apps),       color: '#1A65D3' },
                  { label: 'Minutes', value: String(player.minutesPlayed), color: '#1A65D3' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <p style={{ color: item.color, fontWeight: 900, fontSize: 22, margin: 0 }}>{item.value}</p>
                    <p style={{ color: '#939A9E', fontSize: 10, fontWeight: 600, margin: '2px 0 0' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileText size={13} color="#1A65D3" weight="regular" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#1A65D3', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scout Summary</span>
              </div>
              <p style={{ color: '#939A9E', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {player.name} is a {player.position} playing for {player.club}, aged {player.age}.
                {player.goals > 0 ? ` Scored ${player.goals} goals` : ''}
                {player.assists > 0 ? ` and provided ${player.assists} assists` : ''} across {player.apps} appearances this season.
                {' '}xG of {player.xg.toFixed(2)} and xA of {player.xa.toFixed(2)} per 90 reflect a{' '}
                {player.rating >= 7.5 ? 'high-impact' : player.rating >= 6 ? 'solid' : 'developing'} attacking profile.
                {' '}{rec === 'Highly Recommended' ? 'Strongly recommended for immediate consideration.' : rec === 'Recommended' ? 'Recommended for further evaluation.' : 'Continue monitoring over the coming weeks.'}
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="layout-6pills" style={{ gap: 12 }}>
          {[
            { label: 'Goals',   value: String(player.goals)   },
            { label: 'Assists', value: String(player.assists)  },
            { label: 'xG/90',  value: player.xg.toFixed(2)    },
            { label: 'xA/90',  value: player.xa.toFixed(2)    },
            { label: 'Apps',   value: String(player.apps)     },
            { label: 'Rating', value: overallRating            },
          ].map(s => (
            <motion.div key={s.label} variants={cardVariants}>
              <StatHex label={s.label} value={s.value} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="layout-2col" style={{ gap: 20 }}>
          <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChartLineUp size={15} color="#1A65D3" />
              </div>
              <h3 style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 13, margin: 0 }}>Attribute Ratings</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {attrs.map(a => <AttributeBar key={a.label} label={a.label} value={a.value} />)}
            </div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={15} color="#1A65D3" weight="regular" />
                </div>
                <h3 style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 13, margin: 0 }}>Strengths</h3>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {strengths.map((s, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A65D3', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ color: '#939A9E', fontSize: 12 }}>{s}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Warning size={15} color="#1A65D3" />
                </div>
                <h3 style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 13, margin: 0 }}>Areas to Watch</h3>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {weaknesses.map((w, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(147,154,158,0.6)', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ color: '#939A9E', fontSize: 12 }}>{w}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="layout-3col" style={{ gap: 20 }}>
          {[
            { icon: Shield,    label: 'Injury Risk',    value: injuryRisk(player), sub: 'Based on recent injury history' },
            { icon: Star,      label: 'Overall Rating', value: `${overallRating}/10`, sub: 'Season per-90 output blend'  },
            { icon: Lightning, label: 'Recommendation', value: rec,                sub: 'Scout assessment'               },
          ].map(item => (
            <motion.div key={item.label} variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={18} color="#1A65D3" />
              </div>
              <div>
                <p style={{ color: '#939A9E', fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ color: '#F2F2F2', fontWeight: 900, fontSize: 20, margin: 0 }}>{item.value}</p>
                <p style={{ color: '#939A9E', fontSize: 10, margin: '4px 0 0' }}>{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="layout-2col" style={{ gap: 20 }}>
          <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crosshair size={15} color="#1A65D3" />
              </div>
              <h3 style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 13, margin: 0 }}>Shot Map</h3>
            </div>
            <ShotMapView shotMap={shotMap} loading={extrasLoading} />
          </motion.div>

          <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChartLineUp size={15} color="#1A65D3" />
              </div>
              <h3 style={{ color: '#F2F2F2', fontWeight: 700, fontSize: 13, margin: 0 }}>Match Log</h3>
            </div>
            <MatchLogTable matchLog={matchLog} loading={extrasLoading} club={player.club} />
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
