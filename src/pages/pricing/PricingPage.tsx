import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { Users, Binoculars, ChartBar, Star } from '@phosphor-icons/react';
import Navbar from '../../components/landing/Navbar';
import '../../styles/landing.css';

const E = [0.16, 1, 0.3, 1] as const;

type RoleKey = 'fan' | 'scout' | 'club';

const ROLES: { id: RoleKey; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'fan',   label: 'Fan',   sub: 'Follow the game deeper',        Icon: Star       },
  { id: 'scout', label: 'Scout', sub: 'Find and track players',        Icon: Binoculars },
  { id: 'club',  label: 'Club',  sub: 'Coach, analyst, or full staff', Icon: ChartBar   },
];

type Plan = {
  id: string;
  name: string;
  tag: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  primary: boolean;
  salesContact?: boolean;
};

const PLANS_BY_ROLE: Record<RoleKey, Plan[]> = {
  fan: [
    {
      id: 'fan-free',
      name: 'Starter',
      tag: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: 'Follow the Premier League with AI-powered predictions at no cost.',
      features: [
        '5 Match Predictions / day',
        'League Table Forecasts',
        'Public Player Stats',
        'Basic Standings Model',
      ],
      cta: 'Get Started Free',
      primary: false,
    },
    {
      id: 'fan-pro',
      name: 'Fan Pro',
      tag: 'Most Popular',
      monthlyPrice: 9,
      yearlyPrice: 7,
      description: 'Unlimited predictions and deeper stats for serious supporters.',
      features: [
        'Unlimited Match Predictions',
        'Table Predictions (Full Season)',
        'Full Player Stats & Profiles',
        'Win probability breakdowns',
        'Email Digest (weekly)',
      ],
      cta: 'Start Fan Pro',
      primary: true,
    },
    {
      id: 'fan-plus',
      name: 'Fan Plus',
      tag: null,
      monthlyPrice: 19,
      yearlyPrice: 15,
      description: 'Everything Fan Pro, plus injury intelligence and advanced analytics.',
      features: [
        'Everything in Fan Pro',
        'Injury Risk Viewer',
        'Advanced Player Comparisons',
        'xG & Progressive Metrics',
        'Priority Support',
      ],
      cta: 'Start Fan Plus',
      primary: false,
    },
  ],
  scout: [
    {
      id: 'scout-basic',
      name: 'Scout',
      tag: null,
      monthlyPrice: 29,
      yearlyPrice: 23,
      description: 'Discover players with AI-ranked search and exportable reports.',
      features: [
        '50 Scout Queries / day',
        'Player Profiles & Stats',
        'Position & Age Filters',
        '10 Report Exports / month',
        'Email Support',
      ],
      cta: 'Start Scouting',
      primary: false,
    },
    {
      id: 'scout-pro',
      name: 'Scout Pro',
      tag: 'Most Popular',
      monthlyPrice: 59,
      yearlyPrice: 47,
      description: 'Unlimited discovery with AI ranking, full analytics and injury intelligence.',
      features: [
        'Unlimited Scout Search',
        'AI Tactical Fit Ranking',
        'Advanced Multi-filter Grid',
        'Full Player Analytics & xG',
        'Injury Risk per Player',
        'Unlimited Report Exports',
        'Priority Support',
      ],
      cta: 'Start Scout Pro',
      primary: true,
    },
    {
      id: 'scout-elite',
      name: 'Scout Elite',
      tag: 'Enterprise',
      monthlyPrice: 99,
      yearlyPrice: 79,
      description: 'Custom pipelines, API access and dedicated support for full clubs.',
      features: [
        'Everything in Scout Pro',
        'Custom Scout Pipelines',
        '5-Seat Team Collaboration',
        'API Access & Data Exports',
        'White-label PDF Reports',
        'Dedicated Account Manager',
      ],
      cta: 'Contact Sales',
      primary: false,
      salesContact: true,
    },
  ],
  club: [
    {
      id: 'club-coach',
      name: 'Coach',
      tag: null,
      monthlyPrice: 39,
      yearlyPrice: 31,
      description: 'Match intelligence and injury risk for coaching staff preparing fixtures.',
      features: [
        'Unlimited Match Predictions',
        'Injury Risk Forecasting',
        'Full Player Analytics',
        'Team-level Reports',
        'Table & Season Model',
        'Email Support',
      ],
      cta: 'Start Coach Plan',
      primary: false,
    },
    {
      id: 'club-pro',
      name: 'Club Pro',
      tag: 'Most Popular',
      monthlyPrice: 69,
      yearlyPrice: 55,
      description: 'The full platform — coaching, scouting and analytics in one place.',
      features: [
        'Everything in Coach',
        'Full Scout Search & Discovery',
        'AI-Generated Match Reports',
        'Advanced Injury Intelligence',
        'xG, Progressive & Pressing Stats',
        'Priority Support',
      ],
      cta: 'Start Club Pro',
      primary: true,
    },
    {
      id: 'club-suite',
      name: 'Club Suite',
      tag: 'Enterprise',
      monthlyPrice: 109,
      yearlyPrice: 87,
      description: 'One platform for the whole club — coaching, scouting and board aligned.',
      features: [
        'Everything in Club Pro',
        '10-Seat Team Collaboration',
        'Custom Scout Pipelines',
        'API Access & White-label Reports',
        'Dedicated Account Manager',
        '24/7 Priority Support',
      ],
      cta: 'Contact Sales',
      primary: false,
      salesContact: true,
    },
  ],
};

function Toggle({ yearly, onChange }: { yearly: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!yearly)}
      style={{
        width: 36, height: 20, borderRadius: 999,
        background: yearly ? '#1A65D3' : 'rgba(255,255,255,0.15)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 220ms ease', flexShrink: 0, padding: 0,
      }}
    >
      <motion.div
        animate={{ x: yearly ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }}
      />
    </button>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleKey | null>(null);
  const [yearlyMap, setYearlyMap] = useState<Record<string, boolean>>({});

  const togglePlan = (id: string) =>
    setYearlyMap(prev => ({ ...prev, [id]: !prev[id] }));

  const plans = role ? PLANS_BY_ROLE[role] : [];

  return (
    <div style={{ minHeight: '100dvh', background: '#000000', color: '#F2F2F2', overflowX: 'hidden' }}>
      <Navbar />

      <div style={{ textAlign: 'center', padding: '140px 24px 56px' }}>
        <motion.h1
          initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: E }}
          style={{
            fontSize: 'clamp(34px, 4.2vw, 52px)',
            fontWeight: 900, lineHeight: 0.9,
            letterSpacing: '-0.03em', textTransform: 'uppercase',
            color: '#F2F2F2', margin: '0 0 20px',
          }}
        >
          Pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: E, delay: 0.18 }}
          style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: '0 0 48px' }}
        >
          14 days free on every plan.
        </motion.p>

        {/* Role selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: E, delay: 0.28 }}
        >
<div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {ROLES.map(({ id, label, sub, Icon }) => {
              const active = role === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => setRole(id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px 10px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(26,101,211,0.14)' : 'rgba(255,255,255,0.03)',
                    outline: active ? '1.5px solid rgba(26,101,211,0.45)' : '1px solid rgba(255,255,255,0.07)',
                    transition: 'all 200ms ease', fontFamily: 'inherit',
                    boxShadow: active ? '0 4px 18px rgba(26,101,211,0.18)' : 'none',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: active ? '#1A65D3' : 'rgba(26,101,211,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 200ms ease', flexShrink: 0,
                  }}>
                    <Icon size={15} weight="duotone" color={active ? '#F2F2F2' : '#1A65D3'} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#F2F2F2' : 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.01em', marginTop: 2 }}>{sub}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {role && (
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 32, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: E }}
          >
            <div className="lprice-grid">
              {plans.map((plan, i) => {
                const yearly = yearlyMap[plan.id] ?? true;
                const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: E, delay: i * 0.08 }}
                    style={{
                      background: plan.primary ? 'rgba(26,101,211,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${plan.primary ? 'rgba(26,101,211,0.28)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 20, padding: '28px 28px',
                      display: 'flex', flexDirection: 'column',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {plan.primary && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: 'linear-gradient(90deg, transparent, #1A65D3 40%, transparent)',
                      }} />
                    )}
                    {plan.primary && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 340,
                        background: 'linear-gradient(to top, rgba(26,101,211,0.18) 0%, rgba(26,101,211,0.07) 55%, transparent 100%)',
                        pointerEvents: 'none', borderRadius: '0 0 20px 20px',
                      }} />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: plan.primary ? '#F2F2F2' : 'rgba(255,255,255,0.65)' }}>
                          {plan.name}
                        </span>
                        {plan.tag && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: plan.primary ? '#1A65D3' : '#939A9E',
                            background: plan.primary ? 'rgba(26,101,211,0.12)' : 'rgba(147,154,158,0.1)',
                            border: `1px solid ${plan.primary ? 'rgba(26,101,211,0.28)' : 'rgba(147,154,158,0.2)'}`,
                            borderRadius: 999, padding: '2px 8px',
                          }}>
                            {plan.tag}
                          </span>
                        )}
                      </div>
                      {plan.monthlyPrice > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
                            Annual
                          </span>
                          <Toggle yearly={yearly} onChange={() => togglePlan(plan.id)} />
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={price}
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.18 }}
                            style={{ fontSize: 52, fontWeight: 900, color: '#F2F2F2', lineHeight: 1, letterSpacing: '-0.03em' }}
                          >
                            {price === 0 ? 'Free' : `$${price}`}
                          </motion.span>
                        </AnimatePresence>
                        {price > 0 && (
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 8 }}>per month</span>
                        )}
                      </div>
                      {yearly && plan.monthlyPrice > 0 && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: '4px 0 0' }}>
                          Billed ${plan.yearlyPrice * 12}/yr · Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/yr
                        </p>
                      )}
                    </div>

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, margin: '0 0 20px' }}>
                      {plan.description}
                    </p>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                      {plan.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                            background: plan.primary ? 'rgba(26,101,211,0.12)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${plan.primary ? 'rgba(26,101,211,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={8} strokeWidth={3} color={plan.primary ? '#1A65D3' : 'rgba(255,255,255,0.4)'} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <motion.button
                      onClick={() =>
                        plan.salesContact
                          ? (window.location.href = 'mailto:sales@plai.io')
                          : plan.monthlyPrice === 0
                            ? navigate('/signup')
                            : navigate(`/payment?plan=${plan.id}&billing=${yearly ? 'yearly' : 'monthly'}`)
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97, y: 1 }}
                      style={{
                        width: '100%', height: 46, borderRadius: 999,
                        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        background: plan.primary ? '#1A65D3' : 'rgba(255,255,255,0.07)',
                        color: plan.primary ? '#F2F2F2' : 'rgba(255,255,255,0.6)',
                        transition: 'background 180ms ease, color 180ms ease',
                        boxShadow: plan.primary ? '0 6px 28px rgba(26,101,211,0.22)' : 'none',
                        position: 'relative', zIndex: 1,
                      }}
                      onMouseEnter={e => {
                        if (!plan.primary) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.11)';
                          (e.currentTarget as HTMLButtonElement).style.color = '#F2F2F2';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!plan.primary) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
                        }
                      }}
                    >
                      {plan.cta}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {/* Role context note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ textAlign: 'center', padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>
                Showing plans for{' '}
                <button
                  onClick={() => setRole(null)}
                  style={{ background: 'none', border: 'none', color: '#1A65D3', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {ROLES.find(r => r.id === role)?.label}
                </button>
                {' '}· Not your role?{' '}
                <button
                  onClick={() => setRole(null)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  Change
                </button>
              </span>
            </motion.div>
          </motion.div>
        )}

        {!role && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '0 24px 80px', color: 'rgba(255,255,255,0.14)', fontSize: 13, letterSpacing: '0.06em' }}
          >
            Select your role above to see plans
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ textAlign: 'center', padding: '48px 24px 56px', color: 'rgba(255,255,255,0.12)', fontSize: 12, letterSpacing: '0.06em' }}>
        14-day free trial · No credit card required · Cancel anytime · All 20 Premier League clubs covered
      </div>
    </div>
  );
}
