import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, X, ArrowRight, Sparkle, User } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import PageBanner from '../../components/dashboard/PageBanner';

const SCOUT_STATS = [
  { value: 532, suffix: '', label: 'Players indexed' },
  { value: 47,  suffix: '', label: 'Scout criteria' },
  { value: 20,  suffix: '', label: 'PL Clubs' },
  { value: 81,  suffix: '%', label: 'Top match rate' },
];
import Flag from '../../components/ui/Flag';
import ClubLogo from '../../components/ui/ClubLogo';
import PlayerAvatar from '../../components/ui/PlayerAvatar';
import { scoutingService, type ScoutPlayer } from '../../services/scouting.service';

const E = [0.16, 1, 0.3, 1] as const;

const QUERIES = [
  'Left-footed CAM, under 24, high xA...',
  'Box-to-box midfielder, strong pressing, Premier League...',
  'Target man, 6ft+, aerial threat, under 28...',
  'Creative fullback, high chance creation, under 26...',
  'Ball-playing centre-back, PL experience...',
];

const POSITION_CHIPS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const ATTRIBUTE_CHIPS = ['High xG', 'High xA', 'Pressing', 'Aerial', 'Pace', 'Dribbling', 'Long Passing'];
const CLUB_CHIPS = ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Tottenham', 'Man United'];

type SearchPlayer = { id: number; name: string; position: string; club: string; age: number; nationality: string; rating: number; xg: number; xa: number; apps: number; xgPer90: number; xaPer90: number; aerial: number; pressing: number; dribbling: number; progPasses: number };

const CLUB_CHIP_MAP: Record<string, string[]> = {
  'Arsenal':   ['Arsenal'],
  'Chelsea':   ['Chelsea'],
  'Liverpool': ['Liverpool'],
  'Man City':  ['Manchester City'],
  'Tottenham': ['Tottenham Hotspur', 'Tottenham'],
  'Man United':['Manchester Utd', 'Manchester United'],
};

function posChipMatches(chip: string, fbrefPos: string): boolean {
  if (chip === 'GK') return fbrefPos.includes('GK');
  if (['CB', 'LB', 'RB'].includes(chip)) return fbrefPos.includes('DF');
  if (['DM', 'CM', 'CAM'].includes(chip)) return fbrefPos.includes('MF');
  if (['LW', 'RW', 'ST'].includes(chip)) return fbrefPos.includes('FW');
  return false;
}

function mapScoutPlayer(p: ScoutPlayer, idx: number): SearchPlayer {
  const apps = Math.max(1, p['90s'] ?? 1);
  const xg = parseFloat((p.xG ?? 0).toString());
  const xa = parseFloat((p.xAG ?? 0).toString());
  return {
    id: idx + 1,
    name: p.Player ?? p.player_squad?.split('_')[0] ?? '—',
    position: p.Pos ?? '—',
    club: p.Squad ?? '—',
    age: p.Age ?? 0,
    nationality: p.citizenship ?? p.nationality ?? '—',
    rating: parseFloat(scoutingService.rating(p).toFixed(1)),
    xg, xa,
    apps: Math.round(p['90s'] ?? 0),
    xgPer90: parseFloat((xg / apps).toFixed(3)),
    xaPer90: parseFloat((xa / apps).toFixed(3)),
    aerial:     p.aerial_won_per90 ?? 0,
    pressing:   p.tackles_per90 ?? 0,
    dribbling:  p.prog_carries_per90 ?? 0,
    progPasses: p.prog_passes_per90 ?? 0,
  };
}

function useTypewriter(phrases: string[], speed = 55) {
  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx]     = useState(0);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplayed(current.slice(0, charIdx + 1));
        if (charIdx + 1 === current.length) {
          setTimeout(() => setDeleting(true), 1800);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setDisplayed(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setPhraseIdx(i => (i + 1) % phrases.length);
          setCharIdx(0);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, deleting ? speed / 2.5 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, phraseIdx, phrases, speed]);

  return displayed;
}

function PlayerResultCard({ player, index }: { player: SearchPlayer; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
      transition={{ duration: 0.5, ease: E, delay: index * 0.07 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface-card)',
        border: `1px solid ${hovered ? 'rgba(26,101,211,0.4)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 18, padding: '20px 22px',
        transition: 'border-color 200ms ease',
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {hovered && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #1A65D3, #1A65D3)', borderRadius: '18px 18px 0 0' }}
        />
      )}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <PlayerAvatar name={player.name} size={48} style={{ borderRadius: 14, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F2F2F2' }}>{player.name}</span>
            <span style={{ background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.3)', color: '#1A65D3', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{player.position}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClubLogo club={player.club} size={14} />
            <span style={{ fontSize: 11, color: '#939A9E' }}>{player.club}</span>
            <span style={{ fontSize: 11, color: '#939A9E' }}>·</span>
            <Flag nationality={player.nationality} size={12} className="inline" />
            <span style={{ fontSize: 11, color: '#939A9E' }}>Age {player.age}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F2F2F2', lineHeight: 1 }}>{player.rating.toFixed(1)}</div>
          <div style={{ fontSize: 9, color: '#939A9E', marginTop: 2, letterSpacing: '0.08em' }}>RATING</div>
        </div>
      </div>
      <div className="layout-stat-4-sm">
        {[
          { label: 'xG/90', value: player.xg.toFixed(2) },
          { label: 'xA/90', value: player.xa.toFixed(2) },
          { label: 'Apps',  value: String(player.apps) },
          { label: 'Match', value: `${Math.round(player.rating * 11.4)}%` },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#F2F2F2', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#939A9E', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PlayerHistoryCard({ player, index }: { player: SearchPlayer; index: number }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const profilePath = (() => {
    const n = player.name.toLowerCase();
    if (n.includes('haaland')) return '/player-profile/haaland';
    if (n.includes('saka'))    return '/player-profile/saka';
    return '/player-profile';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: E, delay: index * 0.06 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface-card)',
        border: `1px solid ${hovered ? 'rgba(26,101,211,0.4)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16, padding: '16px 18px',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(26,101,211,0.08)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {hovered && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #1A65D3, #1A65D3)', borderRadius: '16px 16px 0 0' }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PlayerAvatar name={player.name} size={44} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</span>
            <span style={{ background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.3)', color: '#1A65D3', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>{player.position}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ClubLogo club={player.club} size={12} />
            <span style={{ fontSize: 11, color: '#939A9E' }}>{player.club}</span>
            <span style={{ fontSize: 11, color: '#939A9E' }}>·</span>
            <Flag nationality={player.nationality} size={11} className="inline" />
            <span style={{ fontSize: 11, color: '#939A9E' }}>Age {player.age}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#F2F2F2', lineHeight: 1 }}>{player.rating.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: '#939A9E', marginTop: 2, letterSpacing: '0.06em' }}>RATING</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => navigate(profilePath)}
            className="scout-profile-btn"
            style={{
              background: hovered ? '#ffffff' : 'transparent',
              border: `1px solid ${hovered ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
              color: hovered ? '#000000' : 'rgba(255,255,255,0.5)',
              borderRadius: 999, padding: '7px 14px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <User size={12} />
            <span className="scout-profile-btn__label">Player Profile</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ScoutSearchPage() {
  const [query, setQuery]           = useState('');
  const [activePos, setActivePos]   = useState<string | null>(null);
  const [activeAttr, setActiveAttr] = useState<string[]>([]);
  const [activeClub, setActiveClub] = useState<string | null>(null);
  const [searched, setSearched]     = useState(false);
  const [allPlayers, setAllPlayers] = useState<SearchPlayer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = useTypewriter(QUERIES);

  useEffect(() => {
    scoutingService.getCurrent({ limit: 500 })
      .then(data => setAllPlayers(data.map(mapScoutPlayer)))
      .catch(() => {});
  }, []);

  const hasFilters = !!query || !!activePos || activeAttr.length > 0 || !!activeClub;

  const filteredPlayers = searched
    ? allPlayers.filter(p => {
        if (activePos && !posChipMatches(activePos, p.position)) return false;
        if (activeClub) {
          const allowed = CLUB_CHIP_MAP[activeClub] ?? [activeClub];
          if (!allowed.includes(p.club)) return false;
        }
        if (activeAttr.includes('High xG')     && p.xgPer90 < 0.12) return false;
        if (activeAttr.includes('High xA')     && p.xaPer90 < 0.10) return false;
        if (activeAttr.includes('Aerial')      && p.aerial < 2.0) return false;
        if (activeAttr.includes('Pressing')    && p.pressing < 2.5) return false;
        if (activeAttr.includes('Dribbling')   && p.dribbling < 1.5) return false;
        if (activeAttr.includes('Long Passing')&& p.progPasses < 3.0) return false;
        if (query) {
          const q = query.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q) || p.club.toLowerCase().includes(q) || p.nationality.toLowerCase().includes(q);
        }
        return true;
      })
    : [];

  function handleSearch() {
    if (hasFilters || query.length > 1) setSearched(true);
  }

  function clearAll() {
    setQuery(''); setActivePos(null); setActiveAttr([]); setActiveClub(null); setSearched(false);
  }

  function toggleAttr(a: string) {
    setActiveAttr(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Scouting"
        title="Scout"
        titleAccent="Search"
        description="Natural language player discovery — describe what you need, AI finds the match"
        stats={[
          { value: '500+', label: 'Players' },
          { value: '20',   label: 'PL Clubs' },
          { value: 'Live', label: 'Data' },
        ]}
        badge="AI Powered"
      />


      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 60px' }}>

        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: E }}
          style={{ marginBottom: 28 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 999, padding: '14px 20px',
            boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
          onFocus={() => {}}
          >
            <MagnifyingGlass size={20} style={{ color: '#1A65D3', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={placeholder}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: '#F2F2F2', fontFamily: 'inherit',
              }}
            />
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                onClick={() => setQuery('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', flexShrink: 0, padding: 4 }}
              >
                <X size={16} />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSearch}
              style={{
                background: '#1A65D3', color: '#F2F2F2',
                border: 'none', borderRadius: 999, padding: '8px 20px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >
              Search <ArrowRight size={13} />
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: E, delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}
        >
          <div>
            <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Position</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {POSITION_CHIPS.map(p => (
                <motion.button
                  key={p} whileTap={{ scale: 0.94 }}
                  onClick={() => setActivePos(activePos === p ? null : p)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, border: `1px solid ${activePos === p ? '#1A65D3' : 'rgba(255,255,255,0.1)'}`,
                    background: activePos === p ? 'rgba(26,101,211,0.18)' : 'transparent',
                    color: activePos === p ? '#1A65D3' : '#939A9E',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 150ms ease',
                  }}
                >{p}</motion.button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Attributes</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ATTRIBUTE_CHIPS.map(a => {
                const on = activeAttr.includes(a);
                return (
                  <motion.button
                    key={a} whileTap={{ scale: 0.94 }}
                    onClick={() => toggleAttr(a)}
                    style={{
                      padding: '6px 14px', borderRadius: 999,
                      border: `1px solid ${on ? '#1A65D3' : 'rgba(255,255,255,0.1)'}`,
                      background: on ? 'rgba(26,101,211,0.12)' : 'transparent',
                      color: on ? '#1A65D3' : '#939A9E',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 150ms ease',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {on && <Sparkle size={10} weight="fill" />}
                    {a}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Club</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CLUB_CHIPS.map(c => (
                <motion.button
                  key={c} whileTap={{ scale: 0.94 }}
                  onClick={() => setActiveClub(activeClub === c ? null : c)}
                  style={{
                    padding: '5px 12px', borderRadius: 999,
                    border: `1px solid ${activeClub === c ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    background: activeClub === c ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: activeClub === c ? '#F2F2F2' : '#939A9E',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 150ms ease',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <ClubLogo club={c} size={14} />
                  {c}
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {hasFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontSize: 11, color: '#939A9E' }}>
                  {[activePos, activeClub, ...activeAttr].filter(Boolean).join(' · ') || 'Custom query'}
                </span>
                <button onClick={clearAll} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: '#939A9E', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X size={12} /> Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait">
          {searched ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#939A9E', fontWeight: 600 }}>
                  <span style={{ color: '#F2F2F2', fontWeight: 800 }}>{filteredPlayers.length}</span> players matched
                </p>
              </div>
              {filteredPlayers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: '60px 24px', color: '#939A9E' }}
                >
                  <MagnifyingGlass size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ fontSize: 14, marginBottom: 6 }}>No players matched</p>
                  <p style={{ fontSize: 12 }}>Try adjusting your filters or search query</p>
                </motion.div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))', gap: 14 }}>
                  <AnimatePresence>
                    {filteredPlayers.map((p, i) => <PlayerResultCard key={p.id} player={p} index={i} />)}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: E, delay: 0.3 }}
          style={{ marginTop: 48 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>Players</p>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allPlayers.slice(0, 6).map((p, i) => (
              <PlayerHistoryCard key={p.id} player={p} index={i} />
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
