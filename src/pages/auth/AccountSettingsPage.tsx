import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, EnvelopeSimple, ShieldStar, Heart, Target,
  SignOut, Trash, Warning, X, ArrowLeft, Camera,
} from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { getClubCrest } from '../../utils/clubs';
import ImageCropModal from '../../components/ui/ImageCropModal';

const SPRING = { type: 'spring' as const, stiffness: 130, damping: 22 };

const GOAL_LABELS: Record<string, string> = {
  win_more: 'Win more matches',
  find_talent: 'Find new talent',
  reduce_injuries: 'Reduce injuries',
  follow_team: 'Follow my team',
  analyze_data: 'Analyze performance',
};

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, logout, deleteAccount, updateProfile } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCropConfirm(dataUrl: string) {
    setCropSrc(null);
    setUploading(true);
    try {
      await updateProfile({ profileImage: dataUrl });
    } catch { /**/ } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    await updateProfile({ profileImage: null });
  }
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const initials = user.name?.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
  const crest = user.favoriteClub ? getClubCrest(user.favoriteClub.toLowerCase()) : null;
  const avatarBg = (user as { avatarColor?: string }).avatarColor ?? '#1A65D3';

  async function handleDelete() {
    if (confirmText !== user!.email) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch {
      setError('Could not delete account. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#000', color: '#F2F2F2', fontFamily: 'inherit' }}>

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36,
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.45)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            transition: 'color 180ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F2F2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <ArrowLeft size={14} weight="bold" /> Back
        </button>

        <h1 style={{
          fontFamily: 'Miguer Sans, sans-serif', fontSize: 'clamp(28px, 4vw, 38px)',
          fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 4px', color: '#F2F2F2',
        }}>
          Account settings
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 40px' }}>
          Manage your profile, preferences, and account.
        </p>

        <Section label="Profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: user.profileImage ? 'transparent' : avatarBg,
                  display: 'grid', placeItems: 'center',
                  fontSize: 22, fontWeight: 900, color: '#fff',
                  cursor: 'pointer', overflow: 'hidden',
                  boxShadow: `0 0 0 2px rgba(255,255,255,0.06), 0 0 20px ${avatarBg}44`,
                  opacity: uploading ? 0.5 : 1, transition: 'opacity 200ms',
                }}
              >
                {user.profileImage
                  ? <img src={user.profileImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#1A65D3', border: '2px solid #0e0e0e',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                }}
              >
                <Camera size={10} weight="fill" style={{ color: '#fff' }} />
              </button>
              {user.profileImage && (
                <button
                  onClick={removeImage}
                  disabled={uploading}
                  style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.9)', border: '2px solid #0e0e0e',
                    display: 'grid', placeItems: 'center', cursor: 'pointer',
                  }}
                >
                  <Trash size={9} weight="bold" style={{ color: '#fff' }} />
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

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#F2F2F2', marginBottom: 2 }}>{user.name}</div>
              {(user as { bio?: string }).bio && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{(user as { bio?: string }).bio}</div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>
                {uploading ? 'Uploading…' : 'Click avatar to change photo'}
              </div>
            </div>
          </div>
        </Section>

        <Section label="Details">
          <InfoRow icon={<EnvelopeSimple size={14} />} label="Email" value={user.email} />
          {user.username && <InfoRow icon={<span style={{ fontSize: 13, fontWeight: 700 }}>@</span>} label="Username" value={`@${user.username}`} />}
          {user.age && <InfoRow icon={<User size={14} />} label="Age" value={String(user.age)} />}
          <InfoRow icon={<ShieldStar size={14} />} label="Role" value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
          {user.favoriteClub && (
            <InfoRow
              icon={crest ? <img src={crest} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} /> : <Heart size={14} />}
              label="Favourite club"
              value={user.favoriteClub}
            />
          )}
          {user.primaryGoal && (
            <InfoRow icon={<Target size={14} />} label="Primary goal" value={GOAL_LABELS[user.primaryGoal] ?? user.primaryGoal} />
          )}
          <InfoRow icon={<User size={14} />} label="Member since" value={new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </Section>

        <Section label="Session">
          <button
            onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '11px 20px', borderRadius: 999,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#F2F2F2', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 160ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <SignOut size={14} weight="bold" /> Sign out
          </button>
        </Section>

        <Section label="Danger zone" danger>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', lineHeight: 1.55 }}>
            Permanently deletes your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '11px 20px', borderRadius: 999,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 160ms, border 160ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
          >
            <Trash size={14} weight="bold" /> Delete my account
          </button>
        </Section>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!deleting) setShowConfirm(false); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', zIndex: 100 }}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={SPRING}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                zIndex: 101, width: 'min(480px, calc(100vw - 32px))',
                background: '#0e0e0e', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 20, padding: '28px 28px 24px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'grid', placeItems: 'center' }}>
                  <Warning size={18} weight="fill" style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 18, fontWeight: 900, margin: 0, color: '#F2F2F2' }}>
                    Delete account
                  </h2>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>This cannot be undone</p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
                Type your email address <strong style={{ color: '#F2F2F2' }}>{user.email}</strong> to confirm.
              </p>

              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={user.email}
                disabled={deleting}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F2F2F2', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  marginBottom: 12, transition: 'border 180ms',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />

              {error && (
                <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 12px', fontWeight: 600 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  style={{
                    padding: '10px 18px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F2F2F2', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== user.email || deleting}
                  style={{
                    padding: '10px 18px', borderRadius: 999,
                    background: confirmText === user.email ? '#ef4444' : 'rgba(239,68,68,0.2)',
                    border: 'none', color: confirmText === user.email ? '#fff' : 'rgba(239,68,68,0.5)',
                    fontSize: 12, fontWeight: 800, cursor: confirmText === user.email ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', transition: 'background 200ms, color 200ms',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete permanently'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

function Section({ label, children, danger }: { label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: danger ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.35)',
        marginBottom: 12,
      }}>
        {label}
      </div>
      <div style={{
        padding: '20px 22px', borderRadius: 16,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}
      className="info-row-last"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        {icon}
        <span style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2' }}>{value}</span>
    </div>
  );
}
