import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Activity, Users, BarChart3,
  CreditCard, Code2, ChevronDown, Mail, MessageSquare,
  ArrowRight, BookOpen, Zap, Clock,
} from 'lucide-react';
import Navbar from '../../components/landing/Navbar';

const E = [0.16, 1, 0.3, 1] as const;

const CATEGORIES = [
  {
    icon: TrendingUp,
    title: 'Match Predictions',
    desc: 'Win/draw/loss probabilities, xG forecasts, live lineup data.',
    articles: 12,
    color: '#1A65D3',
  },
  {
    icon: Activity,
    title: 'Injury Risk',
    desc: 'Biomechanical scores, workload monitoring, early-warning flags.',
    articles: 9,
    color: '#ef4444',
  },
  {
    icon: Search,
    title: 'Scout Search',
    desc: 'Filtering 4,200+ players by position, age, budget and tactical fit.',
    articles: 14,
    color: '#1A65D3',
  },
  {
    icon: BarChart3,
    title: 'Player Analytics',
    desc: 'xG, xA, progressive passes, pressing intensity and percentile ranks.',
    articles: 18,
    color: '#1A65D3',
  },
  {
    icon: CreditCard,
    title: 'Account & Billing',
    desc: 'Subscriptions, invoices, seat management and access controls.',
    articles: 7,
    color: '#939A9E',
  },
  {
    icon: Code2,
    title: 'API & Integrations',
    desc: 'Direct data feeds, webhooks, and club BI infrastructure setup.',
    articles: 11,
    color: '#1A65D3',
  },
];

const FAQS = [
  {
    q: 'How accurate are the match predictions?',
    a: 'Validated with walk-forward cross-validation across three full Premier League seasons (2022-24): 53.4% average test accuracy, with the strongest of the three seasons reaching 58.1%. Predictions are generated from the latest available season data — there is no live, real-time update feed yet.',
  },
  {
    q: 'How does the injury risk model work, and how accurate is it?',
    a: 'The model scores AUC 0.672 with 69.3% sensitivity on held-out data, using workload, age, and injury-history features. It does not currently use GPS or biomechanical tracking data — that’s a real ceiling on how much further accuracy can improve without richer input data. Risk is shown as a validated binary High/Low tier, not a precise percentage.',
  },
  {
    q: 'Can I export scout search results to our existing scouting software?',
    a: 'Not yet — there is no CSV/JSON export or API endpoint for scout search results in the product today. API access is listed as an Ultra-plan feature; if you need this now, contact us directly and we can scope it for your club.',
  },
  {
    q: 'What leagues does PLAI cover?',
    a: 'Five leagues today: Premier League, Serie A, La Liga, Bundesliga, and Ligue 1 — 2,168 tracked players across all five, not a Premier-League-only product with others in beta.',
  },
  {
    q: 'How many user seats are included per subscription?',
    a: 'Standard and Plus are single-seat plans. Ultra includes 5-seat team collaboration, for clubs that need multiple staff accessing the platform under one subscription.',
  },
  {
    q: 'Is there an onboarding service for new clubs?',
    a: 'Reach out to the team directly to discuss onboarding for your club — this is handled case by case rather than through a fixed, automated process right now.',
  },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: E, delay: index * 0.06 }}
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
            Search our knowledge base, browse topics, or connect directly with the PLAI team.
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
              placeholder="Search articles, guides, and FAQs…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%', height: 52, paddingLeft: 50, paddingRight: 20,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%), rgba(0,0,0,0.55)',
                backdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 999, color: '#F2F2F2', fontSize: 15,
                outline: 'none', fontFamily: 'inherit',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.3)',
                boxSizing: 'border-box',
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 32 }}
          >
            {[
              { icon: BookOpen, label: '71 articles' },
              { icon: Clock, label: 'Avg. 2 min read' },
              { icon: Zap, label: '< 4h response' },
            ].map(({ icon: Icon, label }) => (
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
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: E, delay: i * 0.07 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              style={{
                background: 'linear-gradient(155deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 50%, rgba(26,101,211,0.05) 100%), rgba(0,0,0,0.60)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '24px 24px 20px',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.35)',
                transition: 'border-color 200ms, box-shadow 200ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,101,211,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
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
                  {cat.articles} articles
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F2', marginBottom: 8, letterSpacing: '-0.01em' }}>
                {cat.title}
              </h3>
              <p style={{ fontSize: 13, color: '#939A9E', lineHeight: 1.6, margin: 0 }}>
                {cat.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16, fontSize: 12, fontWeight: 700, color: '#1A65D3', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Browse <ArrowRight size={12} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 120px' }}>
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
        </motion.div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {FAQS.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
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
            Our analyst support team responds within 4 hours on weekdays.<br />
            Priority support available on Professional and Ultra plans.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: E, delay: 0.18 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              onClick={() => navigate('/signup')}
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
              <MessageSquare size={15} /> Live Chat
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 24 }}
          >
            Weekdays 08:00–20:00 GMT · Emergency line available 24/7 for Ultra clubs
          </motion.p>
        </div>
      </section>
    </div>
  );
}
