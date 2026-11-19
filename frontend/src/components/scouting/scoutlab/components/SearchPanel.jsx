import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandPalm, Warning, UsersThree, Brain, CaretDown, MagnifyingGlass, SlidersHorizontal, X, Funnel } from "@phosphor-icons/react";
import ClubLogo from "../../../ui/ClubLogo";
import { CAT_ICON, POS, ATTR_CATS, ALL_A, thresholdCfg, BUDGET, POS_PRESETS, PTL, T, C, PRI_SEG, PRI_SEG_C, PRI_SEG_TEXT } from "../constants";
import { hasC } from "../engine";

// ─── SEARCH ───
// Collapsible panel — progressive disclosure to reduce filter clutter
export function Collapsible({title,summary,badge,defaultOpen=false,icon,children}){
  const[open,setOpen]=useState(defaultOpen);
  const Icon=typeof icon==='function'?icon:null;
  return(
    <div style={{...C.card,padding:0,marginBottom:12,overflow:'hidden'}}>
      <button onClick={()=>setOpen(o=>!o)} aria-expanded={open} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'15px 18px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
        {Icon&&<Icon size={16} weight="bold" color={T.accent} aria-hidden="true"/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:0.8}}>{title}</div>
          {!open&&summary&&<div style={{fontSize:13,color:T.dim,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{summary}</div>}
        </div>
        {badge!=null&&badge>0&&<span style={C.tag(T.accent)}>{badge}</span>}
        <CaretDown size={16} weight="bold" color={T.dim} aria-hidden="true" style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.22s ease',flexShrink:0}}/>
      </button>
      <AnimatePresence initial={false}>
        {open&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{type:'spring',stiffness:130,damping:22,opacity:{duration:0.18}}} style={{overflow:'hidden'}}>
            <div style={{padding:'0 18px 18px'}}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PrioritySegment({attrKey,label,value,onChange}){
  return(
    <div style={{display:'flex',background:'rgba(255,255,255,0.04)',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden',flexShrink:0}}>
      {PRI_SEG.map((seg,i)=>{
        const active=value===seg.k;
        return(
          <button key={seg.k}
            onClick={()=>onChange(attrKey,active?'none':seg.k)}
            aria-label={`Set ${label} to ${seg.label}`}
            aria-pressed={active}
            title={seg.label}
            style={{
              padding:'7px 13px',
              fontSize:12,fontWeight:700,
              background:active?PRI_SEG_C[seg.k]:'transparent',
              color:active?PRI_SEG_TEXT[seg.k]:'#555',
              border:'none',
              borderRight:i<PRI_SEG.length-1?'1px solid rgba(255,255,255,0.06)':'none',
              cursor:'pointer',fontFamily:'inherit',
              transition:'all 0.12s',
              letterSpacing:0.3,
              minWidth:38,
              lineHeight:1,
            }}
          >{seg.short}</button>
        );
      })}
    </div>
  );
}

export function AttrCategory({g,priorities,thresholds,uP,uT,gP,tooltip,setTooltip,defaultOpen}){
  const[open,setOpen]=useState(defaultOpen);
  const active=g.attrs.filter(a=>priorities[a.k]&&priorities[a.k]!=='none').length;
  const reqCount=g.attrs.filter(a=>priorities[a.k]==='required').length;
  const Icon=CAT_ICON[g.cat];
  return(
    <div style={{borderTop:`1px solid ${T.border}`}}>
      <button onClick={()=>setOpen(o=>!o)} aria-expanded={open} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'12px 0',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
        {Icon&&<Icon size={14} weight="bold" color={active?T.accent:T.dim} aria-hidden="true"/>}
        <span style={{flex:1,fontSize:15,fontWeight:700,color:active?T.text:T.dim,letterSpacing:0.2}}>{g.cat}</span>
        {g.note&&<span style={{fontSize:10,color:T.dim}}>{g.note}</span>}
        {reqCount>0&&<span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'#1A65D3',color:'#F2F2F2',letterSpacing:0.5}}>{reqCount}×!</span>}
        {active>0&&!reqCount&&<span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:4,background:'rgba(59,130,246,0.2)',color:'#3B82F6'}}>{active}</span>}
        <CaretDown size={12} weight="bold" color={T.dim} aria-hidden="true" style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.22s ease'}}/>
      </button>
      <AnimatePresence initial={false}>
        {open&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{type:'spring',stiffness:140,damping:22,opacity:{duration:0.16}}} style={{overflow:'hidden'}}>
            <div style={{paddingBottom:14}}>
              {/* Bulk actions */}
              <div style={{display:'flex',gap:4,marginBottom:12,alignItems:'center',justifyContent:'flex-end'}}>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontWeight:600,marginRight:4}}>All:</span>
                {[['!','required','Set all Must'],['H','high','Set all High'],['—','none','Clear all']].map(([lbl,val,title])=>(
                  <button key={val} onClick={()=>gP(g,val)} title={title} aria-label={title}
                    style={{padding:'3px 9px',fontSize:10,fontWeight:800,borderRadius:999,border:`1px solid ${val==='none'?T.border:'rgba(255,255,255,0.12)'}`,background:val==='required'?'#1A65D3':val==='high'?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.04)',color:val==='required'?'#F2F2F2':val==='high'?'#3B82F6':T.dim,cursor:'pointer',fontFamily:'inherit',minWidth:28,textAlign:'center'}}
                  >{lbl}</button>
                ))}
              </div>
              {g.attrs.map(a=>{
                const pri=priorities[a.k]||'none';
                const isActive=pri&&pri!=='none';
                return(
                  <div key={a.k} style={{marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      {/* Color bar indicator */}
                      <div style={{width:2,height:16,borderRadius:999,background:isActive?PRI_SEG_C[pri]:'rgba(255,255,255,0.08)',flexShrink:0,transition:'background 0.15s'}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <span style={{fontSize:15,color:isActive?T.text:T.dim,fontWeight:isActive?600:400,transition:'color 0.15s',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.l}</span>
                          {a.desc&&(
                            <span role="button" tabIndex={0} aria-label={a.desc}
                              style={{fontSize:10,color:T.dim,cursor:'help',position:'relative',flexShrink:0}}
                              onMouseEnter={()=>setTooltip(a.k)} onMouseLeave={()=>setTooltip(null)}
                              onFocus={()=>setTooltip(a.k)} onBlur={()=>setTooltip(null)}
                            >ⓘ{tooltip===a.k&&(
                              <span style={{position:'absolute',bottom:'120%',left:0,width:220,background:T.card2,border:`1px solid ${T.border}`,borderRadius:6,padding:'6px 8px',fontSize:11,color:T.text,lineHeight:1.4,zIndex:100,pointerEvents:'none',whiteSpace:'normal'}}>{a.desc}</span>
                            )}</span>
                          )}
                        </div>
                      </div>
                      <PrioritySegment attrKey={a.k} label={a.l} value={pri} onChange={uP}/>
                    </div>
                    {a.thresholdKey&&isActive&&(()=>{
                      const tc=thresholdCfg(a.thresholdKey);
                      return(
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginLeft:18,marginTop:4}}>
                        <span style={{fontSize:11,color:T.dim,minWidth:70,flexShrink:0}}>{a.thresholdLabel}:</span>
                        <input aria-label={`${a.thresholdLabel} for ${a.l}`} type="number"
                          min={tc.min} max={tc.max} step={tc.step}
                          value={thresholds[a.thresholdKey]||''}
                          onChange={e=>uT(a.thresholdKey,e.target.value)}
                          placeholder={tc.placeholder||'Min'}
                          style={{...C.input,flex:1,minWidth:80,padding:'3px 10px',fontSize:11,border:`1px solid ${thresholds[a.thresholdKey]?'#1A65D3':T.border}`}}/>
                        {thresholds[a.thresholdKey]&&<span style={{fontSize:10,color:'#1A65D3',fontWeight:800,letterSpacing:0.5}}>KNOCKOUT</span>}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Search({data,onSearch,clubCtx,forceValues,sidebar}){
  const leagues=useMemo(()=>[...new Set(data.current.map(p=>p.league).filter(Boolean))].sort(),[data]);
  const[f,setF]=useState({posGroup:'FW',ageMin:18,ageMax:35,budgetMin:'',budgetMax:'',heightMin:'',heightMax:'',foot:'Any',contractBefore:'',contractAfter:'',nationality:'',mlRole:[],leagues:[],minMinutes:450,priorities:{},thresholds:{},teamFormation:clubCtx?.formation||'4-3-3',teamStyle:clubCtx?.style||'',playerNeed:'',similarTo:'',subPos:'',potentialTier:'',gkMinSave:'',gkMaxGA:'',gkMinCS:''});
  const[tooltip,setTooltip]=useState(null);
  const isGK = f.posGroup === 'GK';
  const availMlRoles=useMemo(()=>{
    if(!data.current?.length) return [];
    const seen=new Set();
    data.current.forEach(p=>{
      if(p._ml_pos_group===f.posGroup&&p._ml_role) seen.add(p._ml_role);
    });
    return [...seen].sort();
  },[data,f.posGroup]);
  const availCats=useMemo(()=>ATTR_CATS.map(g=>{
    if(g.gkOnly && !isGK) return null;
    if(isGK && !g.gkOnly && g.cat !== 'Passing & Distribution') return null;
    const attrs = g.attrs.filter(a=>hasC(data.current,a.c)||hasC(data.current,a.z)||a.custom);
    if(!attrs.length) return null;
    return {...g, attrs};
  }).filter(Boolean),[data, isGK, f.posGroup]);

  // Initial league + priority setup
  useEffect(()=>{
    const d={};ALL_A.forEach(a=>{d[a.k]='none';});
    const pre=POS_PRESETS[f.posGroup]||{};
    const club=clubCtx?.autoWeights||{};
    setF(p=>({...p,priorities:{...d,...pre,...club},leagues:p.leagues.length?p.leagues:[...leagues]}));
  },[leagues]);

  // Apply forceValues when a suggestion card is clicked
  useEffect(()=>{
    if(!forceValues)return;
    const d={};ALL_A.forEach(a=>{d[a.k]='none';});
    const pre=POS_PRESETS[forceValues.posGroup]||{};
    const club=clubCtx?.autoWeights||{};
    setF(p=>({
      ...p,
      posGroup:forceValues.posGroup||p.posGroup,
      priorities:{...d,...pre,...forceValues.priorities,...club},
      teamFormation:forceValues.teamFormation||p.teamFormation,
      teamStyle:forceValues.teamStyle||p.teamStyle,
      thresholds:{...(forceValues.thresholds||{})},
      leagues:p.leagues.length?p.leagues:[...leagues],
    }));
  },[forceValues]);

  const applyPreset=pg=>{const d={};ALL_A.forEach(a=>{d[a.k]='none';});setF(p=>({...p,posGroup:pg,priorities:{...d,...(POS_PRESETS[pg]||{})},thresholds:{},mlRole:[],nationality:'',subPos:'',potentialTier:''}));};
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const uP=(k,v)=>setF(p=>({...p,priorities:{...p.priorities,[k]:v}}));
  const uT=(k,v)=>setF(p=>({...p,thresholds:{...p.thresholds,[k]:v}}));
  const tL=l=>setF(p=>({...p,leagues:p.leagues.includes(l)?p.leagues.filter(x=>x!==l):[...p.leagues,l]}));
  const gP=(g,v)=>setF(p=>{const n={...p.priorities};g.attrs.forEach(a=>{n[a.k]=v;});return{...p,priorities:n};});
  const ac=Object.values(f.priorities).filter(v=>v&&v!=='none').length;
  const reqc=Object.values(f.priorities).filter(v=>v==='required').length;
  const hc=Object.values(f.priorities).filter(v=>v==='high').length;

  const inputSt={...C.input,padding:'8px 12px',fontSize:13};
  const labelSt={...C.label,fontSize:11,marginBottom:4};
  const hasActiveFilters=reqc>0||Object.values(f.thresholds).some(v=>v)||f.contractBefore||f.contractAfter||f.mlRole?.length>0||f.nationality||f.subPos||f.potentialTier;
  return(
    <div style={{...(sidebar?{padding:'14px 14px 120px'}:{maxWidth:860,margin:'0 auto',padding:'24px 20px 40px'}),fontFamily:T.font}}>

      {/* ── Position selector ── */}
      {sidebar&&(
        <div style={{marginBottom:20}}>
          <div style={labelSt}>Position</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {Object.entries(POS).map(([k,v])=>(
              <motion.button key={k} onClick={()=>applyPreset(k)} whileTap={{scale:0.93}} animate={{background:f.posGroup===k?T.accent:'transparent',color:f.posGroup===k?'#F2F2F2':T.dim}} transition={{duration:0.15}} aria-pressed={f.posGroup===k} style={{padding:'5px 12px',fontSize:11,borderRadius:999,border:`1px solid ${f.posGroup===k?T.accent:'rgba(255,255,255,0.1)'}`,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>{v.label}</motion.button>
            ))}
          </div>
        </div>
      )}
      {!sidebar&&(
        <div style={{marginBottom:22}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
            {clubCtx?(
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <ClubLogo club={clubCtx.team} size={44}/>
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{fontSize:22,fontWeight:900,color:T.text,margin:'0 0 2px'}}>{clubCtx.team}</h2>
                  <p style={{color:T.dim,fontSize:14,margin:0}}>{clubCtx.formation} · {clubCtx.style} · 2024/25 Season</p>
                </div>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 11px',borderRadius:999,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <MagnifyingGlass size={12} weight="bold" color={T.accent} aria-hidden="true"/>
                <span style={{fontSize:12,fontWeight:600,color:T.dim}}>All Clubs</span>
              </div>
            )}
            <span style={{fontSize:12,color:'rgba(255,255,255,0.25)'}}>{data.current.length.toLocaleString()} players · {data.meta.currentSeason}</span>
          </div>
          <div role="group" aria-label="Filter by position" style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {Object.entries(POS).map(([k,v])=>(
              <motion.button key={k} onClick={()=>applyPreset(k)} whileTap={{scale:0.95}}
                animate={{background:f.posGroup===k?T.accent:'rgba(255,255,255,0.04)',color:f.posGroup===k?'#F2F2F2':T.dim,borderColor:f.posGroup===k?T.accent:'rgba(255,255,255,0.09)'}}
                transition={{type:'spring',stiffness:200,damping:22}} aria-pressed={f.posGroup===k}
                style={{padding:'8px 18px',fontSize:13,borderRadius:999,border:'1px solid',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}
              >{v.label}</motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-position (DF / WG only) ── */}
      {(f.posGroup==='DF'||f.posGroup==='WG')&&(
        <div style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <Funnel size={12} weight="bold" color={T.dim} aria-hidden="true"/>
            <span style={labelSt}>{f.posGroup==='DF'?'Defender Type':'Winger Side'}</span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {(f.posGroup==='DF'
              ?[['','All'],['CB','Centre-Back'],['LB','Left Back'],['RB','Right Back']]
              :[['','All'],['LW','Left'],['RW','Right']]
            ).map(([val,label])=>(
              <button key={val} onClick={()=>u('subPos',val)} aria-pressed={f.subPos===val}
                style={{...C.btn(f.subPos===val),padding:'6px 14px',fontSize:12,borderRadius:999}}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── GK thresholds ── */}
      {f.posGroup==='GK'&&(
        <div style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}>
            <HandPalm size={13} weight="bold" color={T.dim} aria-hidden="true"/>
            <span style={labelSt}>Goalkeeper Thresholds</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}} className="scout-filter-grid">
            <div>
              <label style={labelSt}>Min Save %</label>
              <input aria-label="Minimum Save percentage" type="number" min="50" max="100" step="1" value={f.gkMinSave} onChange={e=>u('gkMinSave',+e.target.value||'')} style={inputSt} placeholder="e.g. 68"/>
            </div>
            <div>
              <label style={labelSt}>Max GA / 90</label>
              <input aria-label="Maximum Goals Against per 90" type="number" min="0" max="4" step="0.1" value={f.gkMaxGA} onChange={e=>u('gkMaxGA',+e.target.value||'')} style={inputSt} placeholder="e.g. 1.2"/>
            </div>
            <div>
              <label style={labelSt}>Min Clean Sheet %</label>
              <input aria-label="Minimum Clean Sheet percentage" type="number" min="0" max="60" step="1" value={f.gkMinCS} onChange={e=>u('gkMinCS',+e.target.value||'')} style={inputSt} placeholder="e.g. 30"/>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters — always visible ── */}
      <div style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14}}>
          <SlidersHorizontal size={13} weight="bold" color={T.dim} aria-hidden="true"/>
          <span style={labelSt}>Filters</span>
        </div>

        {/* Row 1: Age / Budget / Minutes */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:10}} className="scout-filter-grid">
          <div><label style={labelSt}>Age Min</label><input aria-label="Age Min" type="number" min="15" max="45" step="1" value={f.ageMin} onChange={e=>u('ageMin',+e.target.value||'')} style={inputSt} placeholder="18"/></div>
          <div><label style={labelSt}>Age Max</label><input aria-label="Age Max" type="number" min="15" max="45" step="1" value={f.ageMax} onChange={e=>u('ageMax',+e.target.value||'')} style={inputSt} placeholder="35"/></div>
          <div><label style={labelSt}>Budget Max</label><select aria-label="Budget Max" value={f.budgetMax} onChange={e=>u('budgetMax',e.target.value?+e.target.value:'')} style={inputSt}>{BUDGET.map(b=><option key={`mx${b.v}`} value={b.v}>{b.l}</option>)}</select></div>
          <div><label style={labelSt}>Min Minutes</label><select aria-label="Minimum minutes played" value={f.minMinutes} onChange={e=>u('minMinutes',+e.target.value)} style={inputSt}>
            {[[0,'Any'],[450,'450+'],[900,'900+'],[1350,'1350+'],[1800,'1800+'],[2520,'Full season'],[3240,'Near full']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select></div>
        </div>

        {/* Row 2: Nationality / Foot / Height / Potential */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:12}} className="scout-filter-grid">
          <div><label style={labelSt}>Nationality</label><input aria-label="Nationality" value={f.nationality} onChange={e=>u('nationality',e.target.value)} style={inputSt} placeholder="e.g. Spanish"/></div>
          <div><label style={labelSt}>Foot</label><select aria-label="Preferred Foot" value={f.foot} onChange={e=>u('foot',e.target.value)} style={inputSt}>{['Any','Right','Left','Both'].map(x=><option key={x}>{x}</option>)}</select></div>
          <div><label style={labelSt}>Height Min (cm)</label><input aria-label="Height Min" type="number" min="155" max="215" step="1" value={f.heightMin} onChange={e=>u('heightMin',+e.target.value||'')} style={inputSt} placeholder="e.g. 175"/></div>
          <div><label style={labelSt}>Potential</label><select aria-label="Potential tier" value={f.potentialTier} onChange={e=>u('potentialTier',e.target.value)} style={inputSt}><option value=''>Any</option><option value='Developing'>Developing</option><option value='High Potential'>High Potential</option><option value='Elite Prospect'>Elite Prospect</option></select></div>
        </div>

        {/* Contract shortcuts */}
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:12}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:600}}>Contract:</span>
          {[['Free Agents',()=>{const d=new Date();d.setMonth(d.getMonth()+3);u('contractBefore',d.toISOString().slice(0,10));}],['Expiring 12m',()=>{const d=new Date();d.setMonth(d.getMonth()+12);u('contractBefore',d.toISOString().slice(0,10));}],['Any',()=>{u('contractBefore','');u('contractAfter','');}]].map(([l,fn])=>(
            <button key={l} onClick={fn} style={{...C.btn(l==='Any'&&!f.contractBefore&&!f.contractAfter),padding:'5px 12px',fontSize:11,borderRadius:999,border:`1px solid ${T.border}`}}>{l}</button>
          ))}
          {f.contractBefore&&<span style={{fontSize:11,color:T.dim}}>before {f.contractBefore}</span>}
        </div>

        {/* Leagues */}
        <div>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:600,marginRight:6}}>Leagues:</span>
          <div style={{display:'inline-flex',flexWrap:'wrap',gap:5,marginTop:4}}>
            {leagues.map(l=><button key={l} onClick={()=>tL(l)} aria-pressed={f.leagues.includes(l)} style={{...C.btn(f.leagues.includes(l)),padding:'4px 11px',fontSize:11,borderRadius:999}}>{l}</button>)}
          </div>
        </div>
      </div>

      {/* ── Attribute Priorities ── */}
      <div style={{marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
            <span style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:0.8}}>Priorities</span>
            {reqc>0&&<span style={C.tag('#1A65D3')}>{reqc}!</span>}
            {hc>0&&<span style={C.tag(T.accent)}>{hc}H</span>}
            {ac>0&&<span style={{fontSize:11,color:T.dim}}>{ac} set</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            {/* Legend dots */}
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {PRI_SEG.filter(s=>s.k!=='none').reverse().map(seg=>(
                <div key={seg.k} style={{display:'flex',alignItems:'center',gap:3}}>
                  <div style={{width:8,height:8,borderRadius:999,background:PRI_SEG_C[seg.k],flexShrink:0}}/>
                  <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{seg.label}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>applyPreset(f.posGroup)} title="Reset" aria-label="Reset attribute priorities" style={{...C.btn(false),padding:'4px 10px',fontSize:11,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:3}}>
              <X size={9} weight="bold" aria-hidden="true"/> Reset
            </button>
          </div>
        </div>

        {ac===0&&(
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:8,background:'rgba(26,101,211,0.06)',border:'1px solid rgba(26,101,211,0.2)',marginBottom:14}}>
            <Warning size={14} weight="fill" color={T.accent} aria-hidden="true"/>
            <span style={{fontSize:12,color:T.dim}}>No attributes active — all players will score equally</span>
          </div>
        )}

        <div style={{border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',background:'rgba(255,255,255,0.01)'}}>
          {availCats.map((g,gi)=>(
            <AttrCategory key={g.cat} g={g} priorities={f.priorities} thresholds={f.thresholds}
              uP={uP} uT={uT} gP={gP} tooltip={tooltip} setTooltip={setTooltip} defaultOpen={gi===0}/>
          ))}
        </div>
      </div>

      {/* ── Advanced: Role Archetype + Team Context ── */}
      {availMlRoles.length>0&&(
        <Collapsible title="Role Archetype" icon={Brain} badge={f.mlRole.length} defaultOpen={false}
          summary={f.mlRole.length>0?f.mlRole.join(', '):'Optional ML filter'}>
          {f.mlRole.length>0&&<button onClick={()=>u('mlRole',[])} style={{...C.btn(false),fontSize:11,padding:'3px 10px',marginBottom:10,border:`1px solid ${T.border}`}}>Clear</button>}
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {availMlRoles.map(r=>{
              const on=f.mlRole.includes(r);
              return(<button key={r} onClick={()=>u('mlRole',on?f.mlRole.filter(x=>x!==r):[...f.mlRole,r])} aria-pressed={on} style={{...C.btn(on,T.accent2),padding:'5px 13px',fontSize:11,borderRadius:999,border:on?'none':`1px solid ${T.border}`}}>{r}</button>);
            })}
          </div>
        </Collapsible>
      )}

      <Collapsible title="Team Context" icon={UsersThree} defaultOpen={false}
        summary={`${f.teamFormation}${f.teamStyle?` · ${f.teamStyle}`:''}${f.similarTo?` · similar to ${f.similarTo}`:''}`}>
        <div style={{display:'flex',gap:10,marginBottom:12}} className="scout-filter-grid">
          <div style={{flex:1}}><label style={labelSt}>Formation</label><select aria-label="Team Formation" value={f.teamFormation} onChange={e=>u('teamFormation',e.target.value)} style={inputSt}>{['4-3-3','4-2-3-1','3-5-2','4-4-2','3-4-3','5-3-2','4-1-4-1'].map(x=><option key={x}>{x}</option>)}</select></div>
          <div style={{flex:1}}><label style={labelSt}>Playing Style</label><select aria-label="Team Playing Style" value={f.teamStyle} onChange={e=>u('teamStyle',e.target.value)} style={inputSt}><option value="">Any</option>{['Possession','Counter-attack','High Press','Direct Play','Gegenpressing'].map(x=><option key={x}>{x}</option>)}</select></div>
        </div>
        <label style={labelSt}>Similar to player</label>
        <input aria-label="Similar to Existing Player" value={f.similarTo} onChange={e=>u('similarTo',e.target.value)} placeholder="e.g. Pedri, Salah, Haaland" style={inputSt}/>
      </Collapsible>

      {/* ── Knockout filters summary ── */}
      {hasActiveFilters&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:5,padding:'10px 14px',borderRadius:8,background:'rgba(26,101,211,0.06)',border:'1px solid rgba(26,101,211,0.18)',marginBottom:12,marginTop:8}}>
          <span style={{fontSize:11,fontWeight:800,color:T.accent,marginRight:4,flexShrink:0}}>KNOCKOUT:</span>
          {reqc>0&&<span style={C.tag('#1A65D3')}>{reqc} required attrs</span>}
          {Object.entries(f.thresholds).filter(([,v])=>v).map(([k,v])=>(
            <span key={k} style={C.tag('#1A65D3')}>{k.replace(/_per90/,'').replace(/_/g,' ')} ≥ {v}</span>
          ))}
          {f.subPos&&<span style={C.tag('#1A65D3')}>{f.subPos==='LB'?'Left Back':f.subPos==='RB'?'Right Back':f.subPos==='CB'?'CB':f.subPos==='LW'?'LW':f.subPos==='RW'?'RW':f.subPos}</span>}
          {f.mlRole?.length>0&&<span style={C.tag('#1A65D3')}>{f.mlRole.join(' / ')}</span>}
          {f.nationality&&<span style={C.tag('#1A65D3')}>{f.nationality}</span>}
          {f.potentialTier&&<span style={C.tag(PTL[f.potentialTier]?.c||T.accent)}>{f.potentialTier}</span>}
          {f.contractBefore&&<span style={C.tag('#1A65D3')}>≤ {f.contractBefore}</span>}
        </div>
      )}

      {/* ── Search button ── */}
      <div style={{position:'sticky',bottom:16,zIndex:20,marginTop:10}}>
        <motion.button onClick={()=>onSearch(f)} whileHover={{scale:1.02,boxShadow:'0 12px 40px rgba(26,101,211,0.55)'}} whileTap={{scale:0.97}} transition={{type:'spring',stiffness:300,damping:22}}
          style={{width:'100%',padding:'16px 24px',borderRadius:999,border:'none',cursor:'pointer',background:T.accent,color:'#F2F2F2',fontSize:15,fontWeight:800,letterSpacing:0.3,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:'0 8px 32px rgba(26,101,211,0.40)'}}>
          <MagnifyingGlass size={17} weight="bold" aria-hidden="true"/>
          Search Players
          {ac>0&&<span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'rgba(255,255,255,0.18)'}}>{ac} attribute{ac>1?'s':''}</span>}
        </motion.button>
      </div>
    </div>
  );
}
