import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Server, Database, Cpu, RefreshCw, Save, AlertTriangle,
  CheckCircle, Settings, Zap, Clock, HardDrive, Wifi, Activity,
} from 'lucide-react';
import PageBanner from '../../components/dashboard/PageBanner';

const E = [0.16, 1, 0.3, 1] as const;

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', background: enabled ? '#1A65D3' : '#939A9E', position: 'relative', transition: 'background 220ms ease', flexShrink: 0 }}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ duration: 0.22, ease: E }}
        style={{ width: 20, height: 20, borderRadius: '50%', background: '#1A65D3', position: 'absolute', top: 2 }}
      />
    </button>
  );
}

const defaultToggles = {
  liveDataPipeline: true,
  autoRetrain:      true,
  injuryAlerts:     true,
  aiInsights:       true,
  debugLogs:        false,
  rateLimiting:     true,
  caching:          true,
  betaFeatures:     false,
};

export default function SystemManagementPage() {
  const [saved, setSaved]               = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [toggles, setToggles]           = useState(defaultToggles);
  const [modelThreshold, setModelThreshold] = useState(72);
  const [cacheWindow, setCacheWindow]   = useState(15);

  const toggle = (key: keyof typeof toggles) =>
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  const resources = [
    { icon: Cpu,       label: 'CPU',     value: 42, color: '#1A65D3' },
    { icon: Database,  label: 'Memory',  value: 67, color: '#1A65D3' },
    { icon: HardDrive, label: 'Storage', value: 58, color: '#1A65D3' },
    { icon: Wifi,      label: 'Network', value: 31, color: '#1A65D3' },
  ];

  const modelSettings: { key: keyof typeof defaultToggles; label: string; sub: string }[] = [
    { key: 'liveDataPipeline', label: 'Live Data Pipeline',    sub: 'Real-time Opta feed ingestion'        },
    { key: 'autoRetrain',      label: 'Auto Model Retraining', sub: 'Weekly retraining on new match data'   },
    { key: 'injuryAlerts',     label: 'Injury Alert Triggers', sub: 'Push alerts on risk threshold breach'  },
    { key: 'aiInsights',       label: 'AI Insight Generation', sub: 'GPT-4 powered scout report summaries'  },
    { key: 'debugLogs',        label: 'Debug Logging',         sub: 'Verbose logging — performance impact'  },
    { key: 'rateLimiting',     label: 'API Rate Limiting',     sub: '100 req/min per user tier'             },
    { key: 'caching',          label: 'Response Caching',      sub: 'Redis cache for prediction endpoints'  },
    { key: 'betaFeatures',     label: 'Beta Features',         sub: 'Experimental UI + model features'      },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      <PageBanner
        eyebrow="Administration"
        title="System"
        titleAccent="Settings"
        stats={[
          { value: '4',     label: 'Services' },
          { value: '2',     label: 'Models'   },
          { value: '99.8%', label: 'Uptime'   },
        ]}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: E }}
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={14} style={{ color: '#1A65D3' }} />
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>Resource Monitor</h3>
            <button
              onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1800); }}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#939A9E', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.8, ease: 'linear', repeat: refreshing ? Infinity : 0 }}>
                <RefreshCw size={12} />
              </motion.span>
              Refresh
            </button>
          </div>

          <div className="layout-stat-4" style={{ gap: 20 }}>
            {resources.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: E, delay: i * 0.08 }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                  <r.icon size={13} style={{ color: '#939A9E' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#939A9E', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r.label}</span>
                </div>
                <p style={{ fontSize: 36, fontWeight: 900, color: r.color, margin: '0 0 12px', lineHeight: 1 }}>{r.value}<span style={{ fontSize: 16, color: '#939A9E' }}>%</span></p>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.value}%` }}
                    transition={{ duration: 1, ease: E, delay: 0.4 + i * 0.1 }}
                    style={{ height: '100%', background: r.color, borderRadius: 99 }}
                  />
                </div>
                <p style={{ fontSize: 9, color: r.value > 70 ? '#1A65D3' : '#939A9E', fontWeight: 700, marginTop: 8 }}>
                  {r.value > 70 ? 'High' : r.value > 50 ? 'Moderate' : 'Normal'}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="layout-sys-split">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: E, delay: 0.12 }}
            style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={14} style={{ color: '#1A65D3' }} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>Feature Toggles</h3>
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#939A9E', fontWeight: 700 }}>
                {Object.values(toggles).filter(Boolean).length}/{Object.keys(toggles).length} enabled
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {modelSettings.map((s, i) => (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: E, delay: 0.2 + i * 0.05 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: 12, transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2', margin: '0 0 2px' }}>{s.label}</p>
                    <p style={{ fontSize: 10, color: '#939A9E', margin: 0 }}>{s.sub}</p>
                  </div>
                  <Toggle enabled={toggles[s.key]} onToggle={() => toggle(s.key)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: E, delay: 0.2 }}
              style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} style={{ color: '#1A65D3' }} />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>Model Parameters</h3>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 600 }}>Confidence Threshold</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#1A65D3', }}>{modelThreshold}%</span>
                </div>
                <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                    <div style={{ width: `${((modelThreshold - 40) / 55) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #1A65D3, #1A65D3)', borderRadius: 99 }} />
                  </div>
                  <input
                    type="range" min={40} max={95} value={modelThreshold}
                    onChange={e => setModelThreshold(Number(e.target.value))}
                    style={{ position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', height: 20 }}
                  />
                  <div style={{ position: 'absolute', left: `${((modelThreshold - 40) / 55) * 100}%`, transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#1A65D3', border: '2px solid #1A65D3', pointerEvents: 'none' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 9, color: '#939A9E' }}>40% Lenient</span>
                  <span style={{ fontSize: 9, color: '#939A9E' }}>95% Strict</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#939A9E', fontWeight: 600 }}>Cache Window</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#1A65D3', }}>{cacheWindow}m</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[5, 10, 15, 30, 60].map(m => (
                    <button
                      key={m} onClick={() => setCacheWindow(m)}
                      style={{ flex: 1, height: 30, borderRadius: 8, border: `1px solid ${cacheWindow === m ? 'rgba(26,101,211,0.5)' : 'rgba(255,255,255,0.08)'}`, background: cacheWindow === m ? 'rgba(26,101,211,0.14)' : 'transparent', color: cacheWindow === m ? '#F2F2F2' : '#939A9E', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 140ms' }}
                    >{m}m</button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: E, delay: 0.28 }}
              style={{ background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(26,101,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={14} style={{ color: '#1A65D3' }} />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F2', margin: 0 }}>Recent Deployments</h3>
              </div>

              {[
                { label: 'Model v2.4.1',         time: '2h ago', ok: true,  tag: 'Prediction' },
                { label: 'Pipeline patch 3.1',    time: '6h ago', ok: true,  tag: 'Data'       },
                { label: 'Config hotfix',         time: '1d ago', ok: true,  tag: 'Config'     },
                { label: 'Model v2.4.0 rollback', time: '2d ago', ok: false, tag: 'Prediction' },
              ].map((dep, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  {dep.ok
                    ? <CheckCircle size={12} style={{ color: '#1A65D3', flexShrink: 0 }} />
                    : <AlertTriangle size={12} style={{ color: '#1A65D3', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 11, fontWeight: 600, color: dep.ok ? '#F2F2F2' : '#939A9E', flex: 1 }}>{dep.label}</span>
                  <span style={{ fontSize: 9, color: '#939A9E', marginRight: 8 }}>{dep.time}</span>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#939A9E', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 99 }}>{dep.tag}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: E, delay: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}
        >
          <span style={{ fontSize: 11, color: '#939A9E', marginRight: 'auto' }}>Changes applied immediately on save</span>
          <button
            onClick={() => setToggles(defaultToggles)}
            style={{ height: 36, padding: '0 16px', borderRadius: 999, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#939A9E', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >Reset</button>
          <button
            onClick={handleSave}
            style={{ height: 36, padding: '0 20px', borderRadius: 999, background: saved ? '#1A65D3' : '#ffffff', color: '#F2F2F2', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 300ms' }}
          >
            {saved ? <><CheckCircle size={13} /> Saved!</> : <><Save size={13} /> Save Changes</>}
          </button>
        </motion.div>

      </div>
    </div>
  );
}
