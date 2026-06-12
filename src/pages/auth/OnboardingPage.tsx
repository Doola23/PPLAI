import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  SoccerBall, ChartLineUp, MagnifyingGlassPlus, Crown,
  Target, ArrowRight, ArrowLeft, Check, ShieldStar, Heart,
  Trophy, BookmarkSimple, Bandaids, ChartBarHorizontal, Compass,
  User, PencilSimple, Camera, Trash,
} from '@phosphor-icons/react';
import Logo from '../../components/ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { getClubCrest } from '../../utils/clubs';
import ImageCropModal from '../../components/ui/ImageCropModal';
import type { PrimaryGoal, Role } from '../../types/auth.types';

const AVATAR_COLORS = [
  '#1A65D3', '#2B4C5E', '#0F766E', '#7C3AED', '#BE185D',
  '#B45309', '#15803D', '#9F1239', '#1D4ED8', '#6D28D9',
];

const SPRING = { type: 'spring' as const, stiffness: 120, damping: 22 };

const ROLES: { id: Role; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'coach',   label: 'Coach',   sub: 'Plan tactics, manage squad, monitor injuries', Icon: SoccerBall },
  { id: 'analyst', label: 'Analyst', sub: 'Deep stats, predictive models, percentile maps', Icon: ChartLineUp },
  { id: 'scout',   label: 'Scout',   sub: 'Shortlist players, compare profiles, dossiers', Icon: MagnifyingGlassPlus },
  { id: 'fan',     label: 'Fan',     sub: 'Follow your club, live predictions, tables',    Icon: Crown },
];

const PL_CLUBS = [
  'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton',
  'Chelsea','Crystal Palace','Everton','Fulham','Ipswich',
  'Leicester','Liverpool','Manchester City','Manchester United','Newcastle',
  "Nott'm Forest",'Southampton','Tottenham','West Ham','Wolves',
];

const GOALS: { id: PrimaryGoal; label: string; sub: string; Icon: React.ElementType }[] = [
  { id: 'win_more',        label: 'Win more matches',     sub: 'Tactical insights, opponent breakdowns, xG',         Icon: Trophy },
  { id: 'find_talent',     label: 'Find new talent',      sub: 'Scout players matching your style and budget',       Icon: BookmarkSimple },
  { id: 'reduce_injuries', label: 'Reduce injuries',      sub: 'Load monitoring and pre-match risk alerts',          Icon: Bandaids },
  { id: 'follow_team',     label: 'Follow my team',       sub: 'Live predictions, form, leaderboards',                Icon: Heart },
  { id: 'analyze_data',    label: 'Analyze performance',  sub: 'Percentile rankings, xG, progressive carries',        Icon: ChartBarHorizontal },
];

const TOTAL_STEPS = 4;
const STEP_META = [
  { eyebrow: '01 · Profile', Icon: User,       title: 'Set up your profile.',     sub: 'Personalise your PLAI identity.' },
  { eyebrow: '02 · Role',    Icon: ShieldStar, title: 'Who are you, really?',     sub: 'We tailor the dashboard around your role.' },
  { eyebrow: '03 · Club',    Icon: Heart,      title: 'Pick a club to follow.',   sub: 'Their fixtures and squad get top billing.' },
  { eyebrow: '04 · Goal',    Icon: Target,     title: "What's the mission?",      sub: 'Helps us surface the right tools first.' },
];

function MagneticCTA({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, SPRING); const sy = useSpring(y, SPRING);
  const ref = useRef<HTMLButtonElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    x.set(mx * 0.18); y.set(my * 0.32);
  }
  function reset() { x.set(0); y.set(0); }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ x: sx, y: sy }}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      className="onb-cta"
    >
      {children}
    </motion.button>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }
  const [role, setRole] = useState<Role | ''>('');
  const [club, setClub] = useState('');
  const [goal, setGoal] = useState<PrimaryGoal | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = displayName.trim().split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';

  const canNext = useMemo(() => (
    (step === 0 && displayName.trim().length >= 2) ||
    (step === 1 && role) ||
    (step === 2 && club) ||
    (step === 3 && goal)
  ), [step, displayName, role, club, goal]);

  async function handleFinish() {
    if (!role || !club || !goal) return;
    setSaving(true); setError(null);
    try {
      await updateProfile({
        name: displayName.trim() || undefined,
        username: username.trim() || null,
        age: age ? Number(age) : null,
        bio: bio.trim() || null,
        avatarColor,
        profileImage: profileImage ?? null,
        role: role as Role,
        favoriteClub: club,
        primaryGoal: goal as PrimaryGoal,
        onboardingComplete: true,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Could not save preferences. Please try again.');
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true); setError(null);
    try {
      await updateProfile({ role: 'fan', onboardingComplete: true });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Could not skip. Please try again.');
      setSaving(false);
    }
  }

  function next() { if (step < TOTAL_STEPS - 1) setStep(s => s + 1); else handleFinish(); }

  const meta = STEP_META[step];
  const MetaIcon = meta.Icon;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
    show:   { opacity: 1, y: 0, filter: 'blur(0px)', transition: SPRING },
  };

  return (
    <div className="onb-root">
      <style>{`
        .onb-root {
          min-height: 100dvh; background: #000;
          display: grid; grid-template-columns: 1fr;
          color: #F2F2F2; font-family: inherit;
          position: relative;
        }
        .onb-grid-noise {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse at 30% 20%, #000 0%, transparent 70%);
        }
        .onb-main {
          position: relative; z-index: 1;
          padding: 36px 40px; display: flex; flex-direction: column;
          min-height: 100dvh; max-width: 860px; margin: 0 auto; width: 100%;
        }
        @media (min-width: 1024px) {
          .onb-main { padding: 56px 80px; }
        }
.onb-step-strip { display: flex; gap: 6px; margin-top: 18px; }
        .onb-step-bar {
          flex: 1; height: 3px; border-radius: 999px;
          background: rgba(255,255,255,0.06); overflow: hidden; position: relative;
        }
        .onb-step-bar-fill {
          position: absolute; inset: 0; background: #1A65D3;
          transform-origin: left; box-shadow: 0 0 12px rgba(26,101,211,0.5);
        }

        .onb-option {
          all: unset; cursor: pointer; display: block; padding: 18px 20px;
          border-radius: 16px; background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07); transition: background 200ms, border 200ms, transform 200ms;
        }
        .onb-option:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
        .onb-option[data-on="true"] {
          background: rgba(26,101,211,0.08);
          border-color: rgba(26,101,211,0.55);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .onb-option:active { transform: translateY(0) scale(0.99); }

        .onb-club {
          all: unset; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 14px 10px; border-radius: 14px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07); transition: all 180ms cubic-bezier(0.16,1,0.3,1);
        }
        .onb-club:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }
        .onb-club[data-on="true"] {
          background: rgba(26,101,211,0.1);
          border-color: rgba(26,101,211,0.6);
        }
        .onb-club[data-on="true"]:after {
          content: ''; position: absolute;
        }

        .onb-cta {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 16px 28px; border-radius: 999px;
          background: #1A65D3; color: #F2F2F2; border: none; cursor: pointer;
          font-family: inherit; font-size: 13px; font-weight: 800; letter-spacing: 0.02em;
          box-shadow: 0 8px 28px rgba(26,101,211,0.32), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: box-shadow 200ms;
        }
        .onb-cta:disabled {
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); cursor: not-allowed; box-shadow: none;
        }
        .onb-cta:not(:disabled):hover { box-shadow: 0 12px 36px rgba(26,101,211,0.45), inset 0 1px 0 rgba(255,255,255,0.22); }

        .onb-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 22px; border-radius: 999px; background: transparent;
          border: 1px solid rgba(255,255,255,0.1); color: #F2F2F2;
          font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
          transition: background 180ms, border 180ms;
        }
        .onb-back:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.16); }
        .onb-back:disabled { color: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.05); cursor: not-allowed; }

        .onb-clubs-grid {
          display: grid; gap: 10px; max-height: 460px; overflow-y: auto;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          padding: 4px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .onb-clubs-grid::-webkit-scrollbar { width: 6px; }
        .onb-clubs-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }

      `}</style>

      <div className="onb-grid-noise" />

      <main className="onb-main">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo height={20} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Setup
            </span>
            <span style={{
              fontFamily: 'Miguer Sans, sans-serif', fontSize: 14, color: '#F2F2F2',
              padding: '5px 12px', borderRadius: 999, background: 'rgba(26,101,211,0.1)',
              border: '1px solid rgba(26,101,211,0.25)', letterSpacing: '0.06em', fontWeight: 700,
            }}>
              {String(step + 1).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
            </span>
          </div>
        </header>

        <div className="onb-step-strip">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="onb-step-bar">
              <motion.div
                className="onb-step-bar-fill"
                initial={false}
                animate={{ scaleX: i < step ? 1 : i === step ? 1 : 0 }}
                transition={SPRING}
              />
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: 36, paddingBottom: 28 }}>
          <div style={{ width: '100%', maxWidth: 720 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              >
                <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.25)' }}>
                  <MetaIcon size={13} weight="fill" style={{ color: '#1A65D3' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1A65D3' }}>{meta.eyebrow}</span>
                </motion.div>

                <motion.h1 variants={itemVariants} style={{
                  fontFamily: 'Miguer Sans, sans-serif',
                  fontSize: 'clamp(34px, 4.4vw, 52px)', fontWeight: 900,
                  letterSpacing: '-0.02em', lineHeight: 1.04,
                  margin: '20px 0 12px', color: '#F2F2F2',
                }}>
                  {step === 0 ? <>Hey {firstName},<br />let's set up your profile.</> : meta.title}
                </motion.h1>

                <motion.p variants={itemVariants} style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: 0, lineHeight: 1.55 }}>
                  {meta.sub}
                </motion.p>

                {step === 0 && (
                  <motion.div variants={itemVariants} style={{ marginTop: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: profileImage ? 'transparent' : avatarColor,
                            display: 'grid', placeItems: 'center',
                            fontSize: 28, fontWeight: 900, color: '#fff',
                            cursor: 'pointer', overflow: 'hidden',
                            boxShadow: `0 0 0 3px rgba(255,255,255,0.08), 0 0 24px ${avatarColor}55`,
                            transition: 'box-shadow 200ms',
                          }}
                        >
                          {profileImage
                            ? <img src={profileImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ letterSpacing: '-0.02em' }}>{initials}</span>}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 26, height: 26, borderRadius: '50%',
                            background: '#1A65D3', border: '2px solid #000',
                            display: 'grid', placeItems: 'center', cursor: 'pointer',
                          }}
                        >
                          <Camera size={12} weight="fill" style={{ color: '#fff' }} />
                        </button>
                        {profileImage && (
                          <button
                            onClick={() => setProfileImage(null)}
                            style={{
                              position: 'absolute', top: 0, right: 0,
                              width: 22, height: 22, borderRadius: '50%',
                              background: 'rgba(239,68,68,0.9)', border: '2px solid #000',
                              display: 'grid', placeItems: 'center', cursor: 'pointer',
                            }}
                          >
                            <Trash size={10} weight="bold" style={{ color: '#fff' }} />
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
                        />
                      </div>

                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          {profileImage ? 'Photo uploaded' : 'Avatar colour'}
                        </p>
                        {!profileImage && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {AVATAR_COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => setAvatarColor(c)}
                                style={{
                                  width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', flexShrink: 0,
                                  outline: avatarColor === c ? `2px solid ${c}` : '2px solid transparent',
                                  outlineOffset: 2, transition: 'outline 150ms, transform 150ms',
                                  transform: avatarColor === c ? 'scale(1.2)' : 'scale(1)',
                                }}
                              />
                            ))}
                          </div>
                        )}
                        {profileImage && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            Click the avatar to change it.
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Display name
                      </label>
                      <div style={{ position: 'relative' }}>
                        <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                        <input
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="Your full name"
                          maxLength={60}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '13px 16px 13px 38px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, color: '#F2F2F2', fontSize: 14, fontWeight: 600,
                            fontFamily: 'inherit', outline: 'none',
                            transition: 'border 180ms',
                          }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(26,101,211,0.6)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Username <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.28)', fontSize: 13, pointerEvents: 'none', userSelect: 'none' }}>@</span>
                          <input
                            value={username}
                            onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24))}
                            placeholder="your_handle"
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              padding: '13px 14px 13px 30px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 12, color: '#F2F2F2', fontSize: 13, fontWeight: 600,
                              fontFamily: 'inherit', outline: 'none', transition: 'border 180ms',
                            }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(26,101,211,0.6)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Age
                        </label>
                        <input
                          type="number"
                          value={age}
                          onChange={e => setAge(e.target.value)}
                          placeholder="—"
                          min={13} max={120}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '13px 14px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, color: '#F2F2F2', fontSize: 13, fontWeight: 600,
                            fontFamily: 'inherit', outline: 'none', transition: 'border 180ms',
                          }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(26,101,211,0.6)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Short bio <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <PencilSimple size={15} style={{ position: 'absolute', left: 14, top: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                        <textarea
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          placeholder="e.g. Head of performance at FC Midlands"
                          maxLength={120}
                          rows={3}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '13px 16px 13px 38px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12, color: '#F2F2F2', fontSize: 13, fontWeight: 500,
                            fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.55,
                            transition: 'border 180ms',
                          }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(26,101,211,0.6)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        />
                        <span style={{ position: 'absolute', right: 12, bottom: 10, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{bio.length}/120</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 32 }}>
                    {ROLES.map((r) => {
                      const Icon = r.Icon;
                      const on = role === r.id;
                      return (
                        <button key={r.id} className="onb-option" data-on={on} onClick={() => setRole(r.id)}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                              flexShrink: 0,
                              width: 38, height: 38, borderRadius: 12,
                              display: 'grid', placeItems: 'center',
                              background: on ? 'rgba(26,101,211,0.16)' : 'rgba(255,255,255,0.04)',
                              border: on ? '1px solid rgba(26,101,211,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              transition: 'all 200ms',
                            }}>
                              <Icon size={18} weight={on ? 'fill' : 'regular'} style={{ color: on ? '#1A65D3' : '#F2F2F2' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: '#F2F2F2' }}>{r.label}</span>
                                {on && <Check size={13} weight="bold" style={{ color: '#1A65D3', marginLeft: 'auto' }} />}
                              </div>
                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: '4px 0 0', lineHeight: 1.5 }}>{r.sub}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div variants={itemVariants} style={{ marginTop: 32 }}>
                    <div className="onb-clubs-grid">
                      {PL_CLUBS.map(c => {
                        const crest = getClubCrest(c.toLowerCase());
                        const on = club === c;
                        return (
                          <motion.button
                            key={c}
                            className="onb-club"
                            data-on={on}
                            onClick={() => setClub(c)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {crest && <img src={crest} alt={c} style={{ width: 36, height: 36, objectFit: 'contain' }} />}
                            <span style={{ fontSize: 11, fontWeight: 700, color: on ? '#F2F2F2' : 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.3 }}>{c}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
                    {GOALS.map(g => {
                      const Icon = g.Icon;
                      const on = goal === g.id;
                      return (
                        <button key={g.id} className="onb-option" data-on={on} onClick={() => setGoal(g.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                              flexShrink: 0, width: 36, height: 36, borderRadius: 11,
                              display: 'grid', placeItems: 'center',
                              background: on ? 'rgba(26,101,211,0.16)' : 'rgba(255,255,255,0.04)',
                              border: on ? '1px solid rgba(26,101,211,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            }}>
                              <Icon size={17} weight={on ? 'fill' : 'regular'} style={{ color: on ? '#1A65D3' : '#F2F2F2' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#F2F2F2' }}>{g.label}</div>
                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: '3px 0 0' }}>{g.sub}</p>
                            </div>
                            {on && <Check size={14} weight="bold" style={{ color: '#1A65D3' }} />}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 18, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                {error}
              </motion.div>
            )}
          </div>
        </div>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="onb-back" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft size={13} weight="bold" /> Back
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.1em' }}>
              {step === TOTAL_STEPS - 1 ? 'Ready to launch' : `Step ${step + 1} of ${TOTAL_STEPS}`}
            </span>
            <MagneticCTA onClick={next} disabled={!canNext || saving}>
              {saving ? 'Saving…' : step === TOTAL_STEPS - 1 ? 'Launch dashboard' : 'Continue'}
              {!saving && <ArrowRight size={13} weight="bold" />}
            </MagneticCTA>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button
              onClick={handleSkip}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: 'none', padding: '6px 10px',
                color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                transition: 'color 180ms',
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.color = '#F2F2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              <Compass size={13} weight="bold" />
              Skip — let me explore first
              <ArrowRight size={11} weight="bold" />
            </button>
          </div>
        </footer>
      </main>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={dataUrl => { setProfileImage(dataUrl); setCropSrc(null); }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
