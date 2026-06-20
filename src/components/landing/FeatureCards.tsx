import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../../hooks/useReveal';
import { injuriesService } from '../../services/injuries.service';

const SplineLazy = lazy(() => import('@splinetool/react-spline'));

const MATCH_SETS: Record<string, { home:string; away:string; hw:number; dw:number; aw:number; conf:number }[]> = {
  this: [
    { home:'MCI', away:'LIV', hw:45, dw:28, aw:27, conf:91 },
    { home:'ARS', away:'CHE', hw:52, dw:24, aw:24, conf:87 },
    { home:'TOT', away:'MUN', hw:38, dw:30, aw:32, conf:83 },
  ],
  next: [
    { home:'NEW', away:'BHA', hw:48, dw:26, aw:26, conf:79 },
    { home:'AVL', away:'WOL', hw:56, dw:22, aw:22, conf:85 },
    { home:'FUL', away:'CRY', hw:41, dw:31, aw:28, conf:72 },
  ],
  top: [
    { home:'MCI', away:'BUR', hw:78, dw:15, aw: 7, conf:96 },
    { home:'LIV', away:'BOU', hw:71, dw:18, aw:11, conf:94 },
    { home:'ARS', away:'LUT', hw:74, dw:17, aw: 9, conf:93 },
  ],
};

const XG_SETS: Record<string, { name:string; xg:number }[]> = {
  season: [
    { name:'E. Haaland',   xg:0.91 },
    { name:'M. Salah',     xg:0.82 },
    { name:'O. Marmoush',  xg:0.78 },
    { name:'O. Watkins',   xg:0.74 },
    { name:'C. Palmer',    xg:0.61 },
  ],
  l5: [
    { name:'O. Marmoush',  xg:1.14 },
    { name:'E. Haaland',   xg:1.10 },
    { name:'C. Palmer',    xg:0.95 },
    { name:'M. Salah',     xg:0.70 },
    { name:'A. Isak',      xg:0.68 },
  ],
};

const PROB_SETS: Record<string, { label:string; team:string; prob:number; color:string }[]> = {
  base: [
    { label:'Title',      team:'MCI', prob:38, color:'#1A65D3' },
    { label:'Top 4',      team:'ARS', prob:74, color:'#1A65D3' },
    { label:'Relegation', team:'BUR', prob:61, color:'#1A65D3' },
    { label:'UCL Group',  team:'LIV', prob:91, color:'#1A65D3' },
  ],
  form: [
    { label:'Title',      team:'ARS', prob:44, color:'#1A65D3' },
    { label:'Top 4',      team:'TOT', prob:58, color:'#1A65D3' },
    { label:'Relegation', team:'SHU', prob:82, color:'#1A65D3' },
    { label:'UCL Group',  team:'MCI', prob:88, color:'#1A65D3' },
  ],
  injury: [
    { label:'Title',      team:'LIV', prob:41, color:'#1A65D3' },
    { label:'Top 4',      team:'NEW', prob:52, color:'#1A65D3' },
    { label:'Relegation', team:'LUT', prob:77, color:'#1A65D3' },
    { label:'UCL Group',  team:'ARS', prob:85, color:'#1A65D3' },
  ],
};

function useSpotlight(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', handler);
    return () => el.removeEventListener('pointermove', handler);
  }, []);
}


function BigStat({ value, unit = '' }: { value: number; unit?: string }) {
  const ref  = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el || done.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; done.current = true; io.disconnect();
      const dur = 1600, start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = String(Math.round((1 - Math.pow(1-p,3)) * value));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>0</span>;
}

function MatchCard({ navigate }: { navigate: (p: string) => void }) {
  const [tab, setTab] = useState('this');
  const cardRef = useRef<HTMLElement>(null);
  const revRef  = useRef<HTMLElement>(null);
  useSpotlight(cardRef as React.RefObject<HTMLElement>);
  useReveal(revRef as React.RefObject<HTMLElement>);

  const matches = MATCH_SETS[tab];

  return (
    <article
      ref={(el) => { (cardRef as any).current = el; (revRef as any).current = el; }}
      className="lcard lcard--match lreveal"
      style={{ '--reveal-x': '-44px', '--reveal-delay': '0ms' } as React.CSSProperties}
      onClick={() => navigate('/match-predictions')}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:18 }}>
        <div>
          <div className="lcard__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h3 className="lcard__title">Match Prediction</h3>
          <p className="lcard__sub">AI calculates win / draw / loss probabilities with live lineup and form data.</p>
        </div>
        <div className="lcard__tag"><span className="dot" />Live</div>
      </div>

      <div className="lseg" onClick={e => e.stopPropagation()}>
        {[['this','This week'],['next','Next week'],['top','Top picks']].map(([key,label]) => (
          <button key={key} aria-selected={tab===key ? 'true' : 'false'} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div className="lmatches" style={{ marginTop: 14 }}>
        <div className="lmatch__head">
          <span>Fixture</span>
          <span style={{ display:'flex', justifyContent:'space-around' }}><span>H</span><span>D</span><span>A</span></span>
          <span style={{ textAlign:'right' }}>Conf.</span>
        </div>
        {matches.map((m) => (
          <div key={`${m.home}-${m.away}`} className="lmatch">
            <div className="lmatch__teams">
              <span>{m.home}</span><span className="vs">vs</span><span>{m.away}</span>
            </div>
            <div className="lmatch__bars">
              <span style={{ width: `${m.hw}%` }} />
              <span style={{ width: `${m.dw}%` }} />
              <span style={{ width: `${m.aw}%` }} />
            </div>
            <div className="lmatch__conf">{m.conf}%</div>
          </div>
        ))}
      </div>

      <button className="lcard__foot" onClick={e => { e.stopPropagation(); navigate('/match-predictions'); }}>Open Predictions</button>
    </article>
  );
}

function AccuracyCard({ navigate }: { navigate: (p: string) => void }) {
  const cardRef = useRef<HTMLElement>(null);
  useSpotlight(cardRef as React.RefObject<HTMLElement>);
  useReveal(cardRef as React.RefObject<HTMLElement>);
  return (
    <article ref={cardRef as React.RefObject<HTMLElement>} className="lcard lcard--acc lreveal"
      style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', '--reveal-x': '44px', '--reveal-delay': '80ms' } as React.CSSProperties}
      onClick={() => navigate('/dashboard')}>
      <div>
        <div className="lcard__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
        </div>
        <h3 className="lcard__title">Prediction Accuracy</h3>
        <p className="lcard__sub">Validated with walk-forward cross-validation across three full seasons.</p>
      </div>
      <div>
        <div className="lbigstat"><BigStat value={53} /><span className="unit">%</span></div>
        <div className="lbigstat__cap">3-season test average (2022-24)</div>
      </div>
    </article>
  );
}

function InjuryCard({ navigate }: { navigate: (p: string) => void }) {
  const cardRef = useRef<HTMLElement>(null);
  useSpotlight(cardRef as React.RefObject<HTMLElement>);
  useReveal(cardRef as React.RefObject<HTMLElement>);
  const [highRiskCount, setHighRiskCount] = useState(0);
  useEffect(() => {
    injuriesService.getPredictions()
      .then(rows => setHighRiskCount(rows.filter(p => injuriesService.riskLevel(p) === 'High').length))
      .catch(() => {});
  }, []);
  return (
    <article ref={cardRef as React.RefObject<HTMLElement>} className="lcard lcard--inj lreveal"
      style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', '--reveal-x': '-44px', '--reveal-delay': '160ms' } as React.CSSProperties}
      onClick={() => navigate('/injury-risk')}>
      <div>
        <div className="lcard__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <h3 className="lcard__title">Injury Risk</h3>
        <p className="lcard__sub">Load monitoring + fatigue signals flag issues before they happen.</p>
      </div>
      <div>
        <div className="lbigstat"><BigStat value={highRiskCount} /></div>
        <div className="lbigstat__cap">High-risk flags raised this season</div>
      </div>
    </article>
  );
}

function AnalyticsCard({ navigate }: { navigate: (p: string) => void }) {
  const [xgTab, setXgTab] = useState('season');
  const cardRef = useRef<HTMLElement>(null);
  const revRef  = useRef<HTMLElement>(null);
  useSpotlight(cardRef as React.RefObject<HTMLElement>);
  useReveal(revRef as React.RefObject<HTMLElement>);

  const players = XG_SETS[xgTab];
  const max = Math.max(...players.map(p => p.xg));

  return (
    <article
      ref={(el) => { (cardRef as any).current = el; (revRef as any).current = el; }}
      className="lcard lcard--ana lreveal"
      style={{ '--reveal-x': '44px', '--reveal-delay': '240ms' } as React.CSSProperties}
      onClick={() => navigate('/injury-risk')}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:18 }}>
        <div>
          <div className="lcard__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="3" x2="3" y2="21"/><line x1="3" y1="21" x2="21" y2="21"/><rect x="7" y="13" width="3" height="6"/><rect x="12" y="9" width="3" height="10"/><rect x="17" y="5" width="3" height="14"/></svg>
          </div>
          <h3 className="lcard__title">Player Analytics</h3>
          <p className="lcard__sub">xG, xA, progressive carries, heatmaps — deep profiles on every player in every league.</p>
        </div>
        <div className="lcard__tag lcard__tag--muted"><span className="dot" />2024 / 25</div>
      </div>

      <div style={{ background:'#000000', border:'1px solid #000000', borderRadius:14, padding:'16px 18px' }}>
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom:14 }}>
          <span style={{ fontSize:11, letterSpacing:'0.18em', textTransform:'uppercase', color:'#939A9E' }}>Expected Goals (xG) — Top 5</span>
          <div className="lseg" onClick={e => e.stopPropagation()}>
            {[['season','Season'],['l5','Last 5']].map(([key,label]) => (
              <button key={key} aria-selected={xgTab===key ? 'true' : 'false'} onClick={() => setXgTab(key)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="lxg">
          {players.map(p => (
            <div key={p.name} className="lxg__row">
              <span className="lxg__name">{p.name}</span>
              <div className="lxg__track"><div className="lxg__fill" style={{ width: `${(p.xg/max)*100}%` }} /></div>
              <span className="lxg__val">{p.xg.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="lcard__foot" onClick={e => { e.stopPropagation(); navigate('/injury-risk'); }}>Injury Risk</button>
    </article>
  );
}

function TableCard({ navigate }: { navigate: (p: string) => void }) {
  const [scen, setScen] = useState('base');
  const cardRef = useRef<HTMLElement>(null);
  const revRef  = useRef<HTMLElement>(null);
  useSpotlight(cardRef as React.RefObject<HTMLElement>);
  useReveal(revRef as React.RefObject<HTMLElement>);

  const probs = PROB_SETS[scen];

  return (
    <article
      ref={(el) => { (cardRef as any).current = el; (revRef as any).current = el; }}
      className="lcard lcard--tbl lreveal"
      style={{ display:'flex', flexDirection:'column', gap:20, '--reveal-delay': '320ms' } as React.CSSProperties}
      onClick={() => navigate('/table-predictions')}
    >
      <div className="flex flex-wrap justify-between items-start gap-6">
        <div>
          <div className="lcard__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h3 className="lcard__title" style={{ marginTop:14 }}>Table Predictions</h3>
          <p className="lcard__sub">2,000 Monte Carlo season simulations — title odds, relegation %, UCL slots.</p>
        </div>
        <div className="lseg" onClick={e => e.stopPropagation()}>
          {[['base','Base'],['form','Form'],['injury','Injuries']].map(([key,label]) => (
            <button key={key} aria-selected={scen===key ? 'true' : 'false'} onClick={() => setScen(key)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="lprob-grid">
        {probs.map(p => (
          <div key={p.label} className="lprob">
            <div className="lprob__top">
              <span>{p.label}</span>
              <span className="lprob__team">{p.team}</span>
            </div>
            <div className="lprob__bar"><div style={{ background: p.color, width: `${p.prob}%` }} /></div>
            <span className="lprob__val">{p.prob}<span style={{ color:'#1A65D3', fontSize:20 }}>%</span></span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function FeatureCards() {
  const navigate     = useNavigate();
  const headRef      = useRef<HTMLDivElement>(null);
  const [pillsIn, setPillsIn] = useState(false);
  const [splineInView, setSplineInView] = useState(false);

  useEffect(() => {
    const el = headRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="lsection" id="features" style={{ background: '#000000', position: 'relative', zIndex: 1 }}>
      <div className="mx-auto px-6 sm:px-8" style={{ maxWidth: 1240 }}>

        <div ref={headRef} className="lreveal lreveal--head" style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 className="lsection__title" style={{ fontSize: 'clamp(32px, 4vw, 58px)', marginTop: 16 }}>
            Five pillars of football intelligence
          </h2>
        </div>

        <div
          ref={(el) => {
            if (!el) return;
            const io = new IntersectionObserver(([e]) => {
              if (e.isIntersecting) {
                el.classList.add('in');
                setSplineInView(true);
                setTimeout(() => setPillsIn(true), 600);
                io.disconnect();
              }
            }, { threshold: 0.1 });
            io.observe(el);
          }}
          className="lreveal lspline-box"
          style={{
            '--reveal-y': '48px',
            '--reveal-blur': '6px',
            '--reveal-delay': '120ms',
            marginBottom: 56,
            position: 'relative',
            width: '100%',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: 'none',
          } as React.CSSProperties}
        >
          {splineInView && (
            <Suspense fallback={null}>
              <SplineLazy
                scene="https://prod.spline.design/wyb7RJWNakOpAWBy/scene.splinecode"
                style={{ width: '100%', height: '100%', mixBlendMode: 'screen' }}
              />
            </Suspense>
          )}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to bottom, transparent, #000000)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 180, height: 80,
            background: '#000000',
            pointerEvents: 'none',
          }} />

          {[
            { label: 'Match Predictions',  icon: '', color: '#1A65D3', path: '/match-predictions', top: '18%',  left: '8%',   floatDelay: '0s',   enterDelay: 0   },
            { label: 'Scout Search',       icon: '', color: '#1A65D3', path: '/scout-search',      top: '28%',  right: '7%',  floatDelay: '1.8s', enterDelay: 150 },
            { label: 'Table Predictions',  icon: '', color: '#1A65D3', path: '/table-predictions', top: '46%',  left: '6%',   floatDelay: '3.2s', enterDelay: 300 },
            { label: 'Injury Risk',        icon: '', color: '#1A65D3', path: '/injury-risk',       top: '60%',  right: '8%',  floatDelay: '0.9s', enterDelay: 450 },
            { label: 'Player Predictions', icon: '', color: '#1A65D3', path: '/player-stats',      top: '74%',  left: '6%',   floatDelay: '2.4s', enterDelay: 600 },
          ].map(({ label, icon, color, path, top, left, right, floatDelay, enterDelay }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="lspline-pill"
              style={{
                position: 'absolute', top, left, right,
                zIndex: 20,
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 22px',
                background: 'rgba(0,0,0,0.88)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(26,101,211,0.25)',
                borderRadius: 999,
                cursor: 'pointer',
                animation: pillsIn
                  ? `lpill-in 0.6s cubic-bezier(0.16,1,0.3,1) ${enterDelay}ms both, lfloat 7s ease-in-out ${floatDelay} infinite`
                  : 'none',
                opacity: pillsIn ? undefined : 0,
                transition: 'border-color 220ms ease, box-shadow 220ms ease',
              } as React.CSSProperties}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px ${color}40, 0 8px 32px rgba(0,0,0,0.5)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                {label}
              </div>
            </button>
          ))}
        </div>

        <div className="lfeatures__grid" id="insights">
          <MatchCard     navigate={navigate} />
          <AccuracyCard  navigate={navigate} />
          <InjuryCard    navigate={navigate} />
          <AnalyticsCard navigate={navigate} />
          <TableCard     navigate={navigate} />
        </div>

      </div>
    </section>
  );
}
