import { useState, useMemo, useEffect } from "react";
import { Star, TrendUp, TrendDown, Warning, ChartBar, ChartLineUp, CalendarBlank, Crosshair, Scales, UsersThree, Brain, Heartbeat, GitDiff, Question, ArrowLeft } from "@phosphor-icons/react";
import { BarChart,Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import PlayerAvatar from "../../../ui/PlayerAvatar";
import ClubLogo from "../../../ui/ClubLogo";
import { EMPTY_EXTRAS, fetchPlayerExtras } from "../data";
import { POS, ALL_A, IRK, TRJ, PTL, T, C } from "../constants";
import { gv, rc, sc, mv, getProfile } from "../engine";
import { Sec } from "./Section";

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

  // Standalone player comparison
  const[compareQ,setCompareQ]=useState('');
  const[compareP,setCompareP]=useState(null);
  const compareMatches=useMemo(()=>{
    const q=compareQ.trim().toLowerCase();
    if(q.length<2)return[];
    return data.current.filter(x=>x.Player&&x.Player.toLowerCase().includes(q)&&x.Player!==p.Player).slice(0,8);
  },[compareQ,data,p]);
  const comparePProf=useMemo(()=>{if(!compareP)return[];return getProfile(compareP,data.current,pg);},[compareP,data,pg]);
  const compareRadarData=useMemo(()=>{
    const cats=['goals','assists','shots','key_passes','tackles','interceptions','aerial','pressing'];
    return cats.map(k=>{
      const a=prof.find(x=>x.k===k);
      const b=comparePProf.find(x=>x.k===k);
      return{attr:ALL_A.find(x=>x.k===k)?.l?.split('/')[0]||k,me:a?.percentile||0,them:b?.percentile||0};
    }).filter(d=>d.me>0||d.them>0);
  },[prof,comparePProf]);


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


      {/* Last 10 Games */}
      <Sec icon={CalendarBlank} title="Form & Recent Matches" tag={logs?`${Math.min(10,logs.length)} games`:null}>
        {logs?(()=>{
          const last=logs.slice(0,10);
          const tG=last.reduce((s,m)=>s+m.g,0),tA=last.reduce((s,m)=>s+m.a,0),tXG=last.reduce((s,m)=>s+m.xg,0);
          const scored=last.filter(m=>m.g>0).length;
          return(<>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={last.map(m=>({date:m.d.slice(5),goals:m.g,xG:m.xg,opp:`${m.ht} v ${m.at}`})).reverse()}>
                <XAxis dataKey="date" tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false} domain={[0,'auto']}/>
                <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,fontFamily:T.font}} labelStyle={{color:T.text}} itemStyle={{color:T.dim}}/>
                <Bar dataKey="goals" fill={T.green} radius={[3,3,0,0]} name="Goals"/>
                <Bar dataKey="xG" fill={T.accent+'60'} radius={[3,3,0,0]} name="xG"/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:'flex',gap:20,marginTop:8,flexWrap:'wrap'}}>
              {[[`${tG} goals`],[`${tA} assists`],[`${tXG.toFixed(1)} xG`],[`${scored}/${last.length} scored in`]].map(([v],j)=>(
                <span key={j} style={{fontSize:13,color:T.dim}}><b style={{color:T.text}}>{v}</b></span>
              ))}
            </div>
            <div style={{marginTop:12,overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {['Date','Match','Min','G','A','S','KP','xG','xA'].map(h=><th key={h} style={{padding:'4px 8px',color:T.dim,fontWeight:600,textAlign:'center',fontSize:11}}>{h}</th>)}
                </tr></thead>
                <tbody>{last.map((m,i)=>{
                  const win=m.r==='w',loss=m.r==='l';
                  return(<tr key={i} style={{borderBottom:`1px solid ${T.border}15`,background:win?T.green+'08':loss?T.red+'08':'transparent'}}>
                    <td style={{padding:'4px 8px',color:T.dim,fontSize:11,fontFamily:T.mono}}>{m.d.slice(5)}</td>
                    <td style={{padding:'4px 8px',color:T.text,fontSize:11}}>{m.ht} v {m.at}</td>
                    <td style={{padding:'4px 8px',color:T.dim,textAlign:'center',fontFamily:T.mono}}>{m.t}'</td>
                    <td style={{padding:'4px 8px',textAlign:'center',fontWeight:m.g?800:400,color:m.g?T.green:T.dim,fontFamily:T.mono}}>{m.g}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',fontWeight:m.a?800:400,color:m.a?T.accent:T.dim,fontFamily:T.mono}}>{m.a}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.dim,fontFamily:T.mono}}>{m.s}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.dim,fontFamily:T.mono}}>{m.kp}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.text,fontFamily:T.mono}}>{m.xg.toFixed(2)}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.text,fontFamily:T.mono}}>{m.xa.toFixed(2)}</td>
                  </tr>);
                })}</tbody>
              </table>
            </div>
          </>);
        })():<p style={{color:T.dim,fontSize:13,textAlign:'center',padding:16}}>Match logs not available in bundle</p>}
      </Sec>

      {/* Shot Map */}
      <Sec icon={Crosshair} title="Shot Map" tag={shotData?`${shotData.ts} shots · ${shotData.g} goals`:null}>
        {shotData?(()=>{
          const shots = shotData.sh || [];
          const goals = shots.filter(s=>s.r==='G');
          const saved = shots.filter(s=>s.r==='S');
          const missed = shots.filter(s=>s.r==='M');
          const blocked = shots.filter(s=>s.r==='B');
          const conversion = shots.length > 0 ? ((goals.length/shots.length)*100).toFixed(1) : 0;
          const avgXg = shots.length > 0 ? (shots.reduce((a,s)=>a+s.xg,0)/shots.length).toFixed(3) : 0;
          const xgTotal = shots.reduce((a,s)=>a+s.xg,0).toFixed(1);

          // Pitch dimensions (SVG coordinate space)
          const PW = 420, PH = 280; // pitch width/height in SVG units
          const boxW = 132, boxH = 184; // penalty box
          const sixW = 44, sixH = 72; // six yard box
          const goalW = 30, goalH = 8;

          // Convert Understat coords to SVG
          // Understat: X=horizontal (0=left, 1=right), Y=vertical (0=top, 1=bottom)
          // We show attacking half only — X goes from ~0.5 to 1.0
          // Map: x → SVG_x, y → SVG_y
          const toSVG = (x, y) => ({
            // x: Understat 1.0 = goal line, 0.5 = halfway. Map 0.5-1.0 to 0-PW
            sx: Math.round((1 - x) * PW * 2),
            // y: Understat 0=top, 1=bottom. Map to SVG (center = PH/2)
            sy: Math.round(y * PH),
          });

          // Missed = white (the slate pitch is #2B4C5E, so the old slate dot was invisible);
          // Blocked = gray. Goal/Saved stay blue tones.
          const dotColor = (r) => r==='G'?'#1A65D3':r==='S'?'#4F82D6':r==='M'?'#F2F2F2':'#939A9E';
          const dotSize = (xg) => Math.max(4, Math.min(14, xg * 60));

          // Shot zone stats
          const zones = {
            'Box Center': shots.filter(s=>s.x>0.78&&s.y>0.29&&s.y<0.71),
            'Box Left': shots.filter(s=>s.x>0.78&&s.y<=0.29),
            'Box Right': shots.filter(s=>s.x>0.78&&s.y>=0.71),
            'Outside Box': shots.filter(s=>s.x<=0.78),
            'Penalty': shots.filter(s=>s.sit&&s.sit.startsWith('Pe')),
          };

          return(<>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
              {[
                ['Total Shots', shots.length],
                ['Goals', goals.length],
                ['xG Total', xgTotal],
                ['Avg xG/Shot', avgXg],
                ['Conversion', `${conversion}%`],
                ['On Target', saved.length + goals.length],
              ].map(([l,v])=>(
                <div key={l}><div style={{fontSize:11,color:T.dim}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:T.text,fontFamily:T.mono}}>{v}</div></div>
              ))}
            </div>

            {/* Pitch SVG */}
            <div style={{background:'rgba(43,76,94,0.22)',borderRadius:10,padding:12,marginBottom:12,overflowX:'auto'}}>
              <svg viewBox={`0 0 ${PW} ${PH}`} style={{width:'100%',maxWidth:500,display:'block',margin:'0 auto'}}>
                {/* Pitch markings */}
                <rect x={0} y={0} width={PW} height={PH} fill="#2B4C5E" rx={4}/>
                {/* Penalty box */}
                <rect x={0} y={(PH-boxH)/2} width={boxW} height={boxH} fill="none" stroke="#ffffff30" strokeWidth={1}/>
                {/* 6-yard box */}
                <rect x={0} y={(PH-sixH)/2} width={sixW} height={sixH} fill="none" stroke="#ffffff30" strokeWidth={1}/>
                {/* Goal */}
                <rect x={0} y={(PH-goalW)/2} width={goalH} height={goalW} fill="#ffffff20" stroke="#ffffff60" strokeWidth={1}/>
                {/* Penalty spot */}
                <circle cx={66} cy={PH/2} r={2} fill="#ffffff40"/>
                {/* Goal line */}
                <line x1={0} y1={0} x2={0} y2={PH} stroke="#ffffff50" strokeWidth={1}/>

                {/* Plot shots — goals on top */}
                {[...missed, ...saved, ...blocked, ...goals].map((s, i) => {
                  const {sx, sy} = toSVG(s.x, s.y);
                  const r = dotSize(s.xg);
                  const col = dotColor(s.r);
                  const isGoal = s.r === 'G';
                  return (
                    <circle key={i} cx={sx} cy={sy} r={r}
                      fill={col} fillOpacity={isGoal?0.9:0.55}
                      stroke={isGoal?'#fff':'none'} strokeWidth={isGoal?1.5:0}
                    >
                      <title>{s.r} {s.xg.toFixed(3)} xG — {s.m}' {s.st==='H'?'Head':s.st==='L'?'Left':'Right'}</title>
                    </circle>
                  );
                })}
              </svg>
              {/* Legend */}
              <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
                {[['#1A65D3','Goal'],['#4F82D6','Saved'],['#F2F2F2','Missed'],['#939A9E','Blocked']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:T.dim}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span>{l}</span>
                  </div>
                ))}
                <span style={{fontSize:11,color:T.dim}}>Dot size = xG value</span>
              </div>
            </div>

            {/* Shot zone breakdown */}
            <div style={{fontSize:12,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Shot Zones</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {Object.entries(zones).map(([zone, zshots])=>{
                const zgoals = zshots.filter(s=>s.r==='G').length;
                const zxg = zshots.reduce((a,s)=>a+s.xg,0).toFixed(1);
                const zpct = zshots.length>0?((zgoals/zshots.length)*100).toFixed(0):0;
                return(
                  <div key={zone} style={{flex:1,minWidth:80,padding:'8px 10px',background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:11,color:T.dim,marginBottom:4}}>{zone}</div>
                    <div style={{fontSize:14,fontWeight:800,color:T.text,fontFamily:T.mono}}>{zshots.length}</div>
                    <div style={{fontSize:11,color:T.dim}}>{zgoals}G · {zxg}xG · {zpct}%</div>
                  </div>
                );
              })}
            </div>

            {/* Shot type breakdown */}
            <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
              {[['Right Foot','R'],['Left Foot','L'],['Head','H']].map(([label,code])=>{
                const ts = shots.filter(s=>s.st===code);
                const tg = ts.filter(s=>s.r==='G').length;
                if(!ts.length) return null;
                return(
                  <span key={code} style={{fontSize:13,color:T.dim}}>
                    {label}: <b style={{color:T.text}}>{ts.length} shots, {tg} goals</b>
                  </span>
                );
              })}
            </div>
          </>);
        })():<p style={{color:T.dim,fontSize:13,textAlign:'center',padding:16}}>Shot map data not available for this player</p>}
      </Sec>

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

      {/* Head-to-Head Comparison */}
      <Sec icon={GitDiff} title="Head-to-Head Comparison" tag="Any player"><div>
        <div style={{position:'relative',marginBottom:compareP?12:0}}>
          <div style={{display:'flex',gap:8}}>
            <input
              aria-label={`Compare ${p.Player} against another player`}
              value={compareQ}
              onChange={e=>{setCompareQ(e.target.value);if(!e.target.value)setCompareP(null);}}
              placeholder={`Compare ${p.Player} against any player...`}
              style={{...C.input,flex:1}}
            />
            {compareP&&<button onClick={()=>{setCompareP(null);setCompareQ('');}} style={{...C.btn(false,'#1A65D3'),padding:'8px 12px',fontSize:11,border:`1px solid ${T.border}`}}>✕ Clear</button>}
          </div>
          {/* Dropdown — in normal flow so it extends the card and pushes content
              below down (no overlay, no see-through over other sections) */}
          {compareMatches.length>0&&!compareP&&(
            <div style={{marginTop:6,background:'rgba(0,0,0,0.25)',border:`1px solid ${T.border}`,borderRadius:10,overflow:'hidden'}}>
              {compareMatches.map((x,i)=>(
                <div key={i} onClick={()=>{setCompareP(x);setCompareQ(x.Player);}}
                  style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<compareMatches.length-1?`1px solid ${T.border}`:'none',display:'flex',alignItems:'center',gap:10}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.accent+'15'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <PlayerAvatar name={x.Player} src={x._img_url||undefined} playerId={x._player_id} size={32} style={{borderRadius:4,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{x.Player}</div>
                    <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.dim}}><ClubLogo club={x.Squad} size={13}/><span>{x.Squad} · {x.league} · {x.Pos||x.position} · {x.Age}y</span></div>
                  </div>
                  <span style={{marginLeft:'auto',fontSize:12,fontWeight:700,color:T.dim,fontFamily:T.mono}}>{mv(x)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Comparison display */}
        {compareP&&(()=>{
          const metrics=[
            {l:'Age',f:x=>x.Age},{l:'Value',f:x=>mv(x)},{l:'Match Score',f:x=>`${x.matchScore||'—'}/100`},
            {l:'Goals',f:x=>+(x.goals||x.Gls||0)},{l:'Assists',f:x=>+(x.assists||x.Ast||0)},
            {l:'G/90',f:x=>(+(x.goals_per90||0)).toFixed(2)},{l:'xG/90',f:x=>(+(x.xG_per90||x.npxg_per90||0)).toFixed(2)},
            {l:'xA/90',f:x=>(+(x.xA_per90||x.xag_per90||0)).toFixed(2)},
            {l:'Shots/90',f:x=>(+(x.shots_per90||0)).toFixed(2)},{l:'KP/90',f:x=>(+(x.key_passes_per90||0)).toFixed(2)},
            {l:'Tkl/90',f:x=>(+(x.tackles_per90||x.tackles_won_per90||0)).toFixed(2)},{l:'Int/90',f:x=>(+(x.interceptions_per90||0)).toFixed(2)},
            {l:'Pass%',f:x=>x.pass_success_pct?`${x.pass_success_pct}%`:'—'},{l:'Contract',f:x=>x.contract_expires||'—'},
          ];
          return(
            <div>
              {/* Overlay Radar */}
              {compareRadarData.length>=3&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:T.dim,marginBottom:8,display:'flex',gap:16}}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:T.accent,opacity:0.8}}/>{p.Player}</span>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:T.accent2,opacity:0.8}}/>{compareP.Player}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={compareRadarData}>
                      <PolarGrid stroke={T.border}/>
                      <PolarAngleAxis dataKey="attr" tick={{fill:T.dim,fontSize:11}}/>
                      <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                      <Radar dataKey="me" name={p.Player} stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2}/>
                      <Radar dataKey="them" name={compareP.Player} stroke={T.accent2} fill={T.accent2} fillOpacity={0.2} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Stats table */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.dim,fontSize:11}}></th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:T.accent,fontWeight:800}}>{p.Player}<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:11,color:T.dim,fontWeight:400}}><ClubLogo club={p.Squad} size={13}/>{p.Squad}</div></th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:T.accent2,fontWeight:800}}>{compareP.Player}<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:11,color:T.dim,fontWeight:400}}><ClubLogo club={compareP.Squad} size={13}/>{compareP.Squad}</div></th>
                  </tr></thead>
                  <tbody>{metrics.map(r=>{
                    const pv=r.f(p),cv=r.f(compareP);
                    const pn=parseFloat(pv),cn=parseFloat(cv);
                    const pBetter=!isNaN(pn)&&!isNaN(cn)&&r.l!=='Age'&&r.l!=='Value'&&r.l!=='Contract'&&pn>cn;
                    const cBetter=!isNaN(pn)&&!isNaN(cn)&&r.l!=='Age'&&r.l!=='Value'&&r.l!=='Contract'&&cn>pn;
                    return(
                      <tr key={r.l} style={{borderBottom:`1px solid ${T.border}20`}}>
                        <td style={{padding:'4px 8px',color:T.dim,fontWeight:600,fontSize:11}}>{r.l}</td>
                        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:pBetter?800:400,color:pBetter?T.green:T.text,fontFamily:T.mono}}>{pv}</td>
                        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:cBetter?800:400,color:cBetter?T.green:T.dim,fontFamily:T.mono}}>{cv}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {/* Contract note */}
              <p style={{fontSize:11,color:T.dim,marginTop:8,marginBottom:0}}>
                Contract dates shown are from Transfermarkt and reflect the permanent contract. For loaned players, verify directly — loan end dates may differ.
              </p>
            </div>
          );
        })()}
        {!compareP&&!compareQ&&<p style={{fontSize:12,color:T.dim,margin:'12px 0 0'}}>Type any player name above to compare head-to-head with overlaid radar and full stats table.</p>}
      </div></Sec>

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

      {/* ML Similar Players */}
      {mlSim.length>0&&<Sec icon={UsersThree} title="ML Player Similarity" tag="Cosine Similarity"><div>
        <p style={{fontSize:11,color:T.dim,marginTop:-6,marginBottom:10}}>Players with the most similar statistical profiles across all per-90 metrics (machine learning cosine similarity)</p>
        {mlSim.slice(0,8).map((s,i)=>{
          // Find player in data to get their image
          const simPlayer = data.current?.find(p=>(p.Player||'').toLowerCase().trim()===s.name.toLowerCase().trim());
          return(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,padding:'6px 8px',borderRadius:6,background:i<3?T.accent+'08':'transparent'}}>
            <span style={{fontSize:11,fontWeight:800,color:T.dim,width:18,fontFamily:T.mono}}>#{i+1}</span>
            {/* Mini photo */}
            <PlayerAvatar name={s.name} src={simPlayer?._img_url||undefined} playerId={simPlayer?._player_id} size={40} style={{borderRadius:6,flexShrink:0}}/>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:600,color:T.text}}>{s.name}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:T.dim,marginLeft:8,verticalAlign:'middle'}}><ClubLogo club={s.team} size={13}/>{s.team} · {s.league}</span>
              {s.role&&<span style={{fontSize:11,marginLeft:6,padding:'1px 5px',borderRadius:3,background:T.accent+'20',color:T.accent}}>{s.role}</span>}
            </div>
            <div style={{width:90,height:6,borderRadius:3,background:T.border,overflow:'hidden'}}>
              <div style={{width:`${s.similarity*100}%`,height:'100%',borderRadius:3,background:s.similarity>0.95?T.green:s.similarity>0.9?T.accent:T.yellow}}/>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:s.similarity>0.95?T.green:s.similarity>0.9?T.accent:T.yellow,fontFamily:T.mono,width:45,textAlign:'right'}}>{(s.similarity*100).toFixed(1)}%</span>
          </div>
          );
        })}
      </div></Sec>}

      {/* ML Role Classification */}
      {mlRole&&<Sec icon={Brain} title="Player Archetype" tag="K-Means Clustering"><div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
          <div style={{padding:'8px 16px',borderRadius:8,background:T.accent+'15',border:`1px solid ${T.accent}30`}}>
            <div style={{fontSize:16,fontWeight:800,color:T.accent}}>{mlRole.role}</div>
          </div>
          <div style={{fontSize:12,color:T.dim}}>
            Automatically classified by ML based on statistical profile.
            <br/>Cluster determined by k-means analysis of 13 per-90 metrics across {data.ml?.modelInfo?.total_players_clustered||'1700'} players.
          </div>
        </div>
        {data.ml?.roleProfiles?.[String(mlRole.cluster)]&&(()=>{
          const rp=data.ml.roleProfiles[String(mlRole.cluster)];
          const topZ=Object.entries(rp.z_scores).filter(([,v])=>v>0.3).sort((a,b)=>b[1]-a[1]).slice(0,5);
          return topZ.length>0?(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.dim,marginBottom:6}}>DEFINING CHARACTERISTICS OF THIS ROLE:</div>
              {topZ.map(([k,v])=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{width:130,fontSize:11,color:T.dim}}>{k.replace(/_per90/g,'').replace(/_/g,' ')}</span>
                  <div style={{flex:1,height:5,borderRadius:3,background:T.border,overflow:'hidden'}}>
                    <div style={{width:`${Math.min(100,50+v*20)}%`,height:'100%',borderRadius:3,background:v>1?T.green:T.accent}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:v>1?T.green:T.accent,fontFamily:T.mono}}>{v>0?'+':''}{v.toFixed(2)}σ</span>
                </div>
              ))}
              <p style={{fontSize:11,color:T.dim,marginTop:6}}>Cluster size: {rp.size} players with similar profiles</p>
            </div>
          ):null;
        })()}
      </div></Sec>}

      {/* Value & Contract */}
      <Sec icon={Scales} title="Value & Contract Analysis"><div>
        {/* Key metrics */}
        <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
          {[
            ['Market Value', mv(p)],
            ['Goals/€M', vmv>0?(goals/(vmv/1e6)).toFixed(2):'—'],
            ['Score/€M', vmv>0?(p.matchScore/(vmv/1e6)).toFixed(1):'—'],
          ].map(([l,v])=>(
            <div key={l}><div style={{fontSize:11,color:T.dim}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:T.text,fontFamily:T.mono}}>{v}</div></div>
          ))}
        </div>

        {/* Contract Bargain Alert */}
        {(()=>{
          const exp = p.contract_expires;
          if (!exp) return <p style={{fontSize:12,color:T.dim}}>Contract expiry data unavailable</p>;

          const expDate = new Date(exp);
          const today = new Date();
          const monthsLeft = Math.round((expDate - today) / (1000 * 60 * 60 * 24 * 30));
          const expired = monthsLeft < 0;
          const expiresThisSummer = monthsLeft >= 0 && monthsLeft <= 2;
          const within6 = monthsLeft > 2 && monthsLeft <= 6;
          const within12 = monthsLeft > 6 && monthsLeft <= 12;
          const within18 = monthsLeft > 12 && monthsLeft <= 18;

          let alertColor, alertTitle, alertMsg;

          if (expired || expiresThisSummer) {
            alertColor = T.red;
            alertTitle = expired ? 'CONTRACT EXPIRED' : 'CONTRACT EXPIRES THIS SUMMER';
            alertMsg = expired
              ? `Contract expired in ${exp}. Player is a free agent or on temporary extension. Available for zero transfer fee.`
              : `Contract ends ${exp}. Player available for free this summer. No transfer fee required — only wages.`;
          } else if (within6) {
            alertColor = T.orange;
            alertTitle = 'EXPIRING IN UNDER 6 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Club must sell now or lose player for free. Strong negotiating position for buyer.`;
          } else if (within12) {
            alertColor = T.yellow;
            alertTitle = 'EXPIRING IN UNDER 12 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Player entering final year — selling club likely to accept below market value rather than risk losing for free.`;
          } else if (within18) {
            alertColor = T.accent;
            alertTitle = 'EXPIRING IN UNDER 18 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Pre-contract discussions could begin in ~6 months. Window to negotiate at discount.`;
          } else {
            alertColor = T.green;
            alertTitle = 'CONTRACT SECURED';
            alertMsg = `Contract runs until ${exp} (${monthsLeft} months). Full market value applies. No leverage from contract situation.`;
          }

          return (
            <div style={{padding:14,borderRadius:8,background:alertColor+'10',border:`1px solid ${alertColor}30`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:alertColor,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:800,color:alertColor,textTransform:'uppercase',letterSpacing:0.8}}>{alertTitle}</span>
              </div>
              <p style={{fontSize:13,color:T.text,margin:0,lineHeight:1.6}}>{alertMsg}</p>
              {(expired||expiresThisSummer||within6)&&vmv>0&&(
                <div style={{marginTop:10,padding:'8px 12px',background:alertColor+'15',borderRadius:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:alertColor}}>
                    Estimated saving: €{(vmv/1e6).toFixed(0)}M–€{(vmv*0.7/1e6).toFixed(0)}M vs full market value
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div></Sec>

      {/* Injury History */}
      {(()=>{
        const totalInj=+(p.total_injuries||0);
        const totalDays=+(p.total_days_missed||0);
        const recentInj=+(p.recent_injuries||0);
        const recentDays=+(p.recent_days_missed||0);
        const hasInjData=totalInj>0||totalDays>0;
        if(!hasInjData) return null;
        return(
          <Sec icon={Heartbeat} title="Injury History">
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[
                ['Career Injuries',totalInj,totalInj>=10?'#1A65D3':totalInj>=5?'#6E7E8A':T.text],
                ['Career Days Missed',totalDays,totalDays>=200?'#1A65D3':totalDays>=90?'#6E7E8A':T.text],
                ['Recent Injuries (2yr)',recentInj,recentInj>=4?'#1A65D3':recentInj>=2?'#6E7E8A':T.text],
                ['Recent Days Missed',recentDays,recentDays>=90?'#1A65D3':recentDays>=30?'#6E7E8A':T.text],
              ].map(([l,v,c])=>(
                <div key={l} style={{flex:1,minWidth:100,padding:'8px 10px',background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.dim,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:T.mono}}>{v}</div>
                </div>
              ))}
            </div>
          </Sec>
        );
      })()}

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
