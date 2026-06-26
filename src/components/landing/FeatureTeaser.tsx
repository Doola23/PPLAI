import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PlayerAvatar from '@/components/ui/PlayerAvatar';
import { injuriesService, type InjuryPrediction } from '../../services/injuries.service';
import { playerStatsService, type PlayerStat } from '../../services/playerStats.service';
import { scoutingService, type ScoutPlayer } from '../../services/scouting.service';
import { matchesService, type MatchPrediction, type StandingsRow } from '../../services/matches.service';
import { getClubCrest } from '../../utils/clubs';
import { loadLandingConfig, type LandingConfig } from '../../pages/admin/LandingConfigTab';

const E = [0.16, 1, 0.3, 1] as const;

function ClubImg({ club, size = 20 }: { club: string; size?: number }) {
  const src = getClubCrest(club);
  if (!src) return null;
  return <img src={src} alt={club} width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0 }} />;
}

function shortName(full: string) {
  const parts = full.trim().split(' ');
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

function riskColor(level: 'High' | 'Low') {
  return level === 'High' ? '#1A65D3' : '#939A9E';
}
function riskLabel(level: 'High' | 'Low') {
  return level === 'High' ? 'HIGH' : 'LOW';
}


function MatchPreview({ matches }: { matches: MatchPrediction[] }) {
  const rows = matches.slice(0, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((m, i) => {
        const hw = Math.round(parseFloat(m.home_win_pct) * 100);
        const dw = Math.round(parseFloat(m.draw_pct) * 100);
        const aw = Math.round(parseFloat(m.away_win_pct) * 100);
        return (
          <motion.div key={i}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: E }}
            style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ClubImg club={m.home_team.toLowerCase()} size={22} />
                <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{m.home_team}</span>
              </div>
              <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 500 }}>vs</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexDirection: 'row-reverse' }}>
                <ClubImg club={m.away_team.toLowerCase()} size={22} />
                <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{m.away_team}</span>
              </div>
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${hw}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: E }} style={{ background: '#1A65D3', borderRadius: 999 }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${dw}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 0.8, ease: E }} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 999 }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${aw}%` }} transition={{ delay: 0.5 + i * 0.08, duration: 0.8, ease: E }} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#939A9E' }}>
              <span>{hw}%</span>
              <span style={{ color: '#1A65D3', fontWeight: 700 }}>{hw > aw ? m.home_team : m.away_team} favoured</span>
              <span>{aw}%</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function InjuryPreview({ players }: { players: InjuryPrediction[] }) {
  const rows = players.slice(0, 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((p, i) => {
        const level = injuriesService.riskLevel(p);
        const color = riskColor(level);
        const label = riskLabel(level);
        const name = shortName(p.player_name);
        return (
          <motion.div key={i}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: E }}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <PlayerAvatar name={p.player_name} size={36} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#000', padding: 1 }}>
                <ClubImg club={p.team.toLowerCase()} size={12} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: level === 'High' ? '85%' : '35%' }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.9, ease: E }}
                  style={{ height: '100%', borderRadius: 999, background: color }} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function AnalyticsPreview({ player }: { player: PlayerStat | null }) {
  const p = player;
  if (!p) return null;
  const score = Math.min(99, Math.round(50 + (p.xg_per_90 ?? 0) * 30 + (p.goals ?? 0) * 0.3));
  const stats = [
    { label: 'xG per 90', val: (p.xg_per_90 ?? 0).toFixed(2), pct: Math.min(99, Math.round((p.xg_per_90 ?? 0) * 120)) },
    { label: 'xAG per 90', val: (p.xag_per_90 ?? 0).toFixed(2), pct: Math.min(99, Math.round((p.xag_per_90 ?? 0) * 130)) },
    { label: 'Progressive Passes', val: String(p.progressive_passes ?? 0), pct: Math.min(99, Math.round((p.progressive_passes ?? 0) / 2)) },
    { label: 'Goals', val: String(p.goals ?? 0), pct: Math.min(99, Math.round((p.goals ?? 0) * 2.5)) },
    { label: 'Assists', val: String(p.assists ?? 0), pct: Math.min(99, Math.round((p.assists ?? 0) * 4)) },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
        <PlayerAvatar name={p.player} size={40} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.2 }}>{p.player}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <ClubImg club={p.squad.toLowerCase()} size={14} />
            <span style={{ fontSize: 11, color: '#939A9E' }}>{p.squad} · {p.position}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1A65D3', lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: '#939A9E', letterSpacing: '0.05em' }}>PLAI score</div>
        </div>
      </div>
      {stats.map((s, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4, ease: E }}
          style={{ display: 'grid', gridTemplateColumns: '1fr auto 90px', alignItems: 'center', gap: 12 }}
        >
          <span style={{ fontSize: 13, color: '#939A9E' }}>{s.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{s.val}</span>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease: E }}
              style={{ height: '100%', borderRadius: 999, background: '#1A65D3' }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ScoutPreview({ players }: { players: ScoutPlayer[] }) {
  const rows = players.slice(0, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: 'rgba(26,101,211,0.08)', border: '1px solid rgba(26,101,211,0.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['FW', 'U26', 'High xG'].map(tag => (
          <span key={tag} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(26,101,211,0.15)', color: '#1A65D3', fontWeight: 700, letterSpacing: '0.06em' }}>{tag}</span>
        ))}
      </div>
      {rows.map((p, i) => {
        const score = Math.round(scoutingService.rating(p) * 10);
        const name = shortName(p.Player ?? p.player_squad?.split('_')[0] ?? '');
        return (
          <motion.div key={i}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: E }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: i === 0 ? '1px solid rgba(26,101,211,0.35)' : '1px solid rgba(255,255,255,0.05)' }}
          >
            <PlayerAvatar name={p.Player} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <ClubImg club={p.Squad.toLowerCase()} size={13} />
                <span style={{ fontSize: 11, color: '#939A9E' }}>{p.Squad} · Age {p.Age}</span>
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#1A65D3' }}>{score}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TablePreview({ rows }: { rows: StandingsRow[] }) {
  const top5 = rows.slice(0, 5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {top5.map((t, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4, ease: E }}
          style={{ display: 'grid', gridTemplateColumns: '20px 20px 1fr 52px 60px', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: i === 0 ? 'rgba(26,101,211,0.1)' : 'rgba(255,255,255,0.03)', border: i === 0 ? '1px solid rgba(26,101,211,0.25)' : '1px solid rgba(255,255,255,0.04)' }}
        >
          <span style={{ fontSize: 12, color: i === 0 ? '#1A65D3' : '#939A9E', fontWeight: 700 }}>{t.Predicted_Pos ?? i + 1}</span>
          <ClubImg club={t.Team.toLowerCase()} size={18} />
          <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{t.Team}</span>
          <span style={{ fontSize: 12, color: '#939A9E', textAlign: 'right' }}>{t.Predicted_Pts}pts</span>
          <span style={{ fontSize: 11, color: '#1A65D3', fontWeight: 700, textAlign: 'right' }}>{i === 0 ? 'Title' : i < 4 ? 'UCL' : 'UEL'}</span>
        </motion.div>
      ))}
    </div>
  );
}


export default function FeatureTeaser() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [matches, setMatches]   = useState<MatchPrediction[]>([]);
  const [injuries, setInjuries] = useState<InjuryPrediction[]>([]);
  const [topPlayer, setTopPlayer] = useState<PlayerStat | null>(null);
  const [scouts, setScouts]     = useState<ScoutPlayer[]>([]);
  const [standings, setStandings] = useState<StandingsRow[]>([]);

  function applyConfig(cfg: LandingConfig, allMatches: MatchPrediction[], allInjuries: InjuryPrediction[], allStats: PlayerStat[], allScouts: ScoutPlayer[], allStandings: StandingsRow[]) {
    if (cfg.matchTeams.length) {
      const pinned = cfg.matchTeams.flatMap(team =>
        allMatches.filter(m => m.home_team === team || m.away_team === team).slice(0, 1)
      ).slice(0, 3);
      setMatches(pinned.length ? pinned : allMatches.slice(0, 3));
    } else {
      setMatches(allMatches.slice(0, 3));
    }

    if (cfg.injuryPlayers.length) {
      const pinned = cfg.injuryPlayers
        .map(name => allInjuries.find(p => p.player_name === name))
        .filter(Boolean) as InjuryPrediction[];
      setInjuries(pinned.length ? pinned : [...allInjuries].sort((a, b) => injuriesService.rankScore(b) - injuriesService.rankScore(a)).slice(0, 4));
    } else {
      setInjuries([...allInjuries].sort((a, b) => injuriesService.rankScore(b) - injuriesService.rankScore(a)).slice(0, 4));
    }

    if (cfg.analyticsPlayer) {
      const p = allStats.find(s => s.player === cfg.analyticsPlayer) ?? null;
      setTopPlayer(p ?? [...allStats].sort((a, b) => (b.xg ?? 0) - (a.xg ?? 0))[0] ?? null);
    } else {
      setTopPlayer([...allStats].sort((a, b) => (b.xg ?? 0) - (a.xg ?? 0))[0] ?? null);
    }

    if (cfg.scoutPlayers.length) {
      const pinned = cfg.scoutPlayers
        .map(name => allScouts.find(p => p.Player === name))
        .filter(Boolean) as ScoutPlayer[];
      setScouts(pinned.length ? pinned : allScouts.filter(p => (p.Pos ?? '').includes('FW') || (p.Pos ?? '').includes('MF')).slice(0, 3));
    } else {
      setScouts(allScouts.filter(p => (p.Pos ?? '').includes('FW') || (p.Pos ?? '').includes('MF')).slice(0, 3));
    }

    if (cfg.tableTeams.length) {
      const pinned = cfg.tableTeams
        .map(team => allStandings.find(r => r.Team === team))
        .filter(Boolean) as StandingsRow[];
      setStandings(pinned.length ? pinned : allStandings.slice(0, 5));
    } else {
      setStandings(allStandings.slice(0, 5));
    }
  }

  useEffect(() => {
    let allMatches: MatchPrediction[] = [];
    let allInjuries: InjuryPrediction[] = [];
    let allStats: PlayerStat[] = [];
    let allScouts: ScoutPlayer[] = [];
    let allStandings: StandingsRow[] = [];

    const fetch = () => Promise.allSettled([
      matchesService.getAllPredictions().then(d => { allMatches = d; }),
      injuriesService.getPredictions().then(d => { allInjuries = d; }),
      playerStatsService.getAll({ limit: 500 }).then(d => { allStats = d; }),
      scoutingService.getCurrent({ limit: 100 }).then(d => { allScouts = d; }),
      matchesService.getPredictedStandings().then(d => { allStandings = d; }),
    ]).then(() => applyConfig(loadLandingConfig(), allMatches, allInjuries, allStats, allScouts, allStandings));

    fetch();

    const onUpdate = () => applyConfig(loadLandingConfig(), allMatches, allInjuries, allStats, allScouts, allStandings);
    window.addEventListener('plai:landing-config-updated', onUpdate);
    return () => window.removeEventListener('plai:landing-config-updated', onUpdate);
  }, []);

  const FEATURES = [
    {
      id: 'match',
      label: 'Match Predictions',
      tagline: 'Know the outcome before kickoff.',
      description: 'Win/draw/loss probabilities, xG forecasts, and tactical breakdowns for any fixture across the Premier League.',
      preview: matches.length ? <MatchPreview matches={matches} /> : <StaticMatchPreview />,
    },
    {
      id: 'injury',
      label: 'Injury Risk',
      tagline: "Protect your squad before it's too late.",
      description: 'Biomechanical stress scores, load monitoring, and early-warning flags — weeks before symptoms appear.',
      preview: injuries.length ? <InjuryPreview players={injuries} /> : <StaticInjuryPreview />,
    },
    {
      id: 'analytics',
      label: 'Player Analytics',
      tagline: 'Every metric. Every player.',
      description: 'Deep performance profiles with xG, progressive passes, pressing intensity, and percentile rankings.',
      preview: topPlayer ? <AnalyticsPreview player={topPlayer} /> : <StaticAnalyticsPreview />,
    },
    {
      id: 'scout',
      label: 'Scout Search',
      tagline: 'Find the next signing in seconds.',
      description: 'Filter 4,200+ players by position, age, budget, and style. AI ranks candidates by tactical fit.',
      preview: scouts.length ? <ScoutPreview players={scouts} /> : <StaticScoutPreview />,
    },
    {
      id: 'table',
      label: 'Table Predictions',
      tagline: "See the season before it's played.",
      description: 'Monte Carlo simulations across 3,400 scenarios/day. Relegation battles, title races, and Europa spots updated live.',
      preview: standings.length ? <TablePreview rows={standings} /> : <StaticTablePreview />,
    },
  ];

  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let closest = 0;
      let minDist = Infinity;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActive(closest);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const feat = FEATURES[active];

  return (
    <section className="lfs" id="features">
      <div className="lfs__inner">
        <div className="lfs__left">
          {FEATURES.map((f, i) => (
            <div
              key={f.id}
              ref={el => { itemRefs.current[i] = el; }}
              className={`lfs__item${active === i ? ' lfs__item--active' : ''}`}
              onClick={() => itemRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <span className="lfs__num">0{i + 1}</span>
              <h3 className="lfs__name">{f.label}</h3>
              <p className="lfs__desc">{f.description}</p>
              <div className="lfs__mobile-preview">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A65D3', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#939A9E' }}>{f.tagline}</span>
                </div>
                {f.preview}
              </div>
            </div>
          ))}
          <div className="lfs__foot">
            <motion.button
              className="lbtn"
              onClick={() => { navigate('/features'); window.scrollTo(0, 0); }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{ height: 52, padding: '0 32px', fontSize: 14, borderRadius: 999 }}
            >
              Explore Features
            </motion.button>
          </div>
        </div>

        <div className="lfs__right">
          <div className="lfs__panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: E }}
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  {FEATURES.map((_, i) => (
                    <button key={i}
                      onClick={() => itemRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === active ? '#1A65D3' : 'rgba(255,255,255,0.15)', transform: i === active ? 'scale(1.5)' : 'scale(1)', transition: 'all 250ms' }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1A65D3', animation: 'ldot-pulse 2s infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#939A9E' }}>{feat.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.1em' }}>{String(active + 1).padStart(2, '0')} / 05</span>
                </div>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 18, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${((active + 1) / FEATURES.length) * 100}%` }} transition={{ duration: 0.5, ease: E }} style={{ height: '100%', background: '#1A65D3', borderRadius: 2 }} />
                </div>
                <h4 style={{ fontFamily: 'Miguer Sans', fontWeight: 800, fontSize: 20, color: '#F2F2F2', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 18 }}>{feat.tagline}</h4>
                <div style={{ flex: 1 }}>{feat.preview}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}


function StaticMatchPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { home: 'Man City', away: 'Arsenal', hw: 62, dw: 22, aw: 16 },
        { home: 'Liverpool', away: 'Chelsea', hw: 48, dw: 27, aw: 25 },
        { home: 'Spurs', away: 'Man Utd', hw: 34, dw: 29, aw: 37 },
      ].map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.4, ease: E }} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{m.home}</span>
            <span style={{ fontSize: 11, color: '#939A9E' }}>vs</span>
            <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{m.away}</span>
          </div>
          <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${m.hw}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: E }} style={{ background: '#1A65D3', borderRadius: 999 }} />
            <motion.div initial={{ width: 0 }} animate={{ width: `${m.dw}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 0.8, ease: E }} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 999 }} />
            <motion.div initial={{ width: 0 }} animate={{ width: `${m.aw}%` }} transition={{ delay: 0.5 + i * 0.08, duration: 0.8, ease: E }} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 999 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#939A9E' }}>
            <span>{m.hw}%</span>
            <span style={{ color: '#1A65D3', fontWeight: 700 }}>{m.hw > m.aw ? m.home : m.away} favoured</span>
            <span>{m.aw}%</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StaticInjuryPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {([
        { name: 'M. Salah', club: 'liverpool', risk: 'Low' as const },
        { name: 'O. Marmoush', club: 'manchester city', risk: 'Low' as const },
        { name: 'B. Saka', club: 'arsenal', risk: 'High' as const },
        { name: 'E. Haaland', club: 'manchester city', risk: 'High' as const },
      ]).map((p, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.4, ease: E }} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayerAvatar name={p.name} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: riskColor(p.risk) }}>{riskLabel(p.risk)}</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: p.risk === 'High' ? '85%' : '35%' }} transition={{ delay: 0.3 + i * 0.07, duration: 0.9, ease: E }} style={{ height: '100%', borderRadius: 999, background: riskColor(p.risk) }} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StaticAnalyticsPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
        <PlayerAvatar name="Mohamed Salah" size={40} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2' }}>Mohamed Salah</div>
          <span style={{ fontSize: 11, color: '#939A9E' }}>Liverpool · RW</span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1A65D3' }}>94</div>
          <div style={{ fontSize: 10, color: '#939A9E' }}>PLAI score</div>
        </div>
      </div>
      {[{ label: 'xG per 90', val: '0.71', pct: 88 }, { label: 'Progressive Passes', val: '8.4', pct: 76 }, { label: 'Goals', val: '28', pct: 91 }].map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.4, ease: E }} style={{ display: 'grid', gridTemplateColumns: '1fr auto 90px', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#939A9E' }}>{s.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{s.val}</span>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease: E }} style={{ height: '100%', borderRadius: 999, background: '#1A65D3' }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StaticScoutPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: 'rgba(26,101,211,0.08)', border: '1px solid rgba(26,101,211,0.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['FW', 'U26', 'High xG'].map(tag => (
          <span key={tag} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(26,101,211,0.15)', color: '#1A65D3', fontWeight: 700 }}>{tag}</span>
        ))}
      </div>
      {[{ name: 'O. Marmoush', club: 'Man City', score: 97 }, { name: 'C. Palmer', club: 'Chelsea', score: 94 }, { name: 'M. Salah', club: 'Liverpool', score: 92 }].map((p, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4, ease: E }} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', border: i === 0 ? '1px solid rgba(26,101,211,0.35)' : '1px solid rgba(255,255,255,0.05)' }}>
          <PlayerAvatar name={p.name} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{p.name}</div>
            <span style={{ fontSize: 11, color: '#939A9E' }}>{p.club}</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#1A65D3' }}>{p.score}</div>
        </motion.div>
      ))}
    </div>
  );
}

function StaticTablePreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[{ pos: 1, club: 'Liverpool', pts: 87, badge: '76% title', hi: true }, { pos: 2, club: 'Arsenal', pts: 84, badge: '21%', hi: false }, { pos: 3, club: 'Man City', pts: 80, badge: '3%', hi: false }, { pos: 4, club: 'Chelsea', pts: 71, badge: 'UCL', hi: false }, { pos: 5, club: 'Aston Villa', pts: 68, badge: 'UEL', hi: false }].map((t, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, duration: 0.4, ease: E }} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 52px 60px', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: t.hi ? 'rgba(26,101,211,0.1)' : 'rgba(255,255,255,0.03)', border: t.hi ? '1px solid rgba(26,101,211,0.25)' : '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: 12, color: t.hi ? '#1A65D3' : '#939A9E', fontWeight: 700 }}>{t.pos}</span>
        <span style={{ fontSize: 13, color: '#F2F2F2', fontWeight: 600 }}>{t.club}</span>
        <span style={{ fontSize: 12, color: '#939A9E', textAlign: 'right' }}>{t.pts}pts</span>
        <span style={{ fontSize: 11, color: '#1A65D3', fontWeight: 700, textAlign: 'right' }}>{t.badge}</span>
      </motion.div>
      ))}
    </div>
  );
}
