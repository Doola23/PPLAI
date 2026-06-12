import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import Navbar from '../../components/landing/Navbar';
import '../../styles/landing.css';

const E = [0.16, 1, 0.3, 1] as const;

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    tag: null,
    monthlyPrice: 20,
    yearlyPrice: 16,
    description: 'Everything an analyst needs to prepare faster and back every decision with data.',
    features: [
      '10 Match Predictions / day',
      'Player Search & Comparison',
      'League Table Forecasting',
      'Scout Reports (Basic)',
      'Email Support',
    ],
    cta: 'Start with Standard',
    primary: false,
  },
  {
    id: 'plus',
    name: 'Plus',
    tag: 'Most Popular',
    monthlyPrice: 50,
    yearlyPrice: 40,
    description: 'Full squad intelligence — predictions, injury risks, and AI reports in one place.',
    features: [
      'Unlimited Match Predictions',
      'Advanced Scout Search & Profiles',
      'Injury Risk Forecasting',
      'AI-Generated Match Reports',
      'Full Player Stats & Comparison',
      'Priority Support',
    ],
    cta: 'Start with Plus',
    primary: true,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    tag: 'Enterprise',
    monthlyPrice: 80,
    yearlyPrice: 64,
    description: 'One platform for your entire club — coaching, scouting, and board aligned.',
    features: [
      'Everything in Plus',
      '5-Seat Team Collaboration',
      'Custom Scout Pipelines',
      'API Access & White-label Reports',
      'Dedicated Account Manager',
      '24/7 Priority Support',
    ],
    cta: 'Contact Sales',
    primary: false,
  },
];

function Toggle({ yearly, onChange }: { yearly: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!yearly)}
      style={{
        width: 36, height: 20, borderRadius: 999,
        background: yearly ? '#1A65D3' : 'rgba(255,255,255,0.15)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 220ms ease', flexShrink: 0,
        padding: 0,
      }}
    >
      <motion.div
        animate={{ x: yearly ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{
          position: 'absolute', top: 2, width: 16, height: 16,
          borderRadius: '50%', background: '#fff',
        }}
      />
    </button>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [yearlyMap, setYearlyMap] = useState<Record<string, boolean>>({
    standard: true, plus: true, ultra: true,
  });

  const togglePlan = (id: string) =>
    setYearlyMap(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ minHeight: '100dvh', background: '#000000', color: '#F2F2F2', overflowX: 'hidden' }}>
      <Navbar />

      <div style={{ textAlign: 'center', padding: '140px 24px 72px' }}>
        <motion.h1
          initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: E }}
          style={{
            fontSize: 'clamp(34px, 4.2vw, 52px)',
            fontWeight: 900, lineHeight: 0.9,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            color: '#F2F2F2', margin: '0 0 24px',
          }}
        >
          Pricing
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: E, delay: 0.18 }}
          style={{ fontSize: 16, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, margin: 0 }}
        >
          14 days free on every plan. No credit card required.
        </motion.p>
      </div>

      <div className="lprice-grid">
        {PLANS.map((plan, i) => {
          const yearly = yearlyMap[plan.id];
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.72, ease: E, delay: 0.1 + i * 0.1 }}
              style={{
                background: plan.primary
                  ? 'rgba(26,101,211,0.06)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${plan.primary ? 'rgba(26,101,211,0.28)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 20,
                padding: '28px 28px 28px',
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
                  pointerEvents: 'none',
                  borderRadius: '0 0 20px 20px',
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 15, fontWeight: 700,
                    color: plan.primary ? '#F2F2F2' : 'rgba(255,255,255,0.65)',
                  }}>
                    {plan.name}
                  </span>
                  {plan.tag && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: plan.primary ? '#1A65D3' : '#939A9E',
                      background: plan.primary ? 'rgba(26,101,211,0.12)' : 'rgba(147,154,158,0.1)',
                      border: `1px solid ${plan.primary ? 'rgba(26,101,211,0.28)' : 'rgba(147,154,158,0.2)'}`,
                      borderRadius: 999, padding: '2px 8px',
                    }}>
                      {plan.tag}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
                    Annual
                  </span>
                  <Toggle yearly={yearly} onChange={() => togglePlan(plan.id)} />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={price}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        fontSize: 52, fontWeight: 900,
                        color: '#F2F2F2', lineHeight: 1,
                        letterSpacing: '-0.03em',
                      }}
                    >
                      ${price}
                    </motion.span>
                  </AnimatePresence>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 8 }}>
                    per month
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

              <p style={{
                fontSize: 13, color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.65, margin: '0 0 20px',
              }}>
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
                  plan.id === 'ultra'
                    ? (window.location.href = 'mailto:sales@plai.io')
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

      <div style={{ textAlign: 'center', padding: '0 24px 56px', color: 'rgba(255,255,255,0.12)', fontSize: 12, letterSpacing: '0.06em' }}>
        14-day free trial · No credit card required · Cancel anytime · All 20 Premier League clubs covered
      </div>
    </div>
  );
}
