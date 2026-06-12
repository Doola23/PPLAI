import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Shield, ArrowRight, ArrowLeft, CreditCard as CardIcon, Zap } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import '../../styles/landing.css';

const E = [0.16, 1, 0.3, 1] as const;

const PLANS: Record<string, { name: string; price: number; accent: string; features: string[] }> = {
  standard: {
    name: 'Standard', price: 20, accent: '#1A65D3',
    features: ['Match Predictions (10/day)', 'Player Search', 'Table Predictions', 'Basic Scout Reports'],
  },
  plus: {
    name: 'Plus', price: 50, accent: '#1A65D3',
    features: ['Unlimited Match Predictions', 'Advanced Scout Search', 'Injury Risk Analysis', 'AI-powered Reports'],
  },
  ultra: {
    name: 'Ultra', price: 80, accent: '#1A65D3',
    features: ['Everything in Plus', 'Team Collaboration', 'API Access', 'Dedicated Manager'],
  },
};

const SAVED_CARDS = [
  { id: '2', last4: '5555', brand: 'mastercard', expiry: '03/26', holder: 'OMAR WALID', bg: ['#0d1a22', '#162e40', '#0f2535'], accent: '#2B4C5E', tier: 'PREMIUM' },
];

function VisaLogo() {
  return (
    <svg width="38" height="13" viewBox="0 0 38 13" fill="none">
      <path d="M14.5 12.4H11.7L13.5 0.6H16.3L14.5 12.4Z" fill="white"/>
      <path d="M25.2 0.9C24.6 0.6 23.7 0.3 22.6 0.3C19.8 0.3 17.8 1.8 17.7 3.9C17.7 5.5 19.1 6.4 20.2 6.9C21.3 7.5 21.7 7.9 21.7 8.4C21.7 9.2 20.7 9.6 19.8 9.6C18.6 9.6 17.9 9.4 16.9 9L16.5 8.8L16.1 11.4C16.8 11.7 18.1 12 19.4 12C22.4 12 24.3 10.6 24.4 8.3C24.4 7 23.6 6.1 21.9 5.3C20.9 4.8 20.3 4.4 20.3 3.9C20.3 3.4 20.9 2.9 22.1 2.9C23.1 2.9 23.8 3.1 24.4 3.4L24.7 3.5L25.2 0.9Z" fill="white"/>
      <path d="M29.3 8.1C29.5 7.6 30.5 4.9 30.5 4.9C30.5 4.9 30.8 4.1 30.9 3.6L31.1 4.8C31.1 4.8 31.8 8 31.9 8.1H29.3ZM32.9 0.6H30.7C30 0.6 29.5 0.8 29.2 1.5L24.9 12.4H27.9L28.5 10.7H32.2L32.6 12.4H35.3L32.9 0.6Z" fill="white"/>
      <path d="M9.6 0.6L6.8 8.6L6.5 7.1C5.9 5.1 4.1 3 2.1 1.9L4.7 12.4H7.7L12.6 0.6H9.6Z" fill="white"/>
    </svg>
  );
}
function MastercardLogo() {
  return (
    <svg width="32" height="20" viewBox="0 0 34 22" fill="none">
      <circle cx="13" cy="11" r="10" fill="#EB001B"/>
      <circle cx="21" cy="11" r="10" fill="#F79E1B"/>
      <path d="M17 4.8a10 10 0 0 1 0 12.4A10 10 0 0 1 17 4.8z" fill="#FF5F00"/>
    </svg>
  );
}
function PayPalLogo() {
  return (
    <img src="/paypal.png" alt="PayPal" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
  );
}

function CreditCard({ card, selected, onClick }: { card: typeof SAVED_CARDS[0]; selected: boolean; onClick: () => void }) {
  const src = card.brand === 'visa'
    ? '/Visa-Card-Logo-Transparent-Clip-Art-Background.png'
    : '/mc-standard-card-1280x720.png';

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
      style={{
        width: 272, height: 172, borderRadius: 18, cursor: 'pointer', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        boxShadow: selected
          ? '0 0 0 2.5px #1A65D3, 0 20px 50px rgba(0,0,0,0.6)'
          : '0 14px 44px rgba(0,0,0,0.45)',
        transition: 'box-shadow 220ms ease',
      }}
    >
      <img
        src={src}
        alt={card.brand}
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: card.brand === 'mastercard' ? '160%' : '120%',
          height: card.brand === 'mastercard' ? '160%' : '120%',
          objectFit: 'cover',
        }}
      />

      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          style={{
            position: 'absolute', top: 12, right: 12, width: 22, height: 22,
            borderRadius: '50%', background: '#1A65D3', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(26,101,211,0.8)',
          }}
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </motion.div>
      )}
    </motion.div>
  );
}


function FieldInput({
  label, type = 'text', placeholder, value, onChange, error, accent, adornment, half,
}: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string; accent: string; adornment?: React.ReactNode; half?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={half ? {} : {}}>
      <label style={{ fontSize: 10, color: focused ? accent : 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 8, transition: 'color 180ms ease' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: adornment ? '13px 48px 13px 16px' : '13px 16px',
            borderRadius: 12, fontSize: 14, color: '#fff',
            background: error ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${error ? '#ef4444' : focused ? accent : 'rgba(255,255,255,0.08)'}`,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 180ms ease, background 180ms ease',
            fontFamily: 'inherit',
          }}
          className="placeholder-rgba-white-20"
        />
        {adornment && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>{adornment}</span>}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ color: '#ef4444', fontSize: 11, marginTop: 5, fontWeight: 600 }}
        >{error}</motion.p>
      )}
    </div>
  );
}

function StepBar({ step }: { step: 'details' | 'confirm' | 'success' }) {
  const steps = ['Details', 'Confirm', 'Done'];
  const idx = step === 'details' ? 0 : step === 'confirm' ? 1 : 2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: idx > i ? '#1A65D3' : idx === i ? 'rgba(26,101,211,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${idx > i ? '#1A65D3' : idx === i ? 'rgba(26,101,211,0.5)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 350ms ease',
            }}>
              {idx > i
                ? <Check size={12} strokeWidth={3} color="#F2F2F2" />
                : <span style={{ fontSize: 11, fontWeight: 700, color: idx === i ? '#1A65D3' : 'rgba(255,255,255,0.2)' }}>{i + 1}</span>
              }
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: idx >= i ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)', whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, margin: '0 12px', marginBottom: 22, background: idx > i ? 'rgba(26,101,211,0.4)' : 'rgba(255,255,255,0.06)', transition: 'background 400ms ease' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 2.5, height: 14, borderRadius: 999, background: accent }} />
      <span style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{text}</span>
    </div>
  );
}

function formatCard(val: string) { return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); }
function formatExpiry(val: string) { const v = val.replace(/\D/g, '').slice(0, 4); return v.length >= 3 ? `${v.slice(0, 2)}/${v.slice(2)}` : v; }

function LoadingDots({ color = '#fff' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.44, repeat: Infinity, delay: i * 0.1 }}
          style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      ))}
    </div>
  );
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planKey = params.get('plan') || 'plus';
  const billing = params.get('billing') || 'monthly';
  const plan = PLANS[planKey] || PLANS.plus;
  const price = billing === 'yearly' ? Math.round(plan.price * 0.8) : plan.price;
  const isBlue = plan.accent === '#1A65D3';

  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [method, setMethod] = useState<'card' | 'paypal'>('card');
  const [selectedCard, setSelectedCard] = useState<string | null>('2');
  const [form, setForm] = useState({ name: '', email: '', card: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    if (method === 'card' && !selectedCard) {
      if (form.card.replace(/\s/g, '').length < 16) e.card = 'Invalid card number';
      if (form.expiry.length < 5) e.expiry = 'MM/YY required';
      if (form.cvv.length < 3) e.cvv = 'CVV required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const displayCard = selectedCard ? SAVED_CARDS.find(c => c.id === selectedCard) : null;
  const last4 = displayCard ? displayCard.last4 : form.card.replace(/\s/g, '').slice(-4);

  const ctaBg = '#1A65D3';
  const ctaText = '#F2F2F2';
  const ctaShadow = '0 8px 32px rgba(26,101,211,0.28)';

  return (
    <div style={{ minHeight: '100dvh', background: '#000000', color: '#fff', overflowX: 'hidden' }}>

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <Logo height={20} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(26,101,211,0.06)', border: '1px solid rgba(26,101,211,0.14)', borderRadius: 999, padding: '5px 12px' }}>
            <Lock size={10} color="#1A65D3" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>Secure Checkout</span>
          </div>
          <button onClick={() => navigate('/pricing')} className="lnav__btn" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Pricing
          </button>
        </div>
      </nav>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: `radial-gradient(ellipse, ${plan.accent}06 0%, transparent 65%)` }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '96px 24px 80px' }}>

        <AnimatePresence mode="wait">

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: E }}
              style={{ width: '100%', maxWidth: 980 }}
            >
              <div className="layout-payment-split">

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '36px 36px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${plan.accent}, transparent)` }} />

                  <StepBar step={step} />

                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 6px' }}>Checkout</h2>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={11} color="rgba(255,255,255,0.2)" /> 256-bit SSL · Encrypted · Instant access
                    </p>
                  </div>

                  <SectionLabel text="Personal Info" accent={plan.accent} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
                    <FieldInput label="Full Name" placeholder="Erling Haaland" value={form.name} onChange={v => set('name', v)} error={errors.name} accent={plan.accent} />
                    <FieldInput label="Email" type="email" placeholder="erling@cityfc.com" value={form.email} onChange={v => set('email', v)} error={errors.email} accent={plan.accent} />
                  </div>

                  <SectionLabel text="Payment Method" accent={plan.accent} />
                  <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                    {(['card', 'paypal'] as const).map(m => (
                      <motion.button
                        key={m}
                        onClick={() => setMethod(m)}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          flex: 1, height: 50, borderRadius: 999,
                          border: `1.5px solid ${method === m ? plan.accent : 'rgba(255,255,255,0.07)'}`,
                          background: method === m ? `${plan.accent}10` : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                          transition: 'all 180ms ease',
                        }}
                      >
                        {m === 'paypal'
                          ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}><PayPalLogo /></div>
                          : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><VisaLogo /><span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>/</span><MastercardLogo /></div>
                        }
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {method === 'card' && (
                      <motion.div key="card-m" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                        <SectionLabel text="Saved Cards" accent="rgba(255,255,255,0.18)" />
                        <div style={{ overflowX: 'auto', overflowY: 'visible', marginBottom: 24, paddingBottom: 4, marginLeft: -8 }}>
                          <div style={{ display: 'flex', gap: 14, paddingTop: 10, paddingBottom: 18, paddingLeft: 8, width: 'max-content' }}>
                            {SAVED_CARDS.map(card => (
                              <CreditCard key={card.id} card={card} selected={selectedCard === card.id} onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)} />
                            ))}
                            <motion.div
                              whileHover={{ y: -5 }}
                              onClick={() => setSelectedCard(null)}
                              style={{
                                width: 272, height: 172, borderRadius: 18,
                                border: `1.5px dashed ${selectedCard === null ? plan.accent : 'rgba(255,255,255,0.08)'}`,
                                background: selectedCard === null ? `${plan.accent}08` : 'transparent',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                                cursor: 'pointer', flexShrink: 0,
                                color: selectedCard === null ? plan.accent : 'rgba(255,255,255,0.2)',
                                fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                transition: 'all 180ms ease',
                              }}
                            >
                              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid currentColor`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </div>
                              New Card
                            </motion.div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {selectedCard === null && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <SectionLabel text="Card Details" accent={plan.accent} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <FieldInput
                                  label="Card Number" placeholder="1234 5678 9012 3456"
                                  value={form.card} onChange={v => set('card', formatCard(v))}
                                  error={errors.card} accent={plan.accent}
                                  adornment={<span style={{ opacity: 0.3 }}>{form.card.startsWith('5') ? <MastercardLogo /> : <VisaLogo />}</span>}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                  <FieldInput label="Expiry" placeholder="MM/YY" value={form.expiry} onChange={v => set('expiry', formatExpiry(v))} error={errors.expiry} accent={plan.accent} />
                                  <FieldInput label="CVV" placeholder="•••" value={form.cvv} onChange={v => set('cvv', v.replace(/\D/g, '').slice(0, 4))} error={errors.cvv} accent={plan.accent}
                                    adornment={<CardIcon size={14} color="rgba(255,255,255,0.2)" />}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}

                    {method === 'paypal' && (
                      <motion.div key="pp-m" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ background: 'rgba(26,101,211,0.07)', border: '1px solid rgba(26,101,211,0.2)', borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
                        <PayPalLogo />
                        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, marginTop: 14, lineHeight: 1.65 }}>You'll be redirected to PayPal to complete your payment securely.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={() => { if (validate()) setStep('confirm'); }}
                    whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975, y: 1 }}
                    style={{
                      width: '100%', height: 54, borderRadius: 999, border: 'none', cursor: 'pointer', marginTop: 32,
                      background: ctaBg, color: ctaText,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                      boxShadow: ctaShadow,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    Review Order
                  </motion.button>
                </div>

                <div style={{
                  background: 'linear-gradient(160deg, rgba(26,101,211,0.13) 0%, rgba(26,101,211,0.06) 55%, rgba(26,101,211,0.10) 100%)',
                  border: '1px solid rgba(26,101,211,0.28)',
                  backdropFilter: 'blur(32px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
                  borderRadius: 22, padding: '28px 26px',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: 'inset 0 1px 0 rgba(26,101,211,0.35), 0 8px 40px rgba(26,101,211,0.12)',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(26,101,211,0.9) 40%, transparent)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,101,211,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', width: 280, height: 120, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(26,101,211,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  <SectionLabel text="Order Summary" accent={plan.accent} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, position: 'relative', zIndex: 1 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', margin: 0 }}>{plan.name}</p>
                        {isBlue && (
                          <span style={{ background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.22)', borderRadius: 999, padding: '2px 8px', fontSize: 8, fontWeight: 700, color: '#1A65D3', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Popular</span>
                        )}
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, textTransform: 'capitalize', margin: 0 }}>{billing} billing</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 34, fontWeight: 900, margin: 0, color: plan.accent }}>${price}</p>
                      <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, margin: 0 }}>/month</p>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 18 }} />

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {plan.features.map((f: string) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: `${plan.accent}14`, border: `1px solid ${plan.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={8} strokeWidth={3} color={plan.accent} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 16 }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>14-day free trial</span>
                    <span style={{ color: '#1A65D3', fontSize: 13, fontWeight: 700 }}>FREE</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: `${plan.accent}09`, borderRadius: 14, border: `1px solid ${plan.accent}18` }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Due today</span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: plan.accent }}>$0</span>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(26,101,211,0.05)', border: '1px solid rgba(26,101,211,0.12)', borderRadius: 12 }}>
                    <Zap size={12} color="#1A65D3" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.55, margin: 0 }}>
                      Charged ${price}/mo after trial. No surprise fees. Cancel from your dashboard at any time.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: E }}
              style={{ width: '100%', maxWidth: 520 }}
            >
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '44px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${plan.accent}, transparent)` }} />

                <StepBar step={step} />

                <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${plan.accent}14`, border: `1.5px solid ${plan.accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  {method === 'paypal'
                    ? <PayPalLogo />
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  }
                </div>

                <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 26, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Confirm Payment</h2>
                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, marginBottom: 28 }}>Review your order before completing</p>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '4px 20px', marginBottom: 28, textAlign: 'left' }}>
                  {[
                    { label: 'Plan',    value: `${plan.name} (${billing})` },
                    { label: 'Name',    value: form.name || '—' },
                    { label: 'Email',   value: form.email || '—' },
                    { label: 'Payment', value: method === 'paypal' ? 'PayPal' : `•••• •••• •••• ${last4 || '????'}` },
                    { label: 'Amount',  value: `$${price}/mo`, highlight: true },
                  ].map((r, i, arr) => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{r.label}</span>
                      <span style={{
                        color: (r as any).highlight ? plan.accent : 'rgba(255,255,255,0.65)',
                        fontWeight: (r as any).highlight ? 900 : 500,
                        fontSize: (r as any).highlight ? 15 : 13,
                      }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setStep('details')}
                    style={{ flex: 1, height: 46, borderRadius: 999, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <ArrowLeft size={12} /> Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97, y: 1 }}
                    onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); setStep('success'); }, 1800); }}
                    style={{
                      flex: 2, height: 52, borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: ctaBg, color: ctaText,
                      fontSize: 12, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase',
                      boxShadow: ctaShadow,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {loading ? <LoadingDots color={ctaText} /> : 'Confirm & Pay'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.88, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: E }}
              style={{ width: '100%', maxWidth: 480, textAlign: 'center', padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
                <StepBar step={step} />
              </div>

              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
                style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: '#1A65D3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 32px',
                  boxShadow: '0 0 60px rgba(26,101,211,0.35)',
                }}
              >
                <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
                  <motion.path
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.55, ease: 'easeOut', delay: 0.5 }}
                    d="M3 14L13 24L33 3" stroke="#F2F2F2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52, duration: 0.5, ease: E }}
                style={{ fontSize: 38, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '-0.02em' }}
              >
                You're In.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
                style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, marginBottom: 6 }}
              >
                Welcome to PLAI <span style={{ color: plan.accent, fontWeight: 700 }}>{plan.name}</span>
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13, marginBottom: 44 }}
              >
                Confirmation sent to <span style={{ color: 'rgba(255,255,255,0.5)' }}>{form.email || 'your email'}</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.82, duration: 0.5 }}
                style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 36, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}
              >
                {[
                  { label: 'Trial ends', value: '14 days' },
                  { label: 'Charge date', value: 'Day 15' },
                  { label: 'Monthly', value: `$${price}` },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ flex: 1, padding: '16px 14px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: plan.accent, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5, ease: E }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97, y: 1 }}
                onClick={() => navigate('/dashboard')}
                style={{
                  height: 54, padding: '0 48px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: ctaBg, color: ctaText,
                  fontSize: 12, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase',
                  boxShadow: ctaShadow,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                Go to Dashboard <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
