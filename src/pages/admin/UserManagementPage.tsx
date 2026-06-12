import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, CheckCircle, XCircle,
  Clock, MoreVertical, Mail, Trash2, Edit3, X,
} from 'lucide-react';
import PageBanner from '../../components/dashboard/PageBanner';

const E = [0.16, 1, 0.3, 1] as const;

type Role   = 'Admin' | 'Analyst' | 'Coach' | 'Scout' | 'Viewer';
type Status = 'Active' | 'Inactive' | 'Pending';

interface AppUser {
  id: number; name: string; email: string;
  role: Role; status: Status; lastSeen: string; initials: string;
}

const USERS: AppUser[] = [
  { id:1,  name:'Alex Johnson',  email:'analyst@plai.com',   role:'Analyst', status:'Active',   lastSeen:'2m ago',  initials:'AJ' },
  { id:2,  name:'Sarah Mills',   email:'sarah@plai.com',     role:'Coach',   status:'Active',   lastSeen:'12m ago', initials:'SM' },
  { id:3,  name:'Liam Torres',   email:'liam@plai.com',      role:'Admin',   status:'Active',   lastSeen:'1h ago',  initials:'LT' },
  { id:4,  name:'Emma Clarke',   email:'emma@plai.com',      role:'Scout',   status:'Active',   lastSeen:'3h ago',  initials:'EC' },
  { id:5,  name:'Rayan Hassan',  email:'rayan@plai.com',     role:'Analyst', status:'Inactive', lastSeen:'2d ago',  initials:'RH' },
  { id:6,  name:'Julia Nwosu',   email:'julia@plai.com',     role:'Viewer',  status:'Pending',  lastSeen:'Never',   initials:'JN' },
  { id:7,  name:'Omar Walid',    email:'omar@plai.com',      role:'Admin',   status:'Active',   lastSeen:'Now',     initials:'OW' },
  { id:8,  name:'Priya Sharma',  email:'priya@plai.com',     role:'Scout',   status:'Active',   lastSeen:'30m ago', initials:'PS' },
  { id:9,  name:'Carlos Mendes', email:'carlos@plai.com',    role:'Coach',   status:'Inactive', lastSeen:'5d ago',  initials:'CM' },
  { id:10, name:'Zoe Adeyemi',   email:'zoe@plai.com',       role:'Analyst', status:'Pending',  lastSeen:'Never',   initials:'ZA' },
];

const ROLES: Role[]      = ['Admin', 'Analyst', 'Coach', 'Scout', 'Viewer'];
const STATUSES: Status[] = ['Active', 'Inactive', 'Pending'];

const roleColor: Record<Role, [string, string]> = {
  Admin:   ['rgba(26,101,211,0.15)', '#1A65D3'],
  Analyst: ['rgba(26,101,211,0.12)', '#1A65D3'],
  Coach:   ['rgba(26,101,211,0.12)', '#1A65D3'],
  Scout:   ['rgba(26,101,211,0.12)', '#1A65D3'],
  Viewer:  ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.35)'],
};

const statusConfig: Record<Status, { icon: typeof CheckCircle; color: string }> = {
  Active:   { icon: CheckCircle, color: '#1A65D3' },
  Inactive: { icon: XCircle,    color: 'rgba(255,255,255,0.3)' },
  Pending:  { icon: Clock,      color: '#1A65D3' },
};

const avatarHues = ['#1A65D3', '#1A65D3', '#1A65D3', '#1A65D3', '#1A65D3', '#1A65D3', '#1A65D3', '#1A65D3'];

export default function UserManagementPage() {
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState<Role | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [menuOpen, setMenuOpen]         = useState<number | null>(null);
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState<Role>('Analyst');
  const [invited, setInvited]           = useState(false);

  const filtered = USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === 'All' || u.role === roleFilter;
    const matchStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Administration"
        title="User"
        titleAccent="Management"
        stats={[
          { value: String(USERS.length),                                    label: 'Total'   },
          { value: String(USERS.filter(u => u.status === 'Active').length),  label: 'Active'  },
          { value: String(USERS.filter(u => u.status === 'Pending').length), label: 'Pending' },
        ]}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: E }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
        >
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              style={{ width: '100%', paddingLeft: 34, paddingRight: 12, height: 36, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, outline: 'none', color: '#fff', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['All', ...ROLES] as const).map(r => (
              <button
                key={r} onClick={() => setRoleFilter(r)}
                style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${roleFilter === r ? 'rgba(26,101,211,0.5)' : 'rgba(255,255,255,0.08)'}`, background: roleFilter === r ? 'rgba(26,101,211,0.14)' : 'transparent', color: roleFilter === r ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms ease' }}
              >{r}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {(['All', ...STATUSES] as const).map(s => (
              <button
                key={s} onClick={() => setStatusFilter(s)}
                style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${statusFilter === s ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`, background: statusFilter === s ? 'rgba(255,255,255,0.07)' : 'transparent', color: statusFilter === s ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms ease' }}
              >{s}</button>
            ))}
          </div>

          <button
            onClick={() => setShowInvite(true)}
            style={{ height: 36, paddingLeft: 16, paddingRight: 16, borderRadius: 999, border: 'none', background: '#1A65D3', color: '#F2F2F2', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexShrink: 0 }}
          >
            <UserPlus size={13} /> Invite User
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: E, delay: 0.1 }}
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}
        >
          <div className="table-scroll-x">
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 1fr 1fr 40px', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: 560 }}>
            {['User', 'Email', 'Role', 'Status', 'Last Seen', ''].map(h => (
              <span key={h} style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          <AnimatePresence mode="popLayout">
            {filtered.map((user, i) => {
              const [roleBg, roleTextColor] = roleColor[user.role];
              const sConfig = statusConfig[user.status];
              const hue = avatarHues[user.id % avatarHues.length];

              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.28, ease: E, delay: i * 0.04 }}
                  style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 1fr 1fr 40px', gap: 12, padding: '14px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', position: 'relative', transition: 'background 150ms', minWidth: 560 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${hue}18`, border: `1px solid ${hue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: hue, flexShrink: 0 }}>
                      {user.initials}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>{user.name}</p>
                      {user.status === 'Active' && user.lastSeen === 'Now' && (
                        <span style={{ fontSize: 9, color: '#1A65D3', fontWeight: 700 }}>● Online</span>
                      )}
                    </div>
                  </div>

                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>

                  <span style={{ background: roleBg, color: roleTextColor, fontSize: 9, fontWeight: 800, padding: '4px 10px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', width: 'fit-content' }}>{user.role}</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <sConfig.icon size={11} style={{ color: sConfig.color }} />
                    <span style={{ fontSize: 11, color: sConfig.color, fontWeight: 600 }}>{user.status}</span>
                  </div>

                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{user.lastSeen}</span>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                    >
                      <MoreVertical size={13} />
                    </button>
                    <AnimatePresence>
                      {menuOpen === user.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: -4 }}
                          transition={{ duration: 0.15 }}
                          style={{ position: 'absolute', right: 0, top: 36, background: '#000000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '6px', zIndex: 50, minWidth: 140 }}
                        >
                          {[
                            { label: 'Edit role',    icon: Edit3  },
                            { label: 'Send invite',  icon: Mail   },
                            { label: 'Remove user',  icon: Trash2, danger: true },
                          ].map(item => (
                            <button
                              key={item.label}
                              onClick={() => setMenuOpen(null)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: item.danger ? '#ff6b6b' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                            >
                              <item.icon size={12} /> {item.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Users size={32} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 10 }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>No users match filters</p>
            </div>
          )}
          </div>{/* /table-scroll-x */}
        </motion.div>

        <div className="layout-stat-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px,1fr))' }}>
          {ROLES.map((r, ri) => {
            const count = USERS.filter(u => u.role === r).length;
            const [, color] = roleColor[r];
            return (
              <motion.div
                key={r}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: E, delay: 0.4 + ri * 0.05 }}
                style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}
              >
                <p style={{ fontSize: 24, fontWeight: 900, color, margin: '0 0 4px' }}>{count}</p>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{r}s</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowInvite(false); setInvited(false); setInviteEmail(''); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ duration: 0.25, ease: E }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#000000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px', width: 420, zIndex: 101 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Miguer Sans, sans-serif', fontSize: 18, fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase' }}>Invite User</h3>
                <button onClick={() => { setShowInvite(false); setInvited(false); setInviteEmail(''); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
              </div>

              {!invited ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>Email Address</label>
                    <input
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@club.com"
                      style={{ width: '100%', height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 6 }}>Role</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ROLES.map(r => {
                        const [bg, color] = roleColor[r];
                        return (
                          <button key={r} onClick={() => setInviteRole(r)} style={{ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${inviteRole === r ? color : 'rgba(255,255,255,0.1)'}`, background: inviteRole === r ? bg : 'transparent', color: inviteRole === r ? color : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 140ms' }}>{r}</button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (inviteEmail) setInvited(true); }}
                    disabled={!inviteEmail}
                    style={{ width: '100%', height: 42, borderRadius: 999, background: inviteEmail ? '#ffffff' : 'rgba(255,255,255,0.1)', color: inviteEmail ? '#000000' : 'rgba(255,255,255,0.3)', border: 'none', fontSize: 13, fontWeight: 700, cursor: inviteEmail ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 200ms' }}
                  >
                    <Mail size={14} /> Send Invite
                  </button>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.div animate={{ scale: [0.8, 1.1, 1] }} transition={{ duration: 0.4 }}>
                    <CheckCircle size={40} style={{ color: '#1A65D3', margin: '0 auto 14px' }} />
                  </motion.div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Invite Sent!</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Emailed to <strong style={{ color: '#1A65D3' }}>{inviteEmail}</strong> as {inviteRole}</p>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
