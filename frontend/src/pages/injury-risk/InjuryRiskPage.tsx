import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import PageBanner from '../../components/dashboard/PageBanner';
import Spinner from '../../components/ui/Spinner';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import ClubLogo from '../../components/ui/ClubLogo';
import { injuriesService, type InjuryPrediction } from '../../services/injuries.service';

const INJURY_STATS = [
  { value: 532, suffix: '', label: 'Players tracked' },
  { value: 67,  suffix: '%', label: 'AUC' },
  { value: 20,  suffix: '', label: 'PL Clubs' },
  { value: 11,  suffix: '', label: 'Positions mapped' },
];

const E = [0.16, 1, 0.3, 1] as const;

type RiskLevel = 'High' | 'Low';

interface SquadPlayer {
  id: number;
  name: string; shortName: string;
  club: string; position: string;
  risk: RiskLevel; rankScore: number;
  minutesPlayed: number;
  bodyPart: string; returnDate: string;
  imageKey: string;
}

interface PitchPlayer extends SquadPlayer {
  pitchX: number; pitchY: number;
}

const PITCH_SLOTS = [
  { position: 'GK', pitchX: 7,  pitchY: 50 },
  { position: 'RB', pitchX: 23, pitchY: 80 },
  { position: 'CB', pitchX: 23, pitchY: 60 },
  { position: 'CB', pitchX: 23, pitchY: 40 },
  { position: 'LB', pitchX: 23, pitchY: 20 },
  { position: 'DM', pitchX: 42, pitchY: 50 },
  { position: 'CM', pitchX: 52, pitchY: 34 },
  { position: 'CM', pitchX: 52, pitchY: 66 },
  { position: 'LW', pitchX: 73, pitchY: 22 },
  { position: 'ST', pitchX: 80, pitchY: 50 },
  { position: 'RW', pitchX: 73, pitchY: 78 },
];

// Group pitch slots by broad position so a player lands in a slot matching their real position_group.
const SLOTS_BY_GROUP: Record<string, typeof PITCH_SLOTS> = {
  GK: PITCH_SLOTS.filter(s => s.position === 'GK'),
  DF: PITCH_SLOTS.filter(s => s.position === 'RB' || s.position === 'CB' || s.position === 'LB'),
  MF: PITCH_SLOTS.filter(s => s.position === 'DM' || s.position === 'CM'),
  FW: PITCH_SLOTS.filter(s => s.position === 'LW' || s.position === 'ST' || s.position === 'RW'),
};

const riskGlow:  Record<RiskLevel, string> = { High: '#939A9E', Low: '#1A65D3' };
const riskBg:    Record<RiskLevel, string> = { High: 'rgba(26,101,211,0.06)', Low: 'rgba(26,101,211,0.15)' };
const riskLabel: Record<RiskLevel, string> = { High: 'High Risk', Low: 'Low Risk' };

const riskRgb: Record<RiskLevel, string> = { High: '26,101,211', Low: '26,101,211' };
const riskGlassOpacity: Record<RiskLevel, [number, number, number]> = {
  High: [0.10, 0.06, 0.08],
  Low:  [0.22, 0.14, 0.18],
};

const toX = (px: number) => ((18 + (px / 100) * 764) / 800) * 100;
const toY = (py: number) => ((22 + (py / 100) * 456) / 500) * 100;

// Portrait matrix: matrix(0,-1,1,0,0,800) maps 800×500 landscape coords to 500×800 portrait
// x_new = y_old, y_new = 800 - x_old  →  GK at bottom, strikers at top
const SVG_MATRIX_PORTRAIT = 'matrix(0,-1,1,0,0,800)';

function PlayerNode({ p, onHover, isHovered, isMobile }: { p: PitchPlayer; onHover: (id: number | null) => void; isHovered: boolean; isMobile: boolean }) {
  const glow = riskGlow[p.risk];
  const flipTooltip = isMobile ? p.pitchY > 62 : p.pitchX > 62;

  // Portrait: left ← pitchY (horizontal on pitch), top ← inverted pitchX (depth from GK end)
  const left = isMobile ? `${toY(p.pitchY)}%` : `${toX(p.pitchX)}%`;
  const top  = isMobile ? `${100 - toX(p.pitchX)}%` : `${toY(p.pitchY)}%`;

  return (
    // Centering translate lives on this plain wrapper so framer-motion's scale animation
    // (below) doesn't overwrite it — otherwise every node is pinned by its top-left corner
    // and drifts right + down by half its size.
    <div style={{ position: 'absolute', left, top, transform: 'translate(-50%, -50%)', zIndex: isHovered ? 30 : 10 }}>
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: E, delay: p.id * 0.05 }}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {p.risk === 'High' && (
        <motion.div
          animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1.5px solid ${glow}`, pointerEvents: 'none' }}
        />
      )}

      <motion.div
        animate={isHovered ? { scale: 1.3 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
          width: 42, height: 42, borderRadius: '50%',
          background: riskBg[p.risk],
          border: `2px solid ${glow}`,
          boxShadow: `0 0 ${isHovered ? 22 : 10}px ${glow}55`,
          overflow: 'hidden',
        }}
      >
        <PlayerAvatar name={p.name} size={42} style={{ borderRadius: '50%' }} />
      </motion.div>

      <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center', marginTop: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#F2F2F2', letterSpacing: '0.04em' }}>{p.shortName}</span>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.2, ease: E }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 16px)',
              ...(flipTooltip ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }),
              width: 200, zIndex: 50,
              background: 'rgba(4,4,4,0.97)',
              border: `1px solid ${glow}45`,
              borderRadius: 14, padding: '14px 16px',
              backdropFilter: 'blur(18px)',
              boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 24px ${glow}18`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <PlayerAvatar name={p.name} size={36} style={{ borderRadius: '50%', border: `1px solid ${glow}40`, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#939A9E' }}>
                  <ClubLogo club={p.club.toLowerCase()} size={12} />
                  <span>{p.position} · {p.club} · {p.minutesPlayed}'</span>
                </div>
              </div>
            </div>
            <div style={{ background: riskBg[p.risk], border: `1px solid ${glow}35`, borderRadius: 8, padding: '10px', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: glow, fontWeight: 800, letterSpacing: '0.04em' }}>{riskLabel[p.risk]}</div>
            </div>
            {p.bodyPart !== '—'
              ? <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#939A9E' }}>{p.bodyPart}</span>
                  <span style={{ color: '#939A9E', fontWeight: 600 }}>Est. {p.returnDate}</span>
                </div>
              : <div style={{ fontSize: 11, color: '#1A65D3', fontWeight: 600 }}>Cleared to play</div>
            }
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}

function PlayerCard({ p, rank, onHover, isHovered }: { p: SquadPlayer; rank: number; onHover: (id: number | null) => void; isHovered: boolean }) {
  const glow = riskGlow[p.risk];
  const rgb  = riskRgb[p.risk];
  const [op0, op1, op2] = riskGlassOpacity[p.risk];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: E, delay: rank * 0.05 }}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        position: 'relative',
        background: `linear-gradient(145deg, rgba(${rgb},${op0}) 0%, rgba(${rgb},${op1}) 45%, rgba(${rgb},${op2}) 100%)`,
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: `1px solid rgba(${rgb},${isHovered ? 0.55 : Math.max(op2, 0.18)})`,
        borderTop: `1px solid rgba(${rgb},${isHovered ? 0.80 : Math.max(op0, 0.30)})`,
        borderRadius: 20,
        padding: '20px 16px 18px',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 8,
        overflow: 'hidden',
        boxShadow: isHovered
          ? `0 8px 40px rgba(${rgb},0.40), inset 0 0 0 1px rgba(${rgb},0.30), inset 0 1px 0 rgba(255,255,255,0.25)`
          : `0 4px 24px rgba(${rgb},0.22), inset 0 1px 0 rgba(255,255,255,0.16)`,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)`,
        borderRadius: 20,
      }} />

      <motion.div
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 55% at 50% 0%, rgba(${rgb},0.28), transparent 65%)`,
        }}
      />

      <div style={{ position: 'absolute', top: 11, left: 13, fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.05em' }}>
        #{rank + 1}
      </div>

      <div style={{
        position: 'absolute', top: 10, right: 11,
        fontSize: 7.5, fontWeight: 800, padding: '2px 7px',
        borderRadius: 999,
        background: `${glow}28`,
        border: `1px solid ${glow}55`,
        backdropFilter: 'blur(8px)',
        color: '#F2F2F2',
        letterSpacing: '0.09em', textTransform: 'uppercase',
      }}>{riskLabel[p.risk]}</div>

      <div style={{ position: 'relative', marginTop: 10 }}>
        {p.risk === 'High' && (
          <motion.div
            animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1.5px solid ${glow}`, pointerEvents: 'none' }}
          />
        )}
        <PlayerAvatar name={p.name} size={64} style={{
          borderRadius: '50%',
          border: `2px solid ${glow}80`,
          boxShadow: `0 0 20px ${glow}50, inset 0 1px 0 rgba(255,255,255,0.2)`,
        }} />
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.25, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, justifyContent: 'center' }}>
          <ClubLogo club={p.club.toLowerCase()} size={14} />
          <span style={{ fontSize: 10, color: '#939A9E' }}>{p.club}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          fontSize: 8.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#939A9E',
        }}>{p.position}</span>
        {p.bodyPart !== '—' && (
          <span style={{
            fontSize: 8.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#939A9E',
          }}>{p.bodyPart}</span>
        )}
      </div>

      <div style={{ width: '70%', height: 1, background: `linear-gradient(90deg, transparent, ${glow}60, transparent)`, marginTop: 2 }} />

      <div>
        <div style={{
          fontSize: 19, fontWeight: 900, color: glow,
          lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase',
          textShadow: `0 0 20px ${glow}80`,
        }}>
          {riskLabel[p.risk]}
        </div>
        <div style={{ fontSize: 8, color: '#939A9E', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
          {p.risk === 'High' ? 'Top 15% by model score' : 'Bottom 85% by model score'}
        </div>
      </div>
    </motion.div>
  );
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatMatchDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`;
}

export default function InjuryRiskPage() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [allRows, setAllRows] = useState<InjuryPrediction[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('Arsenal');
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const teamPickerRef = useRef<HTMLDivElement>(null);
  const [dateIdx, setDateIdx] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) {
        setTeamPickerOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    // Fetch every row once (~11k, one per player per match date across the season) and
    // filter client-side per team/date selection.
    injuriesService.getPredictions()
      .then(data => setAllRows(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const allTeams = useMemo(() => [...new Set(allRows.map(r => r.team))].sort(), [allRows]);

  // Reference gameweek calendar: every PL team plays exactly 38 matches, one per gameweek, so
  // whichever team has the most complete date coverage gives a reliable GW1..GW38 sequence.
  // A few teams (e.g. Leicester) have data gaps, so their dates are nearest-matched against
  // this reference instead of trusting their own (incomplete) chronological index.
  const gwReferenceDates = useMemo(() => {
    const byTeam = new Map<string, Set<string>>();
    for (const r of allRows) {
      if (!byTeam.has(r.team)) byTeam.set(r.team, new Set());
      byTeam.get(r.team)!.add(r.match_date);
    }
    let best: string[] = [];
    for (const dates of byTeam.values()) {
      if (dates.size > best.length) best = [...dates].sort();
    }
    return best;
  }, [allRows]);

  const gameweekFor = (date: string): number | null => {
    if (!gwReferenceDates.length || !date) return null;
    const target = new Date(date).getTime();
    let bestIdx = 0, bestDiff = Infinity;
    gwReferenceDates.forEach((d, i) => {
      const diff = Math.abs(new Date(d).getTime() - target);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    return bestIdx + 1;
  };

  // Snapshot dates are scoped to the selected team — different teams' fixtures fall on different
  // exact calendar days (Fri/Sat/Sun/Mon), so the picker only ever shows dates that team actually has.
  const teamDates = useMemo(
    () => [...new Set(allRows.filter(r => r.team === selectedTeam).map(r => r.match_date))].sort(),
    [allRows, selectedTeam]
  );

  useEffect(() => { setDateIdx(0); }, [selectedTeam]);

  const selectedDate = teamDates[dateIdx] ?? '';

  // Matchday squads run 14-16 players but the pitch only has 11 slots. Within each position group,
  // rank by actual minutes played in that specific match — there's no explicit starter flag in the
  // data, but minutes_played_this_match is a direct, real signal (≈90 = started, fewer = came off
  // the bench) rather than an arbitrary cutoff. Top N per group (matching slot capacity) start;
  // the rest are real substitutes for that match, not a display-only split.
  const { startingXI, substitutes } = useMemo(() => {
    const players = allRows.filter(r => r.team === selectedTeam && r.match_date === selectedDate);

    // Unrecognized position_group values (likely an abbreviated raw position code the
    // classifier's substring check didn't catch -- e.g. real wingers/defenders showing as
    // "Unknown") go to a backfill pool instead of being force-defaulted into MF, which would
    // starve the real DF/FW slots. The backfill pool also catches genuine MF overflow, so any
    // empty pitch slot gets the next-highest-minutes real starter regardless of their group.
    const byGroup: Record<string, InjuryPrediction[]> = { GK: [], DF: [], MF: [], FW: [] };
    const unclassified: InjuryPrediction[] = [];
    players.forEach(p => {
      if (p.position_group === 'GK' || p.position_group === 'DF' || p.position_group === 'MF' || p.position_group === 'FW') {
        byGroup[p.position_group].push(p);
      } else {
        unclassified.push(p);
      }
    });

    const xi: PitchPlayer[] = [];
    const overflow: InjuryPrediction[] = [];
    const toBase = (p: InjuryPrediction, group: string, idCounter: number): SquadPlayer => {
      const shortName = p.player_name.split(' ').slice(-1)[0];
      const bodyPart = Number(p.muscle_injury_history) === 1 ? 'Muscle' : Number(p.hamstring_history) === 1 ? 'Hamstring' : '—';
      return {
        id: idCounter, name: p.player_name, shortName, club: p.team,
        position: group, risk: injuriesService.riskLevel(p), rankScore: injuriesService.rankScore(p),
        minutesPlayed: Number(p.minutes_played_this_match) || 0,
        bodyPart, returnDate: '—', imageKey: p.player_name.toLowerCase(),
      };
    };

    let idCounter = 0;
    (['GK', 'DF', 'MF', 'FW'] as const).forEach(group => {
      const sorted = [...byGroup[group]].sort(
        (a, b) => (Number(b.minutes_played_this_match) || 0) - (Number(a.minutes_played_this_match) || 0)
      );
      const slots = SLOTS_BY_GROUP[group];

      sorted.forEach((p, idx) => {
        idCounter++;
        const slot = slots[idx];
        if (slot) {
          xi.push({ ...toBase(p, group, idCounter), position: slot.position, pitchX: slot.pitchX, pitchY: slot.pitchY });
        } else {
          overflow.push(p);
        }
      });
    });

    // Backfill any empty pitch slots (real DF/FW shortfall, or Unknown-tagged real starters)
    // with the highest-minutes remaining players -- never promote someone who didn't actually
    // play, so the pitch shows fewer than 11 only when the team genuinely has that few rows.
    const emptySlots = Object.values(SLOTS_BY_GROUP).flat().length - xi.length;
    const backfillPool = [...unclassified, ...overflow]
      .filter(p => (Number(p.minutes_played_this_match) || 0) > 0)
      .sort((a, b) => (Number(b.minutes_played_this_match) || 0) - (Number(a.minutes_played_this_match) || 0));
    const emptySlotObjs = PITCH_SLOTS.filter(s => !xi.some(x => x.pitchX === s.pitchX && x.pitchY === s.pitchY));

    for (let i = 0; i < Math.min(emptySlots, backfillPool.length); i++) {
      idCounter++;
      const p = backfillPool[i];
      const slot = emptySlotObjs[i];
      xi.push({ ...toBase(p, slot.position, idCounter), position: slot.position, pitchX: slot.pitchX, pitchY: slot.pitchY });
    }

    const usedNames = new Set(xi.map(p => p.name));
    const subs = [...unclassified, ...overflow]
      .filter(p => !usedNames.has(p.player_name))
      .map((p, i) => toBase(p, p.position_group || 'MF', 1000 + i));
    subs.sort((a, b) => b.minutesPlayed - a.minutesPlayed);
    return { startingXI: xi, substitutes: subs };
  }, [allRows, selectedTeam, selectedDate]);

  const allSquadPlayers = [...startingXI, ...substitutes];
  const cardPlayers = [...allSquadPlayers].sort((a, b) => b.rankScore - a.rankScore);
  const highCount   = allSquadPlayers.filter(p => p.risk === 'High').length;
  const lowCount    = allSquadPlayers.filter(p => p.risk === 'Low').length;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={300} label="Injury data" />
    </div>
  );
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#939A9E', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em' }}>Backend offline — start the server to load injury data</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#000000', paddingBottom: 60, overflowX: 'hidden' }}>

      <PageBanner
        eyebrow="Analytics"
        title="Injury"
        titleAccent="Risk"
        description="Real-time squad fitness radar — powered by historical injury patterns and workload data"
        stats={[
          { value: String(highCount), label: 'High Risk' },
          { value: String(lowCount),  label: 'Low Risk' },
          { value: '67%',             label: 'AUC' },
        ]}
        badge="Live Monitoring"
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        <div style={{ marginTop: 28, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Select Team</span>
            <div ref={teamPickerRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={() => setTeamPickerOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,101,211,0.45)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <ClubLogo club={selectedTeam.toLowerCase()} size={20} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#F2F2F2' }}>{selectedTeam}</span>
                <CaretDown size={12} color="#939A9E" style={{ transform: teamPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '200ms' }} />
              </button>

              <AnimatePresence>
                {teamPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: E }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', left: 0,
                      background: 'rgba(12,12,12,0.97)',
                      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 16, padding: 8,
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                      zIndex: 200, maxHeight: 320, overflowY: 'auto',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      minWidth: 220,
                    }}
                  >
                    {allTeams.map(team => {
                      const isActive = team === selectedTeam;
                      return (
                        <button
                          key={team}
                          onClick={() => { setSelectedTeam(team); setTeamPickerOpen(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 10, border: 'none',
                            background: isActive ? 'rgba(26,101,211,0.16)' : 'transparent',
                            color: isActive ? '#1A65D3' : '#F2F2F2',
                            cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 800 : 600,
                            textAlign: 'left', fontFamily: 'inherit', transition: '120ms',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <ClubLogo club={team.toLowerCase()} size={18} />
                          {team}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {teamDates.length > 0 && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Gameweek</span>
              <div ref={datePickerRef} style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,101,211,0.45)', borderRadius: 999, padding: '3px 4px' }}>
                  <button
                    onClick={() => setDateIdx(i => Math.max(0, i - 1))}
                    disabled={dateIdx <= 0}
                    style={{
                      width: 28, height: 28, borderRadius: 999, border: 'none',
                      background: 'transparent', color: dateIdx <= 0 ? 'rgba(255,255,255,0.15)' : '#939A9E',
                      cursor: dateIdx <= 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}
                  >‹</button>

                  <button
                    onClick={() => setDatePickerOpen(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F2F2F2' }}>
                      {selectedDate ? `GW${gameweekFor(selectedDate)} · ${formatMatchDate(selectedDate)}` : '—'}
                    </span>
                    {dateIdx === 0 && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#1A65D3', textTransform: 'uppercase', background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.3)', borderRadius: 999, padding: '1px 6px' }}>Start</span>}
                    {dateIdx === teamDates.length - 1 && teamDates.length > 1 && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#939A9E', textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '1px 6px' }}>Final</span>}
                    <CaretDown size={10} color="rgba(255,255,255,0.3)" style={{ transform: datePickerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '200ms' }} />
                  </button>

                  <button
                    onClick={() => setDateIdx(i => Math.min(teamDates.length - 1, i + 1))}
                    disabled={dateIdx >= teamDates.length - 1}
                    style={{
                      width: 28, height: 28, borderRadius: 999, border: 'none',
                      background: 'transparent', color: dateIdx >= teamDates.length - 1 ? 'rgba(255,255,255,0.15)' : '#939A9E',
                      cursor: dateIdx >= teamDates.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}
                  >›</button>
                </div>

                <AnimatePresence>
                  {datePickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: E }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 10px)', left: 0,
                        background: 'rgba(12,12,12,0.97)',
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16, padding: 8,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                        zIndex: 200, maxHeight: 320, overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        minWidth: 180,
                      }}
                    >
                      {teamDates.map((d, i) => {
                        const isActive = i === dateIdx;
                        return (
                          <button
                            key={d}
                            onClick={() => { setDateIdx(i); setDatePickerOpen(false); }}
                            style={{
                              padding: '8px 12px', borderRadius: 10, border: 'none',
                              background: isActive ? 'rgba(26,101,211,0.16)' : 'transparent',
                              color: isActive ? '#1A65D3' : '#F2F2F2',
                              cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 800 : 600,
                              textAlign: 'left', fontFamily: 'inherit', transition: '120ms',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                          >
                            GW{gameweekFor(d)} · {formatMatchDate(d)}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>

          <div className="injury-section-header" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Formation View</span>
            <div className="injury-divider" style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div className="injury-legend-items" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {(['High', 'Low'] as RiskLevel[]).map(r => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskGlow[r], boxShadow: `0 0 5px ${riskGlow[r]}` }} />
                  <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 600 }}>{riskLabel[r]}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: E }}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: isMobile ? '5 / 8' : '8 / 4',
              borderRadius: 22,
              overflow: 'visible',
              boxShadow: '0 0 0 1px rgba(26,101,211,0.3), 0 24px 80px rgba(0,0,0,0.8), 0 0 120px rgba(26,101,211,0.06)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', pointerEvents: 'none' }}>

              <div style={{ position: 'absolute', inset: 0, background: '#000000' }} />

              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 90% 88% at 50% 50%, transparent 48%, rgba(0,0,0,0.55) 100%)',
              }} />
            </div>

            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              viewBox={isMobile ? '0 0 500 800' : '0 0 800 500'}
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="circleGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* On mobile: matrix(0,-1,1,0,0,800) rotates landscape 800×500 coords to portrait 500×800.
                  GK goal (x≈18) maps to y≈782 (bottom), striker goal (x≈782) maps to y≈18 (top). */}
              <g transform={isMobile ? SVG_MATRIX_PORTRAIT : undefined}>

              <motion.rect
                x="18" y="22" width="764" height="456"
                fill="none" stroke="rgba(255,255,255,0.70)" strokeWidth="2"
                filter="url(#lineGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 1.4, ease: [0.4,0,0.2,1], delay: 0.1 }, opacity: { duration: 0.2, delay: 0.1 } }}
              />

              <motion.line
                x1="400" y1="22" x2="400" y2="478"
                stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.6, ease: 'easeOut', delay: 1.0 }, opacity: { duration: 0.2, delay: 1.0 } }}
              />

              <motion.circle
                cx="400" cy="250" r="74"
                fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"
                filter="url(#circleGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 1.1, ease: 'easeInOut', delay: 1.3 }, opacity: { duration: 0.2, delay: 1.3 } }}
              />

              <motion.circle
                cx="400" cy="250" r="4.5"
                fill="rgba(255,255,255,0.85)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 2.2 }}
              />

              <motion.rect
                x="18" y="113" width="130" height="274"
                fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.8, ease: 'easeOut', delay: 1.6 }, opacity: { duration: 0.2, delay: 1.6 } }}
              />

              <motion.rect
                x="652" y="113" width="130" height="274"
                fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.8, ease: 'easeOut', delay: 1.6 }, opacity: { duration: 0.2, delay: 1.6 } }}
              />

              <motion.rect
                x="18" y="185" width="44" height="130"
                fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.5, ease: 'easeOut', delay: 1.9 }, opacity: { duration: 0.2, delay: 1.9 } }}
              />

              <motion.rect
                x="738" y="185" width="44" height="130"
                fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.5, ease: 'easeOut', delay: 1.9 }, opacity: { duration: 0.2, delay: 1.9 } }}
              />

              <motion.rect
                x="5" y="215" width="15" height="70"
                fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.50)" strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.4, ease: 'easeOut', delay: 2.0 }, opacity: { duration: 0.2, delay: 2.0 } }}
              />

              <motion.rect
                x="780" y="215" width="15" height="70"
                fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.50)" strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.4, ease: 'easeOut', delay: 2.0 }, opacity: { duration: 0.2, delay: 2.0 } }}
              />

              <motion.circle cx="104" cy="250" r="3.5" fill="rgba(255,255,255,0.65)"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 16, delay: 2.1 }}
              />
              <motion.circle cx="696" cy="250" r="3.5" fill="rgba(255,255,255,0.65)"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 16, delay: 2.1 }}
              />

              <motion.path
                d="M 148,205 A 75,75 0 0 1 148,295"
                fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.5, ease: 'easeOut', delay: 2.1 }, opacity: { duration: 0.2, delay: 2.1 } }}
              />

              <motion.path
                d="M 652,205 A 75,75 0 0 0 652,295"
                fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ pathLength: { duration: 0.5, ease: 'easeOut', delay: 2.1 }, opacity: { duration: 0.2, delay: 2.1 } }}
              />

              {[
                "M 18,36 A 14,14 0 0 1 32,22",
                "M 768,22 A 14,14 0 0 1 782,36",
                "M 18,464 A 14,14 0 0 0 32,478",
                "M 768,478 A 14,14 0 0 0 782,464",
              ].map((d, i) => (
                <motion.path key={i} d={d}
                  fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { duration: 0.3, ease: 'easeOut', delay: 2.2 + i * 0.06 }, opacity: { duration: 0.2, delay: 2.2 } }}
                />
              ))}
              </g>
            </svg>

            {startingXI.map(p => (
              <PlayerNode key={p.id} p={p} onHover={setHoveredId} isHovered={hoveredId === p.id} isMobile={isMobile} />
            ))}

            <div style={{
              position: 'absolute', bottom: 14, right: 20,
              fontSize: 9, color: '#939A9E',
              fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>4 · 3 · 3</div>
          </motion.div>

          {substitutes.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
                Substitutes · {substitutes.length}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {substitutes.map(p => {
                  const glow = riskGlow[p.risk];
                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 6px',
                        borderRadius: 999, background: hoveredId === p.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${glow}35`, cursor: 'pointer', transition: '150ms',
                      }}
                    >
                      <PlayerAvatar name={p.name} size={28} style={{ borderRadius: '50%', border: `1.5px solid ${glow}` }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F2F2F2' }}>{p.shortName}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#939A9E' }}>{p.position} · {p.minutesPlayed}'</span>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: glow, flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 36 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Squad Risk Report</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 9, color: '#939A9E', fontWeight: 600 }}>{cardPlayers.length} players</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: 14 }}>
            {cardPlayers.map((p, i) => (
              <PlayerCard
                key={p.id}
                p={p}
                rank={i}
                onHover={setHoveredId}
                isHovered={hoveredId === p.id}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              marginTop: 24,
              background: 'rgba(26,101,211,0.06)',
              border: '1px solid rgba(26,101,211,0.2)',
              borderRadius: 14,
              padding: '16px 24px',
              display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 800, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Squad Overview</span>
            {(['High', 'Low'] as RiskLevel[]).map(r => {
              const count = allSquadPlayers.filter(p => p.risk === r).length;
              return (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: riskGlow[r], boxShadow: `0 0 5px ${riskGlow[r]}` }} />
                  <span style={{ fontSize: 11, color: '#939A9E' }}>{riskLabel[r]}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: riskGlow[r], }}>{count}</span>
                </div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
