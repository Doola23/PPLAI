import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Status = 'live' | 'beta' | 'soon' | 'future';

const ITEMS: { label: string; desc: string; status: Status }[] = [
  { label: 'Match Predictions',   desc: 'Win / draw / loss probabilities with lineup data.',  status: 'live'   },
  { label: 'Injury Risk Engine',  desc: 'Load-based fatigue flags before they happen.',        status: 'live'   },
  { label: 'Player Analytics',    desc: 'xG, xA, heatmaps across the Premier League.',                status: 'live'   },
  { label: 'Scout Search',        desc: 'Filter 62K+ players by fit score.',                  status: 'live'   },
  { label: 'Table Predictions',   desc: 'Monte Carlo simulations — title odds, relegation.', status: 'live'   },
  { label: 'Scout Reports',       desc: 'AI-written PDF reports per player.',                 status: 'beta'   },
  { label: 'Real-time Match Feed',desc: 'In-game probability shifts as they happen.',         status: 'soon'   },
  { label: 'Team Collaboration',  desc: 'Shared dashboards and analyst handoffs.',            status: 'soon'   },
  { label: 'API Access',          desc: 'Direct data feed for club BI infrastructure.',       status: 'future' },
  { label: 'Video Intelligence',  desc: 'Frame-level event detection tied to match data.',    status: 'future' },
];

const META: Record<Status, { label: string; color: string; bg: string }> = {
  live:   { label: 'Live',        color: '#1A65D3', bg: 'rgba(26,101,211,0.1)'  },
  beta:   { label: 'Beta',        color: '#1A65D3', bg: 'rgba(26,101,211,0.1)'  },
  soon:   { label: 'Coming soon', color: '#1A65D3', bg: 'rgba(26,101,211,0.1)'  },
  future: { label: 'Planned',     color: '#939A9E', bg: 'rgba(147,154,158,0.15)'   },
};

const FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'all',    label: 'All'         },
  { key: 'live',   label: 'Live'        },
  { key: 'beta',   label: 'Beta'        },
  { key: 'soon',   label: 'Coming soon' },
  { key: 'future', label: 'Planned'     },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function RoadmapSection() {
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const visible = filter === 'all' ? ITEMS : ITEMS.filter(i => i.status === filter);

  return (
    <section className="lmap-v2" id="roadmap">

      <motion.div
        className="lmap-v2__head"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.68, ease: EASE }}
        viewport={{ once: true, amount: 0.4 }}
      >
        <span className="eyebrow" style={{ justifyContent: 'center' }}>Roadmap</span>
        <h2 className="lmap-v2__title">
          What's live. What's next.<br />
          <span className="lmap-v2__title-muted">Where PLAI is going.</span>
        </h2>
      </motion.div>

      <motion.div
        className="lmap-v2__filters"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        viewport={{ once: true }}
      >
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`lmap-v2__pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.key !== 'all' && (
              <span className="lmap-v2__pill-dot" style={{ background: META[f.key as Status].color }} />
            )}
            {f.label}
          </button>
        ))}
      </motion.div>

      <div className="lmap-v2__grid">
        <AnimatePresence mode="popLayout">
          {visible.map((item, i) => {
            const m = META[item.status];
            return (
              <motion.div
                key={item.label}
                className="lmap-v2__item"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.38, ease: EASE, delay: i * 0.04 }}
              >
                <div className="lmap-v2__item-top">
                  <span
                    className="lmap-v2__badge"
                    style={{ color: m.color, background: m.bg }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />
                    {m.label}
                  </span>
                </div>
                <div className="lmap-v2__item-bar" style={{ background: m.color }} />
                <h3 className="lmap-v2__item-title">{item.label}</h3>
                <p className="lmap-v2__item-desc">{item.desc}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </section>
  );
}
