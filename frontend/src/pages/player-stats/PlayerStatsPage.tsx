import Spinner from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageBanner from '../../components/dashboard/PageBanner';
import ClubLogo from '../../components/ui/ClubLogo';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import { playerStatsService, type PlayerStat } from '../../services/playerStats.service';
import { getFlagUrl } from '../../utils/flags';

const E = [0.16, 1, 0.3, 1] as const;

interface DisplayPlayer {
  id: string; name: string; club: string; position: string;
  goals: number; assists: number; xgPer90: number; passAcc: number;
  xg: number; shotsPer90: number; keyPasses: number; progressiveCarries: number;
  progressivePasses: number; tackles: number;
  raw: PlayerStat;
}

function mapStat(s: PlayerStat, i: number): DisplayPlayer {
  const mins90 = s.ninety_mins_played || s.mp || 1;
  return {
    id: `${i}`,
    name: s.player ?? '—',
    club: s.squad ?? '—',
    position: s.position ?? '—',
    goals:    s.goals   ?? 0,
    assists:  s.assists ?? 0,
    xgPer90:  typeof s.xg_per_90 === 'number' ? s.xg_per_90 : (s.xg ?? 0) / mins90,
    passAcc:  s.pass_completion_pct ?? 0,
    xg:       s.xg ?? 0,
    shotsPer90: s.shots ? s.shots / mins90 : 0,
    keyPasses:  0,
    progressiveCarries: s.progressive_carries ?? 0,
    progressivePasses:  s.progressive_passes  ?? 0,
    tackles:   s.tackles ?? 0,
    raw: s,
  };
}

const leagueAvg = {
  goals: 8, assists: 5, xg: 7.2, shotsPer90: 2.1,
  progressiveCarries: 40, progressivePasses: 50, tackles: 30, passAcc: 78,
};

function Sparkline({ goals }: { goals: number }) {
  const W = 280; const H = 48;
  const pts = Array.from({ length: 10 }, (_, i) => ({
    goals: i % 3 === 0 ? Math.floor(goals / 5) : i % 5 === 0 ? Math.ceil(goals / 4) : 0,
  }));
  const maxG = Math.max(...pts.map(d => d.goals), 1);
  const gap = W / (pts.length - 1);
  const polyPts = pts.map((d, i) => `${i * gap},${H - (d.goals / maxG) * (H - 4)}`).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={polyPts} fill="none" stroke="#1A65D3" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((d, i) => (
        <circle key={i} cx={i * gap} cy={H - (d.goals / maxG) * (H - 4)} r="3" fill="#1A65D3" />
      ))}
    </svg>
  );
}

function MetricBar({ label, value, max, avg, color }: { label: string; value: number; max: number; avg: number; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#F2F2F2', }}>
            {value % 1 !== 0 ? value.toFixed(2) : value}
          </span>
          <span style={{ fontSize: 10, color: '#939A9E' }}>avg {avg % 1 !== 0 ? avg.toFixed(1) : avg}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          transition={{ duration: 0.9, ease: E }}
          style={{ height: '100%', background: color, borderRadius: 99, position: 'absolute' }}
        />
        <div style={{ position: 'absolute', left: `${Math.min((avg / max) * 100, 100)}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.25)' }} />
      </div>
    </div>
  );
}

export default function PlayerStatsPage() {
  const [players, setPlayers]     = useState<DisplayPlayer[]>([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [season, setSeason]       = useState<'2024/25' | '2023/24' | '2022/23'>('2024/25');

  useEffect(() => {
    playerStatsService.getAll({ limit: 50 }).then(data => {
      const sorted = [...data].sort((a, b) => ((b.goals ?? 0) + (b.assists ?? 0)) - ((a.goals ?? 0) + (a.assists ?? 0)));
      setPlayers(sorted.slice(0, 20).map(mapStat));
    }).catch(() => {});
  }, []);

  const player = players[playerIdx];

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={300} label="Stats" />
      </div>
    );
  }

  const statCards = [
    { label: 'Goals',              value: player.goals,              max: 35,  avg: leagueAvg.goals,              color: '#1A65D3' },
    { label: 'Assists',            value: player.assists,            max: 20,  avg: leagueAvg.assists,            color: '#1A65D3' },
    { label: 'xG',                 value: parseFloat(player.xg.toFixed(1)), max: 30, avg: leagueAvg.xg,           color: '#1A65D3' },
    { label: 'Shots / 90',         value: parseFloat(player.shotsPer90.toFixed(2)), max: 6, avg: leagueAvg.shotsPer90, color: '#1A65D3' },
    { label: 'Prog Carries',       value: player.progressiveCarries, max: 150, avg: leagueAvg.progressiveCarries, color: '#1A65D3' },
    { label: 'Prog Passes',        value: player.progressivePasses,  max: 200, avg: leagueAvg.progressivePasses,  color: '#1A65D3' },
    { label: 'Tackles',            value: player.tackles,            max: 100, avg: leagueAvg.tackles,            color: '#1A65D3' },
    { label: 'Pass Completion %',  value: player.passAcc,            max: 100, avg: leagueAvg.passAcc,            color: '#1A65D3' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Players"
        title="Player"
        titleAccent="Stats"
        stats={[
          { value: String(players.length), label: 'Players' },
          { value: '2024/25',              label: 'Season'  },
          { value: 'Live',                 label: 'Data'    },
        ]}
        badge="Live"
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>

        <div style={{ display: 'flex', gap: 6, padding: '20px 0 0', overflowX: 'auto' }}>
          {players.map((p, i) => (
            <motion.button
              key={p.id} whileTap={{ scale: 0.97 }}
              onClick={() => setPlayerIdx(i)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 999,
                background: i === playerIdx ? 'rgba(26,101,211,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i === playerIdx ? 'rgba(26,101,211,0.4)' : 'rgba(255,255,255,0.07)'}`,
                cursor: 'pointer', transition: 'all 160ms ease',
              }}
            >
              <PlayerAvatar name={p.name} size={28} style={{ borderRadius: 8 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: i === playerIdx ? '#F2F2F2' : '#939A9E', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 9, color: '#939A9E', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClubLogo club={p.club} size={11} />
                  {p.position}
                </div>
              </div>
            </motion.button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {(['2024/25', '2023/24', '2022/23'] as const).map(s => (
              <button
                key={s} onClick={() => setSeason(s)}
                style={{
                  padding: '8px 12px', borderRadius: 999,
                  border: `1px solid ${s === season ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  background: s === season ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: s === season ? '#F2F2F2' : '#939A9E',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={player.id}
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: E }}
            className="layout-sidebar-left" style={{ marginTop: 20 }}
          >
            <div style={{
              position: 'sticky', top: 56, height: 'fit-content',
              background: 'var(--surface-card)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 22, overflow: 'hidden',
            }}>
              <div style={{ height: 4, background: '#1A65D3' }} />
              <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <PlayerAvatar name={player.name} size={96} style={{ borderRadius: 24, border: '2px solid rgba(26,101,211,0.3)' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 24, fontWeight: 900, color: '#F2F2F2', margin: 0, lineHeight: 1.1 }}>{player.name}</h2>
                    {getFlagUrl(player.raw.nation ?? '') && (
                      <img
                        src={getFlagUrl(player.raw.nation ?? '')}
                        alt={player.raw.nation ?? ''}
                        style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 3, flexShrink: 0, marginTop: 2 }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClubLogo club={player.club} size={16} />
                    <span style={{ fontSize: 12, color: '#939A9E' }}>{player.club}</span>
                    <span style={{ background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.3)', color: '#1A65D3', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{player.position}</span>
                  </div>
                </div>

                <div className="layout-2col" style={{ gap: 8 }}>
                  {[
                    { label: 'Goals',   value: player.goals,              color: '#F2F2F2' },
                    { label: 'Assists', value: player.assists,            color: '#F2F2F2' },
                    { label: 'xG/90',  value: player.xgPer90.toFixed(2), color: '#1A65D3' },
                    { label: 'Pass %', value: `${Math.round(player.passAcc)}%`, color: '#1A65D3' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: '#939A9E', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Season Trend</p>
                  <Sparkline goals={player.goals} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: '#939A9E' }}>GW1</span>
                    <span style={{ fontSize: 9, color: '#939A9E' }}>GW38</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
                  vs League Average <span style={{ color: '#939A9E', fontWeight: 400 }}>— white line = avg</span>
                </p>
                {statCards.slice(0, 4).map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: E, delay: i * 0.08 }}>
                    <MetricBar {...s} />
                  </motion.div>
                ))}
              </div>

              <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Workrate & Progression</p>
                {statCards.slice(4).map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: E, delay: 0.32 + i * 0.08 }}>
                    <MetricBar {...s} />
                  </motion.div>
                ))}
              </div>

              <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}>
                <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Profile</p>
                <div className="layout-3col" style={{ gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                      {getFlagUrl(player.raw.nation ?? '') && (
                        <img
                          src={getFlagUrl(player.raw.nation ?? '')}
                          alt={player.raw.nation ?? ''}
                          style={{ width: 20, height: 15, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F2F2F2' }}>{player.raw.nation ?? '—'}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Nation</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                      <ClubLogo club={player.club} size={18} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F2F2F2' }}>{player.club}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Club</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', marginBottom: 4 }}>{player.position}</div>
                    <div style={{ fontSize: 9, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Position</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
