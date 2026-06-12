import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Settings, Activity, Shield, TrendingUp, AlertTriangle,
  CheckCircle, Server, Database, Cpu, ArrowRight, Clock,
  Zap, Globe, RefreshCw, BarChart2, Layout,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageBanner from '../../components/dashboard/PageBanner';
import LandingConfigTab from './LandingConfigTab';
import { adminService, type ServiceHealth, type Alert, type ActivityEntry } from '../../services/admin.service';

const E = [0.16, 1, 0.3, 1] as const;

const typeColor: Record<string, string> = {
  signup: '#1A65D3', login: '#939A9E', logout: '#939A9E', default: '#1A65D3',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'landing',  label: 'Landing Config', icon: Layout },
];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const [resolvedAlerts, setResolvedAlerts] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'landing'>('overview');
  const [systemServices, setSystemServices] = useState<ServiceHealth[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<{ users: number | null; services: number | null }>({ users: null, services: null });

  useEffect(() => {
    adminService.getHealth().then(d => {
      setSystemServices(d.services);
      setActiveAlerts(d.alerts);
    }).catch(() => {});
    adminService.getActivity().then(d => setRecentActivity(d.activity.slice(0, 6))).catch(() => {});
    adminService.getStats().then(d => setStats({ users: d.users, services: d.injuries != null ? 4 : null })).catch(() => {});
  }, []);

  const quickLinks = [
    { label: 'User Management', icon: Users,    path: '/user-management', sub: 'Manage accounts, roles & invites', stat: stats.users != null ? `${stats.users} users` : '— users' },
    { label: 'System Settings', icon: Settings, path: '/system',           sub: 'Config, models & pipeline',        stat: `${systemServices.length || 4} services` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Administration"
        title="Admin"
        titleAccent="Panel"
        stats={[
          { value: stats.users != null ? String(stats.users) : '—', label: 'Users' },
          { value: String(activeAlerts.length - resolvedAlerts.length), label: 'Alerts' },
          { value: String(systemServices.filter(s => s.ok).length || '—'), label: 'Healthy' },
        ]}
        badge="Admin Access"
      />

      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#000' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '14px 18px', background: 'none', border: 'none', borderBottom: on ? '2px solid #1A65D3' : '2px solid transparent', color: on ? '#F2F2F2' : '#939A9E', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, transition: 'color 150ms' }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {activeTab === 'landing' && <LandingConfigTab />}
        {activeTab === 'overview' && <>

        <div className="layout-stat-4">
          {[
            { label: 'Total Users',       value: stats.users != null ? String(stats.users) : '—', sub: 'Registered accounts', icon: Users,       iconColor: '#1A65D3', delay: 0    },
            { label: 'Services Healthy',  value: systemServices.length ? `${systemServices.filter(s => s.ok).length}/${systemServices.length}` : '—', sub: 'API health check', icon: Activity,    iconColor: '#1A65D3', delay: 0.06 },
            { label: 'Recent Actions',    value: String(recentActivity.length), sub: 'Last 50 logged',   icon: BarChart2,   iconColor: '#1A65D3', delay: 0.12 },
            { label: 'Open Alerts',       value: String(activeAlerts.length - resolvedAlerts.length), sub: activeAlerts.some(a => a.severity === 'Critical') ? '1 critical' : 'None critical', icon: AlertTriangle, iconColor: '#1A65D3', delay: 0.18 },
          ].map(card => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: E, delay: card.delay }}
              whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
              style={{
                background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '20px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#939A9E', fontWeight: 600, margin: 0 }}>{card.label}</p>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${card.iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={15} style={{ color: card.iconColor }} />
                </div>
              </div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#F2F2F2', lineHeight: 1, margin: '0 0 4px' }}>{card.value}</p>
              <p style={{ fontSize: 10, color: '#939A9E', fontWeight: 600, margin: 0 }}>{card.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="layout-2col">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: E, delay: 0.24 + i * 0.08 }}
              onClick={() => navigate(link.path)}
              whileHover={{ y: -4, scale: 1.01 }}
              style={{
                background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'border-color 200ms',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,101,211,0.4)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(26,101,211,0.12)', border: '1px solid rgba(26,101,211,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <link.icon size={20} style={{ color: '#1A65D3' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#F2F2F2', margin: '0 0 3px' }}>{link.label}</p>
                <p style={{ fontSize: 11, color: '#939A9E', margin: 0 }}>{link.sub}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#939A9E', fontWeight: 600 }}>{link.stat}</span>
                <ArrowRight size={14} style={{ color: '#939A9E' }} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="layout-2col">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.38 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={14} style={{ color: '#1A65D3' }} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>System Status</h3>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, color: '#1A65D3', background: 'rgba(26,101,211,0.1)', border: '1px solid rgba(26,101,211,0.2)', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{systemServices.length ? `${systemServices.filter(s => s.ok).length}/${systemServices.length} OK` : '— OK'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
              {systemServices.map(svc => (
                <div key={svc.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${svc.ok ? 'rgba(26,101,211,0.06)' : 'rgba(26,101,211,0.12)'}` }}>
                  <motion.div
                    animate={svc.ok ? {} : { opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ width: 7, height: 7, borderRadius: '50%', background: svc.ok ? '#1A65D3' : '#1A65D3', boxShadow: `0 0 6px ${svc.ok ? '#1A65D3' : '#1A65D3'}`, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: svc.ok ? '#F2F2F2' : '#F2F2F2', flex: 1 }}>{svc.label}</span>
                  <span style={{ fontSize: 10, color: '#939A9E' }}>{svc.latency}</span>
                  <span style={{ fontSize: 10, color: svc.ok ? '#1A65D3' : '#1A65D3', fontWeight: 700 }}>{svc.status}</span>
                </div>
              ))}
            </div>

            <div>
              <p style={{ fontSize: 9, color: '#939A9E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Resource Usage</p>
              {[
                { icon: Cpu,      label: 'CPU',     value: 42 },
                { icon: Database, label: 'Memory',  value: 67 },
                { icon: Globe,    label: 'Network', value: 31 },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <r.icon size={12} style={{ color: '#939A9E' }} />
                    <span style={{ fontSize: 11, color: '#939A9E', flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#F2F2F2' }}>{r.value}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.value}%` }}
                      transition={{ duration: 0.9, ease: E, delay: 0.5 }}
                      style={{ height: '100%', background: r.value > 70 ? '#1A65D3' : '#1A65D3', borderRadius: 99, opacity: r.value > 70 ? 1 : 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.44 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={14} style={{ color: '#1A65D3' }} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>Recent Activity</h3>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: '50%', background: '#1A65D3', display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: '#1A65D3', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 13, top: 12, bottom: 12, width: 1, background: 'rgba(255,255,255,0.07)' }} />
              {recentActivity.length === 0 && (
                <p style={{ fontSize: 12, color: '#939A9E', textAlign: 'center', padding: '20px 0', margin: 0 }}>No activity yet</p>
              )}
              {recentActivity.map((item, i) => {
                const color = typeColor[item.actionType] ?? typeColor.default;
                return (
                  <motion.div
                    key={item.logId}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: E, delay: 0.5 + i * 0.06 }}
                    style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: `${color}18`, border: `1px solid ${color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color, zIndex: 1,
                    }}>
                      {initials(item.userName || item.userEmail)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#F2F2F2', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.userName || item.userEmail}</p>
                      <p style={{ fontSize: 10, color: '#939A9E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.action}</p>
                    </div>
                    <span style={{ fontSize: 9, color: '#939A9E', flexShrink: 0, fontWeight: 600 }}>{relativeTime(item.timestamp)}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: E, delay: 0.52 }}
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={14} style={{ color: '#1A65D3' }} />
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>Active Alerts</h3>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: '#939A9E', fontWeight: 600 }}>{activeAlerts.length - resolvedAlerts.length} unresolved</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {activeAlerts.map((alert, i) => !resolvedAlerts.includes(i) && (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.3, ease: E }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderRadius: 12, background: 'rgba(26,101,211,0.05)',
                    border: '1px solid rgba(26,101,211,0.15)',
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#1A65D3', background: 'rgba(26,101,211,0.15)', border: '1px solid rgba(26,101,211,0.3)', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>{alert.severity}</span>
                  <p style={{ fontSize: 12, color: '#939A9E', flex: 1, margin: 0, lineHeight: 1.5 }}>{alert.message}</p>
                  <span style={{ fontSize: 9, color: '#939A9E', flexShrink: 0, fontWeight: 600 }}>{alert.time}</span>
                  <button
                    onClick={() => setResolvedAlerts(prev => [...prev, i])}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 800, color: '#1A65D3', background: 'rgba(26,101,211,0.08)', border: '1px solid rgba(26,101,211,0.25)', padding: '5px 12px', borderRadius: 99, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    <CheckCircle size={10} /> Resolve
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {activeAlerts.length > 0 && resolvedAlerts.length === activeAlerts.length && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px', textAlign: 'center' }}>
                <CheckCircle size={24} style={{ color: '#1A65D3', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#939A9E', margin: 0 }}>All alerts resolved</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        </>}
      </div>
    </div>
  );
}
