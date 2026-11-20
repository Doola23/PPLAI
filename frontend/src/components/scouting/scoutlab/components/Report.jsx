import { useState, useMemo, useEffect } from "react";
import { Star, TrendUp, TrendDown, Warning, ChartBar, ChartLineUp, GitDiff, Question, ArrowLeft } from "@phosphor-icons/react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import PlayerAvatar from "../../../ui/PlayerAvatar";
import ClubLogo from "../../../ui/ClubLogo";
import { EMPTY_EXTRAS, fetchPlayerExtras } from "../data";
import { POS, ALL_A, IRK, TRJ, PTL, T, C } from "../constants";
import { gv, rc, sc, mv, getProfile } from "../engine";
import { Sec } from "./Section";
import { FormSection } from "./report/FormSection";
import { ShotMapSection } from "./report/ShotMapSection";
import { HeadToHeadSection } from "./report/HeadToHeadSection";
import { SimilarPlayersSection } from "./report/SimilarPlayersSection";
import { ArchetypeSection } from "./report/ArchetypeSection";
import { ValueContractSection } from "./report/ValueContractSection";
import { InjurySection } from "./report/InjurySection";

// ─── PLAYER REPORT ───
export function Report({player:p,idx,results,data,req,shortlist,onToggleShortlist,onBack,onShortlist}){
  const pg=req.posGroup!=='ALL'?req.posGroup:'FW';
  const [isMob,setIsMob]=useState(()=>typeof window!=='undefined'&&window.innerWidth<=600);
  useEffect(()=>{const h=()=>setIsMob(window.innerWidth<=600);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);
  const prof=useMemo(()=>getProfile(p,data.current,pg),[p,data,pg]);
  const str=prof.filter(s=>s.percentile>=75).slice(0,5);
  const weak=prof.filter(s=>s.percentile<50).slice(-3).reverse();
  const comps=results.filter(x=>x.Player!==p.Player).slice(0,3);

  // Previous season
  const prevP=useMemo(()=>{if(!data.previous)return null;const n=(p.Player||'').toLowerCase().trim();return data.previous.find(x=>(x.Player||'').toLowerCase().trim()===n)||null;},[data,p]);
  const prevProf=useMemo(()=>{if(!prevP||!data.previous)return[];return getProfile(prevP,data.previous,pg);},[prevP,data,pg]);

  // Shot map + match logs load per player when the report opens
  const playerKey=(p.Player||'').toLowerCase().trim();
  const [extras,setExtras]=useState(EMPTY_EXTRAS);
  useEffect(()=>{
    let cancelled=false;
    setExtras(EMPTY_EXTRAS);
    fetchPlayerExtras(playerKey).then(e=>{if(!cancelled)setExtras(e);});
    return()=>{cancelled=true;};
  },[playerKey]);
  const logs=extras.logs;

  // Radar data
  const radarData=useMemo(()=>{
    const cats=['goals','assists','shots','key_passes','tackles','interceptions','aerial','pressing'];
    // Mobile only: shorter axis labels so they aren't clipped at the side vertices (laptop
    // keeps the full names). Interceptions stays full per request.
    const SHORT={goals:'Goals',assists:'Assists',shots:'Shots',key_passes:'Key Pass',tackles:'Tackles',interceptions:'Interceptions',aerial:'Aerial',pressing:'Press'};
    return cats.map(k=>{const a=prof.find(x=>x.k===k);const full=ALL_A.find(x=>x.k===k)?.l?.split('/')[0]||k;return{attr:isMob?(SHORT[k]||full):full,value:a?.percentile||0};}).filter(d=>d.value>0);
  },[prof,isMob]);

  // Comparative analysis
  const compAnalysis=useMemo(()=>{
    return comps.map(c=>{
      const adv=[],dis=[];
      const metrics=[{l:"goals/90",k:"goals_per90"},{l:"xG/90",k:"xG_per90",alt:"npxg_per90"},{l:"assists/90",k:"assists_per90"},{l:"xA/90",k:"xA_per90",alt:"xag_per90"},{l:"shots/90",k:"shots_per90"},{l:"key passes/90",k:"key_passes_per90"},{l:"tackles/90",k:"tackles_won_per90",alt:"tackles_per90"},{l:"interceptions/90",k:"interceptions_per90"}];
      for(const m of metrics){
        const pv=+(p[m.k]||p[m.alt]||0),cv=+(c[m.k]||c[m.alt]||0);
        if(!pv&&!cv)continue;const d=pv-cv;if(Math.abs(d)>0.05&&cv>0&&Math.abs(d/cv)>0.1){
          const t=`${Math.abs(d).toFixed(2)} ${d>0?'higher':'lower'} ${m.l} (${pv.toFixed(2)} vs ${cv.toFixed(2)})`;
          d>0?adv.push(t):dis.push(t);
        }
      }
      const pmv=+(p.market_value_eur||0),cmv=+(c.market_value_eur||0);
      if(pmv>0&&cmv>0){if(pmv<cmv*0.8)adv.push(`${mv(p)} vs ${mv(c)} — significantly cheaper`);else if(pmv>cmv*1.2)dis.push(`${mv(p)} vs ${mv(c)} — more expensive`);}
      const pa=+(p.Age||0),ca=+(c.Age||0);
      if(pa&&ca&&Math.abs(pa-ca)>=2){pa<ca?adv.push(`${pa} vs ${ca}y — younger`):dis.push(`${pa} vs ${ca}y — older`);}
      return{player:c,adv,dis};
    });
  },[p,comps]);

  const shotData = extras.shots;

  // Season trend
  const trend=useMemo(()=>{
    if(!prevP)return[];
    return[{l:"Goals/90",c:"goals_per90"},{l:"Assists/90",c:"assists_per90"},{l:"xG/90",c:"xG_per90",alt:"npxg_per90"},{l:"xA/90",c:"xA_per90",alt:"xag_per90"},{l:"Shots/90",c:"shots_per90"},{l:"Tackles/90",c:"tackles_won_per90",alt:"tackles_per90"}].map(m=>{
      const cur=+(p[m.c]||p[m.alt]||0),prev=+(prevP[m.c]||prevP[m.alt]||0);
      if(!cur&&!prev)return null;
      const d=cur-prev;return{label:m.l,cur,prev,diff:d,pct:prev>0?((d/prev)*100).toFixed(0):'—'};
    }).filter(Boolean);
  },[p,prevP]);

  // Position pool + avg map for vs-average bars
  const posPool=useMemo(()=>pg&&pg!=='ALL'?data.current.filter(x=>x._ml_pos_group?x._ml_pos_group===pg:POS[pg]?.fn(x)):data.current,[data,pg]);
  const poolAvgMap=useMemo(()=>{
    const map={};
    for(const a of ALL_A){
      const vals=posPool.map(x=>gv(x,a.c,a.custom)).filter(v=>v!==null);
      if(vals.length>5){vals.sort((a,b)=>a-b);map[a.k]={avg:vals.reduce((s,v)=>s+v,0)/vals.length,max:vals[vals.length-1]||1};}
    }
    return map;
  },[posPool]);

  const mlKey = playerKey;
  const mlSim = extras.similar;
  // Use position override if WhoScored says WG but ML classified as MF
  const mlRoleRaw = data.ml?.roles?.[mlKey] || null;
  const mlRole = mlRoleRaw && p._pos_override && mlRoleRaw.pos_group !== p._pos_override
    ? {...mlRoleRaw, role: mlRoleRaw.role.replace('Attacking Midfielder','Inside Forward').replace('Creative Midfielder','Creative Winger').replace('Central Midfielder','Inverted Winger'), pos_group: p._pos_override}
    : mlRoleRaw;



  const vmv=+(p.market_value_eur||0);
  const goals=+(p.goals||p.Gls||0);
  const verdict=p.matchScore>=90?{r:'HIGHLY RECOMMENDED',a:'Pursue actively.',c:T.accent}:p.matchScore>=80?{r:'RECOMMENDED',a:'Strong candidate.',c:T.green}:p.matchScore>=70?{r:'WORTH MONITORING',a:'Good option, some gaps.',c:T.yellow}:p.matchScore>=60?{r:'CONDITIONAL',a:'Backup option.',c:T.orange}:{r:'NOT RECOMMENDED',a:'Does not match requirements.',c:T.red};

  return(
    <div className="scout-full-report" style={{maxWidth:1080,margin:'0 auto',padding:'24px 24px 60px',fontFamily:T.font}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,gap:12,flexWrap:'wrap'}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:999,background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.dim,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          <ArrowLeft size={13} weight="bold"/> Back to Results
        </button>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onShortlist} style={{...C.btn(false,T.accent),padding:'7px 14px',fontSize:12,border:`1px solid ${T.border}`,borderRadius:999,display:'inline-flex',alignItems:'center',gap:5}}><Star size={13} weight="fill"/> Shortlist {shortlist?.length>0?`(${shortlist.length})`:''}</button>
          <button onClick={()=>onToggleShortlist(p)} aria-label={shortlist?.includes(p.Player)?`Remove ${p.Player} from shortlist`:`Add ${p.Player} to shortlist`} aria-pressed={shortlist?.includes(p.Player)} style={{background:shortlist?.includes(p.Player)?'rgba(250,204,21,0.08)':'rgba(255,255,255,0.04)',border:`1px solid ${shortlist?.includes(p.Player)?'rgba(250,204,21,0.25)':T.border}`,borderRadius:999,cursor:'pointer',color:shortlist?.includes(p.Player)?'#facc15':T.dim,padding:'7px 11px',lineHeight:1,display:'inline-flex',alignItems:'center'}}><Star size={16} weight={shortlist?.includes(p.Player)?'fill':'regular'}/></button>
        </div>
      </div>

      {/* Header */}
      <div className="sfr-head" style={{...C.card,display:'flex',gap:16,alignItems:'center'}}>
        {/* Player Photo */}
        <div style={{position:'relative',flexShrink:0}}>
          <PlayerAvatar name={p.Player} src={p._img_url||undefined} playerId={p._player_id} size={108} style={{borderRadius:12}}/>
          <div style={{position:'absolute',bottom:-6,right:-6,width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:sc(p.matchScore),color:'#F2F2F2',fontWeight:900,fontSize:12,fontFamily:T.mono}}>{p.matchScore}</div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <h2 style={{fontSize:24,fontWeight:800,color:T.text,margin:0}}>{p.Player}</h2>
            <span style={C.tag(verdict.c)}>#{(idx||0)+1} · {verdict.r}</span>
            {p._trajectory&&<span style={{fontSize:12,fontWeight:800,color:TRJ[p._trajectory]?.c,padding:'2px 8px',borderRadius:5,background:TRJ[p._trajectory]?.c+'15'}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
            {p._potential_tier&&<span style={{fontSize:11,fontWeight:800,color:PTL[p._potential_tier]?.c,padding:'2px 8px',borderRadius:5,background:PTL[p._potential_tier]?.c+'15'}}>{p._potential_tier} · {p._potential_score}/100</span>}
            {p._injury_risk&&<span style={{fontSize:11,fontWeight:800,color:IRK[p._injury_risk]?.c,padding:'2px 8px',borderRadius:5,background:IRK[p._injury_risk]?.c+'15'}}>{p._injury_risk} Injury Risk</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,color:T.dim,margin:'4px 0 0',fontSize:13}}>
            <ClubLogo club={p.Squad} size={16}/>
            <span>{p.Squad} · {p.league} · {p._ml_role||p.Pos||p.position}</span>
          </div>
          <div style={{display:'flex',gap:16,marginTop:8,fontSize:12,color:T.dim,flexWrap:'wrap'}}>
            {[['Age',p.Age],['Height',p.height?p.height+'cm':''],['Foot',p.foot],['Nation',(p.citizenship||'').split(/\s{2,}/).filter(Boolean)[0]||null],['Minutes',p.Min?`${p.Min}'`:''],['Value',mv(p)],['Contract',p.contract_expires]].filter(x=>x[1]).map(([l,v])=>(
              <span key={l}>{l}: <b style={{color:T.text}}>{v}</b></span>
            ))}
            {p.whoscored_rating>0&&<span>WS Rating: <b style={{color:p.whoscored_rating>=7.5?T.green:p.whoscored_rating>=7?T.yellow:T.text}}>{(+p.whoscored_rating).toFixed(2)}</b></span>}
            {p.pass_success_pct>0&&<span>Pass%: <b style={{color:p.pass_success_pct>=88?T.green:p.pass_success_pct>=80?T.yellow:T.text}}>{p.pass_success_pct}%</b></span>}
          </div>
        </div>
      </div>

      {/* Radar + Match Breakdown side by side */}
      <div className="sfr-pair" style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap'}}>
        <div className="sfr-card" style={{...C.card,flex:'1 1 300px',minWidth:0,marginBottom:0}}>
          <div style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Player Profile</div>
          {radarData.length>=3&&<ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} {...(isMob?{outerRadius:'68%',margin:{top:6,right:24,bottom:6,left:24}}:{})}><PolarGrid stroke={T.border}/><PolarAngleAxis dataKey="attr" tick={{fill:T.dim,fontSize:isMob?10:11}}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/><Radar dataKey="value" stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2}/></RadarChart>
          </ResponsiveContainer>}
        </div>
        <div className="sfr-card" style={{...C.card,flex:'1 1 300px',minWidth:0,marginBottom:0}}>
          <div style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Match Breakdown <span style={{color:T.dim,fontWeight:400}}>{data.meta.currentSeason}</span></div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{flex:1,height:10,borderRadius:5,background:T.border,overflow:'hidden'}}><div style={{width:`${p.matchScore}%`,height:'100%',borderRadius:5,background:sc(p.matchScore)}}/></div>
            <span style={{fontWeight:900,color:sc(p.matchScore),fontSize:18,fontFamily:T.mono}}>{p.matchScore}</span>
          </div>
          {prof.slice(0,8).map(a=>(
            <div key={a.k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
              <span style={{width:90,fontSize:11,color:T.dim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.l}</span>
              <div style={{flex:1,height:5,borderRadius:3,background:T.border,overflow:'hidden'}}><div style={{width:`${a.percentile}%`,height:'100%',borderRadius:3,background:rc(a.percentile)}}/></div>
              <span style={{width:28,fontSize:11,fontWeight:700,color:rc(a.percentile),textAlign:'right',fontFamily:T.mono}}>{a.percentile}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="sfr-pair" style={{display:'flex',gap:16,marginBottom:0,flexWrap:'wrap'}}>
        <div style={{flex:'1 1 300px',minWidth:0}}>
        <Sec className="sfr-card" icon={TrendUp} title="Strengths" tag={data.meta.currentSeason}><div>
          {str.length?str.map(s=>(
            <div key={s.k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <TrendUp size={13} weight="bold" color={T.accent} aria-hidden="true" style={{flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:600,color:T.text}}>{s.l}</span>
              <span style={{fontSize:11,fontWeight:800,padding:'2px 8px',borderRadius:4,background:rc(s.percentile),color:'#F2F2F2'}}>{s.rating}</span>
              <span style={{fontSize:11,color:T.dim,fontFamily:T.mono,marginLeft:'auto'}}>{s.value?.toFixed(2)} · P{s.percentile}</span>
            </div>
          )):<p style={{color:T.dim,fontSize:13}}>No standout attributes</p>}
        </div></Sec>
        </div>
        {weak.length>0&&<div style={{flex:'1 1 300px',minWidth:0}}>
        <Sec className="sfr-card" icon={Warning} title="Development" tag={data.meta.currentSeason}><div>
          {weak.map(w=>(
            <div key={w.k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <TrendDown size={13} weight="bold" color={T.dim} aria-hidden="true" style={{flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:600,color:T.text}}>{w.l}</span>
              <span style={{fontSize:11,fontWeight:800,padding:'2px 8px',borderRadius:4,background:rc(w.percentile),color:'#F2F2F2'}}>{w.rating}</span>
              <span style={{fontSize:11,color:T.dim,fontFamily:T.mono,marginLeft:'auto'}}>{w.value?.toFixed(2)} · P{w.percentile}</span>
            </div>
          ))}
        </div></Sec>
        </div>}
      </div>

      {/* vs Position Average */}
      <Sec icon={ChartBar} title="vs Position Average" tag={POS[pg]?.label||pg}>
        <p style={{fontSize:11,color:T.dim,marginTop:-6,marginBottom:10}}>Bar = player value. Line marker (|) = position average. Bold = above average.</p>
        <div>
          {prof.slice(0,12).map(a=>{
            const stats=poolAvgMap[a.k];
            if(!stats||stats.max<=0)return null;
            const pp=Math.min(100,(a.value/stats.max)*100);
            const ap=Math.min(100,(stats.avg/stats.max)*100);
            const above=a.value>=stats.avg;
            return(
              <div key={a.k} style={{marginBottom:7}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:11,color:above?T.text:T.dim,fontWeight:above?700:400}}>{a.l}</span>
                  <span style={{fontSize:11,fontFamily:T.mono,color:above?rc(a.percentile):T.dim}}>
                    {a.value?.toFixed(2)} <span style={{color:T.dim,fontWeight:400}}>avg {stats.avg.toFixed(2)}</span>
                  </span>
                </div>
                <div style={{position:'relative',height:6,background:T.border,borderRadius:3}}>
                  <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${pp}%`,borderRadius:3,background:rc(a.percentile),opacity:0.85}}/>
                  <div style={{position:'absolute',top:-3,left:`${ap}%`,width:2,height:12,background:T.dim,transform:'translateX(-50%)',borderRadius:1}}/>
                </div>
              </div>
            );
          })}
        </div>
      </Sec>


      <FormSection logs={logs}/>

      <ShotMapSection shotData={shotData}/>

      {/* Season Trend */}
      {trend.length>0&&<Sec icon={ChartLineUp} title="Season-over-Season Trend" accent={T.accent2}>
        <div style={{display:'flex',gap:6,marginBottom:8,fontSize:11,color:T.dim}}>
          <span style={C.tag(T.accent2)}>{data.meta.previousSeason} → {data.meta.currentSeason}</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}>Club: <ClubLogo club={prevP?.Squad} size={13}/>{prevP?.Squad} → <ClubLogo club={p.Squad} size={13}/>{p.Squad}</span>
        </div>
        {trend.map(t=>{const up=t.diff>0.05,dn=t.diff<-0.05;return(
          <div key={t.label} style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{width:80,fontSize:12,color:T.dim}}>{t.label}</span>
            <span style={{width:50,fontSize:12,color:T.accent2,fontFamily:T.mono,textAlign:'right'}}>{t.prev.toFixed(2)}</span>
            <span style={{fontSize:13,color:up?T.green:dn?T.red:T.dim}}>{up?'→↑':dn?'→↓':'→'}</span>
            <span style={{width:50,fontSize:12,color:T.text,fontWeight:700,fontFamily:T.mono}}>{t.cur.toFixed(2)}</span>
            <span style={{fontSize:11,fontWeight:700,color:up?T.green:dn?T.red:T.dim}}>({t.diff>0?'+':''}{t.diff.toFixed(2)})</span>
          </div>
        );})}
      </Sec>}

      {/* Previous Season Deep Profile */}
      {prevProf.length>0&&<Sec icon={ChartBar} title="Previous Season Deep Profile" tag={data.meta.previousSeason} accent={T.accent2}>
        <p style={{fontSize:12,color:T.accent2,marginTop:-6,marginBottom:10}}>Advanced stats: progressive passes, aerial duels, take-ons, SCA, pressures</p>
        {prevProf.slice(0,12).map(a=>(
          <div key={a.k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
            <div style={{width:4,height:4,borderRadius:'50%',background:T.accent2,flexShrink:0}}/>
            <span style={{width:120,fontSize:11,color:T.dim}}>{a.l}</span>
            <div style={{flex:1,height:5,borderRadius:3,background:T.accent2+'20',overflow:'hidden'}}><div style={{width:`${a.percentile}%`,height:'100%',borderRadius:3,background:rc(a.percentile)}}/></div>
            <span style={{width:24,fontSize:11,fontWeight:700,color:rc(a.percentile),fontFamily:T.mono}}>{a.percentile}</span>
            <span style={{width:45,fontSize:11,color:T.dim,fontFamily:T.mono,textAlign:'right'}}>{a.value?.toFixed(2)}</span>
          </div>
        ))}
      </Sec>}

      {/* Comparison */}
      <Sec icon={GitDiff} title="Comparison"><div>
        <p style={{fontSize:11,color:T.dim,marginTop:-6,marginBottom:10}}>vs top matches from your search</p>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
              <th style={{padding:'6px 8px',textAlign:'left',color:T.dim}}></th>
              <th style={{padding:'6px 8px',textAlign:'center',color:T.accent,fontWeight:800}}>{p.Player}</th>
              {comps.map((c,i)=><th key={i} style={{padding:'6px 8px',textAlign:'center',color:T.text}}>{c.Player}</th>)}
            </tr></thead>
            <tbody>{[
              {l:'Score',f:x=>`${x.matchScore}/100`},{l:'Age',f:x=>x.Age},{l:'Value',f:x=>mv(x)},
              {l:'Goals',f:x=>+(x.goals||x.Gls||0)},{l:'xG',f:x=>(+(x.xG||0)).toFixed(1)},
              {l:'Assists',f:x=>+(x.assists||x.Ast||0)},{l:'G/90',f:x=>(+(x.goals_per90||0)).toFixed(2)},
              {l:'xG/90',f:x=>(+(x.xG_per90||x.npxg_per90||0)).toFixed(2)},
            ].map(r=>(
              <tr key={r.l} style={{borderBottom:`1px solid ${T.border}20`}}>
                <td style={{padding:'4px 8px',color:T.dim,fontWeight:600,fontSize:11}}>{r.l}</td>
                {[p,...comps].map((x,i)=><td key={i} style={{padding:'4px 8px',textAlign:'center',color:i===0?T.text:T.dim,fontWeight:i===0?700:400,fontFamily:T.mono}}>{r.f(x)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div></Sec>

      <HeadToHeadSection p={p} data={data} pg={pg} prof={prof}/>

      {/* Why This Player */}
      {compAnalysis.length>0&&<Sec icon={Question} title={`Why ${p.Player}?`}><div>
        {compAnalysis.map((c,i)=>(
          <div key={i} style={{marginBottom:12,padding:12,background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:8}}>vs {c.player.Player} <span style={{color:T.dim,fontWeight:400}}>({c.player.Squad}, {c.player.matchScore}/100, {mv(c.player)})</span></div>
            {c.adv.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:11,fontWeight:800,color:T.green,marginBottom:3}}>ADVANTAGES</div>{c.adv.map((a,j)=><div key={j} style={{fontSize:12,color:T.text,paddingLeft:12,marginBottom:2}}>• {a}</div>)}</div>}
            {c.dis.length>0&&<div><div style={{fontSize:11,fontWeight:800,color:T.orange,marginBottom:3}}>DISADVANTAGES</div>{c.dis.map((d,j)=><div key={j} style={{fontSize:12,color:T.text,paddingLeft:12,marginBottom:2}}>• {d}</div>)}</div>}
            {!c.adv.length&&!c.dis.length&&<p style={{color:T.dim,fontSize:12}}>Very similar profiles</p>}
          </div>
        ))}
      </div></Sec>}

      <SimilarPlayersSection mlSim={mlSim} data={data}/>

      <ArchetypeSection mlRole={mlRole} data={data}/>

      <ValueContractSection p={p} vmv={vmv} goals={goals}/>

      <InjurySection p={p}/>

      {/* Verdict */}
      <div style={{...C.card,border:`2px solid ${verdict.c}40`,background:verdict.c+'08'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <div style={{width:2,height:16,borderRadius:999,background:verdict.c,flexShrink:0}}/>
          <span style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>Scout's Verdict</span>
        </div>
        <div style={{marginBottom:10}}><span style={{fontWeight:900,color:verdict.c,fontSize:15}}>{verdict.r}</span></div>
        <p style={{fontSize:13,color:T.text,lineHeight:1.7}}>
          {p.Player} scores {p.matchScore}/100.{str.length?` Key strengths: ${str.map(s=>s.l.toLowerCase()).join(', ')}.`:''}{weak.length?` Areas to develop: ${weak.map(w=>w.l.toLowerCase()).join(', ')}.`:''} {verdict.a}
        </p>
      </div>
    </div>
  );
}
