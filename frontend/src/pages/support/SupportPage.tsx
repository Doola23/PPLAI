import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Activity, Users, BarChart3,
  CreditCard, Code2, ChevronDown, Mail, MessageSquare,
  ArrowRight, BookOpen, Globe, X,
} from 'lucide-react';
import Navbar from '../../components/landing/Navbar';

const E = [0.16, 1, 0.3, 1] as const;
const SUPPORT_EMAIL = 'support@plai.io';

type CatKey = 'match' | 'injury' | 'scout' | 'projections' | 'billing' | 'api';

const CATEGORIES: { key: CatKey; icon: typeof TrendingUp; title: string; desc: string }[] = [
  {
    key: 'match',
    icon: TrendingUp,
    title: 'Match Predictions',
    desc: 'Win/draw/loss probabilities and Monte Carlo season standings.',
  },
  {
    key: 'injury',
    icon: Activity,
    title: 'Injury Risk',
    desc: 'Workload, age and history-based High/Low risk tiers.',
  },
  {
    key: 'scout',
    icon: Search,
    title: 'Scout Search',
    desc: 'Filtering 2,168 players by position, age, budget and tactical fit.',
  },
  {
    key: 'projections',
    icon: BarChart3,
    title: 'Player Projections',
    desc: 'Next-season forecasts for goals, assists, xG and more, with a trend per player.',
  },
  {
    key: 'billing',
    icon: CreditCard,
    title: 'Account & Billing',
    desc: 'Subscriptions, seats and access across Standard, Plus and Ultra.',
  },
  {
    key: 'api',
    icon: Code2,
    title: 'API & Integrations',
    desc: 'Data access and club BI infrastructure on the Ultra plan.',
  },
];

const FAQS: { cat: CatKey; q: string; a: string }[] = [
  {
    cat: 'match',
    q: 'What are Match Predictions?',
    a: 'Match Predictions give each fixture a win, draw and loss probability for the two teams, from a model trained on years of results, form and team strength. They tell you who the model favours — and by how much — before a ball is kicked, and feed the simulated season standings.',
  },
  {
    cat: 'match',
    q: 'How accurate are the match predictions?',
    a: 'Validated with walk-forward cross-validation across three full Premier League seasons (2022-24): 53.4% average test accuracy, with the strongest of the three seasons reaching 58.1%. Predictions are generated from the latest available season data — there is no live, real-time update feed yet.',
  },
  {
    cat: 'match',
    q: 'How are the season standings predicted?',
    a: 'The full table is produced by running 2,000 Monte Carlo simulations of the remaining fixtures from the match model’s win/draw/loss probabilities, then averaging each team’s finishing position, points, top-four chance and relegation chance across all runs.',
  },
  {
    cat: 'match',
    q: 'Can I see the predicted result of a specific match?',
    a: 'Yes. Open Match Predictions and pick a fixture to see the home win, draw and away win percentages for that game, so you can see who the model favours before kick-off.',
  },
  {
    cat: 'match',
    q: 'Does it factor in recent form or winning streaks?',
    a: 'Yes. The model leans on each team’s recent results and scoring trends, so a side on a strong run will generally get a better probability than one whose form has dipped.',
  },
  {
    cat: 'match',
    q: 'Does it account for derbies or rivalry matches?',
    a: 'The model treats every fixture the same way — by the two teams’ underlying strength and form — rather than adding a special “derby” boost. Rivalry upsets can still happen on the day, which is why even a clear favourite is never shown at 100%.',
  },
  {
    cat: 'match',
    q: 'Does it predict draws, or just winners?',
    a: 'It predicts all three outcomes — home win, draw and away win — each with its own percentage. Tight, evenly-matched games will show a high draw chance rather than being forced toward one winner.',
  },
  {
    cat: 'injury',
    q: 'What is the Injury Risk feature?',
    a: 'Injury Risk flags how likely a player is to pick up an injury, shown as a simple High or Low tier. It’s built from a player’s workload, age and injury history, so you can spot who is carrying more risk when planning a squad, a rotation or a transfer.',
  },
  {
    cat: 'injury',
    q: 'How does the injury risk model work, and how accurate is it?',
    a: 'The model scores AUC 0.672 with 69.3% sensitivity on held-out data, using workload, age, and injury-history features. It does not currently use GPS or biomechanical tracking data — that is a real ceiling on accuracy without richer inputs. Risk is shown as a validated binary High/Low tier, not a precise percentage.',
  },
  {
    cat: 'injury',
    q: 'Does a High risk flag mean a player will definitely get injured?',
    a: 'No. A High flag means the player sits in the higher-risk group based on workload, age and injury history — it raises the odds, not a certainty. Plenty of High-risk players stay fit, and Low-risk players can still pick up knocks.',
  },
  {
    cat: 'injury',
    q: 'Why do some players show higher risk than others?',
    a: 'Risk goes up mainly with heavier recent workload, older age, and a longer record of past injuries. A young player who rarely gets hurt and plays manageable minutes will usually land in the Low tier.',
  },
  {
    cat: 'injury',
    q: 'Are older players always flagged as higher risk?',
    a: 'Not automatically. Age does push risk up, but it is only one factor — an older player with a light workload and a clean injury record can still come out as Low, while a young player with a heavy schedule and past injuries can read High.',
  },
  {
    cat: 'injury',
    q: 'Does coming back from a long injury raise the risk?',
    a: 'Yes. A heavier injury history — more past injuries and more days missed — is one of the model’s main signals, so a player returning from a long lay-off will generally show a higher risk than one with no record of problems.',
  },
  {
    cat: 'injury',
    q: 'Why is a young, fit-looking player still flagged High?',
    a: 'Usually because of workload or history rather than age. Heavy recent minutes, a packed run of games, or earlier injuries can all push a young player into the High tier even if they look fit right now — it is a caution flag, not a diagnosis.',
  },
  {
    cat: 'injury',
    q: 'Does the risk change as the season goes on?',
    a: 'It reflects whatever the latest data shows, so as a player’s minutes pile up or new injuries are recorded, their tier can move. The risk is a snapshot of current load and history, not a fixed label for the whole season.',
  },
  {
    cat: 'scout',
    q: 'What is Scout Search?',
    a: 'Scout Search is a player-finding tool that filters 2,168 players across five leagues by position, age, budget, foot and playing style, then ranks them on how well they fit your exact brief — so you can build a shortlist of realistic targets instead of searching by name.',
  },
  {
    cat: 'scout',
    q: 'How does Scout Search rank players against my filters?',
    a: 'Each filtered attribute is converted to a z-score against the player’s positional peer group, scaled to a 0–100 fit and weighted by the priority you set (Required, High, Medium, Low). The match score is the weighted average across your chosen attributes — so a player is ranked on fit to your exact brief, not a single global rating.',
  },
  {
    cat: 'scout',
    q: 'Can I search for a left-footed winger or a specific type of player?',
    a: 'Yes. You can filter by position and preferred foot and weight attributes like dribbling, creativity or finishing, so you can target a very specific profile — for example a left-footed right winger who beats his man and creates chances — rather than just browsing by name.',
  },
  {
    cat: 'scout',
    q: 'Can I find players from a specific league or country?',
    a: 'Yes. Players span five leagues — Premier League, Serie A, La Liga, Bundesliga and Ligue 1 — and you can narrow your search to focus on the players that fit your brief.',
  },
  {
    cat: 'scout',
    q: 'Can I find a cheaper alternative to an expensive player?',
    a: 'Yes. Set a market-value or budget filter and search for the profile you want, and Scout Search surfaces players who fit a similar style within your price range — a practical way to find value alternatives to a target you can’t afford.',
  },
  {
    cat: 'scout',
    q: 'Does it show how a player ranks against others in his position?',
    a: 'Yes. Each player’s report shows his key stats as percentile ranks against positional peers, so you can instantly see where he sits versus other players in the same role rather than judging raw numbers in isolation.',
  },
  {
    cat: 'scout',
    q: 'Can I save or revisit my shortlist later?',
    a: 'Yes. You can shortlist the players you like and review them together on the Scout Results page, so you can build and come back to a shortlist instead of starting your search from scratch each time.',
  },
  {
    cat: 'projections',
    q: 'What are Player Projections?',
    a: 'Player Projections forecast how each player is expected to perform in the upcoming 2025-26 season — predicted goals, assists, xG, shots, plus passing and defensive numbers — based on recent output, age and role, each with a low and high estimate and a short trend note explaining the direction.',
  },
  {
    cat: 'projections',
    q: 'Does it separate a player’s real growth from just playing more minutes?',
    a: 'Yes. The model projects expected minutes alongside the season totals, so you can tell whether a jump in goals or assists comes from genuine per-game improvement or simply from playing more football — and the trend note flags which of the two is driving the change.',
  },
  {
    cat: 'projections',
    q: 'How does it handle a player coming back from a long injury layoff?',
    a: 'It leans on recent output and expected availability, so a player returning from a long layoff — with reduced recent minutes — is usually projected more cautiously, with a lower expected total and a wider low estimate to reflect the uncertainty around his return.',
  },
  {
    cat: 'projections',
    q: 'Can it tell if a player overperformed and is due to come back down to earth?',
    a: 'To a degree, yes. Because it tracks xG alongside actual goals, a player who scored well above his underlying numbers tends to be projected back toward his xG rather than repeating an unsustainable haul — so a lucky season isn’t simply assumed to happen again.',
  },
  {
    cat: 'projections',
    q: 'Does a striker’s projection depend on the chances his team creates?',
    a: 'Indirectly. The projection is built mainly from the player’s own recent output and role, and that output already reflects the service he’s been getting. It doesn’t separately re-model a big swing in team quality, so a major change in how many chances his side creates won’t be fully captured on its own.',
  },
  {
    cat: 'projections',
    q: 'How wide is the gap between the low and high estimate, and what drives it?',
    a: 'The gap is the model’s uncertainty band. It widens for players with volatile recent output, uncertain minutes, or at a career stage where change is likely, and narrows for steady, established players — so a wide range is a signal to treat the single number with more caution.',
  },
  {
    cat: 'projections',
    q: 'Why is a consistent player projected more confidently than a streaky one?',
    a: 'A player who posts similar numbers year to year gives the model a stable signal, so his low and high estimates sit close together. A streaky player’s swings widen that range, because the data itself is telling the model the outcome is genuinely harder to pin down.',
  },
  {
    cat: 'projections',
    q: 'Can it flag a player whose output is likely to drop off with age?',
    a: 'Yes. Age is a core input, so players entering their decline years are projected to taper rather than hold their peak, and the trend note calls out a likely downturn. It signals a gradual decline in the direction of travel rather than predicting an exact cliff-edge season.',
  },
  {
    cat: 'projections',
    q: 'How does it weigh one great season against a longer track record?',
    a: 'It leans on recent form but doesn’t take a single standout season at face value. A career-best year is tempered toward the player’s broader body of work, so a one-off spike is projected to settle rather than simply repeat at the same level.',
  },
  {
    cat: 'projections',
    q: 'What leagues and players does PLAI cover?',
    a: 'Five leagues today: Premier League, Serie A, La Liga, Bundesliga and Ligue 1 — 2,168 tracked players across all five, not a Premier-League-only product with others in beta.',
  },
  {
    cat: 'projections',
    q: 'Which metrics are available per player?',
    a: 'Per-90 attacking and defensive output (goals, assists, xG, xA, npxG, shots, SCA/GCA, tackles, interceptions, progressive carries and passes, take-ons, aerials and pass completion), each shown as a raw value and as a percentile rank against positional peers.',
  },
  {
    cat: 'billing',
    q: 'What does Account & Billing cover?',
    a: 'Account & Billing covers your subscription, payment and access — choosing between the Standard, Plus and Ultra plans, how many seats each includes, and managing the staff who can log in under your club’s account.',
  },
  {
    cat: 'billing',
    q: 'How many user seats are included per subscription?',
    a: 'Standard and Plus are single-seat plans. Ultra includes 5-seat team collaboration, for clubs that need multiple staff accessing the platform under one subscription.',
  },
  {
    cat: 'billing',
    q: 'Is there an onboarding service for new clubs?',
    a: 'Reach out to the team directly to discuss onboarding for your club — this is handled case by case rather than through a fixed, automated process right now.',
  },
  {
    cat: 'api',
    q: 'What are the API & Integrations options?',
    a: 'API & Integrations covers getting PLAI’s data into your own systems — direct data access and club BI setup, offered on the Ultra plan and scoped per club rather than as a self-serve public API.',
  },
  {
    cat: 'api',
    q: 'Is there an API or direct data feed?',
    a: 'Direct data access and integrations are part of the Ultra plan and are scoped per club rather than offered as a self-serve public API today. Email us with your use case and we will set up the right feed for your infrastructure.',
  },
];

const HERO_STATS = [
  { icon: Globe, label: '5 leagues covered' },
  { icon: Users, label: '2,168 players tracked' },
  { icon: BookOpen, label: `${FAQS.length} answers` },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: E, delay: Math.min(index, 5) * 0.06 }}
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
          padding: '22px 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: '#F2F2F2', lineHeight: 1.4 }}>{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: E }}
          style={{ flexShrink: 0, color: '#1A65D3' }}
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: E }}
          >
            <p style={{ fontSize: 15, color: '#939A9E', lineHeight: 1.7, paddingBottom: 22, maxWidth: '72ch' }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SupportPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<CatKey | null>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const filteredFaqs = useMemo(() => FAQS.filter(f => {
    if (activeCat && f.cat !== activeCat) return false;
    if (q && !(`${f.q} ${f.a}`.toLowerCase().includes(q))) return false;
    return true;
  }), [q, activeCat]);

  const countFor = (key: CatKey) => FAQS.filter(f => f.cat === key).length;

  const selectCat = (key: CatKey) => {
    setActiveCat(prev => (prev === key ? null : key));
    setQuery('');
    requestAnimationFrame(() => faqRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const emailSupport = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('PLAI support request')}`;
  };

  const activeTitle = activeCat ? CATEGORIES.find(c => c.key === activeCat)?.title : null;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#F2F2F2', overflowX: 'hidden' }}>
      <Navbar />

      <section style={{ paddingTop: 140, paddingBottom: 96, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(26,101,211,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.06 }}
            style={{
              fontWeight: 900,
              fontSize: 'clamp(34px, 4.2vw, 52px)', letterSpacing: '-0.03em',
              textTransform: 'uppercase', lineHeight: 1.05,
              color: '#F2F2F2', margin: '0 0 20px',
            }}
          >
            How can we<br />
            help you?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: E, delay: 0.12 }}
            style={{ fontSize: 16, color: '#939A9E', lineHeight: 1.65, marginBottom: 40 }}
          >
            Search the FAQs, browse topics, or connect directly with the PLAI team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: E, delay: 0.18 }}
            style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}
          >
            <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#939A9E', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search questions and answers…"
              value={query}
              onChange={e => { setQuery(e.target.value); if (e.target.value.trim()) setActiveCat(null); }}
              onKeyDown={e => { if (e.key === 'Enter') faqRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              style={{
                width: '100%', height: 52, paddingLeft: 50, paddingRight: query ? 48 : 20,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%), rgba(0,0,0,0.55)',
                backdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 999, color: '#F2F2F2', fontSize: 15,
                outline: 'none', fontFamily: 'inherit',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.3)',
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#939A9E', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 32, flexWrap: 'wrap' }}
          >
            {HERO_STATS.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.04em' }}>
                <Icon size={13} style={{ color: '#1A65D3' }} />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 120px' }}>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: E }}
          style={{ fontWeight: 900, fontSize: 'clamp(22px, 2.5vw, 32px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#F2F2F2', marginBottom: 32 }}
        >
          Browse by Topic
        </motion.h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {CATEGORIES.map((cat, i) => {
            const isActive = activeCat === cat.key;
            const n = countFor(cat.key);
            return (
              <motion.button
                key={cat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: E, delay: i * 0.07 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                onClick={() => selectCat(cat.key)}
                style={{
                  textAlign: 'left', fontFamily: 'inherit',
                  background: 'linear-gradient(155deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 50%, rgba(26,101,211,0.05) 100%), rgba(0,0,0,0.60)',
                  backdropFilter: 'blur(40px)',
                  border: `1px solid ${isActive ? 'rgba(26,101,211,0.55)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 16,
                  padding: '24px 24px 20px',
                  cursor: 'pointer',
                  boxShadow: isActive
                    ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(26,101,211,0.25)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.35)',
                  transition: 'border-color 200ms, box-shadow 200ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `rgba(26,101,211,0.12)`,
                    border: '1px solid rgba(26,101,211,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <cat.icon size={18} color="#1A65D3" />
                  </div>
                  <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 600, letterSpacing: '0.06em' }}>
                    {n} {n === 1 ? 'article' : 'articles'}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F2', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  {cat.title}
                </h3>
                <p style={{ fontSize: 13, color: '#939A9E', lineHeight: 1.6, margin: 0 }}>
                  {cat.desc}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16, fontSize: 12, fontWeight: 700, color: '#1A65D3', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {isActive ? 'Showing' : 'Browse'} <ArrowRight size={12} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section ref={faqRef} style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 120px', scrollMarginTop: 100 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: E }}
          style={{ marginBottom: 48 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A65D3', marginBottom: 12 }}>FAQ</p>
          <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontWeight: 900, fontSize: 'clamp(22px, 2.5vw, 36px)', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#F2F2F2', margin: 0 }}>
            Common Questions
          </h2>

          {(activeTitle || q) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#939A9E' }}>
                {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'}
                {activeTitle ? ` in ${activeTitle}` : ''}
                {q ? ` for “${query.trim()}”` : ''}
              </span>
              <button
                onClick={() => { setActiveCat(null); setQuery(''); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 28, padding: '0 12px', borderRadius: 999,
                  background: 'rgba(26,101,211,0.12)', border: '1px solid rgba(26,101,211,0.35)',
                  color: '#1A65D3', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <X size={12} /> Clear
              </button>
            </div>
          )}
        </motion.div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, i) => (
              <FaqItem key={`${faq.cat}-${faq.q}`} q={faq.q} a={faq.a} index={i} />
            ))
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 15, color: '#939A9E', marginBottom: 20 }}>
                No answers matched your search. The team can help directly.
              </p>
              <button
                onClick={emailSupport}
                style={{
                  height: 44, padding: '0 24px', borderRadius: 999,
                  background: '#1A65D3', color: '#F2F2F2', border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                <Mail size={15} /> Email Support
              </button>
            </div>
          )}
        </div>
      </section>

      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 140% 60% at 50% 100%, rgba(26,101,211,0.65) 0%, rgba(26,101,211,0.22) 40%, transparent 70%),
          linear-gradient(to top, rgba(26,101,211,0.28) 0%, transparent 55%),
          #000000
        `,
        padding: '100px 24px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: E }}
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}
          >
            Still need help?
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: E, delay: 0.06 }}
            style={{
              fontWeight: 900,
              fontSize: 'clamp(28px, 4vw, 52px)', textTransform: 'uppercase',
              letterSpacing: '-0.03em', color: '#F2F2F2', margin: '0 0 16px',
            }}
          >
            Talk to the Team
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: E, delay: 0.12 }}
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 40 }}
          >
            Email us at <span style={{ color: '#F2F2F2', fontWeight: 600 }}>{SUPPORT_EMAIL}</span> and we’ll get back to you.<br />
            Priority support is available on the Plus and Ultra plans.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: E, delay: 0.18 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              onClick={emailSupport}
              style={{
                height: 48, padding: '0 28px', borderRadius: 999,
                background: '#1A65D3', color: '#F2F2F2',
                border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: 700, fontFamily: 'inherit',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 32px rgba(26,101,211,0.4)',
                transition: 'transform 180ms, box-shadow 180ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(26,101,211,0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(26,101,211,0.4)'; }}
            >
              <Mail size={15} /> Email Support
            </button>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                height: 48, padding: '0 28px', borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px)',
                color: '#F2F2F2', border: '1px solid rgba(255,255,255,0.18)',
                cursor: 'pointer', fontSize: 13,
                fontWeight: 700, fontFamily: 'inherit',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'transform 180ms, border-color 180ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
            >
              <MessageSquare size={15} /> View Plans
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
