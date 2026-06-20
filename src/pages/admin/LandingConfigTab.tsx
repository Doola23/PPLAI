import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { injuriesService, type InjuryPrediction } from '../../services/injuries.service';
import { playerStatsService, type PlayerStat } from '../../services/playerStats.service';
import { scoutingService, type ScoutPlayer } from '../../services/scouting.service';
import { matchesService, type MatchPrediction, type StandingsRow } from '../../services/matches.service';

const E = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = 'plai_landing_config';

export interface LandingConfig {
  matchTeams: string[];       // home team names (auto-pair with next fixture)
  injuryPlayers: string[];    // player_name values
  analyticsPlayer: string;    // player name
  scoutPlayers: string[];     // Player names
  tableTeams: string[];       // Team names (top 5 to show)
}

const DEFAULT_CONFIG: LandingConfig = {
  matchTeams: [],
  injuryPlayers: [],
  analyticsPlayer: '',
  scoutPlayers: [],
  tableTeams: [],
};

export function loadLandingConfig(): LandingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveLandingConfig(cfg: LandingConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function PillPicker({
  label, options, selected, onToggle, max, displayKey,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  max: number;
  displayKey?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase())).slice(0, 60);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#939A9E' }}>{selected.length}/{max} selected</span>
      </div>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {selected.map(v => (
            <motion.button
              key={v}
              onClick={() => onToggle(v)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: '#1A65D3', border: '1px solid #1A65D3', color: '#F2F2F2', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {v}
              <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.7 }}>×</span>
            </motion.button>
          ))}
        </div>
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#F2F2F2', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
      />

      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filtered.map(v => {
          const on = selected.includes(v);
          const disabled = !on && selected.length >= max;
          return (
            <button
              key={v}
              disabled={disabled}
              onClick={() => onToggle(v)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                background: on ? 'rgba(26,101,211,0.15)' : 'rgba(255,255,255,0.04)',
                border: on ? '1px solid rgba(26,101,211,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: on ? '#1A65D3' : disabled ? '#444' : '#939A9E',
                transition: 'all 150ms',
              }}
            >
              {v}
            </button>
          );
        })}
        {filtered.length === 0 && <span style={{ fontSize: 11, color: '#939A9E' }}>No results</span>}
      </div>
    </div>
  );
}

function SinglePicker({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect: (v: string) => void }) {
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase())).slice(0, 60);

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{label}</span>
        {selected && (
          <motion.button onClick={() => onSelect('')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '4px 12px', borderRadius: 999, background: '#1A65D3', border: 'none', color: '#F2F2F2', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {selected} ×
          </motion.button>
        )}
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#F2F2F2', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
      />
      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filtered.map(v => {
          const on = selected === v;
          return (
            <button key={v} onClick={() => onSelect(v)}
              style={{ padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: on ? 'rgba(26,101,211,0.15)' : 'rgba(255,255,255,0.04)', border: on ? '1px solid rgba(26,101,211,0.5)' : '1px solid rgba(255,255,255,0.08)', color: on ? '#1A65D3' : '#939A9E', transition: 'all 150ms' }}>
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1A65D3', background: 'rgba(26,101,211,0.12)', border: '1px solid rgba(26,101,211,0.25)', padding: '3px 10px', borderRadius: 999 }}>{badge}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function LandingConfigTab() {
  const [config, setConfig] = useState<LandingConfig>(loadLandingConfig);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [matchOptions, setMatchOptions]     = useState<string[]>([]);
  const [injuryOptions, setInjuryOptions]   = useState<string[]>([]);
  const [playerOptions, setPlayerOptions]   = useState<string[]>([]);
  const [scoutOptions, setScoutOptions]     = useState<string[]>([]);
  const [tableOptions, setTableOptions]     = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    const all = [
      matchesService.getAllPredictions().then((d: MatchPrediction[]) => {
        const teams = [...new Set(d.flatMap(m => [m.home_team, m.away_team]))].sort();
        setMatchOptions(teams);
      }),
      injuriesService.getPredictions().then((d: InjuryPrediction[]) => {
        setInjuryOptions([...new Set(d.map(p => p.player_name))].sort());
      }),
      playerStatsService.getAll({ limit: 500 }).then((d: PlayerStat[]) => {
        setPlayerOptions([...new Set(d.map(p => p.player))].sort());
      }),
      scoutingService.getCurrent({ limit: 200 }).then((d: ScoutPlayer[]) => {
        setScoutOptions([...new Set(d.map(p => p.Player))].sort());
      }),
      matchesService.getPredictedStandings().then((d: StandingsRow[]) => {
        setTableOptions(d.map(r => r.Team));
      }),
    ];
    Promise.allSettled(all).finally(() => setLoading(false));
  }, []);

  function update<K extends keyof LandingConfig>(key: K, val: LandingConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: val }));
  }

  function toggleList(key: keyof LandingConfig, val: string, max: number) {
    setConfig(prev => {
      const arr = prev[key] as string[];
      const next = arr.includes(val) ? arr.filter(v => v !== val) : arr.length < max ? [...arr, val] : arr;
      return { ...prev, [key]: next };
    });
  }

  function handleSave() {
    saveLandingConfig(config);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2500);
    window.dispatchEvent(new CustomEvent('plai:landing-config-updated'));
  }

  function handleReset() {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('plai:landing-config-updated'));
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #1A65D3', borderRadius: '50%', margin: '0 auto 12px' }} />
          <span style={{ fontSize: 12, color: '#939A9E' }}>Loading player data…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F2F2F2', margin: '0 0 6px' }}>Landing Page Preview Config</h2>
          <p style={{ fontSize: 12, color: '#939A9E', margin: 0 }}>Choose exactly which players and teams appear in each feature preview on the homepage. Leave blank to auto-select from API.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleReset}
            style={{ padding: '9px 18px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#939A9E', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Reset
          </button>
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 22px', borderRadius: 999, background: '#1A65D3', border: 'none', color: '#F2F2F2', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', minWidth: 90 }}>
            <AnimatePresence mode="wait">
              {saved
                ? <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Saved ✓</motion.span>
                : <motion.span key="save" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Save</motion.span>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <Section title="Match Predictions" badge="01">
        <p style={{ fontSize: 11, color: '#939A9E', margin: '0 0 14px', lineHeight: 1.6 }}>Pick up to 3 teams. The preview will show their next available fixture from the API.</p>
        <PillPicker label="Teams" options={matchOptions} selected={config.matchTeams} onToggle={v => toggleList('matchTeams', v, 3)} max={3} />
      </Section>

      <Section title="Injury Risk" badge="02">
        <p style={{ fontSize: 11, color: '#939A9E', margin: '0 0 14px', lineHeight: 1.6 }}>Pick up to 4 players to show in the injury risk preview.</p>
        <PillPicker label="Players" options={injuryOptions} selected={config.injuryPlayers} onToggle={v => toggleList('injuryPlayers', v, 4)} max={4} />
      </Section>

      <Section title="Player Analytics" badge="03">
        <p style={{ fontSize: 11, color: '#939A9E', margin: '0 0 14px', lineHeight: 1.6 }}>Pick 1 player to feature in the analytics deep-dive preview.</p>
        <SinglePicker label="Player" options={playerOptions} selected={config.analyticsPlayer} onSelect={v => update('analyticsPlayer', v)} />
      </Section>

      <Section title="Scout Search" badge="04">
        <p style={{ fontSize: 11, color: '#939A9E', margin: '0 0 14px', lineHeight: 1.6 }}>Pick up to 3 players to show as scouting candidates.</p>
        <PillPicker label="Players" options={scoutOptions} selected={config.scoutPlayers} onToggle={v => toggleList('scoutPlayers', v, 3)} max={3} />
      </Section>

      <Section title="Table Predictions" badge="05">
        <p style={{ fontSize: 11, color: '#939A9E', margin: '0 0 14px', lineHeight: 1.6 }}>Pick exactly 5 teams to show in the predicted standings (in the order shown).</p>
        <PillPicker label="Teams" options={tableOptions} selected={config.tableTeams} onToggle={v => toggleList('tableTeams', v, 5)} max={5} />
      </Section>
    </div>
  );
}
