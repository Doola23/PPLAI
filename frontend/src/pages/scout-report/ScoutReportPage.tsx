import { useState, useEffect, useRef } from 'react';
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

// Missed = white (distinct from the slate pitch + gray Blocked); Goal/Saved are blue tones.
const SHOT_COLOR: Record<string, string> = { G: '#1A65D3', S: '#4F82D6', M: '#F2F2F2', B: '#939A9E', P: '#facc15' };
const SHOT_LABEL: Record<string, string> = { G: 'Goal', S: 'Saved', M: 'Missed', B: 'Blocked', P: 'Post' };

function ShotMapView({ shotMap, loading }: { shotMap: ShotMap | null; loading: boolean }) {
  if (loading) return <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>Loading shot map…</p>;
  if (!shotMap || shotMap.sh.length === 0) return <p style={{ color: '#939A9E', fontSize: 12, margin: 0 }}>No shot data available for this player.</p>;

  const shots = shotMap.sh;
  const goals = shots.filter(s => s.r === 'G');
  const saved = shots.filter(s => s.r === 'S');
  const totalXg = shots.reduce((a, s) => a + s.xg, 0);
  const conversion = shots.length ? ((goals.length / shots.length) * 100).toFixed(0) : '0';
  const avgXg = shots.length ? (totalXg / shots.length).toFixed(2) : '0';

  // Attacking-half pitch, goal on the left. Understat x: 1.0 = goal line, 0.5 = halfway.
  const PW = 420, PH = 280, boxW = 132, boxH = 184, sixW = 44, sixH = 72, goalW = 30, goalH = 8;
  const toSVG = (x: number, y: number) => ({ sx: Math.round((1 - x) * PW * 2), sy: Math.round(y * PH) });
  const dotR = (xg: number) => Math.max(4, Math.min(13, xg * 55));

  const stats: [string, string][] = [
    ['Shots', String(shots.length)], ['Goals', String(goals.length)],
    ['Conversion', `${conversion}%`], ['Total xG', totalXg.toFixed(1)],
    ['Avg xG/Shot', avgXg], ['On Target', String(goals.length + saved.length)],
  ];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {stats.map(([l, v]) => <StatHex key={l} label={l} value={v} />)}
      </div>

      <div style={{ background: 'rgba(43,76,94,0.22)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
        <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: '100%', maxWidth: 520, display: 'block', margin: '0 auto' }}>
          <rect x={0} y={0} width={PW} height={PH} fill="#2B4C5E" rx={6} />
          <rect x={0} y={(PH - boxH) / 2} width={boxW} height={boxH} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
          <rect x={0} y={(PH - sixH) / 2} width={sixW} height={sixH} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
          <rect x={0} y={(PH - goalW) / 2} width={goalH} height={goalW} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} />
          <circle cx={66} cy={PH / 2} r={2.5} fill="rgba(255,255,255,0.4)" />
          <line x1={0} y1={0} x2={0} y2={PH} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
          {[...shots.filter(s => s.r !== 'G'), ...goals].map((s, i) => {
            const { sx, sy } = toSVG(s.x, s.y);
            const isGoal = s.r === 'G';
            return (
              <circle key={i} cx={sx} cy={sy} r={dotR(s.xg)} fill={SHOT_COLOR[s.r] ?? '#939A9E'}
                fillOpacity={isGoal ? 0.95 : 0.6} stroke={isGoal ? '#0a0a0a' : 'none'} strokeWidth={isGoal ? 1.5 : 0}>
                <title>{`${SHOT_LABEL[s.r] ?? s.r} · min ${s.m} · xG ${s.xg.toFixed(2)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {(['G', 'S', 'M', 'B'] as const).map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: SHOT_COLOR[k], display: 'inline-block', border: k === 'M' ? '1px solid rgba(0,0,0,0.3)' : 'none' }} />
              <span style={{ fontSize: 10, color: '#939A9E' }}>{SHOT_LABEL[k]}</span>
            </div>
          ))}
          <span style={{ fontSize: 10, color: '#939A9E' }}>Dot size = xG</span>
        </div>
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
  matchScore?: number; // 0-100 fit/score; falls back to rating*10 if absent
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
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    const el = reportRef.current;
    if (!el || exporting) { if (!el) window.print(); return; }
    setExporting(true);
    setToast('Generating PDF…');
    const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // iOS blocks window.open after an await (outside the tap gesture), so open the tab
    // synchronously now and point it at the PDF once it's ready.
    const iosWin = isIOS ? window.open('', '_blank') : null;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const safeName = (player?.name || 'player').replace(/[^a-z0-9]+/gi, '_');
      const filename = `${safeName}_Scout_Report.pdf`;
      // Build a real Blob — .save() relies on an <a download> click, which iOS Safari
      // ignores for blob URLs (it reports success but nothing is saved).
      const blob = await html2pdf().set({
        margin: 6,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: '#000000', useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(el).outputPdf('blob');

      const url = URL.createObjectURL(blob);
      if (isIOS) {
        if (iosWin) { iosWin.location.href = url; setToast('PDF ready — tap Share → Save to Files'); }
        else { window.location.href = url; }  // popup blocked → navigate current tab
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setToast('PDF downloaded to your files');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (iosWin) iosWin.close();
      setToast('Couldn’t generate PDF — opening print instead');
      try { window.print(); } catch { /* noop */ }
    } finally {
      setExporting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Legacy clipboard copy — works over insecure HTTP (LAN/mobile) where the async
  // Clipboard API is unavailable.
  const legacyCopy = (text: string) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  };

  const handleShare = async () => {
    if (!player) return;
    const text =
      `${player.name} — ${player.position}, ${player.club}\n` +
      `Match Score: ${matchScore}/100 · ${rec}\n` +
      `Goals ${player.goals} · Assists ${player.assists} · xG/90 ${player.xg.toFixed(2)} · xA/90 ${player.xa.toFixed(2)}\n` +
      `PLAI Scout Report`;
    // Native share sheet when available (secure contexts / mobile over HTTPS).
    if (navigator.share) {
      try { await navigator.share({ title: `${player.name} — Scout Report`, text }); } catch { /* cancelled */ }
      return;
    }
    // Fallback: copy to clipboard (async API first, then legacy execCommand for HTTP).
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; }
    } catch { /* falls through to legacy */ }
    if (!copied) copied = legacyCopy(text);
    setToast(copied ? 'Report summary copied to clipboard' : 'Could not copy — select the text to copy manually');
    setTimeout(() => setToast(null), 2600);
  };

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
  // 0-100 match score (50 = positional average). Uses the real search score when
  // present, else derives it from the player's z-score rating.
  const matchScore = Math.round(player.matchScore ?? player.rating * 10);

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Scouting"
        title="Scout"
        titleAccent="Report"
        description="Full AI-generated scouting report — attributes, strengths, shot map and match log"
        stats={[
          { value: String(matchScore),  label: 'Match Score' },
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
          <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ShareNetwork size={13} /> Share
          </button>
          <button onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1A65D3', color: '#F2F2F2', fontSize: 11, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.6 : 1, fontFamily: 'inherit' }}>
            <DownloadSimple size={13} /> {exporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div ref={reportRef} style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={cardVariants} style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '22px 24px' }}>
            <div className="report-id-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                <PlayerAvatar name={player.name} playerId={player.playerId ?? undefined} size={64} style={{ borderRadius: 16 }} />
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h2 style={{ color: '#F2F2F2', fontWeight: 900, fontSize: 22, margin: 0 }}>{player.name}</h2>
                    <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{player.position}</span>
                    <span style={{ background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.3)', color: '#1A65D3', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{rec}</span>
                  </div>
                  <p style={{ color: '#939A9E', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 2, gap: 6 }}>
                    <ClubLogo club={player.club} size={14} /> {player.club} · <Flag nationality={player.nationality} size={13} /> {player.nationality} · Age {player.age}
                  </p>
                </div>
              </div>
              <div className="layout-3col" style={{ gap: 16, flexShrink: 0 }}>
                {[
                  { label: 'Match Score', value: String(matchScore),    color: '#1A65D3' },
                  { label: 'Apps',    value: String(player.apps),       color: '#F2F2F2' },
                  { label: 'Minutes', value: String(player.minutesPlayed), color: '#F2F2F2' },
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
            { label: 'Match Score', value: String(matchScore) },
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
            { icon: Star,      label: 'Match Score',    value: `${matchScore}/100`, sub: 'Fit vs positional peers'    },
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

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#1A65D3', color: '#F2F2F2', fontSize: 12, fontWeight: 700, padding: '10px 18px', borderRadius: 999, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
