import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";

/* ═══════════════════════════════════════════════════════════
   SCOUTLAB — Professional Football Scouting Platform
   ═══════════════════════════════════════════════════════════ */

// ─── POSITION GROUPS ───
const POS = {
  FW: { label: "Forward", sub: "ST · SS · CF", fn: p => {
    // 1. WhoScored position is most reliable tiebreaker
    if(p.ws_position) return p.ws_position === 'FW';
    // 2. FBref strict forward — but only if Understat agrees (not a winger)
    if(p.Pos === 'FW'){
      // Check Understat — if has M it's a winger not a striker
      const u = p.position || '';
      if(/F/.test(u) && /M/.test(u)) return false; // Understat says winger
      return true;
    }
    // 3. Understat forward only (no midfielder component)
    if(/^F/.test(p.position||'') && !/M/.test(p.position||'')) return true;
    // 4. TM attack but not a midfielder
    if((p.main_position||'').toLowerCase() === 'attack' && p.Pos !== 'MF' && !/M/.test((p.position||'').replace(/S/g,''))) return true;
    return false;
  }},
  WG: { label: "Winger", sub: "LW · RW · IF", fn: p => {
    if(p.ws_position) return p.ws_position === 'WG';
    const pos = p.Pos || '';
    const u = p.position || '';
    if(pos==='MF,FW' || pos==='FW,MF') return true;
    if(/F/.test(u) && /M/.test(u)) return true; // Understat hybrid = winger
    if((p.main_position||'').toLowerCase()==='attack' && pos==='MF') return true;
    return false;
  }},
  MF: { label: "Midfielder", sub: "CM · DM · AM", fn: p => {
    if(p.ws_position) return p.ws_position === 'MF';
    const pos = p.Pos || '';
    const u = p.position || '';
    if(pos==='MF' || pos==='MF,DF' || pos==='DF,MF') return true;
    if(/M/.test(u) && !/F/.test(u) && !/D/.test(u)) return true;
    if((p.main_position||'').toLowerCase()==='midfield' && !pos) return true;
    return false;
  }},
  DF: { label: "Defender", sub: "CB · FB · WB", fn: p => {
    if(p.ws_position) return p.ws_position === 'DF';
    const pos = p.Pos || '';
    const u = p.position || '';
    if(pos==='DF') return true;
    if(/D/.test(u) && !/F/.test(u) && !/M/.test(u)) return true;
    if((p.main_position||'').toLowerCase()==='defender' && !pos) return true;
    return false;
  }},
  GK: { label: "Goalkeeper", sub: "GK", fn: p => {
    if(p.ws_position) return p.ws_position === 'GK';
    return (p.Pos||'')==='GK' || (p.main_position||'').toLowerCase()==='goalkeeper';
  }},
};

// ─── ATTRIBUTES ───
const ATTR_CATS = [
  { cat: "Attacking", icon: "⚽", attrs: [
    { k:"goals", l:"Goal Scoring", desc:"Goals & non-penalty xG per 90 — how dangerous is he in front of goal?", c:["goals_per90","npxg_per90","xG_per90","npxG_per90"],z:["goals_per90_zscore","npxg_per90_zscore","xG_per90_zscore","npxG_per90_zscore"],i:"⚽", thresholdLabel:"Min Goals/90", thresholdKey:"goals_per90"},
    { k:"shots", l:"Shot Volume", desc:"Shots per 90 — does he get himself into shooting positions regularly?", c:["shots_per90"],z:["shots_per90_zscore"],i:"🎯", thresholdLabel:"Min Shots/90", thresholdKey:"shots_per90"},
    { k:"xg_over", l:"Finishing Efficiency", desc:"Goals scored vs xG — is he a clinical finisher who beats the average?", c:["goals_per90"],z:[],i:"📈",custom:p=>{const g=+(p.goals||p.Gls||0),x=+(p.xG||p.npxG||0);return x>0?g-x:null;}, thresholdLabel:"Min Goals-xG", thresholdKey:"xg_over_raw"},
  ]},
  { cat: "Creativity & Chance Creation", icon: "🎨", attrs: [
    { k:"assists", l:"Assists & Expected Assists", desc:"Assists and xA per 90 — direct goal contributions beyond scoring", c:["assists_per90","xag_per90","xA_per90"],z:["assists_per90_zscore","xag_per90_zscore","xA_per90_zscore"],i:"🅰️", thresholdLabel:"Min xA/90", thresholdKey:"xA_per90"},
    { k:"key_passes", l:"Key Passes", desc:"Passes leading directly to a shot — creative output per 90", c:["key_passes_per90"],z:["key_passes_per90_zscore"],i:"🔑", thresholdLabel:"Min KP/90", thresholdKey:"key_passes_per90"},
    { k:"sca", l:"Shot-Creating Actions", desc:"Actions leading to shots (passes, dribbles, fouls drawn) — broader creative output", c:["sca_per90","gca_per90"],z:["sca_per90_zscore"],i:"✨"},
    { k:"xg_chain", l:"Goal Sequence Involvement", desc:"xG of all moves the player is involved in — total attacking contribution", c:["xGChain_per90"],z:[],i:"🔗"},
  ]},
  { cat: "Ball Carrying & Pace", icon: "💨", attrs: [
    { k:"prog_carry", l:"Progressive Carrying", desc:"Carries that move the ball significantly towards goal — driving power", c:["prog_carries_per90"],z:["prog_carries_per90_zscore"],i:"📦"},
    { k:"takeons", l:"Successful Dribbles", desc:"Completed take-ons per 90 — ability to beat defenders 1v1", c:["successful_takeons_per90"],z:["successful_takeons_per90_zscore"],i:"💨", thresholdLabel:"Min Take-ons/90", thresholdKey:"successful_takeons_per90"},
    { k:"box_carry", l:"Carries into Penalty Area", desc:"Times the player carries the ball into the opposition box per 90", c:["carries_into_box_per90"],z:[],i:"📥"},
  ]},
  { cat: "Passing & Distribution", icon: "📐", attrs: [
    { k:"pass_pct", l:"Pass Accuracy", desc:"Pass completion % — technical quality and ability to keep possession", c:["pass_success_pct","pass_completion"],z:["pass_completion_zscore"],i:"✅", thresholdLabel:"Min Pass %", thresholdKey:"pass_success_pct"},
    { k:"prog_pass", l:"Progressive Passing", desc:"Passes that advance play significantly towards goal. Available in 24/25 data.", c:["prog_passes_per90"],z:["prog_passes_per90_zscore"],i:"📐"},
    { k:"box_pass", l:"Passes into the Box", desc:"Penetrating passes into the penalty area per 90. Available in 24/25 data.", c:["passes_into_box_per90","PPA"],z:[],i:"🎯"},
    { k:"cross", l:"Crossing", desc:"Crosses per 90 — width and delivery from wide areas", c:["crosses_per90"],z:[],i:"↗️"},
  ]},
  { cat: "Defending & Pressing", icon: "🛡️", attrs: [
    { k:"tackles", l:"Tackles Won", desc:"Successful tackles per 90 — ground-level defensive duels", c:["tackles_per90","tackles_won_per90"],z:["tackles_per90_zscore"],i:"🦶", thresholdLabel:"Min Tackles/90", thresholdKey:"tackles_per90"},
    { k:"interceptions", l:"Interceptions", desc:"Interceptions per 90 — reading the game and cutting out passes", c:["interceptions_per90"],z:["interceptions_per90_zscore"],i:"🖐️", thresholdLabel:"Min Int/90", thresholdKey:"interceptions_per90"},
    { k:"blocks", l:"Blocks & Clearances", desc:"Shot blocks and clearances per 90 — last-ditch defensive actions", c:["blocks_per90","clearances_per90"],z:[],i:"🧱"},
    { k:"pressing", l:"Pressing Intensity", desc:"Pressures applied to opponents per 90 — work rate and high press suitability", c:["pressures_per90"],z:[],i:"⚡"},
  ]},
  { cat: "Physical & Athletic", icon: "🗼", attrs: [
    { k:"aerial", l:"Aerial Dominance", desc:"Aerial duel win % and aerial duels won per game — heading ability and physical presence in the air", c:["aerial_won_pct","aerial_won_per_game","aerial_won_per90"],z:["aerial_won_pct_zscore"],i:"🗼", thresholdLabel:"Min Aerial Won/g", thresholdKey:"aerial_won_per_game"},
    { k:"recovery", l:"Ball Recoveries", desc:"Balls won back per 90 — energy, work rate, hunting the ball", c:["recoveries_per90"],z:[],i:"♻️"},
    { k:"buildup", l:"Off-Ball Buildup Contribution", desc:"xG buildup involvement — movement and positioning in buildup phases even without the ball", c:["xGBuildup_per90"],z:[],i:"🏗️"},
  ]},
  { cat: "Goalkeeping", icon: "🧤", gkOnly: true, attrs: [
    { k:"gk_saves", l:"Save Percentage", desc:"Saves divided by shots on target faced — core shot-stopping ability", c:["Save%","Saves"],z:[],i:"🧤", thresholdLabel:"Min Save %", thresholdKey:"Save%"},
    { k:"gk_cs", l:"Clean Sheet %", desc:"Percentage of games keeping a clean sheet — defensive organisation and consistency", c:["CS%","CS"],z:[],i:"🔒", thresholdLabel:"Min CS%", thresholdKey:"CS%"},
    { k:"gk_ga90", l:"Goals Against Per 90", desc:"Goals conceded per 90 minutes — lower is better for shot-stopping quality", c:["GA90"],z:[],i:"🚫", thresholdLabel:"Max GA/90", thresholdKey:"GA90"},
    { k:"gk_dist", l:"Distribution Quality", desc:"Pass completion % and long ball accuracy — ability to play out from the back", c:["pass_completion"],z:[],i:"📐"},
    { k:"gk_sweeper", l:"Sweeper-Keeper Activity", desc:"Ball recoveries and defensive actions outside the box — proactive GK in high lines", c:["recoveries_per90"],z:[],i:"🏃"},
  ]},
];
const ALL_A = ATTR_CATS.flatMap(g=>g.attrs);
const PRI = {required:4,high:3,medium:2,low:1,none:0};
const PRI_C = {required:"#f43f5e",high:"#22d3ee",medium:"#fbbf24",low:"#fb923c",none:"#475569"};
const PRI_LABELS = {required:"Required",high:"High",medium:"Medium",low:"Low",none:"None"};

const BUDGET = [
  {l:"Any",v:""},{l:"€100K",v:1e5},{l:"€500K",v:5e5},{l:"€1M",v:1e6},
  ...[5,10,15,20,25,30,35,40,50,60,70,80,100,120,150,200].map(n=>({l:`€${n}M`,v:n*1e6}))
];

// ─── SCOUT TEMPLATES ───
const SCOUT_TEMPLATES = {
  'Pressing Forward':    {goals:"high",shots:"high",pressing:"high",prog_carry:"medium",takeons:"medium",xg_chain:"medium"},
  'Target Man':          {goals:"high",aerial:"required",shots:"medium",buildup:"high",key_passes:"low"},
  'Poacher':             {goals:"required",shots:"high",xg_over:"high",box_carry:"high",prog_carry:"low"},
  'False Nine':          {goals:"medium",key_passes:"high",sca:"high",xg_chain:"high",prog_carry:"high",assists:"high"},
  'Inverted Winger':     {goals:"high",shots:"high",takeons:"high",prog_carry:"high",box_carry:"high",cross:"none"},
  'Traditional Winger':  {cross:"required",assists:"high",sca:"high",takeons:"high",prog_carry:"medium"},
  'Deep Playmaker':      {pass_pct:"required",prog_pass:"high",buildup:"high",tackles:"medium",interceptions:"medium"},
  'Box-to-Box':          {tackles:"high",pressing:"high",prog_pass:"medium",assists:"medium",goals:"medium",interceptions:"medium"},
  'Ball-Winning DM':     {tackles:"required",interceptions:"required",pressing:"high",aerial:"medium",pass_pct:"medium"},
  'Ball-Playing CB':     {pass_pct:"high",prog_pass:"high",aerial:"high",interceptions:"high",tackles:"medium",buildup:"medium"},
  'Aggressive CB':       {aerial:"required",tackles:"required",interceptions:"high",blocks:"high",pressing:"medium"},
  'Attacking Wing-Back': {cross:"high",assists:"high",prog_carry:"high",tackles:"medium",interceptions:"medium"},
  'Shot-Stopper GK':     {gk_saves:"required",gk_cs:"high",gk_ga90:"high"},
  'Sweeper-Keeper GK':   {gk_saves:"high",gk_sweeper:"required",gk_dist:"high",gk_cs:"medium"},
  'Ball-Playing GK':     {gk_saves:"high",gk_dist:"required",gk_sweeper:"high",gk_cs:"medium"},
};

const POS_PRESETS = {
  FW:{goals:"high",shots:"high",xg_over:"medium",assists:"low",aerial:"medium",pressing:"medium"},
  WG:{goals:"medium",shots:"medium",assists:"high",key_passes:"high",prog_carry:"high",takeons:"high",cross:"medium"},
  MF:{assists:"medium",key_passes:"high",sca:"medium",pass_pct:"high",prog_pass:"high",tackles:"medium",interceptions:"medium",pressing:"medium",buildup:"medium"},
  DF:{tackles:"high",interceptions:"high",blocks:"high",aerial:"high",pass_pct:"medium",pressing:"medium"},
  GK:{gk_saves:"required",gk_cs:"high",gk_ga90:"high",gk_dist:"medium",gk_sweeper:"medium"},
  ALL:{}
};

// ─── UTILS ───
const gv = (p,cols,fn) => { if(fn){const r=fn(p);if(r!==null&&!isNaN(r))return r;} for(const c of cols){const v=p[c];if(v!==undefined&&v!==null&&v!==''&&!isNaN(v))return+v;} return null; };
const pct = (v,arr) => { const s=arr.filter(x=>x!==null&&!isNaN(x)).sort((a,b)=>a-b); if(!s.length)return 50; const i=s.findIndex(x=>x>=v); return i<0?100:Math.round(i/s.length*100); };
const rl = p => p>=95?"World Class":p>=90?"Elite":p>=75?"Very Good":p>=50?"Good":p>=25?"Average":"Below Avg";
const rc = p => p>=90?"#22d3ee":p>=75?"#34d399":p>=50?"#fbbf24":p>=25?"#fb923c":"#f87171";
const sc = s => s>=90?"#22d3ee":s>=80?"#34d399":s>=70?"#fbbf24":s>=60?"#fb923c":"#f87171";
const mv = p => { const v=+(p.market_value_eur||0); return v>0?`€${v>=1e6?(v/1e6).toFixed(0)+'M':(v/1e3).toFixed(0)+'K'}`:"N/A"; };
const hasC = (d,cols) => d?.length>0&&cols.some(c=>d[0][c]!==undefined&&d[0][c]!==null&&d[0][c]!=='');

// ─── INJURY RISK ───
function calcInjuryRisk(p){
  const ri=+(p.recent_injuries||0),rd=+(p.recent_days_missed||0),ti=+(p.total_injuries||0);
  let s=0;
  s+=ri>=4?4:ri>=3?3:ri>=2?2:ri>=1?1:0;
  s+=rd>=90?3:rd>=45?2:rd>=14?1:0;
  s+=ti>=10?2:ti>=6?1:0;
  return s>=6?'High':s>=3?'Medium':'Low';
}
const IRK={High:{c:'#f43f5e',i:'🔴'},Medium:{c:'#eab308',i:'🟡'},Low:{c:'#22c55e',i:'🟢'}};

// ─── TRAJECTORY ───
function calcTrajectory(cur,prev){
  if(!prev)return null;
  const ms=['goals_per90','assists_per90','npxg_per90','xag_per90','shots_per90','key_passes_per90','tackles_per90','interceptions_per90'];
  const ch=[];
  for(const m of ms){const c=+(cur[m]||0),pv=+(prev[m]||0);if(!c&&!pv)continue;ch.push((c-pv)/(Math.abs(pv)+0.01));}
  if(ch.length<3)return null;
  const avg=ch.reduce((a,b)=>a+b,0)/ch.length;
  return avg>0.12?'Improving':avg<-0.12?'Declining':'Stable';
}
const TRJ={Improving:{c:'#22c55e',i:'↑'},Stable:{c:'#6b7280',i:'→'},Declining:{c:'#f43f5e',i:'↓'}};

// ─── POTENTIAL ───
function calcPotential(p, pg, trajectory){
  const age=+(p.Age||99);
  if(age>26) return {score:0,tier:null};
  // Age score (0–45): drops linearly from 19 to 26
  const ageScore=age<=18?45:age===19?40:age===20?35:age===21?30:age===22?24:age===23?17:age===24?10:age===25?4:0;
  // Trajectory score (0–25)
  const trajScore=trajectory==='Improving'?25:trajectory==='Stable'?10:trajectory==='Declining'?0:8;
  // Performance vs peers via z-scores (0–30)
  const zKeys=
    (pg==='FW'||pg==='WG')?['npxg_per90_zscore','goals_per90_zscore','assists_per90_zscore']:
    pg==='MF'?['xag_per90_zscore','prog_passes_per90_zscore','prog_carries_per90_zscore']:
    pg==='DF'?['tackles_per90_zscore','interceptions_per90_zscore','aerial_won_pct_zscore']:[];
  const zVals=zKeys.map(k=>p[k]!=null?+(p[k]):null).filter(z=>z!==null);
  const avgZ=zVals.length?zVals.reduce((a,b)=>a+b,0)/zVals.length:0;
  const perfScore=Math.round(((Math.max(-1.5,Math.min(2.5,avgZ))+1.5)/4)*30);
  const total=Math.min(100,ageScore+trajScore+perfScore);
  const tier=total>=80?'Elite Prospect':total>=65?'High Potential':total>=50?'Developing':null;
  return{score:total,tier};
}
const PTL={'Elite Prospect':{c:'#a855f7',i:'⚡'},'High Potential':{c:'#3b82f6',i:'🌱'},'Developing':{c:'#64748b',i:'📈'}};

// ─── SCORING ───
function score(player, req, all, refProf) {
  let ts=0,tw=0;
  for(const a of ALL_A){
    const pri=req.priorities[a.k]; if(!pri||pri==='none')continue;
    let w=PRI[pri]; // required=4, high=3, medium=2, low=1
    if(refProf&&refProf[a.k]!==undefined){if(refProf[a.k]>1)w=Math.max(w,3);else if(refProf[a.k]>0.5)w=Math.max(w,2);}
    let z=gv(player,a.z);
    if(z===null){const rv=gv(player,a.c,a.custom);if(rv===null)continue;const vals=all.map(p=>gv(p,a.c,a.custom)).filter(v=>v!==null);const m=vals.reduce((a,b)=>a+b,0)/vals.length;const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-m)**2,0)/vals.length);z=sd>0?(rv-m)/sd:0;}
    let bonus=0;
    if(refProf&&refProf[a.k]!==undefined)bonus=Math.max(0,10-Math.abs(z-refProf[a.k])*5);
    ts+=Math.min(100,Math.max(0,50+z*20+bonus))*w; tw+=w;
  }
  return tw>0?Math.round(ts/tw):50;
}

function findSim(name,data){if(!name?.trim())return null;const n=name.trim().toLowerCase();return data.find(p=>(p.Player||'').toLowerCase().includes(n))||null;}
function simProf(ref,all){const p={};for(const a of ALL_A){const rv=gv(ref,a.c,a.custom);if(rv===null)continue;const vals=all.map(x=>gv(x,a.c,a.custom)).filter(v=>v!==null);const m=vals.reduce((a,b)=>a+b,0)/vals.length;const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-m)**2,0)/vals.length);p[a.k]=sd>0?(rv-m)/sd:0;}return p;}

function search(data,req){
  let f=[...data];
  const{posGroup:pg,ageMin,ageMax,budgetMin,budgetMax,leagues,minMinutes,heightMin,heightMax,foot,contractBefore,contractAfter,mlRole,nationality,similarTo,priorities,thresholds,subPos,potentialTier,gkMinSave,gkMaxGA,gkMinCS}=req;
  if(pg&&pg!=='ALL'){
    f=f.filter(p=>{
      // ML pos_group is the most accurate gate — use it when available
      if(p._ml_pos_group) return p._ml_pos_group===pg;
      return POS[pg]?.fn(p);
    });
  }
  // Sub-position filter for DF (LB/RB/CB) and WG (LW/RW)
  if(subPos){
    if(subPos==='LB') f=f.filter(p=>p._ml_role&&p._ml_role.includes('Left Back'));
    else if(subPos==='RB') f=f.filter(p=>p._ml_role&&p._ml_role.includes('Right Back'));
    else if(subPos==='CB') f=f.filter(p=>p._ml_role&&p._ml_role.includes('CB'));
    else if(subPos==='LW') f=f.filter(p=>p._lateral_side==='L');
    else if(subPos==='RW') f=f.filter(p=>p._lateral_side==='R');
  }
  // ML role filter — hard knockout (only players in selected role archetypes)
  if(mlRole?.length) f=f.filter(p=>mlRole.includes(p._ml_role));
  if(ageMin)f=f.filter(p=>+(p.Age)>=ageMin);
  if(ageMax)f=f.filter(p=>+(p.Age)<=ageMax);
  if(budgetMin)f=f.filter(p=>+(p.market_value_eur)>=budgetMin);
  if(budgetMax)f=f.filter(p=>{const v=+(p.market_value_eur);return v<=0?!budgetMin:v<=budgetMax;});
  if(leagues?.length)f=f.filter(p=>leagues.includes(p.league));
  if(minMinutes)f=f.filter(p=>+(p.minutes||p.Min||0)>=minMinutes);
  if(heightMin)f=f.filter(p=>!p.height||+(p.height)>=heightMin);
  if(heightMax)f=f.filter(p=>!p.height||+(p.height)<=heightMax);
  if(foot&&foot!=='Any')f=f.filter(p=>!p.foot||(p.foot+'').toLowerCase().includes(foot.toLowerCase()));
  if(contractBefore){const cb=new Date(contractBefore+'T23:59:59');f=f.filter(p=>{if(!p.contract_expires)return false;const d=new Date(p.contract_expires);return !isNaN(d)&&d<=cb;});}
  if(contractAfter){const ca=new Date(contractAfter);f=f.filter(p=>{if(!p.contract_expires)return false;const d=new Date(p.contract_expires);return !isNaN(d)&&d>=ca;});}
  if(nationality?.trim()){const n=nationality.trim().toLowerCase();f=f.filter(p=>(p.citizenship||'').toLowerCase().includes(n));}
  if(potentialTier==='Elite Prospect') f=f.filter(p=>p._potential_tier==='Elite Prospect');
  else if(potentialTier==='High Potential') f=f.filter(p=>p._potential_tier==='Elite Prospect'||p._potential_tier==='High Potential');
  else if(potentialTier==='Developing') f=f.filter(p=>p._potential_tier!=null);
  if(gkMinSave)f=f.filter(p=>+(p['Save%']||p.save_pct||0)>=gkMinSave);
  if(gkMaxGA)f=f.filter(p=>{const v=+(p.GA90||p.ga_per90||0);return v>0&&v<=gkMaxGA;});
  if(gkMinCS)f=f.filter(p=>+(p['CS%']||p.cs_pct||0)>=gkMinCS);

  // Apply Required tier knockout — player must have data AND be at/above average for every required attribute
  const reqAttrs = ALL_A.filter(a=>priorities[a.k]==='required');
  if(reqAttrs.length>0){
    // Pre-compute pool mean before filtering so the baseline doesn't shift as we remove players
    const poolMean={};
    for(const a of reqAttrs){
      const vals=f.map(p=>gv(p,a.c,a.custom)).filter(v=>v!==null);
      poolMean[a.k]=vals.length>0?vals.reduce((s,v)=>s+v,0)/vals.length:null;
    }
    f=f.filter(p=>reqAttrs.every(a=>{
      const v=gv(p,a.c,a.custom);
      if(v===null)return false;                // must have data
      const m=poolMean[a.k];
      return m===null||v>=m;                   // must be at or above pool average
    }));
  }

  // Apply minimum thresholds — hard knockout filters
  if(thresholds){
    Object.entries(thresholds).forEach(([col,min])=>{
      if(min===''||min===null||min===undefined)return;
      const minVal=+min;
      if(isNaN(minVal))return;
      f=f.filter(p=>{
        const raw=p[col];
        if(raw===null||raw===undefined||raw==='')return minVal<0;
        return +raw>=minVal;
      });
    });
  }

  let rp=null;
  if(similarTo){const ref=findSim(similarTo,data);if(ref)rp=simProf(ref,f.length?f:data);}
  return f.map(p=>({...p,matchScore:score(p,req,f,rp)})).sort((a,b)=>b.matchScore-a.matchScore);
}

function getProfile(player,data,pg){
  const isGK=pg==='GK';
  const attrs=ALL_A.filter(a=>isGK?a.k.startsWith('gk_'):!a.k.startsWith('gk_'));
  const pp=pg&&pg!=='ALL'?data.filter(p=>POS[pg]?.fn(p)):data;
  return attrs.map(a=>{const v=gv(player,a.c,a.custom);if(v===null)return null;const vals=pp.map(p=>gv(p,a.c,a.custom)).filter(x=>x!==null);const p=pct(v,vals);return{...a,value:v,percentile:p,rating:rl(p)};}).filter(Boolean).sort((a,b)=>b.percentile-a.percentile);
}

// ─── CLUB META ───
const CLUB_META = {
  'Arsenal':          {color:'#EF0107',formation:'4-3-3',  style:'High Press'},
  'Aston Villa':      {color:'#670E36',formation:'4-3-3',  style:'Counter-attack'},
  'Bournemouth':      {color:'#DA291C',formation:'4-2-3-1',style:'Counter-attack'},
  'Brentford':        {color:'#E30613',formation:'4-3-3',  style:'Direct Play'},
  'Brighton':         {color:'#0057B8',formation:'4-2-3-1',style:'Possession'},
  'Chelsea':          {color:'#034694',formation:'4-2-3-1',style:'Possession'},
  'Crystal Palace':   {color:'#1B458F',formation:'4-3-3',  style:'Counter-attack'},
  'Everton':          {color:'#003399',formation:'4-4-2',  style:'Direct Play'},
  'Fulham':           {color:'#CC0000',formation:'4-2-3-1',style:'Counter-attack'},
  'Ipswich':          {color:'#003087',formation:'4-2-3-1',style:'Direct Play'},
  'Leicester':        {color:'#003090',formation:'4-2-3-1',style:'Counter-attack'},
  'Liverpool':        {color:'#C8102E',formation:'4-3-3',  style:'High Press'},
  'Manchester City':  {color:'#6CADDF',formation:'4-3-3',  style:'Possession'},
  'Manchester United':{color:'#DA291C',formation:'4-2-3-1',style:'Counter-attack'},
  'Newcastle':        {color:'#241F20',formation:'4-3-3',  style:'High Press'},
  "Nott'm Forest":    {color:'#DD0000',formation:'4-2-3-1',style:'Counter-attack'},
  'Southampton':      {color:'#D71920',formation:'4-4-2',  style:'Direct Play'},
  'Tottenham':        {color:'#132257',formation:'4-3-3',  style:'Counter-attack'},
  'West Ham':         {color:'#7A263A',formation:'4-2-3-1',style:'Counter-attack'},
  'Wolves':           {color:'#FDB913',formation:'3-4-3',  style:'Counter-attack'},
};

// ─── THEME ───
const T = {
  bg:"#0a0f1e",card:"#111827",card2:"#1a2035",border:"#1e293b",
  text:"#e2e8f0",dim:"#64748b",accent:"#22d3ee",accent2:"#818cf8",
  green:"#34d399",yellow:"#fbbf24",orange:"#fb923c",red:"#f87171",
  font:"'Outfit',sans-serif",mono:"'JetBrains Mono','Fira Code',monospace",
};
const C = {
  card:{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:20,marginBottom:16},
  label:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:T.dim,marginBottom:6,display:'block'},
  input:{width:'100%',padding:'8px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:13,fontFamily:T.font,boxSizing:'border-box',outline:'none'},
  btn:(active,color=T.accent)=>({padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',background:active?color:T.bg,color:active?'#000':T.dim,transition:'all 0.15s'}),
  tag:(color=T.accent)=>({display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,background:color+'18',color:color,letterSpacing:'0.5px'}),
};


// ─── UPLOAD ───
function Upload({onLoad}){
  const[err,setErr]=useState(null);
  useEffect(()=>{
    fetch('/scouting_bundle.json')
      .then(r=>r.json())
      .then(d=>{if(d.current&&d.meta)onLoad(d);else setErr('Invalid bundle format');})
      .catch(e=>setErr(e.message));
  },[]);
  if(err)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,fontFamily:T.font}}>
      <p style={{color:T.red,fontSize:14}}>Error loading bundle: {err}</p>
    </div>
  );
  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,fontFamily:T.font}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:4,color:T.accent,marginBottom:16,textTransform:'uppercase'}}>ScoutLab</div>
        <p style={{color:T.dim,fontSize:14}}>Loading scouting data...</p>
      </div>
    </div>
  );
}

// ─── CLUB SELECT ───
function ClubSelect({teamReports,onSelect,onSkip}){
  const teams=Object.keys(CLUB_META);
  return(
    <div style={{maxWidth:1000,margin:'0 auto',padding:20,fontFamily:T.font}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:3,color:T.accent,textTransform:'uppercase'}}>ScoutLab</div>
        <h1 style={{fontSize:22,fontWeight:800,color:T.text,margin:'4px 0 0'}}>Which club are you scouting for?</h1>
        <p style={{color:T.dim,fontSize:12,marginTop:4}}>Select a club to see their 24/25 season report and recruitment needs</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:10,marginBottom:16}}>
        {teams.map(team=>{
          const meta=CLUB_META[team];
          const rep=teamReports?.[team];
          return(
            <div key={team} onClick={()=>onSelect({team,...meta,formation:rep?.formation||meta.formation,style:rep?.style||meta.style,teamReport:rep})}
              style={{padding:14,borderRadius:12,border:`1px solid ${T.border}`,cursor:'pointer',
                background:T.card,borderTop:`3px solid ${meta.color}`,transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 24px ${meta.color}30`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
              <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:3}}>{team}</div>
              <div style={{fontSize:10,color:T.dim,marginBottom:6}}>{rep?.formation||meta.formation} · {rep?.style||meta.style}</div>
              {rep&&<div style={{fontSize:10,color:T.dim,fontFamily:'monospace'}}>W{rep.w} D{rep.d} L{rep.l} · {rep.gf}GF {rep.ga}GA</div>}
            </div>
          );
        })}
      </div>
      <button onClick={onSkip} style={{...C.btn(false),padding:'12px 28px',fontSize:12,border:`1px solid ${T.border}`,borderRadius:8}}>
        Skip — Custom search without club context
      </button>
    </div>
  );
}

// ─── LEAGUE CONTEXT ───
const ordinal=n=>['1st','2nd','3rd'][n-1]||`${n}th`;

function computeLeagueCtx(teamReports){
  const reps=Object.values(teamReports||{});
  if(!reps.length)return null;
  const avg=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
  const gfA=reps.map(r=>r.gfPerGame||0);
  const gaA=reps.map(r=>r.gaPerGame||0);
  const csA=reps.map(r=>r.cleanSheets||0);
  const eA=reps.map(r=>r.errors||0);
  // rank: 1 = best. rD → higher val better. rA → lower val better.
  const rD=(v,a)=>[...a].sort((x,y)=>y-x).findIndex(x=>x<=v)+1;
  const rA=(v,a)=>[...a].sort((x,y)=>x-y).findIndex(x=>x>=v)+1;
  return{
    n:reps.length,
    avgGF:avg(gfA),avgGA:avg(gaA),avgCS:avg(csA),avgErr:avg(eA),
    gfRank:v=>rD(v,gfA),
    gaRank:v=>rA(v,gaA),
    csRank:v=>rD(v,csA),
    errRank:v=>rA(v,eA),
  };
}

// ─── SUGGESTIONS ENGINE ───
function getSuggestions(rep,team,ctx){
  if(!rep)return[];
  const{n=20,avgGF=1.47,avgGA=1.47,avgCS=8.9,avgErr=25.3,gfRank,gaRank,csRank,errRank}=ctx||{};
  const{gaPerGame=0,gfPerGame=0,cleanSheets=0,errors=0,w=0,d=0,l=0,gf=0,ga=0,topScorer='',topAssister='',gk=''}=rep;
  const total=w+d+l||1;
  const pts=3*w+d;

  // Parse top scorer/assister names, goal and assist counts
  const sGoals=parseInt((topScorer.match(/\((\d+)g\)/)||[0,0])[1])||0;
  const sName=topScorer.replace(/\s*\(\d+g\)$/,'').trim();
  const sShare=gf>0?sGoals/gf:0;
  const aGoals=parseInt((topAssister.match(/\((\d+)a\)/)||[0,0])[1])||0;
  const aName=topAssister.replace(/\s*\(\d+a\)$/,'').trim();
  const aShare=gf>0?aGoals/gf:0;

  // League ranks (1 = best)
  const gfR=gfRank?gfRank(gfPerGame):10;
  const gaR=gaRank?gaRank(gaPerGame):10;
  const csR=csRank?csRank(cleanSheets):10;
  const eR=errRank?errRank(errors):10;

  // Team tier by points
  const isElite=pts>=70;
  const isGood=pts>=56;
  const isMid=pts>=40;
  const isRelegate=pts<28;

  // Attack analysis
  const attackCrisis=gfPerGame<1.1;
  const attackPoor=gfPerGame<avgGF-0.08;
  const attackStrong=gfPerGame>=avgGF+0.2;
  const sWeak=sGoals<12&&pts>=45;           // good team, anemic top scorer
  const sDominant=sShare>0.28&&sGoals>14;   // dangerously over-reliant on one scorer
  const assistDom=aShare>0&&aGoals>7&&aGoals/gf>0.18&&pts<58; // one creator carries everything

  // Defense analysis
  const defCrisis=gaPerGame>2.0;
  const defPoor=gaPerGame>1.65;
  const defWeak=gaPerGame>avgGA+0.1;
  const gkCrisis=cleanSheets<=3;
  const gkPoor=cleanSheets<=6&&gaPerGame>1.4;
  const errVHigh=errors>avgErr+6;   // >~31 — reckless
  const errHigh=errors>avgErr+3;    // >~28 — above average
  const errLow=errors<avgErr-7;     // <~18 — disciplined, DM not priority

  // Patterns
  const manyDraws=d>=12;

  // ── Priority scores for each suggestion type (higher = more urgent) ──
  const sc={
    striker:   attackCrisis?95 : (sWeak&&manyDraws)?88 : sWeak?80
               : (attackPoor&&!sDominant&&pts<60&&!errLow)?65 : 5,
    winger:    (attackPoor&&!attackCrisis&&pts>38&&!sWeak)?68
               : (!attackStrong&&!attackCrisis&&pts>35&&!sWeak&&gfR>11)?55
               : (sDominant&&(isGood||isElite))?50 : 5,
    wideFwd:   (sDominant&&(isElite||isGood))?82 : (sDominant&&isMid)?68 : 5,
    cb:        defCrisis?95 : defPoor?82 : (defWeak&&!gkCrisis)?62
               : (errVHigh&&!isElite)?45 : 5,
    dm:        (errVHigh&&defPoor)?92 : errVHigh?80
               : (errHigh&&!isElite&&!errLow)?62 : (errHigh&&isElite)?45
               : (isElite&&errors>avgErr-2)?38 : errLow?-1 : 5,
    gk:        gkCrisis?93 : gkPoor?74 : (cleanSheets<avgCS-2&&defWeak)?58 : 5,
    b2b:       (manyDraws&&!isRelegate&&pts<70)?74 : (manyDraws&&isElite)?62 : 5,
    playmaker: (errLow&&attackPoor)?82 : (attackStrong&&isGood&&!sDominant)?60
               : (isGood&&pts>50&&!attackStrong&&!sDominant)?32
               : (attackPoor&&pts>35&&!sWeak&&!errLow)?28
               : (assistDom&&!sDominant&&!attackStrong)?50 : 5,
  };

  // ── Build suggestion objects ──
  const build=key=>{
    switch(key){
      case 'striker': return{
        role:'Clinical Striker',posGroup:'FW',icon:'⚽',color:'#f43f5e',
        attrs:[{k:'goals',l:'Goal Scoring',p:'required'},{k:'xg_over',l:'Finishing Efficiency',p:'high'},{k:'shots',l:'Shot Volume',p:'high'},{k:'box_carry',l:'Carries into Box',p:'medium'},{k:'aerial',l:'Aerial Dominance',p:'medium'}],
        weights:{goals:'required',xg_over:'high',shots:'high',box_carry:'medium'},
        thresholds:{xg_over_raw:-2},
        because:attackCrisis
          ?`${gfPerGame.toFixed(2)} goals per game — ${ordinal(gfR)} worst attack in the Premier League. ${sName} netted ${sGoals} all season, output that belongs to a relegation fight. A striker who delivers 15+ goals, consistently finishes above their xG and creates danger every game is the single most urgent signing — no other improvement is meaningful without goals.`
          :(sWeak
            ?`${sName}'s ${sGoals} goals is not the output of a ${pts>=70?'title challenger':pts>=56?'top-half side':'side with '+team+'\'s ambitions'}. ${manyDraws?`Those ${d} draws frequently came from a failure to finish games off.`:''} A striker regularly hitting 18-22 per season would convert 5-7 of those stalled results into wins — a potential 15-point swing across the campaign.`
            :`${team} averaged ${gfPerGame.toFixed(2)} goals per game (${ordinal(gfR)} in the division). ${sName}'s ${sGoals} is the attack's ceiling; there is no second genuine goal threat. A clinical striker who outperforms their xG raises the floor every time the first choice is isolated or double-marked.`)
      };
      case 'winger': return{
        role:'Inverted Winger',posGroup:'WG',icon:'💨',color:T.accent2,
        attrs:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'shots',l:'Shot Volume',p:'high'},{k:'takeons',l:'Successful Dribbles',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'high'},{k:'key_passes',l:'Key Passes',p:'medium'}],
        weights:{goals:'high',shots:'high',takeons:'high',prog_carry:'high'},
        because:`${team} rank ${ordinal(gfR)} for goals per game (${gfPerGame.toFixed(2)} vs ${avgGF.toFixed(2)} league avg). ${aName?`${aName} provides assists but`:'Chances are created but'} the attack lacks a second cutting edge from wide — someone who cuts inside and shoots as much as they cross. An inverted winger contributing 9-13 goals from wide positions adds a dimension the current squad cannot produce.`,
      };
      case 'wideFwd': return{
        role:'Creative Wide Forward',posGroup:'WG',icon:'💨',color:T.accent2,
        attrs:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'assists',l:'Assists & xA',p:'high'},{k:'takeons',l:'Successful Dribbles',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'high'},{k:'sca',l:'Shot-Creating Actions',p:'medium'}],
        weights:{goals:'high',assists:'high',takeons:'high',prog_carry:'high'},
        because:`${sName} contributed ${sGoals} goals — ${Math.round(sShare*100)}% of ${team}'s total. That concentration is a structural risk: opponents double up on the threat, and one injury unravels the entire attack. A wide forward contributing 10+ goals and 8+ assists independently makes the attack two-dimensional and forces opposition to split their defensive focus.`,
      };
      case 'cb': return{
        role:'Commanding CB',posGroup:'DF',icon:'🛡️',color:T.green,
        attrs:[{k:'aerial',l:'Aerial Dominance',p:defCrisis?'required':'high'},{k:'tackles',l:'Tackles Won',p:defCrisis?'required':'high'},{k:'interceptions',l:'Interceptions',p:'high'},{k:'blocks',l:'Blocks & Clearances',p:'medium'},{k:'pass_pct',l:'Pass Accuracy',p:'medium'}],
        weights:{aerial:defCrisis?'required':'high',tackles:defCrisis?'required':'high',interceptions:'high',blocks:'medium'},
        because:defCrisis
          ?`${gaPerGame.toFixed(1)} goals per game conceded — ${ordinal(n+1-gaR)} worst in the league with only ${cleanSheets} clean sheets. The backline is dismantled by aerial balls, transitions and direct runners on a near-weekly basis. A commanding CB who dominates the air, steps out to intercept early and organises the defensive shape addresses the root cause of the majority of goals conceded.`
          :defPoor
          ?`Conceding ${gaPerGame.toFixed(1)}/game (${ordinal(n+1-gaR)} worst in the division) is costing ${team} points. The defence struggles to contain aerial threats, set pieces and direct balls. A dominant CB who wins headers and marshals the line precisely is worth 5-8 points per season — the type of improvement that shifts a team a full table position.`
          :`With ${errors} defensive errors (${ordinal(n+1-eR)} most in the league), the midfield is persistently bypassed — placing enormous pressure on the centre-backs to cover ground, make last-ditch interventions and win duels they shouldn't need to contest. A commanding CB who organises the defensive line, dominates aerially and steps aggressively into the midfield space would reduce the volume of dangerous situations even when the midfield shield fails.`,
      };
      case 'dm': return{
        role:'Ball-Winning DM',posGroup:'MF',icon:'⚙️',color:T.accent,
        attrs:[{k:'tackles',l:'Tackles Won',p:'required'},{k:'interceptions',l:'Interceptions',p:'required'},{k:'pressing',l:'Pressing Intensity',p:'high'},{k:'aerial',l:'Aerial Dominance',p:'medium'},{k:'pass_pct',l:'Pass Accuracy',p:'medium'}],
        weights:{tackles:'required',interceptions:'required',pressing:'high',aerial:'medium'},
        because:`${errors} defensive errors — ${ordinal(n+1-eR)} most in the league. The midfield fails to win back possession before opponents reach dangerous shooting positions, constantly exposing the back four. A genuine destroyer who dominates ground duels, reads passing lanes and absorbs transitions at source would shift ${team}'s defence from reactive to proactive — and directly reduce that error count.`,
      };
      case 'gk': return{
        role:'Shot-Stopper GK',posGroup:'GK',icon:'🧤',color:T.yellow,
        attrs:[{k:'gk_saves',l:'Save Percentage',p:'required'},{k:'gk_cs',l:'Clean Sheet %',p:'high'},{k:'gk_ga90',l:'Goals Against /90',p:'high'},{k:'gk_dist',l:'Distribution Quality',p:'medium'},{k:'gk_sweeper',l:'Sweeper-Keeper Activity',p:'medium'}],
        weights:{gk_saves:'required',gk_cs:'high',gk_ga90:'high',gk_dist:'medium'},
        because:`${cleanSheets} clean sheets — ${ordinal(n+1-csR)} fewest in the league. ${gk?`${gk}'s`:'The goalkeeper\'s'} shot-stopping is not providing the platform ${team} needs. Tight games that finish 1-0 require the exceptional save. A GK performing in the top quartile for save percentage is statistically worth 5-8 additional points per season — one of the most efficient signings per pound spent in the entire market.`,
      };
      case 'b2b': return{
        role:'Box-to-Box Midfielder',posGroup:'MF',icon:'⚙️',color:T.accent,
        attrs:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'pressing',l:'Pressing Intensity',p:'high'},{k:'prog_pass',l:'Progressive Passing',p:'high'},{k:'tackles',l:'Tackles Won',p:'medium'},{k:'assists',l:'Assists & xA',p:'medium'}],
        weights:{goals:'high',pressing:'high',prog_pass:'high',tackles:'medium'},
        because:`${team} drew ${d} games — ${Math.round(d/total*100)}% of their matches. Games consistently finish level because no one can manufacture the decisive moment in tight situations. A box-to-box midfielder who arrives late into the penalty area contributes 8-11 goals from midfield — an unpredictable secondary threat that breaks down defences which have already shut out the obvious attackers. Converting even four draws to wins means 8 extra points.`,
      };
      case 'playmaker':
        if(errLow&&attackPoor)return{
          role:'Attacking Midfielder',posGroup:'MF',icon:'📐',color:T.accent2,
          attrs:[{k:'key_passes',l:'Key Passes',p:'required'},{k:'sca',l:'Shot-Creating Actions',p:'high'},{k:'assists',l:'Assists & xA',p:'high'},{k:'goals',l:'Goal Scoring',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'medium'}],
          weights:{key_passes:'required',sca:'high',assists:'high',goals:'high'},
          because:`${team}'s defensive record is one of the league's best — only ${errors} errors (${ordinal(eR)} fewest) and ${cleanSheets} clean sheets. The constraint is entirely offensive: ${gfPerGame.toFixed(2)} goals per game ranks ${ordinal(gfR)} in the division. An attacking midfielder who operates between the lines, creates 60+ chances per season and contributes directly to goals would convert that defensive platform into significantly more points.`,
        };
        return{
          role:'Deep Playmaker',posGroup:'MF',icon:'📐',color:T.accent2,
          attrs:[{k:'pass_pct',l:'Pass Accuracy',p:'required'},{k:'prog_pass',l:'Progressive Passing',p:'high'},{k:'key_passes',l:'Key Passes',p:'high'},{k:'sca',l:'Shot-Creating Actions',p:'high'},{k:'buildup',l:'Buildup Contribution',p:'medium'}],
          weights:{pass_pct:'required',prog_pass:'high',key_passes:'high',sca:'high'},
          because:`${team} have the defensive structure to compete at a higher level — ${errors} errors (${ordinal(eR)} in the league), ${gfPerGame.toFixed(2)} goals per game from a stable base. The ceiling is in ball progression and chance creation volume. A deep playmaker who advances play quickly into half-spaces, completes 85%+ passes and generates 65+ chances per season turns good performances into consistent points.`,
        };
      default: return null;
    }
  };

  // Sort by score, include only >=20, deduplicate by posGroup (max 1 per group except MF allows 2)
  const sorted=Object.entries(sc).filter(([,s])=>s>=20).sort((a,b)=>b[1]-a[1]);
  const pgCount={};
  const sugs=[];
  for(const[key] of sorted){
    if(sugs.length>=4)break;
    const s=build(key);
    if(!s)continue;
    const pg=s.posGroup;
    const limit=pg==='MF'?2:1;
    if((pgCount[pg]||0)<limit){
      sugs.push(s);
      pgCount[pg]=(pgCount[pg]||0)+1;
    }
  }

  // ── Merge recruitmentPriorities from report into sugs ──────────────────────
  const PRIO_PG={'Centre-Forward':'FW','Clinical Striker':'FW','Forward / Winger':'WG',
    'Attacking Forward / Winger':'WG','Goalkeeper':'GK','Creative Midfielder':'MF',
    'Midfielder':'MF','Centre-Back':'DF','Aerial Centre-Back':'DF','Defender':'DF',
    'Left Back':'DF','Right Back':'DF','Full-Back':'DF'};
  const PRIO_ICON={FW:'⚽',WG:'💨',GK:'🧤',MF:'⚙️',DF:'🛡️'};
  const PRIO_COLOR={FW:'#f43f5e',WG:'#818cf8',GK:'#fbbf24',MF:'#22d3ee',DF:'#34d399'};
  const PRIO_ATTRS={
    FW:[{k:'goals',l:'Goal Scoring',p:'required'},{k:'xg_over',l:'Finishing Efficiency',p:'high'},{k:'shots',l:'Shot Volume',p:'high'},{k:'box_carry',l:'Carries into Box',p:'medium'}],
    WG:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'takeons',l:'Successful Dribbles',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'high'},{k:'key_passes',l:'Key Passes',p:'medium'}],
    GK:[{k:'gk_saves',l:'Save Percentage',p:'required'},{k:'gk_cs',l:'Clean Sheet %',p:'high'},{k:'gk_ga90',l:'Goals Against /90',p:'high'}],
    MF:[{k:'key_passes',l:'Key Passes',p:'required'},{k:'prog_pass',l:'Progressive Passing',p:'high'},{k:'tackles',l:'Tackles Won',p:'medium'},{k:'assists',l:'Assists & xA',p:'medium'}],
    DF:[{k:'aerial',l:'Aerial Dominance',p:'high'},{k:'tackles',l:'Tackles Won',p:'high'},{k:'interceptions',l:'Interceptions',p:'high'},{k:'blocks',l:'Blocks & Clearances',p:'medium'}],
  };

  for(const prio of (rep.recruitmentPriorities||[])){
    const pg=PRIO_PG[prio.position];
    if(!pg) continue;
    const existing=sugs.find(s=>s.posGroup===pg);
    if(existing){
      // Update the because text to reflect the specific weakness from the report
      existing.because=prio.reason+' — '+existing.because;
    } else if(sugs.length<4){
      // Add a new card for positions the scoring didn't catch
      sugs.push({
        role:prio.position,posGroup:pg,
        icon:PRIO_ICON[pg]||'🎯',color:PRIO_COLOR[pg]||'#f43f5e',
        attrs:PRIO_ATTRS[pg]||[],weights:{},thresholds:{},
        because:prio.reason,
      });
    }
  }

  return sugs;
}

// ─── CLUB REPORT ───
function ClubReport({clubCtx,data,teamReports,onSearch,onBack}){
  const{team,color,formation,style,teamReport:rep}=clubCtx;
  const leagueCtx=useMemo(()=>teamReports?computeLeagueCtx(teamReports):null,[teamReports]);
  const sugs=useMemo(()=>getSuggestions(rep,team,leagueCtx),[rep,team,leagueCtx]);
  const[selSug,setSelSug]=useState(null);
  const searchRef=useRef(null);

  const pickSug=s=>{
    setSelSug(s);
    setTimeout(()=>searchRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  };

  const PRI_C2={required:'#f43f5e',high:T.accent,medium:T.yellow,low:T.orange};
  const PRI_W={required:4,high:3,medium:2,low:1};

  return(
    <div style={{maxWidth:900,margin:'0 auto',padding:20,fontFamily:T.font}}>
      {/* Header */}
      <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:12,padding:0,marginBottom:14,fontFamily:T.font}}>← All Clubs</button>
      <div style={{...C.card,borderTop:`4px solid ${color}`,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h2 style={{fontSize:24,fontWeight:900,color:T.text,margin:0}}>{team}</h2>
            <p style={{color:T.dim,fontSize:12,margin:'4px 0 0'}}>{formation} · {style} · 2024/25 Season Report</p>
          </div>
          {rep&&(
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              {[['Wins',rep.w,T.green],['Draws',rep.d,T.yellow],['Losses',rep.l,T.red],['Goals For',rep.gf,T.accent],['Goals Against',rep.ga,T.dim],['Clean Sheets',rep.cleanSheets,T.green],['Errors',rep.errors,T.red]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:'monospace'}}>{v}</div>
                  <div style={{fontSize:9,color:T.dim,textTransform:'uppercase',letterSpacing:0.5}}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {rep&&(
          <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap',fontSize:11,color:T.dim}}>
            {rep.topScorer&&<span>Top Scorer: <b style={{color:T.text}}>{rep.topScorer}</b></span>}
            {rep.topAssister&&<span>Top Assister: <b style={{color:T.text}}>{rep.topAssister}</b></span>}
            {rep.gk&&<span>GK: <b style={{color:T.text}}>{rep.gk}</b></span>}
          </div>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      {rep&&(rep.positives?.length>0||rep.negatives?.length>0)&&(
        <div style={{display:'flex',gap:16,marginBottom:16}}>
          {rep.positives?.length>0&&(
            <div style={{...C.card,flex:1,marginBottom:0,border:`1px solid ${T.green}30`,background:T.green+'06'}}>
              <div style={{fontSize:11,fontWeight:800,color:T.green,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>✅ Strengths</div>
              {rep.positives.map((s,i)=>{
                const[title,...rest]=s.split(':');
                return(<div key={i} style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:T.text}}>{title}</div><div style={{fontSize:11,color:T.dim,lineHeight:1.5}}>{rest.join(':').trim()}</div></div>);
              })}
            </div>
          )}
          {rep.negatives?.length>0&&(
            <div style={{...C.card,flex:1,marginBottom:0,border:`1px solid ${T.red}30`,background:T.red+'06'}}>
              <div style={{fontSize:11,fontWeight:800,color:T.red,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>⚠️ Weaknesses</div>
              {rep.negatives.map((s,i)=>{
                const[title,...rest]=s.split(':');
                return(<div key={i} style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:T.text}}>{title}</div><div style={{fontSize:11,color:T.dim,lineHeight:1.5}}>{rest.join(':').trim()}</div></div>);
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {sugs.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>🎯 Recruitment Priorities</div>
          <p style={{fontSize:11,color:T.dim,marginBottom:12}}>Based on 24/25 season analysis — click a role to pre-fill the search below</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>
            {sugs.map((s,i)=>{
              const active=selSug?.role===s.role;
              return(
                <div key={i} onClick={()=>pickSug(s)} style={{
                  padding:16,borderRadius:12,border:`2px solid ${active?s.color:T.border}`,
                  background:active?s.color+'10':T.card,cursor:'pointer',transition:'all 0.15s'}}
                  onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor=s.color+'80';}}}
                  onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=T.border;}}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{fontSize:16}}>{s.icon}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:active?s.color:T.text}}>{s.role}</div>
                      <div style={{fontSize:10,color:T.dim}}>{POS[s.posGroup]?.label} · {POS[s.posGroup]?.sub}</div>
                    </div>
                    {active&&<span style={{marginLeft:'auto',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:4,background:s.color,color:'#000'}}>SELECTED</span>}
                  </div>
                  {/* Attribute bars */}
                  <div style={{marginBottom:10}}>
                    {s.attrs.map(a=>(
                      <div key={a.k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                        <span style={{width:140,fontSize:10,color:T.dim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.l}</span>
                        <div style={{flex:1,height:5,borderRadius:3,background:T.border,overflow:'hidden'}}>
                          <div style={{width:`${PRI_W[a.p]/4*100}%`,height:'100%',borderRadius:3,background:PRI_C2[a.p]}}/>
                        </div>
                        <span style={{width:52,fontSize:9,fontWeight:800,color:PRI_C2[a.p],textAlign:'right',textTransform:'uppercase'}}>{a.p}</span>
                      </div>
                    ))}
                  </div>
                  {/* Because */}
                  <div style={{fontSize:11,color:T.dim,lineHeight:1.6,borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                    <span style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:'uppercase',letterSpacing:0.5}}>Why: </span>
                    {s.because}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div ref={searchRef} style={{borderTop:`2px solid ${T.border}`,marginBottom:20,paddingTop:20}}>
        <div style={{fontSize:12,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>
          🔍 Player Search {selSug?`— ${selSug.role} for ${team}`:''}
        </div>
        {selSug
          ?<p style={{fontSize:11,color:T.dim,marginBottom:0}}>Pre-filled from your selection — adjust any criteria then search</p>
          :<p style={{fontSize:11,color:T.dim,marginBottom:0}}>No role selected — set your own criteria below or click a recommendation above</p>
        }
      </div>

      {/* Embedded Search */}
      <Search
        data={data}
        clubCtx={{...clubCtx,autoWeights:selSug?.weights||{}}}
        forceValues={selSug?{posGroup:selSug.posGroup,priorities:selSug.weights,teamFormation:formation,teamStyle:style,thresholds:selSug.thresholds||{}}:null}
        onSearch={onSearch}
      />
    </div>
  );
}

// ─── SEARCH ───
function Search({data,onSearch,clubCtx,forceValues}){
  const leagues=useMemo(()=>[...new Set(data.current.map(p=>p.league).filter(Boolean))].sort(),[data]);
  const[f,setF]=useState({posGroup:'FW',ageMin:18,ageMax:35,budgetMin:'',budgetMax:'',heightMin:'',heightMax:'',foot:'Any',contractBefore:'',contractAfter:'',nationality:'',mlRole:[],leagues:[],minMinutes:450,priorities:{},thresholds:{},teamFormation:clubCtx?.formation||'4-3-3',teamStyle:clubCtx?.style||'',playerNeed:'',similarTo:'',subPos:'',potentialTier:'',gkMinSave:'',gkMaxGA:'',gkMinCS:''});
  const[tooltip,setTooltip]=useState(null);
  const[showTemplates,setShowTemplates]=useState(false);
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
  const applyTemplate=name=>{
    const t=SCOUT_TEMPLATES[name];
    if(!t)return;
    const d={};ALL_A.forEach(a=>{d[a.k]='none';});
    setF(p=>({...p,priorities:{...d,...t},thresholds:{}}));
    setShowTemplates(false);
  };
  const u=(k,v)=>setF(p=>({...p,[k]:v}));
  const uP=(k,v)=>setF(p=>({...p,priorities:{...p.priorities,[k]:v}}));
  const uT=(k,v)=>setF(p=>({...p,thresholds:{...p.thresholds,[k]:v}}));
  const tL=l=>setF(p=>({...p,leagues:p.leagues.includes(l)?p.leagues.filter(x=>x!==l):[...p.leagues,l]}));
  const gP=(g,v)=>setF(p=>{const n={...p.priorities};g.attrs.forEach(a=>{n[a.k]=v;});return{...p,priorities:n};});
  const ac=Object.values(f.priorities).filter(v=>v&&v!=='none').length;
  const reqc=Object.values(f.priorities).filter(v=>v==='required').length;
  const hc=Object.values(f.priorities).filter(v=>v==='high').length;

  return(
    <div style={{maxWidth:860,margin:'0 auto',padding:20,fontFamily:T.font}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:3,color:T.accent,textTransform:'uppercase'}}>ScoutLab</div>
          <h1 style={{fontSize:22,fontWeight:800,color:T.text,margin:'4px 0 0',letterSpacing:'-0.3px'}}>Player Search</h1>
          <p style={{color:T.dim,fontSize:12,marginTop:2}}>{data.current.length} players · {data.meta.currentSeason} season</p>
          {clubCtx&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,padding:'5px 10px',borderRadius:6,background:clubCtx.color+'15',border:`1px solid ${clubCtx.color}30`,display:'inline-flex'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:clubCtx.color,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:700,color:clubCtx.color}}>{clubCtx.team}</span>
            <span style={{fontSize:10,color:T.dim}}>{clubCtx.formation} · {clubCtx.style}</span>
          </div>}
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {Object.entries(POS).map(([k,v])=>(
            <button key={k} onClick={()=>applyPreset(k)} style={{...C.btn(f.posGroup===k),padding:'8px 14px',fontSize:11,borderRadius:8}}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* Sub-position filter for DF and WG */}
      {(f.posGroup==='DF'||f.posGroup==='WG')&&(
        <div style={{...C.card,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>
            {f.posGroup==='DF'?'🛡️ Defender Type':'🏃 Winger Side'}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {(f.posGroup==='DF'
              ?[['','All Defenders'],['LB','Left Back'],['RB','Right Back'],['CB','Centre-Back']]
              :[['','All Wingers'],['LW','Left Winger'],['RW','Right Winger']]
            ).map(([val,label])=>(
              <button key={val} onClick={()=>u('subPos',val)} style={{
                ...C.btn(f.subPos===val,T.green),
                padding:'7px 16px',fontSize:10,borderRadius:8,
                border:f.subPos===val?'none':`1px solid ${T.border}30`,
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* GK-specific stat filters */}
      {f.posGroup==='GK'&&(
        <div style={{...C.card,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>🧤 Goalkeeper Thresholds</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:100}}>
              <label style={C.label}>Min Save %</label>
              <input type="number" value={f.gkMinSave} onChange={e=>u('gkMinSave',+e.target.value||'')} style={C.input} placeholder="e.g. 68"/>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <label style={C.label}>Max GA / 90</label>
              <input type="number" step="0.1" value={f.gkMaxGA} onChange={e=>u('gkMaxGA',+e.target.value||'')} style={C.input} placeholder="e.g. 1.2"/>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <label style={C.label}>Min Clean Sheet %</label>
              <input type="number" value={f.gkMinCS} onChange={e=>u('gkMinCS',+e.target.value||'')} style={C.input} placeholder="e.g. 30"/>
            </div>
          </div>
        </div>
      )}

      {/* ML Role Archetype */}
      {availMlRoles.length>0&&(
        <div style={{...C.card,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1}}>🏷️ Player Role Archetype</span>
            {f.mlRole.length>0&&<span style={C.tag('#f43f5e')}>{f.mlRole.length} selected · KNOCKOUT</span>}
            {f.mlRole.length>0&&<button onClick={()=>u('mlRole',[])} style={{...C.btn(false),fontSize:9,padding:'2px 8px',border:`1px solid ${T.border}`}}>✕ Clear</button>}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {availMlRoles.map(r=>{
              const on=f.mlRole.includes(r);
              return(
                <button key={r} onClick={()=>u('mlRole',on?f.mlRole.filter(x=>x!==r):[...f.mlRole,r])} style={{
                  ...C.btn(on,T.accent2),
                  padding:'6px 14px',fontSize:10,borderRadius:8,
                  border:on?'none':`1px solid ${T.border}30`,
                }}>{r}</button>
              );
            })}
          </div>
          <p style={{fontSize:10,color:T.dim,marginTop:8,marginBottom:0}}>Select one or more roles — only players the ML model classified in those archetypes will appear.</p>
        </div>
      )}

      {/* Filters */}
      <div style={C.card}>
        <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>📋 Basic Requirements</div>
        <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Age Min</label><input type="number" value={f.ageMin} onChange={e=>u('ageMin',+e.target.value||'')} style={C.input}/></div>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Age Max</label><input type="number" value={f.ageMax} onChange={e=>u('ageMax',+e.target.value||'')} style={C.input}/></div>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Budget Min</label><select value={f.budgetMin} onChange={e=>u('budgetMin',e.target.value?+e.target.value:'')} style={C.input}>{BUDGET.map(b=><option key={`mn${b.v}`} value={b.v}>{b.l}</option>)}</select></div>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Budget Max</label><select value={f.budgetMax} onChange={e=>u('budgetMax',e.target.value?+e.target.value:'')} style={C.input}>{BUDGET.map(b=><option key={`mx${b.v}`} value={b.v}>{b.l}</option>)}</select></div>
        </div>
        <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Height Min (cm)</label><input type="number" value={f.heightMin} onChange={e=>u('heightMin',+e.target.value||'')} style={C.input} placeholder="e.g. 180"/></div>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Height Max (cm)</label><input type="number" value={f.heightMax} onChange={e=>u('heightMax',+e.target.value||'')} style={C.input} placeholder="e.g. 195"/></div>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Preferred Foot</label><select value={f.foot} onChange={e=>u('foot',e.target.value)} style={C.input}>{['Any','Right','Left','Both'].map(x=><option key={x}>{x}</option>)}</select></div>
          <div style={{flex:1,minWidth:90}}><label style={C.label}>Min Minutes</label><input type="number" value={f.minMinutes} onChange={e=>u('minMinutes',+e.target.value||0)} style={C.input}/></div>
          <div style={{flex:1,minWidth:120}}><label style={C.label}>Nationality</label><input value={f.nationality} onChange={e=>u('nationality',e.target.value)} style={C.input} placeholder="e.g. Spanish, French"/></div>
          <div style={{flex:1,minWidth:130}}><label style={C.label}>Potential</label><select value={f.potentialTier} onChange={e=>u('potentialTier',e.target.value)} style={C.input}><option value=''>Any</option><option value='Developing'>Developing (50+)</option><option value='High Potential'>High Potential (65+)</option><option value='Elite Prospect'>Elite Prospect (80+)</option></select></div>
        </div>
        <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:1,minWidth:130}}><label style={C.label}>Contract Expires Before</label><input type="date" value={f.contractBefore} onChange={e=>u('contractBefore',e.target.value)} style={C.input}/></div>
          <div style={{flex:1,minWidth:130}}><label style={C.label}>Contract Expires After</label><input type="date" value={f.contractAfter} onChange={e=>u('contractAfter',e.target.value)} style={C.input}/></div>
          <div style={{display:'flex',gap:6,paddingBottom:0,flexShrink:0}}>
            {[['Free Agents',()=>{const d=new Date();d.setMonth(d.getMonth()+3);u('contractBefore',d.toISOString().slice(0,10));}],['Expiring 12m',()=>{const d=new Date();d.setMonth(d.getMonth()+12);u('contractBefore',d.toISOString().slice(0,10));}],['Clear',()=>{u('contractBefore','');u('contractAfter','');}]].map(([l,fn])=>(
              <button key={l} onClick={fn} style={{...C.btn(false,T.accent2),padding:'8px 10px',fontSize:9,border:`1px solid ${T.border}`}}>{l}</button>
            ))}
          </div>
        </div>
        <label style={C.label}>Leagues</label>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{leagues.map(l=><button key={l} onClick={()=>tL(l)} style={C.btn(f.leagues.includes(l))}>{l}</button>)}</div>
      </div>

      {/* Attribute Priorities */}
      <div style={C.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:11,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>⚙️ Attribute Priorities</span>
            {reqc>0&&<span style={C.tag('#f43f5e')}>{reqc} required</span>}
            {hc>0&&<span style={C.tag(T.accent)}>{hc} high</span>}
            <span style={C.tag(ac?T.dim:T.red)}>{ac} active</span>
          </div>
          <button onClick={()=>applyPreset(f.posGroup)} style={{...C.btn(false),border:`1px solid ${T.border}`,fontSize:9}}>↻ Reset</button>
        </div>

        {/* Legend */}
        <div style={{display:'flex',gap:12,marginBottom:12,padding:'8px 10px',background:T.bg,borderRadius:8,flexWrap:'wrap'}}>
          {Object.entries(PRI_LABELS).map(([k,l])=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:5,fontSize:10}}>
              <div style={{width:8,height:8,borderRadius:2,background:PRI_C[k]}}/>
              <span style={{color:T.dim,fontWeight:600}}>{l}</span>
              <span style={{color:T.dim,opacity:0.6}}>—</span>
              <span style={{color:T.dim,fontSize:9}}>{k==='required'?'Must be ≥ avg · 4× weight':k==='high'?'Major weight (3×)':k==='medium'?'Standard weight (2×)':k==='low'?'Minor weight (1×)':'Ignored'}</span>
            </div>
          ))}
        </div>

        {ac===0&&<div style={{background:T.red+'15',border:`1px solid ${T.red}30`,borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:T.red}}>⚠ No attributes set — all players will score equally. Set at least 2-3 attributes.</div>}

        {availCats.map(g=>(
          <div key={g.cat} style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>
              <div>
                <span style={{fontSize:11,fontWeight:800,color:T.text,letterSpacing:0.5}}>{g.icon} {g.cat}</span>
                {g.note&&<div style={{fontSize:9,color:T.yellow,marginTop:2}}>⚠ {g.note}</div>}
              </div>
              <div style={{display:'flex',gap:3}}>
                <button onClick={()=>gP(g,'required')} style={{...C.btn(false,'#f43f5e'),fontSize:8,padding:'2px 7px'}}>All Req</button>
                <button onClick={()=>gP(g,'high')} style={{...C.btn(false,T.green),fontSize:8,padding:'2px 7px'}}>All High</button>
                <button onClick={()=>gP(g,'none')} style={{...C.btn(false),fontSize:8,padding:'2px 7px'}}>Clear</button>
              </div>
            </div>
            {g.attrs.map(a=>(
              <div key={a.k} style={{marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:a.thresholdKey&&f.priorities[a.k]&&f.priorities[a.k]!=='none'?4:0}}>
                  <span style={{width:16,fontSize:11}}>{a.i}</span>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:12,color:T.text,fontWeight:500}}>{a.l}</span>
                      {a.desc&&(
                        <span
                          style={{fontSize:9,color:T.dim,cursor:'help',position:'relative'}}
                          onMouseEnter={()=>setTooltip(a.k)}
                          onMouseLeave={()=>setTooltip(null)}
                        >ⓘ{tooltip===a.k&&(
                          <span style={{position:'absolute',bottom:'120%',left:0,width:220,background:T.card2,border:`1px solid ${T.border}`,borderRadius:6,padding:'6px 8px',fontSize:10,color:T.text,lineHeight:1.4,zIndex:100,pointerEvents:'none',whiteSpace:'normal'}}>
                            {a.desc}
                          </span>
                        )}</span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:2}}>
                    {Object.keys(PRI).map(p=>(
                      <button key={p} onClick={()=>uP(a.k,p)} style={{
                        ...C.btn(f.priorities[a.k]===p,PRI_C[p]),
                        fontSize:9,padding:'3px 8px',
                        border:f.priorities[a.k]===p?'none':`1px solid ${T.border}30`,
                      }}>{p==='required'?'REQ':p==='none'?'—':p.charAt(0).toUpperCase()+p.slice(1)}</button>
                    ))}
                  </div>
                </div>
                {/* Minimum threshold input — only shown when attribute is active */}
                {a.thresholdKey&&f.priorities[a.k]&&f.priorities[a.k]!=='none'&&(
                  <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:24,marginTop:2}}>
                    <span style={{fontSize:10,color:T.dim,minWidth:80}}>{a.thresholdLabel}:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={f.thresholds[a.thresholdKey]||''}
                      onChange={e=>uT(a.thresholdKey,e.target.value)}
                      placeholder="Min (optional)"
                      style={{...C.input,width:120,padding:'4px 8px',fontSize:11,border:`1px solid ${f.thresholds[a.thresholdKey]?'#f43f5e':T.border}`}}
                    />
                    {f.thresholds[a.thresholdKey]&&<span style={{fontSize:9,color:'#f43f5e',fontWeight:700}}>KNOCKOUT</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Context */}
      <div style={C.card}>
        <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>🏟️ Team Context</div>
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          <div style={{flex:1}}><label style={C.label}>Formation</label><select value={f.teamFormation} onChange={e=>u('teamFormation',e.target.value)} style={C.input}>{['4-3-3','4-2-3-1','3-5-2','4-4-2','3-4-3','5-3-2','4-1-4-1'].map(x=><option key={x}>{x}</option>)}</select></div>
          <div style={{flex:1}}><label style={C.label}>Playing Style</label><select value={f.teamStyle} onChange={e=>u('teamStyle',e.target.value)} style={C.input}><option value="">Any</option>{['Possession','Counter-attack','High Press','Direct Play','Gegenpressing'].map(x=><option key={x}>{x}</option>)}</select></div>
        </div>
        <label style={C.label}>Similar to Existing Player</label><input value={f.similarTo} onChange={e=>u('similarTo',e.target.value)} placeholder="e.g. Pedri, Salah, Haaland — boosts attributes matching their profile" style={C.input}/>
      </div>

      {/* Active filters summary */}
      {(reqc>0||Object.values(f.thresholds).some(v=>v)||f.contractBefore||f.contractAfter||f.mlRole?.length>0||f.nationality||f.subPos||f.potentialTier)&&(
        <div style={{...C.card,border:`1px solid #f43f5e40`,background:'#f43f5e08',marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:800,color:'#f43f5e',marginBottom:8}}>🚫 KNOCKOUT FILTERS ACTIVE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {reqc>0&&<span style={C.tag('#f43f5e')}>{reqc} Required attributes — must be ≥ pool average</span>}
            {Object.entries(f.thresholds).filter(([,v])=>v).map(([k,v])=>(
              <span key={k} style={C.tag('#f43f5e')}>{k.replace(/_per90/,'').replace(/_/g,' ')} ≥ {v}</span>
            ))}
            {f.subPos&&<span style={C.tag('#f43f5e')}>Position: {f.subPos==='LB'?'Left Back':f.subPos==='RB'?'Right Back':f.subPos==='CB'?'Centre-Back':f.subPos==='LW'?'Left Winger':f.subPos==='RW'?'Right Winger':f.subPos}</span>}
            {f.mlRole?.length>0&&<span style={C.tag('#f43f5e')}>Roles: {f.mlRole.join(', ')}</span>}
            {f.nationality&&<span style={C.tag('#f43f5e')}>Nationality: {f.nationality}</span>}
            {f.potentialTier&&<span style={C.tag(PTL[f.potentialTier]?.c||'#a855f7')}>{PTL[f.potentialTier]?.i} {f.potentialTier}</span>}
            {f.contractBefore&&<span style={C.tag('#f43f5e')}>Contract expires ≤ {f.contractBefore}</span>}
            {f.contractAfter&&<span style={C.tag('#f43f5e')}>Contract expires ≥ {f.contractAfter}</span>}
          </div>
          <p style={{fontSize:10,color:T.dim,marginTop:6,marginBottom:0}}>Players not meeting these thresholds are excluded entirely from results, regardless of other attributes.</p>
        </div>
      )}

      <button onClick={()=>onSearch(f)} style={{width:'100%',padding:16,borderRadius:12,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${T.accent},${T.accent2})`,color:'#000',fontSize:16,fontWeight:800,letterSpacing:0.5}}>Search Players</button>
    </div>
  );
}

// ─── RESULTS ───
function Results({results,req,shortlist,onToggleShortlist,onSelect,onBack,onShortlist}){
  const[devMode,setDevMode]=useState(false);
  const posL=POS[req?.posGroup]?.label||'All';
  const top=useMemo(()=>{
    if(devMode){
      return [...results]
        .filter(p=>p._potential_tier!=null)
        .sort((a,b)=>(b._potential_score||0)-(a._potential_score||0))
        .slice(0,50);
    }
    return results.slice(0,50);
  },[results,devMode]);
  return(
    <div style={{maxWidth:920,margin:'0 auto',padding:20,fontFamily:T.font}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:12,padding:0,marginBottom:6,fontFamily:T.font}}>← Search</button>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>{devMode?'Development Scouting':'Scouting Results'}</h2>
          {devMode&&<p style={{fontSize:11,color:'#a855f7',margin:'2px 0 0'}}>Sorted by potential score — showing players aged 26 and under</p>}
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setDevMode(m=>!m)} style={{...C.btn(devMode,'#a855f7'),padding:'7px 14px',fontSize:11,border:`1px solid #a855f780`,borderRadius:8}}>
              {devMode?'⚡ Dev Mode ON':'🌱 Dev Mode'}
            </button>
            <button onClick={onShortlist} style={{...C.btn(false,T.yellow),padding:'7px 14px',fontSize:11,border:`1px solid ${T.yellow}30`,borderRadius:8}}>
              ⭐ Shortlist {shortlist?.length>0?`(${shortlist.length})`:''}
            </button>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:22,fontWeight:800,color:devMode?'#a855f7':T.accent}}>{devMode?top.length:results.length}</div>
            <div style={{fontSize:11,color:T.dim}}>{devMode?'prospects found':'matches found'}</div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        <span style={C.tag()}>📌 {posL}</span>
        <span style={C.tag()}>👤 {req?.ageMin}–{req?.ageMax}</span>
        {req?.budgetMax&&<span style={C.tag()}>💰 {req.budgetMin?`€${(req.budgetMin/1e6).toFixed(0)}M`:'€0'}–€{(req.budgetMax/1e6).toFixed(0)}M</span>}
        {req?.similarTo&&<span style={C.tag(T.accent2)}>🔍 Like: {req.similarTo}</span>}
      </div>

      {top.map((p,i)=>{
        const starred=shortlist?.includes(p.Player);
        return(
        <div key={`${p.Player}-${i}`} style={{display:'flex',alignItems:'center',gap:14,padding:12,marginBottom:4,background:i===0?T.accent+'10':T.card,border:`1px solid ${i===0?T.accent+'40':T.border}`,borderRadius:10,transition:'all 0.15s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.transform='translateX(3px)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=i===0?T.accent+'40':T.border;e.currentTarget.style.transform='none';}}>
          <span style={{fontSize:10,fontWeight:700,color:T.dim,width:22,textAlign:'center',fontFamily:T.mono}}>#{i+1}</span>
          {/* Player photo */}
          <div style={{width:52,height:52,borderRadius:8,overflow:'hidden',flexShrink:0,background:T.card2,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            {p.img_url&&<img src={p.img_url} alt={p.Player} onError={e=>{e.target.style.display='none';}} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>}
            {!p.img_url&&<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:T.dim}}>{(p.Player||'?')[0]}</div>}
          </div>
          {/* Score badge — match score in normal mode, potential score in dev mode */}
          {devMode?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
              <div style={{width:34,height:34,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:'#a855f7',color:'#fff',fontWeight:900,fontSize:12,fontFamily:T.mono}}>{p._potential_score}</div>
              <div style={{fontSize:8,color:'#a855f7',fontWeight:700}}>POT</div>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
              <div style={{width:34,height:34,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:sc(p.matchScore),color:'#000',fontWeight:900,fontSize:12,fontFamily:T.mono}}>{p.matchScore}</div>
              <div style={{fontSize:8,color:T.dim,fontWeight:700}}>FIT</div>
            </div>
          )}
          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              {i===0&&!devMode&&<span style={{...C.tag(T.accent),fontSize:9}}>TOP MATCH</span>}
              {i===0&&devMode&&<span style={{...C.tag('#a855f7'),fontSize:9}}>TOP PROSPECT</span>}
              <span style={{fontWeight:700,color:T.text,fontSize:14}}>{p.Player}</span>
              {p._trajectory&&<span style={{fontSize:10,fontWeight:700,color:TRJ[p._trajectory]?.c}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
              {p._potential_tier&&<span style={{fontSize:9,padding:'1px 6px',borderRadius:3,background:PTL[p._potential_tier]?.c+'20',color:PTL[p._potential_tier]?.c,fontWeight:700}}>{PTL[p._potential_tier]?.i} {p._potential_tier}</span>}
              {p._injury_risk&&p._injury_risk!=='Low'&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:3,background:IRK[p._injury_risk]?.c+'20',color:IRK[p._injury_risk]?.c,fontWeight:700}}>{p._injury_risk} Risk</span>}
            </div>
            <div style={{fontSize:11,color:T.dim,marginTop:2}}>{p.Squad} · {p.league} · {p._ml_role||p.Pos||p.position} · {p.Age}y{p.height?` · ${p.height}cm`:''}{p.Min?` · ${p.Min}'`:''}{ p.whoscored_rating>0?` · ⭐${(+p.whoscored_rating).toFixed(2)}`:''}</div>
          </div>
          <div style={{textAlign:'right',cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>{mv(p)}</div>
            <div style={{fontSize:10,color:T.dim,fontFamily:T.mono}}>{+(p.goals||p.Gls||0)}G · {+(p.assists||p.Ast||0)}A</div>
          </div>
          <button onClick={e=>{e.stopPropagation();onToggleShortlist(p);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:starred?T.yellow:T.dim,padding:'4px 6px',lineHeight:1,flexShrink:0}} title={starred?'Remove from shortlist':'Add to shortlist'}>
            {starred?'★':'☆'}
          </button>
        </div>
        );
      })}
    </div>
  );
}

// ─── SECTION WRAPPER — defined outside Report so React never remounts it on re-render ───
function Sec({icon,title,tag,children,accent}){
  return(
    <div style={{...C.card,border:accent?`1px solid ${accent}40`:C.card.border,background:accent?accent+'08':C.card.background}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <span style={{fontSize:14}}>{icon}</span>
        <span style={{fontSize:12,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>{title}</span>
        {tag&&<span style={C.tag(accent||T.accent)}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── PLAYER REPORT ───
function Report({player:p,idx,results,data,req,shortlist,onToggleShortlist,onBack,onShortlist}){
  const pg=req.posGroup!=='ALL'?req.posGroup:'FW';
  const prof=useMemo(()=>getProfile(p,data.current,pg),[p,data,pg]);
  const str=prof.filter(s=>s.percentile>=75).slice(0,5);
  const weak=prof.filter(s=>s.percentile<50).slice(-3).reverse();
  const comps=results.filter(x=>x.Player!==p.Player).slice(0,3);

  // Previous season
  const prevP=useMemo(()=>{if(!data.previous)return null;const n=(p.Player||'').toLowerCase().trim();const alt=p._ml_key||'';return data.previous.find(x=>{const xn=(x.Player||'').toLowerCase().trim();return xn===n||xn===alt;})||null;},[data,p]);
  const prevProf=useMemo(()=>{if(!prevP||!data.previous)return[];return getProfile(prevP,data.previous,pg);},[prevP,data,pg]);

  // Match logs
  const logs=useMemo(()=>{if(!data.matchLogs)return null;const n=(p.Player||'').toLowerCase().trim();return data.matchLogs[n]?.m||null;},[data,p]);

  // Radar data
  const radarData=useMemo(()=>{
    const cats=['goals','assists','shots','key_passes','tackles','interceptions','aerial','pressing'];
    return cats.map(k=>{const a=prof.find(x=>x.k===k);return{attr:ALL_A.find(x=>x.k===k)?.l?.split('/')[0]||k,value:a?.percentile||0};}).filter(d=>d.value>0);
  },[prof]);

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

  // Shot map data — use _shot_key override for accent mismatches
  const shotMapKey = p._shot_key || (p.Player||'').toLowerCase().trim();
  const shotData = data.shotMaps?.[shotMapKey] || null;

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

  // ML data — use _ml_key override for accent mismatches
  const mlKey = p._ml_key || (p.Player||'').toLowerCase().trim();
  const mlSim = data.ml?.similarity?.[mlKey] || [];
  const mlVal = data.ml?.valuation?.[mlKey] || null;
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
  const verdict=p.matchScore>=90?{s:'⭐⭐⭐⭐⭐',r:'HIGHLY RECOMMENDED',a:'Pursue actively.',c:T.accent}:p.matchScore>=80?{s:'⭐⭐⭐⭐',r:'RECOMMENDED',a:'Strong candidate.',c:T.green}:p.matchScore>=70?{s:'⭐⭐⭐',r:'WORTH MONITORING',a:'Good option, some gaps.',c:T.yellow}:p.matchScore>=60?{s:'⭐⭐',r:'CONDITIONAL',a:'Backup option.',c:T.orange}:{s:'⭐',r:'NOT RECOMMENDED',a:'Does not match requirements.',c:T.red};

  return(
    <div style={{maxWidth:860,margin:'0 auto',padding:20,fontFamily:T.font}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:12,padding:0,fontFamily:T.font}}>← Results</button>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onShortlist} style={{...C.btn(false,T.yellow),padding:'6px 12px',fontSize:10,border:`1px solid ${T.yellow}30`,borderRadius:7}}>⭐ Shortlist {shortlist?.length>0?`(${shortlist.length})`:''}</button>
          <button onClick={()=>onToggleShortlist(p)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:7,cursor:'pointer',fontSize:18,color:shortlist?.includes(p.Player)?T.yellow:T.dim,padding:'3px 10px',lineHeight:1,fontFamily:T.font}} title="Toggle shortlist">{shortlist?.includes(p.Player)?'★':'☆'}</button>
        </div>
      </div>

      {/* Header */}
      <div style={{...C.card,display:'flex',gap:16,alignItems:'center'}}>
        {/* Player Photo */}
        <div style={{position:'relative',flexShrink:0}}>
          {p.img_url?(
            <img
              src={p.img_url}
              alt={p.Player}
              onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}
              style={{width:108,height:108,borderRadius:12,objectFit:'cover',objectPosition:'top',background:T.card2}}
            />
          ):null}
          <div style={{width:108,height:108,borderRadius:12,background:T.card2,display:p.img_url?'none':'flex',alignItems:'center',justifyContent:'center',fontSize:36,flexShrink:0}}>
            {(p.Player||'?')[0]}
          </div>
          <div style={{position:'absolute',bottom:-6,right:-6,width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:sc(p.matchScore),color:'#000',fontWeight:900,fontSize:11,fontFamily:T.mono}}>{p.matchScore}</div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <h2 style={{fontSize:24,fontWeight:800,color:T.text,margin:0}}>{p.Player}</h2>
            <span style={C.tag(verdict.c)}>#{(idx||0)+1} · {verdict.r}</span>
            {p._trajectory&&<span style={{fontSize:11,fontWeight:800,color:TRJ[p._trajectory]?.c,padding:'2px 8px',borderRadius:5,background:TRJ[p._trajectory]?.c+'15'}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
            {p._potential_tier&&<span style={{fontSize:10,fontWeight:800,color:PTL[p._potential_tier]?.c,padding:'2px 8px',borderRadius:5,background:PTL[p._potential_tier]?.c+'15'}}>{PTL[p._potential_tier]?.i} {p._potential_tier} · {p._potential_score}/100</span>}
            {p._injury_risk&&<span style={{fontSize:10,fontWeight:800,color:IRK[p._injury_risk]?.c,padding:'2px 8px',borderRadius:5,background:IRK[p._injury_risk]?.c+'15'}}>{IRK[p._injury_risk]?.i} {p._injury_risk} Injury Risk</span>}
          </div>
          <p style={{color:T.dim,margin:'4px 0 0',fontSize:13}}>{p.Squad} · {p.league} · {p._ml_role||p.Pos||p.position}</p>
          <div style={{display:'flex',gap:16,marginTop:8,fontSize:11,color:T.dim,flexWrap:'wrap'}}>
            {[['Age',p.Age],['Height',p.height?p.height+'cm':''],['Foot',p.foot],['Nation',(p.citizenship||'').split(/\s{2,}/).filter(Boolean).join(' / ')||null],['Minutes',p.Min?`${p.Min}'`:''],['Value',mv(p)],['Contract',p.contract_expires]].filter(x=>x[1]).map(([l,v])=>(
              <span key={l}>{l}: <b style={{color:T.text}}>{v}</b></span>
            ))}
            {p.whoscored_rating>0&&<span>WS Rating: <b style={{color:p.whoscored_rating>=7.5?T.green:p.whoscored_rating>=7?T.yellow:T.text}}>{(+p.whoscored_rating).toFixed(2)}</b></span>}
            {p.pass_success_pct>0&&<span>Pass%: <b style={{color:p.pass_success_pct>=88?T.green:p.pass_success_pct>=80?T.yellow:T.text}}>{p.pass_success_pct}%</b></span>}
          </div>
        </div>
      </div>

      {/* Radar + Match Breakdown side by side */}
      <div style={{display:'flex',gap:16,marginBottom:16}}>
        <div style={{...C.card,flex:1,marginBottom:0}}>
          <div style={{fontSize:12,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📊 Player Profile</div>
          {radarData.length>=3&&<ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}><PolarGrid stroke={T.border}/><PolarAngleAxis dataKey="attr" tick={{fill:T.dim,fontSize:9}}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/><Radar dataKey="value" stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2}/></RadarChart>
          </ResponsiveContainer>}
        </div>
        <div style={{...C.card,flex:1,marginBottom:0}}>
          <div style={{fontSize:12,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>🎯 Match Breakdown <span style={{color:T.dim,fontWeight:400}}>{data.meta.currentSeason}</span></div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{flex:1,height:10,borderRadius:5,background:T.border,overflow:'hidden'}}><div style={{width:`${p.matchScore}%`,height:'100%',borderRadius:5,background:sc(p.matchScore)}}/></div>
            <span style={{fontWeight:900,color:sc(p.matchScore),fontSize:18,fontFamily:T.mono}}>{p.matchScore}</span>
          </div>
          {prof.slice(0,8).map(a=>(
            <div key={a.k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
              <span style={{width:90,fontSize:10,color:T.dim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.l}</span>
              <div style={{flex:1,height:5,borderRadius:3,background:T.border,overflow:'hidden'}}><div style={{width:`${a.percentile}%`,height:'100%',borderRadius:3,background:rc(a.percentile)}}/></div>
              <span style={{width:28,fontSize:9,fontWeight:700,color:rc(a.percentile),textAlign:'right',fontFamily:T.mono}}>{a.percentile}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div style={{display:'flex',gap:16,marginBottom:0}}>
        <Sec icon="✅" title="Strengths" tag={data.meta.currentSeason}><div>
          {str.length?str.map(s=>(
            <div key={s.k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:11}}>{s.i}</span>
              <span style={{fontSize:12,fontWeight:600,color:T.text}}>{s.l}</span>
              <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:4,background:rc(s.percentile),color:'#000'}}>{s.rating}</span>
              <span style={{fontSize:10,color:T.dim,fontFamily:T.mono,marginLeft:'auto'}}>{s.value?.toFixed(2)} · P{s.percentile}</span>
            </div>
          )):<p style={{color:T.dim,fontSize:12}}>No standout attributes</p>}
        </div></Sec>
        {weak.length>0&&<Sec icon="⚠️" title="Development" tag={data.meta.currentSeason}><div>
          {weak.map(w=>(
            <div key={w.k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:11}}>{w.i}</span>
              <span style={{fontSize:12,fontWeight:600,color:T.text}}>{w.l}</span>
              <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:4,background:rc(w.percentile),color:'#000'}}>{w.rating}</span>
              <span style={{fontSize:10,color:T.dim,fontFamily:T.mono,marginLeft:'auto'}}>{w.value?.toFixed(2)} · P{w.percentile}</span>
            </div>
          ))}
        </div></Sec>}
      </div>

      {/* vs Position Average */}
      <Sec icon="📊" title="vs Position Average" tag={POS[pg]?.label||pg}>
        <p style={{fontSize:10,color:T.dim,marginTop:-6,marginBottom:10}}>Bar = player value. Line marker (|) = position average. Bold = above average.</p>
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
                  <span style={{fontSize:10,color:above?T.text:T.dim,fontWeight:above?700:400}}>{a.l}</span>
                  <span style={{fontSize:10,fontFamily:T.mono,color:above?rc(a.percentile):T.dim}}>
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
      <Sec icon="📅" title="Form & Recent Matches" tag={logs?`${Math.min(10,logs.length)} games`:null}>
        {logs?(()=>{
          const last=logs.slice(0,10);
          const tG=last.reduce((s,m)=>s+m.g,0),tA=last.reduce((s,m)=>s+m.a,0),tXG=last.reduce((s,m)=>s+m.xg,0);
          const scored=last.filter(m=>m.g>0).length;
          return(<>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={last.map(m=>({date:m.d.slice(5),goals:m.g,xG:m.xg,opp:`${m.ht} v ${m.at}`})).reverse()}>
                <XAxis dataKey="date" tick={{fill:T.dim,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.dim,fontSize:9}} axisLine={false} tickLine={false} domain={[0,'auto']}/>
                <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11,fontFamily:T.font}} labelStyle={{color:T.text}} itemStyle={{color:T.dim}}/>
                <Bar dataKey="goals" fill={T.green} radius={[3,3,0,0]} name="Goals"/>
                <Bar dataKey="xG" fill={T.accent+'60'} radius={[3,3,0,0]} name="xG"/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:'flex',gap:20,marginTop:8,flexWrap:'wrap'}}>
              {[['🔥',`${tG} goals`,null],['🅰️',`${tA} assists`,null],['📊',`${tXG.toFixed(1)} xG`,null],['✅',`${scored}/${last.length} scored in`,null]].map(([i,v],j)=>(
                <span key={j} style={{fontSize:12,color:T.dim}}>{i} <b style={{color:T.text}}>{v}</b></span>
              ))}
            </div>
            <div style={{marginTop:12,overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {['Date','Match','Min','G','A','S','KP','xG','xA'].map(h=><th key={h} style={{padding:'4px 8px',color:T.dim,fontWeight:600,textAlign:'center',fontSize:10}}>{h}</th>)}
                </tr></thead>
                <tbody>{last.map((m,i)=>{
                  const win=m.r==='w',loss=m.r==='l';
                  return(<tr key={i} style={{borderBottom:`1px solid ${T.border}15`,background:win?T.green+'08':loss?T.red+'08':'transparent'}}>
                    <td style={{padding:'4px 8px',color:T.dim,fontSize:10,fontFamily:T.mono}}>{m.d.slice(5)}</td>
                    <td style={{padding:'4px 8px',color:T.text,fontSize:10}}>{m.ht} v {m.at}</td>
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
        })():<p style={{color:T.dim,fontSize:12,textAlign:'center',padding:16}}>Match logs not available in bundle</p>}
      </Sec>

      {/* Shot Map */}
      <Sec icon="🎯" title="Shot Map" tag={shotData?`${shotData.ts} shots · ${shotData.g} goals`:null}>
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

          const dotColor = (r) => r==='G'?'#22d3ee':r==='S'?'#fbbf24':r==='M'?'#f87171':'#94a3b8';
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
                <div key={l}><div style={{fontSize:10,color:T.dim}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:T.text,fontFamily:T.mono}}>{v}</div></div>
              ))}
            </div>

            {/* Pitch SVG */}
            <div style={{background:'#1a3a1a',borderRadius:10,padding:12,marginBottom:12,overflowX:'auto'}}>
              <svg viewBox={`0 0 ${PW} ${PH}`} style={{width:'100%',maxWidth:500,display:'block',margin:'0 auto'}}>
                {/* Pitch markings */}
                <rect x={0} y={0} width={PW} height={PH} fill="#1e4620" rx={4}/>
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
                {[['#22d3ee','Goal'],['#fbbf24','Saved'],['#f87171','Missed'],['#94a3b8','Blocked']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#94a3b8'}}>
                    <circle/><div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span>{l}</span>
                  </div>
                ))}
                <span style={{fontSize:10,color:'#94a3b8'}}>Dot size = xG value</span>
              </div>
            </div>

            {/* Shot zone breakdown */}
            <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Shot Zones</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {Object.entries(zones).map(([zone, zshots])=>{
                const zgoals = zshots.filter(s=>s.r==='G').length;
                const zxg = zshots.reduce((a,s)=>a+s.xg,0).toFixed(1);
                const zpct = zshots.length>0?((zgoals/zshots.length)*100).toFixed(0):0;
                return(
                  <div key={zone} style={{flex:1,minWidth:80,padding:'8px 10px',background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:10,color:T.dim,marginBottom:4}}>{zone}</div>
                    <div style={{fontSize:14,fontWeight:800,color:T.text,fontFamily:T.mono}}>{zshots.length}</div>
                    <div style={{fontSize:10,color:T.dim}}>{zgoals}G · {zxg}xG · {zpct}%</div>
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
                  <span key={code} style={{fontSize:12,color:T.dim}}>
                    {label}: <b style={{color:T.text}}>{ts.length} shots, {tg} goals</b>
                  </span>
                );
              })}
            </div>
          </>);
        })():<p style={{color:T.dim,fontSize:12,textAlign:'center',padding:16}}>Shot map data not available for this player</p>}
      </Sec>

      {/* Season Trend */}
      {trend.length>0&&<Sec icon="📈" title="Season-over-Season Trend" accent={T.accent2}>
        <div style={{display:'flex',gap:6,marginBottom:8,fontSize:10,color:T.dim}}>
          <span style={C.tag(T.accent2)}>{data.meta.previousSeason} → {data.meta.currentSeason}</span>
          <span>Club: {prevP?.Squad} → {p.Squad}</span>
        </div>
        {trend.map(t=>{const up=t.diff>0.05,dn=t.diff<-0.05;return(
          <div key={t.label} style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{width:80,fontSize:11,color:T.dim}}>{t.label}</span>
            <span style={{width:50,fontSize:11,color:T.accent2,fontFamily:T.mono,textAlign:'right'}}>{t.prev.toFixed(2)}</span>
            <span style={{fontSize:12,color:up?T.green:dn?T.red:T.dim}}>{up?'→↑':dn?'→↓':'→'}</span>
            <span style={{width:50,fontSize:11,color:T.text,fontWeight:700,fontFamily:T.mono}}>{t.cur.toFixed(2)}</span>
            <span style={{fontSize:10,fontWeight:700,color:up?T.green:dn?T.red:T.dim}}>({t.diff>0?'+':''}{t.diff.toFixed(2)})</span>
          </div>
        );})}
      </Sec>}

      {/* Previous Season Deep Profile */}
      {prevProf.length>0&&<Sec icon="📊" title="Previous Season Deep Profile" tag={data.meta.previousSeason} accent={T.accent2}>
        <p style={{fontSize:11,color:T.accent2,marginTop:-6,marginBottom:10}}>Advanced stats: progressive passes, aerial duels, take-ons, SCA, pressures</p>
        {prevProf.slice(0,12).map(a=>(
          <div key={a.k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
            <span style={{width:16,fontSize:10}}>{a.i}</span>
            <span style={{width:120,fontSize:10,color:T.dim}}>{a.l}</span>
            <div style={{flex:1,height:5,borderRadius:3,background:T.accent2+'20',overflow:'hidden'}}><div style={{width:`${a.percentile}%`,height:'100%',borderRadius:3,background:rc(a.percentile)}}/></div>
            <span style={{width:24,fontSize:9,fontWeight:700,color:rc(a.percentile),fontFamily:T.mono}}>{a.percentile}</span>
            <span style={{width:45,fontSize:9,color:T.dim,fontFamily:T.mono,textAlign:'right'}}>{a.value?.toFixed(2)}</span>
          </div>
        ))}
      </Sec>}

      {/* Comparison */}
      <Sec icon="🔄" title="Comparison"><div>
        <p style={{fontSize:10,color:T.dim,marginTop:-6,marginBottom:10}}>vs top matches from your search</p>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
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
                <td style={{padding:'4px 8px',color:T.dim,fontWeight:600,fontSize:10}}>{r.l}</td>
                {[p,...comps].map((x,i)=><td key={i} style={{padding:'4px 8px',textAlign:'center',color:i===0?T.text:T.dim,fontWeight:i===0?700:400,fontFamily:T.mono}}>{r.f(x)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div></Sec>

      {/* Head-to-Head Comparison */}
      <Sec icon="⚔️" title="Head-to-Head Comparison" tag="Any player"><div>
        <div style={{position:'relative',marginBottom:compareP?12:0}}>
          <div style={{display:'flex',gap:8}}>
            <input
              value={compareQ}
              onChange={e=>{setCompareQ(e.target.value);if(!e.target.value)setCompareP(null);}}
              placeholder={`Compare ${p.Player} against any player...`}
              style={{...C.input,flex:1}}
            />
            {compareP&&<button onClick={()=>{setCompareP(null);setCompareQ('');}} style={{...C.btn(false,'#f43f5e'),padding:'8px 12px',fontSize:10,border:`1px solid ${T.border}`}}>✕ Clear</button>}
          </div>
          {/* Dropdown — absolutely positioned so it never shifts page layout */}
          {compareMatches.length>0&&!compareP&&(
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:200,background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden',boxShadow:'0 8px 32px #00000060'}}>
              {compareMatches.map((x,i)=>(
                <div key={i} onClick={()=>{setCompareP(x);setCompareQ(x.Player);}}
                  style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<compareMatches.length-1?`1px solid ${T.border}`:'none',display:'flex',alignItems:'center',gap:10}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.accent+'15'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  {x.img_url&&<img src={x.img_url} onError={e=>e.target.style.display='none'} style={{width:32,height:32,borderRadius:4,objectFit:'cover',objectPosition:'top'}}/>}
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{x.Player}</div>
                    <div style={{fontSize:10,color:T.dim}}>{x.Squad} · {x.league} · {x.Pos||x.position} · {x.Age}y</div>
                  </div>
                  <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:T.dim,fontFamily:T.mono}}>{mv(x)}</span>
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
                  <div style={{fontSize:10,color:T.dim,marginBottom:8,display:'flex',gap:16}}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:T.accent,opacity:0.8}}/>{p.Player}</span>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:T.accent2,opacity:0.8}}/>{compareP.Player}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={compareRadarData}>
                      <PolarGrid stroke={T.border}/>
                      <PolarAngleAxis dataKey="attr" tick={{fill:T.dim,fontSize:9}}/>
                      <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                      <Radar dataKey="me" name={p.Player} stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2}/>
                      <Radar dataKey="them" name={compareP.Player} stroke={T.accent2} fill={T.accent2} fillOpacity={0.2} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Stats table */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.dim,fontSize:10}}></th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:T.accent,fontWeight:800}}>{p.Player}<div style={{fontSize:9,color:T.dim,fontWeight:400}}>{p.Squad}</div></th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:T.accent2,fontWeight:800}}>{compareP.Player}<div style={{fontSize:9,color:T.dim,fontWeight:400}}>{compareP.Squad}</div></th>
                  </tr></thead>
                  <tbody>{metrics.map(r=>{
                    const pv=r.f(p),cv=r.f(compareP);
                    const pn=parseFloat(pv),cn=parseFloat(cv);
                    const pBetter=!isNaN(pn)&&!isNaN(cn)&&r.l!=='Age'&&r.l!=='Value'&&r.l!=='Contract'&&pn>cn;
                    const cBetter=!isNaN(pn)&&!isNaN(cn)&&r.l!=='Age'&&r.l!=='Value'&&r.l!=='Contract'&&cn>pn;
                    return(
                      <tr key={r.l} style={{borderBottom:`1px solid ${T.border}20`}}>
                        <td style={{padding:'4px 8px',color:T.dim,fontWeight:600,fontSize:10}}>{r.l}</td>
                        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:pBetter?800:400,color:pBetter?T.green:T.text,fontFamily:T.mono}}>{pv}</td>
                        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:cBetter?800:400,color:cBetter?T.green:T.dim,fontFamily:T.mono}}>{cv}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {/* Contract note */}
              <p style={{fontSize:10,color:T.dim,marginTop:8,marginBottom:0}}>
                ⚠ Contract dates shown are from Transfermarkt and reflect the permanent contract. For loaned players, verify directly — loan end dates may differ.
              </p>
            </div>
          );
        })()}
        {!compareP&&!compareQ&&<p style={{fontSize:11,color:T.dim,margin:0}}>Type any player name above to compare head-to-head with overlaid radar and full stats table.</p>}
      </div></Sec>

      {/* Why This Player */}
      {compAnalysis.length>0&&<Sec icon="⚖️" title={`Why ${p.Player}?`}><div>
        {compAnalysis.map((c,i)=>(
          <div key={i} style={{marginBottom:12,padding:12,background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:8}}>vs {c.player.Player} <span style={{color:T.dim,fontWeight:400}}>({c.player.Squad}, {c.player.matchScore}/100, {mv(c.player)})</span></div>
            {c.adv.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:10,fontWeight:800,color:T.green,marginBottom:3}}>✅ ADVANTAGES</div>{c.adv.map((a,j)=><div key={j} style={{fontSize:11,color:T.text,paddingLeft:12,marginBottom:2}}>• {a}</div>)}</div>}
            {c.dis.length>0&&<div><div style={{fontSize:10,fontWeight:800,color:T.orange,marginBottom:3}}>⚠️ DISADVANTAGES</div>{c.dis.map((d,j)=><div key={j} style={{fontSize:11,color:T.text,paddingLeft:12,marginBottom:2}}>• {d}</div>)}</div>}
            {!c.adv.length&&!c.dis.length&&<p style={{color:T.dim,fontSize:11}}>Very similar profiles</p>}
          </div>
        ))}
      </div></Sec>}

      {/* ML Similar Players */}
      {mlSim.length>0&&<Sec icon="🧬" title="ML Player Similarity" tag="Cosine Similarity"><div>
        <p style={{fontSize:10,color:T.dim,marginTop:-6,marginBottom:10}}>Players with the most similar statistical profiles across all per-90 metrics (machine learning cosine similarity)</p>
        {mlSim.slice(0,8).map((s,i)=>{
          // Find player in data to get their image
          const simPlayer = data.current?.find(p=>(p.Player||'').toLowerCase().trim()===s.name.toLowerCase().trim());
          return(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,padding:'6px 8px',borderRadius:6,background:i<3?T.accent+'08':'transparent'}}>
            <span style={{fontSize:10,fontWeight:800,color:T.dim,width:18,fontFamily:T.mono}}>#{i+1}</span>
            {/* Mini photo */}
            <div style={{width:40,height:40,borderRadius:6,overflow:'hidden',flexShrink:0,background:T.card2}}>
              {simPlayer?.img_url&&<img src={simPlayer.img_url} alt={s.name} onError={e=>{e.target.style.display='none';}} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>}
              {!simPlayer?.img_url&&<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:T.dim}}>{(s.name||'?')[0]}</div>}
            </div>
            <div style={{flex:1}}>
              <span style={{fontSize:12,fontWeight:600,color:T.text}}>{s.name}</span>
              <span style={{fontSize:10,color:T.dim,marginLeft:8}}>{s.team} · {s.league}</span>
              {s.role&&<span style={{fontSize:9,marginLeft:6,padding:'1px 5px',borderRadius:3,background:T.accent+'20',color:T.accent}}>{s.role}</span>}
            </div>
            <div style={{width:90,height:6,borderRadius:3,background:T.border,overflow:'hidden'}}>
              <div style={{width:`${s.similarity*100}%`,height:'100%',borderRadius:3,background:s.similarity>0.95?T.green:s.similarity>0.9?T.accent:T.yellow}}/>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:s.similarity>0.95?T.green:s.similarity>0.9?T.accent:T.yellow,fontFamily:T.mono,width:45,textAlign:'right'}}>{(s.similarity*100).toFixed(1)}%</span>
          </div>
          );
        })}
      </div></Sec>}

      {/* ML Role Classification */}
      {mlRole&&<Sec icon="🏷️" title="Player Archetype" tag="K-Means Clustering"><div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
          <div style={{padding:'8px 16px',borderRadius:8,background:T.accent+'15',border:`1px solid ${T.accent}30`}}>
            <div style={{fontSize:16,fontWeight:800,color:T.accent}}>{mlRole.role}</div>
          </div>
          <div style={{fontSize:11,color:T.dim}}>
            Automatically classified by ML based on statistical profile.
            <br/>Cluster determined by k-means analysis of 13 per-90 metrics across {data.ml?.modelInfo?.total_players_clustered||'1700'} players.
          </div>
        </div>
        {data.ml?.roleProfiles?.[String(mlRole.cluster)]&&(()=>{
          const rp=data.ml.roleProfiles[String(mlRole.cluster)];
          const topZ=Object.entries(rp.z_scores).filter(([k,v])=>v>0.3).sort((a,b)=>b[1]-a[1]).slice(0,5);
          return topZ.length>0?(
            <div>
              <div style={{fontSize:10,fontWeight:700,color:T.dim,marginBottom:6}}>DEFINING CHARACTERISTICS OF THIS ROLE:</div>
              {topZ.map(([k,v])=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{width:130,fontSize:10,color:T.dim}}>{k.replace(/_per90/g,'').replace(/_/g,' ')}</span>
                  <div style={{flex:1,height:5,borderRadius:3,background:T.border,overflow:'hidden'}}>
                    <div style={{width:`${Math.min(100,50+v*20)}%`,height:'100%',borderRadius:3,background:v>1?T.green:T.accent}}/>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:v>1?T.green:T.accent,fontFamily:T.mono}}>{v>0?'+':''}{v.toFixed(2)}σ</span>
                </div>
              ))}
              <p style={{fontSize:10,color:T.dim,marginTop:6}}>Cluster size: {rp.size} players with similar profiles</p>
            </div>
          ):null;
        })()}
      </div></Sec>}

      {/* Value & Contract */}
      <Sec icon="💰" title="Value & Contract Analysis"><div>
        {/* Key metrics */}
        <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
          {[
            ['Market Value', mv(p)],
            ['Goals/€M', vmv>0?(goals/(vmv/1e6)).toFixed(2):'—'],
            ['Score/€M', vmv>0?(p.matchScore/(vmv/1e6)).toFixed(1):'—'],
          ].map(([l,v])=>(
            <div key={l}><div style={{fontSize:10,color:T.dim}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:T.text,fontFamily:T.mono}}>{v}</div></div>
          ))}
        </div>

        {/* Contract Bargain Alert */}
        {(()=>{
          const exp = p.contract_expires;
          if (!exp) return <p style={{fontSize:11,color:T.dim}}>Contract expiry data unavailable</p>;

          const expDate = new Date(exp);
          const today = new Date();
          const monthsLeft = Math.round((expDate - today) / (1000 * 60 * 60 * 24 * 30));
          const expired = monthsLeft < 0;
          const expiresThisSummer = monthsLeft >= 0 && monthsLeft <= 2;
          const within6 = monthsLeft > 2 && monthsLeft <= 6;
          const within12 = monthsLeft > 6 && monthsLeft <= 12;
          const within18 = monthsLeft > 12 && monthsLeft <= 18;

          let alertColor, alertIcon, alertTitle, alertMsg;

          if (expired || expiresThisSummer) {
            alertColor = T.red;
            alertIcon = '🔴';
            alertTitle = expired ? 'CONTRACT EXPIRED' : 'CONTRACT EXPIRES THIS SUMMER';
            alertMsg = expired
              ? `Contract expired in ${exp}. Player is a free agent or on temporary extension. Available for zero transfer fee.`
              : `Contract ends ${exp}. Player available for free this summer. No transfer fee required — only wages.`;
          } else if (within6) {
            alertColor = T.orange;
            alertIcon = '🟠';
            alertTitle = 'EXPIRING IN UNDER 6 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Club must sell now or lose player for free. Strong negotiating position for buyer.`;
          } else if (within12) {
            alertColor = T.yellow;
            alertIcon = '🟡';
            alertTitle = 'EXPIRING IN UNDER 12 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Player entering final year — selling club likely to accept below market value rather than risk losing for free.`;
          } else if (within18) {
            alertColor = T.accent;
            alertIcon = '🔵';
            alertTitle = 'EXPIRING IN UNDER 18 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Pre-contract discussions could begin in ~6 months. Window to negotiate at discount.`;
          } else {
            alertColor = T.green;
            alertIcon = '🟢';
            alertTitle = 'CONTRACT SECURED';
            alertMsg = `Contract runs until ${exp} (${monthsLeft} months). Full market value applies. No leverage from contract situation.`;
          }

          return (
            <div style={{padding:14,borderRadius:8,background:alertColor+'10',border:`1px solid ${alertColor}30`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:14}}>{alertIcon}</span>
                <span style={{fontSize:11,fontWeight:800,color:alertColor,textTransform:'uppercase',letterSpacing:0.8}}>{alertTitle}</span>
              </div>
              <p style={{fontSize:12,color:T.text,margin:0,lineHeight:1.6}}>{alertMsg}</p>
              {(expired||expiresThisSummer||within6)&&vmv>0&&(
                <div style={{marginTop:10,padding:'8px 12px',background:alertColor+'15',borderRadius:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:alertColor}}>
                    💡 Estimated saving: €{(vmv/1e6).toFixed(0)}M–€{(vmv*0.7/1e6).toFixed(0)}M vs full market value
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
          <Sec icon="🏥" title="Injury History">
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[
                ['Career Injuries',totalInj,totalInj>=10?'#f43f5e':totalInj>=5?'#eab308':T.text],
                ['Career Days Missed',totalDays,totalDays>=200?'#f43f5e':totalDays>=90?'#eab308':T.text],
                ['Recent Injuries (2yr)',recentInj,recentInj>=4?'#f43f5e':recentInj>=2?'#eab308':T.text],
                ['Recent Days Missed',recentDays,recentDays>=90?'#f43f5e':recentDays>=30?'#eab308':T.text],
              ].map(([l,v,c])=>(
                <div key={l} style={{flex:1,minWidth:100,padding:'8px 10px',background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.dim,marginBottom:2}}>{l}</div>
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
          <span style={{fontSize:14}}>📋</span>
          <span style={{fontSize:12,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>Scout's Verdict</span>
        </div>
        <div style={{marginBottom:10}}><span style={{fontSize:14}}>{verdict.s}</span><span style={{fontWeight:900,color:verdict.c,marginLeft:8,fontSize:15}}>{verdict.r}</span></div>
        <p style={{fontSize:13,color:T.text,lineHeight:1.7}}>
          {p.Player} scores {p.matchScore}/100.{str.length?` Key strengths: ${str.map(s=>s.l.toLowerCase()).join(', ')}.`:''}{weak.length?` Areas to develop: ${weak.map(w=>w.l.toLowerCase()).join(', ')}.`:''} {verdict.a}
        </p>
      </div>
    </div>
  );
}

// ─── SHORTLIST VIEW ───
function ShortlistView({data,shortlist,onToggle,onSelect,onBack}){
  const players=useMemo(()=>data.current.filter(p=>shortlist.includes(p.Player)),[data,shortlist]);
  return(
    <div style={{maxWidth:920,margin:'0 auto',padding:20,fontFamily:T.font}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <button onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:12,padding:0,marginBottom:6,fontFamily:T.font}}>← Back</button>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>⭐ Shortlist</h2>
          <p style={{color:T.dim,fontSize:12,marginTop:2}}>{players.length} saved player{players.length!==1?'s':''}</p>
        </div>
      </div>
      {players.length===0&&<div style={{...C.card,textAlign:'center',padding:40}}>
        <div style={{fontSize:32,marginBottom:12}}>⭐</div>
        <p style={{color:T.dim,fontSize:14}}>No players shortlisted yet. Hit the star on any result card or player report.</p>
      </div>}
      {players.map((p,i)=>(
        <div key={p.Player} style={{display:'flex',alignItems:'center',gap:14,padding:12,marginBottom:4,background:T.card,border:`1px solid ${T.border}`,borderRadius:10}}>
          <div style={{width:48,height:48,borderRadius:7,overflow:'hidden',flexShrink:0,background:T.card2}}>
            {p.img_url?<img src={p.img_url} onError={e=>e.target.style.display='none'} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>
            :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:T.dim}}>{(p.Player||'?')[0]}</div>}
          </div>
          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,color:T.text,fontSize:14}}>{p.Player}</span>
              {p._trajectory&&<span style={{fontSize:10,fontWeight:700,color:TRJ[p._trajectory]?.c}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
              {p._injury_risk&&p._injury_risk!=='Low'&&<span style={{fontSize:9,padding:'1px 6px',borderRadius:4,background:IRK[p._injury_risk]?.c+'20',color:IRK[p._injury_risk]?.c,fontWeight:700}}>{p._injury_risk} Risk</span>}
            </div>
            <div style={{fontSize:11,color:T.dim,marginTop:2}}>{p.Squad} · {p.league} · {p._ml_role||p.Pos||p.position} · {p.Age}y</div>
          </div>
          <div style={{textAlign:'right',marginRight:8}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>{mv(p)}</div>
            <div style={{fontSize:10,color:T.dim}}>{p.contract_expires||'—'}</div>
          </div>
          <button onClick={()=>onToggle(p)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:T.yellow,padding:4,lineHeight:1}}>★</button>
        </div>
      ))}
    </div>
  );
}

// ─── APP ───
export default function App(){
  const[data,setData]=useState(null);
  const[teamReports,setTeamReports]=useState(null);
  const[view,setView]=useState('upload');
  const[results,setResults]=useState([]);
  const[sel,setSel]=useState(null);
  const[selIdx,setSelIdx]=useState(0);
  const[req,setReq]=useState(null);
  const[clubCtx,setClubCtx]=useState(null);
  const[shortlist,setShortlist]=useState(()=>{try{return JSON.parse(localStorage.getItem('scoutlab_shortlist')||'[]');}catch{return[];}});
  const toggleShortlist=useCallback(player=>{
    setShortlist(prev=>{
      const next=prev.includes(player.Player)?prev.filter(n=>n!==player.Player):[...prev,player.Player];
      localStorage.setItem('scoutlab_shortlist',JSON.stringify(next));
      return next;
    });
  },[]);

  const handleLoad=d=>{
    const mlRoles=d.ml?.roles||{};
    const shotMaps=d.shotMaps||{};
    const prevByName={};
    (d.previous||[]).forEach(pp=>{const k=(pp.Player||'').toLowerCase().trim();if(!prevByName[k]||+(pp.Min||0)>+(prevByName[k].Min||0))prevByName[k]=pp;});
    const enrichCurrent=arr=>arr.map(p=>{
      const goals=+(p.goals||p.Gls||0);
      const xg=+(p.xG||p.npxG||0);
      const key=(p.Player||'').toLowerCase().trim();
      const ml=mlRoles[key]||{};
      let role=ml.role||null;
      // If FBref codes player as pure DF but ML misclassified into MF, force back to DF
      let posGroup=ml.pos_group||null;
      if(posGroup==='MF'&&p.Pos==='DF'){posGroup='DF';role=null;}
      // For all DF players: multi-signal fullback detection + L/R side classification
      if(posGroup==='DF'){
        const clears=+(p.clearances_per90||0);
        const pitb=+(p.passes_into_box_per90||0);
        const progC=+(p.prog_carries_per90||0);
        const aerial=+(p.aerial_won_per90||0);
        const sm=shotMaps[key];
        const shots=sm?.sh||[];
        const avgY=shots.length>=3?shots.reduce((s,sh)=>s+sh.y,0)/shots.length:null;
        // Score: positive = fullback, negative = CB
        let fbScore=0;
        fbScore+=pitb>=1.0?2:pitb>=0.35?1:0;
        fbScore+=progC>=2.0?2:progC>=1.5?1:0;
        fbScore+=clears>=4.0?-4:clears>=3.5?-3:clears>=2.5?-1:0;
        fbScore+=aerial>=2.0?-3:aerial>=1.2?-2:aerial>=0.7?-1:0;
        if(avgY!==null) fbScore+=avgY<0.43?2:avgY>0.57?2:avgY<0.48?1:avgY>0.52?1:0;
        // Foot-side consistency: right-footed with right-leaning shots, or left-footed with left-leaning
        if(avgY!==null&&p.foot==='right'&&avgY<0.50) fbScore+=1;
        else if(avgY!==null&&p.foot==='left'&&avgY>0.50) fbScore+=1;
        // Shots from a flank (avgY far from centre) is strong fullback evidence
        const isLateralShoter=avgY!==null&&(avgY<0.43||avgY>0.57);
        const mlSaidFB=role==='Defensive Full-Back'||role==='Attacking Full-Back';
        const mlSaidTraditionalCB=role==='Traditional CB';
        if(!mlSaidTraditionalCB&&(fbScore>=4||(fbScore>=2&&isLateralShoter))){
          // Strong fullback evidence — determine L/R side (never reclassify Traditional CB)
          let side=null;
          if(avgY!==null) side=avgY<0.50?'R':'L';
          else side=p.foot==='left'?'L':p.foot==='right'?'R':null;
          if(side){
            const isAttacking=role==='Attacking Full-Back';
            role=isAttacking?(side==='R'?'Attacking Right Back':'Attacking Left Back'):(side==='R'?'Defensive Right Back':'Defensive Left Back');
          }
        } else if(fbScore<=2&&!isLateralShoter&&mlSaidFB){
          // Weak fullback evidence — CB misclassified by ML
          const blocks=+(p.blocks_per90||0);
          const progPasses=+(p.prog_passes_per90||0);
          if(aerial>=2.5&&clears>=4.0) role='Aerial CB';
          else if(blocks>=1.0) role='Aggressive CB';
          else if(aerial>=2.0) role='Aerial CB';
          else if(pitb>=0.4||progPasses>=5) role='Ball-Playing CB';
          else role='Defensive CB';
        }
      }
      // Winger side detection: avgY < 0.48 = Right Winger, > 0.52 = Left Winger
      let lateralSide=null;
      if(posGroup==='WG'){
        const sm=shotMaps[key];
        const shots=sm?.sh||[];
        if(shots.length>=5){
          const avgY=shots.reduce((s,sh)=>s+sh.y,0)/shots.length;
          lateralSide=avgY<0.48?'R':avgY>0.52?'L':null;
        }
      }
      const _trajectory=calcTrajectory(p, prevByName[key]||null);
      const _posGroup=posGroup;
      const {score:_potential_score,tier:_potential_tier}=calcPotential(p,_posGroup,_trajectory);
      return{...p, xg_over_raw: xg>0 ? +(goals-xg).toFixed(2) : null,
        _ml_pos_group: _posGroup,
        _ml_role: role,
        _lateral_side: lateralSide,
        _injury_risk: calcInjuryRisk(p),
        _trajectory,
        _potential_score: _potential_score||null,
        _potential_tier: _potential_tier||null,
      };
    });
    setData({...d, current:enrichCurrent(d.current||[]), previous:d.previous?enrichCurrent(d.previous):null});
    fetch('/team_reports.json').then(r=>r.json()).then(setTeamReports).catch(()=>{});
    setView('club');
  };

  const handleClubSelect=ctx=>{setClubCtx(ctx);setView('clubreport');};
  const handleClubSkip=()=>{setClubCtx(null);setView('search');};
  const handleSearch=r=>{setReq(r);const pool=clubCtx?data.current.filter(p=>p.Squad!==clubCtx.team):data.current;setResults(search(pool,r));setView('results');};

  return(
    <div style={{background:T.bg,color:T.text,minHeight:'100vh',fontFamily:T.font}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      {view==='upload'&&<Upload onLoad={handleLoad}/>}
      {view==='club'&&<ClubSelect teamReports={teamReports} onSelect={handleClubSelect} onSkip={handleClubSkip}/>}
      {view==='clubreport'&&data&&clubCtx&&<ClubReport clubCtx={clubCtx} data={data} teamReports={teamReports} onSearch={handleSearch} onBack={()=>setView('club')}/>}
      {view==='search'&&data&&<Search data={data} clubCtx={clubCtx} onSearch={handleSearch}/>}
      {view==='results'&&<Results results={results} req={req} shortlist={shortlist} onToggleShortlist={toggleShortlist} onSelect={(p,i)=>{setSel(p);setSelIdx(i);setView('report');}} onBack={()=>clubCtx?setView('clubreport'):setView('search')} onShortlist={()=>setView('shortlist')}/>}
      {view==='report'&&sel&&<Report player={sel} idx={selIdx} results={results} data={data} req={req} shortlist={shortlist} onToggleShortlist={toggleShortlist} onBack={()=>setView('results')} onShortlist={()=>setView('shortlist')}/>}
      {view==='shortlist'&&data&&<ShortlistView data={data} shortlist={shortlist} onToggle={toggleShortlist} onSelect={(p,i)=>{setSel(p);setSelIdx(i);setView('report');}} onBack={()=>setView(results.length?'results':'search')}/>}
    </div>
  );
}