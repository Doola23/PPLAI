import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, SoccerBall, Sparkle, Wind, PaperPlaneTilt, ShieldChevron, Barbell, HandPalm, TrendUp, TrendDown, Warning, ChartBar, ChartLineUp, CalendarBlank, Crosshair, Scales, UsersThree, Brain, Heartbeat, GitDiff, Question, CaretDown, MagnifyingGlass, SlidersHorizontal, CaretRight, X, ArrowRight, ArrowLeft, Funnel, CheckCircle, Buildings, FileText } from "@phosphor-icons/react";

// Phosphor icon for each attribute category (replaces former emoji)
const CAT_ICON = {
  "Attacking": SoccerBall,
  "Creativity & Chance Creation": Sparkle,
  "Ball Carrying & Pace": Wind,
  "Passing & Distribution": PaperPlaneTilt,
  "Defending & Pressing": ShieldChevron,
  "Physical & Athletic": Barbell,
  "Goalkeeping": HandPalm,
};
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import api from "../../services/api";
import PlayerAvatar from "../ui/PlayerAvatar";
import ClubLogo from "../ui/ClubLogo";
import Spinner from "../ui/Spinner";
import { getMarketValueOverride } from "../../utils/marketValueOverrides";
import logoSrc from "../../assets/logo.svg";

const EASE = [0.16, 1, 0.3, 1];

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
  { cat: "Attacking", icon:"", attrs: [
    { k:"goals", l:"Goal Scoring", desc:"Goals & non-penalty xG per 90 — how dangerous is he in front of goal?", c:["goals_per90","npxg_per90","xG_per90","npxG_per90"],z:["goals_per90_zscore","npxg_per90_zscore","xG_per90_zscore","npxG_per90_zscore"],i:"", thresholdLabel:"Min Goals/90", thresholdKey:"goals_per90"},
    { k:"shots", l:"Shot Volume", desc:"Shots per 90 — does he get himself into shooting positions regularly?", c:["shots_per90"],z:["shots_per90_zscore"],i:"", thresholdLabel:"Min Shots/90", thresholdKey:"shots_per90"},
    { k:"xg_over", l:"Finishing Efficiency", desc:"Goals scored vs xG — is he a clinical finisher who beats the average?", c:["goals_per90"],z:[],i:"",custom:p=>{const g=+(p.goals||p.Gls||0),x=+(p.xG||p.npxG||0);return x>0?g-x:null;}, thresholdLabel:"Min Goals-xG", thresholdKey:"xg_over_raw"},
  ]},
  { cat: "Creativity & Chance Creation", icon:"", attrs: [
    { k:"assists", l:"Assists & Expected Assists", desc:"Assists and xA per 90 — direct goal contributions beyond scoring", c:["assists_per90","xag_per90","xA_per90"],z:["assists_per90_zscore","xag_per90_zscore","xA_per90_zscore"],i:"", thresholdLabel:"Min xA/90", thresholdKey:"xA_per90"},
    { k:"key_passes", l:"Key Passes", desc:"Passes leading directly to a shot — creative output per 90", c:["key_passes_per90"],z:["key_passes_per90_zscore"],i:"", thresholdLabel:"Min KP/90", thresholdKey:"key_passes_per90"},
    { k:"sca", l:"Shot-Creating Actions", desc:"Actions leading to shots (passes, dribbles, fouls drawn) — broader creative output", c:["sca_per90","gca_per90"],z:["sca_per90_zscore"],i:""},
    { k:"xg_chain", l:"Goal Sequence Involvement", desc:"xG of all moves the player is involved in — total attacking contribution", c:["xGChain_per90"],z:[],i:""},
  ]},
  { cat: "Ball Carrying & Pace", icon:"", attrs: [
    { k:"prog_carry", l:"Progressive Carrying", desc:"Carries that move the ball significantly towards goal — driving power", c:["prog_carries_per90"],z:["prog_carries_per90_zscore"],i:""},
    { k:"takeons", l:"Successful Dribbles", desc:"Completed take-ons per 90 — ability to beat defenders 1v1", c:["successful_takeons_per90"],z:["successful_takeons_per90_zscore"],i:"", thresholdLabel:"Min Take-ons/90", thresholdKey:"successful_takeons_per90"},
    { k:"box_carry", l:"Carries into Penalty Area", desc:"Times the player carries the ball into the opposition box per 90", c:["carries_into_box_per90"],z:[],i:""},
  ]},
  { cat: "Passing & Distribution", icon:"", attrs: [
    { k:"pass_pct", l:"Pass Accuracy", desc:"Pass completion % — technical quality and ability to keep possession", c:["pass_success_pct","pass_completion"],z:["pass_completion_zscore"],i:"", thresholdLabel:"Min Pass %", thresholdKey:"pass_success_pct"},
    { k:"prog_pass", l:"Progressive Passing", desc:"Passes that advance play significantly towards goal. Available in 24/25 data.", c:["prog_passes_per90"],z:["prog_passes_per90_zscore"],i:""},
    { k:"box_pass", l:"Passes into the Box", desc:"Penetrating passes into the penalty area per 90. Available in 24/25 data.", c:["passes_into_box_per90","PPA"],z:[],i:""},
    { k:"cross", l:"Crossing", desc:"Crosses per 90 — width and delivery from wide areas", c:["crosses_per90"],z:[],i:""},
  ]},
  { cat: "Defending & Pressing", icon:"", attrs: [
    { k:"tackles", l:"Tackles Won", desc:"Successful tackles per 90 — ground-level defensive duels", c:["tackles_per90","tackles_won_per90"],z:["tackles_per90_zscore"],i:"", thresholdLabel:"Min Tackles/90", thresholdKey:"tackles_per90"},
    { k:"interceptions", l:"Interceptions", desc:"Interceptions per 90 — reading the game and cutting out passes", c:["interceptions_per90"],z:["interceptions_per90_zscore"],i:"", thresholdLabel:"Min Int/90", thresholdKey:"interceptions_per90"},
    { k:"blocks", l:"Blocks & Clearances", desc:"Shot blocks and clearances per 90 — last-ditch defensive actions", c:["blocks_per90","clearances_per90"],z:[],i:""},
    { k:"pressing", l:"Pressing Intensity", desc:"Pressures applied to opponents per 90 — work rate and high press suitability", c:["pressures_per90"],z:[],i:""},
  ]},
  { cat: "Physical & Athletic", icon:"", attrs: [
    { k:"aerial", l:"Aerial Dominance", desc:"Aerial duel win % and aerial duels won per game — heading ability and physical presence in the air", c:["aerial_won_pct","aerial_won_per_game","aerial_won_per90"],z:["aerial_won_pct_zscore"],i:"", thresholdLabel:"Min Aerial Won/g", thresholdKey:"aerial_won_per_game"},
    { k:"recovery", l:"Ball Recoveries", desc:"Balls won back per 90 — energy, work rate, hunting the ball", c:["recoveries_per90"],z:[],i:""},
    { k:"buildup", l:"Off-Ball Buildup Contribution", desc:"xG buildup involvement — movement and positioning in buildup phases even without the ball", c:["xGBuildup_per90"],z:[],i:""},
  ]},
  { cat: "Goalkeeping", icon:"", gkOnly: true, attrs: [
    { k:"gk_saves", l:"Save Percentage", desc:"Saves divided by shots on target faced — core shot-stopping ability", c:["Save%","Saves"],z:[],i:"", thresholdLabel:"Min Save %", thresholdKey:"Save%"},
    { k:"gk_cs", l:"Clean Sheet %", desc:"Percentage of games keeping a clean sheet — defensive organisation and consistency", c:["CS%","CS"],z:[],i:"", thresholdLabel:"Min CS%", thresholdKey:"CS%"},
    { k:"gk_ga90", l:"Goals Against Per 90", desc:"Goals conceded per 90 minutes — lower is better for shot-stopping quality", c:["GA90"],z:[],i:"", thresholdLabel:"Max GA/90", thresholdKey:"GA90"},
    { k:"gk_dist", l:"Distribution Quality", desc:"Pass completion % and long ball accuracy — ability to play out from the back", c:["pass_completion"],z:[],i:""},
    { k:"gk_sweeper", l:"Sweeper-Keeper Activity", desc:"Ball recoveries and defensive actions outside the box — proactive GK in high lines", c:["recoveries_per90"],z:[],i:""},
  ]},
];
const ALL_A = ATTR_CATS.flatMap(g=>g.attrs);

// Per-threshold input config: {min, max, step} matched to real football data ranges
function thresholdCfg(key){
  if(!key) return {min:0,step:0.1};
  if(key==='pass_success_pct')       return {min:0,max:100,step:1,placeholder:'e.g. 80'};
  if(key==='Save%')                  return {min:0,max:100,step:1,placeholder:'e.g. 68'};
  if(key==='CS%')                    return {min:0,max:100,step:1,placeholder:'e.g. 35'};
  if(key==='GA90')                   return {min:0,max:4,step:0.1,placeholder:'e.g. 1.2'};
  if(key==='xg_over_raw')            return {min:-2,max:2,step:0.1,placeholder:'e.g. 0.1'};
  if(key==='aerial_won_per_game')    return {min:0,max:10,step:0.1,placeholder:'e.g. 2.5'};
  if(key==='goals_per90')            return {min:0,max:2,step:0.05,placeholder:'e.g. 0.4'};
  if(key==='shots_per90')            return {min:0,max:8,step:0.1,placeholder:'e.g. 2.5'};
  if(key==='xA_per90')               return {min:0,max:1,step:0.05,placeholder:'e.g. 0.2'};
  if(key==='key_passes_per90')       return {min:0,max:6,step:0.1,placeholder:'e.g. 1.5'};
  if(key==='successful_takeons_per90') return {min:0,max:6,step:0.1,placeholder:'e.g. 1.0'};
  if(key==='tackles_per90')          return {min:0,max:8,step:0.1,placeholder:'e.g. 2.0'};
  if(key==='interceptions_per90')    return {min:0,max:5,step:0.1,placeholder:'e.g. 1.0'};
  return {min:0,step:0.1,placeholder:'Min value'};
}

const PRI = {required:4,high:3,medium:2,low:1,none:0};
const PRI_C = {required:"#1A65D3",high:"#3B82F6",medium:"#2B4C5E",low:"#4B5563",none:"transparent"};
const PRI_LABELS = {required:"Required",high:"High",medium:"Med",low:"Low",none:"Off"};

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
// Brand-only sequential ramp (high → low): Celtic Blue → Dark Slate → Spanish Gray
const rc = p => p>=66?"#1A65D3":p>=33?"#2B4C5E":"#5B6166";
const sc = s => s>=80?"#1A65D3":s>=65?"#2B4C5E":"#5B6166";
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
const IRK={High:{c:'#1A65D3'},Medium:{c:'#6E7E8A'},Low:{c:'#939A9E'}};

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
const TRJ={Improving:{c:'#1A65D3',i:'↑'},Stable:{c:'#939A9E',i:'→'},Declining:{c:'#2B4C5E',i:'↓'}};

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
const PTL={'Elite Prospect':{c:'#1A65D3'},'High Potential':{c:'#2B4C5E'},'Developing':{c:'#939A9E'}};

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
  bg:"#000000",card:"rgba(26,101,211,0.38)",card2:"rgba(26,101,211,0.52)",border:"rgba(255,255,255,0.08)",
  text:"#F2F2F2",dim:"#939A9E",accent:"#1A65D3",accent2:"#2B4C5E",
  green:"#1A65D3",yellow:"#939A9E",orange:"#939A9E",red:"#2B4C5E",
  font:"inherit",mono:"inherit",
};
const C = {
  card:{
    position:'relative',
    background:'linear-gradient(145deg, rgba(26,101,211,0.52) 0%, rgba(26,101,211,0.38) 100%)',
    borderRadius:18,
    border:'1px solid rgba(255,255,255,0.08)',
    padding:20,
    marginBottom:16,
    backdropFilter:'blur(14px)',
    WebkitBackdropFilter:'blur(14px)',
    boxShadow:'0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
    overflow:'hidden',
  },
  label:{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:T.dim,marginBottom:7,display:'block'},
  input:{width:'100%',padding:'10px 16px',borderRadius:999,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(0,0,0,0.35)',color:T.text,fontSize:15,fontFamily:T.font,boxSizing:'border-box',outline:'none'},
  btn:(active,color=T.accent)=>({padding:'6px 15px',borderRadius:999,border:active?'none':'1px solid rgba(255,255,255,0.12)',cursor:'pointer',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',background:active?color:'rgba(255,255,255,0.06)',color:active?'#F2F2F2':T.dim,transition:'all 0.15s'}),
  tag:(color=T.accent)=>({display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:color+'22',color:color==='#1A65D3'?'#F2F2F2':color,letterSpacing:'0.5px',border:`1px solid ${color}40`}),
};


// ─── UPLOAD ───
const CACHE_KEY='scoutlab_primary_v2';
function Upload({onLoad}){
  const[err,setErr]=useState(null);
  const[phase,setPhase]=useState('players');
  const fetchedRef=useRef(false);

  useEffect(()=>{
    // StrictMode double-invokes effects in dev — guard so fetch only fires once per real mount
    if(fetchedRef.current)return;
    fetchedRef.current=true;

    // Try sessionStorage cache for instant return visits
    try{
      const raw=sessionStorage.getItem(CACHE_KEY);
      if(raw){
        const d=JSON.parse(raw);
        if(d.current?.length&&d.meta){
          onLoad(d);
          // Still lazy-load extras in background
          api.get('/api/scouting/extras').then(e=>onLoad(e.data)).catch(()=>{});
          return;
        }
      }
    }catch{}

    api.get('/api/scouting/primary')
      .then(res=>{
        const d=res.data;
        if(!d.current?.length||!d.meta){setErr('Scouting database is empty. Populate the scouting tables in DynamoDB first.');return;}
        try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(d));}catch{}
        onLoad(d);
        setPhase('extras');
        api.get('/api/scouting/extras').then(e=>onLoad(e.data)).catch(()=>{});
      })
      .catch(e=>setErr(e.response?.data?.error||e.message));
  },[]);

  if(err)return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:500,height:500,background:'radial-gradient(circle,rgba(247,87,87,0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6,ease:EASE}} style={{textAlign:'center',maxWidth:420,padding:32,background:T.card,borderRadius:16,border:'1px solid rgba(247,87,87,0.2)'}}>
        <div style={{fontSize:32,marginBottom:12,color:T.red}}>!</div>
        <h2 style={{color:T.text,marginBottom:8}}>Scouting Data Unavailable</h2>
        <p style={{color:T.dim,fontSize:13,lineHeight:1.6}}>{err}</p>
      </motion.div>
    </motion.div>
  );

  const PHASE_LABEL={players:'Scanning player database…',extras:'Loading match data…'};
  return(
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg}}>
      <Spinner size={300} label={PHASE_LABEL[phase]}/>
    </div>
  );
}

// ─── CLUB SELECT ───
function ClubSelect({teamReports,onSelect,onSkip}){
  const teams=Object.keys(CLUB_META);
  const doSelect=(team)=>{
    const meta=CLUB_META[team];
    const rep=teamReports?.[team];
    onSelect({team,...meta,formation:rep?.formation||meta.formation,style:rep?.style||meta.style,teamReport:rep});
  };
  return(
    <div style={{maxWidth:1120,margin:'0 auto',padding:'32px 24px',fontFamily:T.font}}>

      {/* Header */}
      <motion.div
        initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.5,ease:EASE}}
        style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:14}}
      >
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <img src="/pl-badge.svg" alt="Premier League" style={{width:20,height:22,objectFit:'contain',flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:800,letterSpacing:'0.28em',color:T.accent,textTransform:'uppercase'}}>Premier League 2024/25</span>
          </div>
          <h2 style={{fontSize:28,fontWeight:900,color:T.text,margin:0,lineHeight:1.1,letterSpacing:'-0.02em'}}>Select your club</h2>
        </div>
        <motion.button
          whileHover={{borderColor:'rgba(255,255,255,0.3)',color:T.text}} whileTap={{scale:0.97}}
          onClick={onSkip}
          style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:999,border:`1px solid rgba(255,255,255,0.1)`,background:'transparent',color:T.dim,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0,transition:'all 0.15s'}}
        >No club context <ArrowRight size={13} weight="bold"/></motion.button>
      </motion.div>

      {/* 2-col row list */}
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4,delay:0.1}}
        style={{display:'grid',gridTemplateColumns:'1fr 1fr',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}
        className="scoutlab-clubs-grid"
      >
        {teams.map((team,i)=>{
          const meta=CLUB_META[team];
          const rep=teamReports?.[team];
          const isRightCol=i%2===1;
          const isLastRow=i>=teams.length-2;
          return(
            <motion.div
              key={team}
              className="club-row"
              initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
              whileHover={{background:'rgba(26,101,211,0.05)'}}
              whileTap={{scale:0.99}}
              transition={{type:'spring',stiffness:90,damping:20,delay:0.08+i*0.022}}
              role="button" tabIndex={0} aria-label={`Scout for ${team}`}
              onClick={()=>doSelect(team)}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();doSelect(team);}}}
              style={{
                position:'relative',
                display:'flex',alignItems:'center',gap:13,padding:'13px 18px',
                cursor:'pointer',background:'transparent',
                borderBottom:isLastRow?'none':'1px solid rgba(255,255,255,0.05)',
                borderRight:isRightCol?'none':'1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Left Celtic Blue accent bar */}
              <div className="club-row-accent" style={{position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:32,borderRadius:2,background:T.accent}}/>

              {/* Logo */}
              <ClubLogo club={team} size={36} style={{flexShrink:0}}/>

              {/* Name + meta */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:800,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{team}</div>
                <div style={{display:'flex',alignItems:'center',gap:5,marginTop:3}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.accent,background:'rgba(26,101,211,0.12)',padding:'1px 7px',borderRadius:999}}>{rep?.formation||meta.formation}</span>
                  <span style={{fontSize:10,color:T.dim,fontWeight:500}}>{rep?.style||meta.style}</span>
                </div>
              </div>

              {/* Stats */}
              {rep?(
                <div style={{display:'flex',gap:14,flexShrink:0,alignItems:'center'}}>
                  <div style={{textAlign:'center',minWidth:18}}>
                    <div style={{fontSize:13,fontWeight:900,color:T.accent,lineHeight:1,fontFamily:T.mono}}>{rep.w}</div>
                    <div style={{fontSize:8,color:'rgba(147,154,158,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:1}}>W</div>
                  </div>
                  <div style={{textAlign:'center',minWidth:18}}>
                    <div style={{fontSize:13,fontWeight:900,color:T.dim,lineHeight:1,fontFamily:T.mono}}>{rep.d}</div>
                    <div style={{fontSize:8,color:'rgba(147,154,158,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:1}}>D</div>
                  </div>
                  <div style={{textAlign:'center',minWidth:18}}>
                    <div style={{fontSize:13,fontWeight:900,color:'rgba(147,154,158,0.45)',lineHeight:1,fontFamily:T.mono}}>{rep.l}</div>
                    <div style={{fontSize:8,color:'rgba(147,154,158,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:1}}>L</div>
                  </div>
                  <div style={{width:1,height:24,background:'rgba(255,255,255,0.06)',flexShrink:0}}/>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:11,fontWeight:800,color:T.dim,lineHeight:1,fontFamily:T.mono,letterSpacing:'0.03em'}}>{rep.gf}<span style={{color:'rgba(147,154,158,0.3)',fontWeight:400}}>:</span>{rep.ga}</div>
                    <div style={{fontSize:8,color:'rgba(147,154,158,0.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:1}}>GF:GA</div>
                  </div>
                </div>
              ):(
                <div style={{fontSize:10,color:'rgba(147,154,158,0.3)',fontFamily:T.mono}}>—</div>
              )}

              {/* Arrow */}
              <div style={{color:'rgba(147,154,158,0.25)',fontSize:14,flexShrink:0,lineHeight:1}}>›</div>
            </motion.div>
          );
        })}
      </motion.div>

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
        role:'Clinical Striker',posGroup:'FW',icon:"",color:'#1A65D3',
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
        role:'Inverted Winger',posGroup:'WG',icon:"",color:T.accent2,
        attrs:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'shots',l:'Shot Volume',p:'high'},{k:'takeons',l:'Successful Dribbles',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'high'},{k:'key_passes',l:'Key Passes',p:'medium'}],
        weights:{goals:'high',shots:'high',takeons:'high',prog_carry:'high'},
        because:`${team} rank ${ordinal(gfR)} for goals per game (${gfPerGame.toFixed(2)} vs ${avgGF.toFixed(2)} league avg). ${aName?`${aName} provides assists but`:'Chances are created but'} the attack lacks a second cutting edge from wide — someone who cuts inside and shoots as much as they cross. An inverted winger contributing 9-13 goals from wide positions adds a dimension the current squad cannot produce.`,
      };
      case 'wideFwd': return{
        role:'Creative Wide Forward',posGroup:'WG',icon:"",color:T.accent2,
        attrs:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'assists',l:'Assists & xA',p:'high'},{k:'takeons',l:'Successful Dribbles',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'high'},{k:'sca',l:'Shot-Creating Actions',p:'medium'}],
        weights:{goals:'high',assists:'high',takeons:'high',prog_carry:'high'},
        because:`${sName} contributed ${sGoals} goals — ${Math.round(sShare*100)}% of ${team}'s total. That concentration is a structural risk: opponents double up on the threat, and one injury unravels the entire attack. A wide forward contributing 10+ goals and 8+ assists independently makes the attack two-dimensional and forces opposition to split their defensive focus.`,
      };
      case 'cb': return{
        role:'Commanding CB',posGroup:'DF',icon:"",color:T.green,
        attrs:[{k:'aerial',l:'Aerial Dominance',p:defCrisis?'required':'high'},{k:'tackles',l:'Tackles Won',p:defCrisis?'required':'high'},{k:'interceptions',l:'Interceptions',p:'high'},{k:'blocks',l:'Blocks & Clearances',p:'medium'},{k:'pass_pct',l:'Pass Accuracy',p:'medium'}],
        weights:{aerial:defCrisis?'required':'high',tackles:defCrisis?'required':'high',interceptions:'high',blocks:'medium'},
        because:defCrisis
          ?`${gaPerGame.toFixed(1)} goals per game conceded — ${ordinal(n+1-gaR)} worst in the league with only ${cleanSheets} clean sheets. The backline is dismantled by aerial balls, transitions and direct runners on a near-weekly basis. A commanding CB who dominates the air, steps out to intercept early and organises the defensive shape addresses the root cause of the majority of goals conceded.`
          :defPoor
          ?`Conceding ${gaPerGame.toFixed(1)}/game (${ordinal(n+1-gaR)} worst in the division) is costing ${team} points. The defence struggles to contain aerial threats, set pieces and direct balls. A dominant CB who wins headers and marshals the line precisely is worth 5-8 points per season — the type of improvement that shifts a team a full table position.`
          :`With ${errors} defensive errors (${ordinal(n+1-eR)} most in the league), the midfield is persistently bypassed — placing enormous pressure on the centre-backs to cover ground, make last-ditch interventions and win duels they shouldn't need to contest. A commanding CB who organises the defensive line, dominates aerially and steps aggressively into the midfield space would reduce the volume of dangerous situations even when the midfield shield fails.`,
      };
      case 'dm': return{
        role:'Ball-Winning DM',posGroup:'MF',icon:"",color:T.accent,
        attrs:[{k:'tackles',l:'Tackles Won',p:'required'},{k:'interceptions',l:'Interceptions',p:'required'},{k:'pressing',l:'Pressing Intensity',p:'high'},{k:'aerial',l:'Aerial Dominance',p:'medium'},{k:'pass_pct',l:'Pass Accuracy',p:'medium'}],
        weights:{tackles:'required',interceptions:'required',pressing:'high',aerial:'medium'},
        because:`${errors} defensive errors — ${ordinal(n+1-eR)} most in the league. The midfield fails to win back possession before opponents reach dangerous shooting positions, constantly exposing the back four. A genuine destroyer who dominates ground duels, reads passing lanes and absorbs transitions at source would shift ${team}'s defence from reactive to proactive — and directly reduce that error count.`,
      };
      case 'gk': return{
        role:'Shot-Stopper GK',posGroup:'GK',icon:"",color:T.yellow,
        attrs:[{k:'gk_saves',l:'Save Percentage',p:'required'},{k:'gk_cs',l:'Clean Sheet %',p:'high'},{k:'gk_ga90',l:'Goals Against /90',p:'high'},{k:'gk_dist',l:'Distribution Quality',p:'medium'},{k:'gk_sweeper',l:'Sweeper-Keeper Activity',p:'medium'}],
        weights:{gk_saves:'required',gk_cs:'high',gk_ga90:'high',gk_dist:'medium'},
        because:`${cleanSheets} clean sheets — ${ordinal(n+1-csR)} fewest in the league. ${gk?`${gk}'s`:'The goalkeeper\'s'} shot-stopping is not providing the platform ${team} needs. Tight games that finish 1-0 require the exceptional save. A GK performing in the top quartile for save percentage is statistically worth 5-8 additional points per season — one of the most efficient signings per pound spent in the entire market.`,
      };
      case 'b2b': return{
        role:'Box-to-Box Midfielder',posGroup:'MF',icon:"",color:T.accent,
        attrs:[{k:'goals',l:'Goal Scoring',p:'high'},{k:'pressing',l:'Pressing Intensity',p:'high'},{k:'prog_pass',l:'Progressive Passing',p:'high'},{k:'tackles',l:'Tackles Won',p:'medium'},{k:'assists',l:'Assists & xA',p:'medium'}],
        weights:{goals:'high',pressing:'high',prog_pass:'high',tackles:'medium'},
        because:`${team} drew ${d} games — ${Math.round(d/total*100)}% of their matches. Games consistently finish level because no one can manufacture the decisive moment in tight situations. A box-to-box midfielder who arrives late into the penalty area contributes 8-11 goals from midfield — an unpredictable secondary threat that breaks down defences which have already shut out the obvious attackers. Converting even four draws to wins means 8 extra points.`,
      };
      case 'playmaker':
        if(errLow&&attackPoor)return{
          role:'Attacking Midfielder',posGroup:'MF',icon:"",color:T.accent2,
          attrs:[{k:'key_passes',l:'Key Passes',p:'required'},{k:'sca',l:'Shot-Creating Actions',p:'high'},{k:'assists',l:'Assists & xA',p:'high'},{k:'goals',l:'Goal Scoring',p:'high'},{k:'prog_carry',l:'Progressive Carrying',p:'medium'}],
          weights:{key_passes:'required',sca:'high',assists:'high',goals:'high'},
          because:`${team}'s defensive record is one of the league's best — only ${errors} errors (${ordinal(eR)} fewest) and ${cleanSheets} clean sheets. The constraint is entirely offensive: ${gfPerGame.toFixed(2)} goals per game ranks ${ordinal(gfR)} in the division. An attacking midfielder who operates between the lines, creates 60+ chances per season and contributes directly to goals would convert that defensive platform into significantly more points.`,
        };
        return{
          role:'Deep Playmaker',posGroup:'MF',icon:"",color:T.accent2,
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
  const PRIO_ICON={FW:'',WG:'',GK:'',MF:'',DF:''};
  const PRIO_COLOR={FW:'#1A65D3',WG:'#2B4C5E',GK:'#939A9E',MF:'#4F82D6',DF:'#6E7E8A'};
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
        icon:PRIO_ICON[pg]||'',color:PRIO_COLOR[pg]||'#1A65D3',
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

  const PRI_C2={required:'#1A65D3',high:T.accent,medium:T.yellow,low:T.orange};
  const PRI_W={required:4,high:3,medium:2,low:1};

  return(
    <div style={{maxWidth:900,margin:'0 auto',padding:20,fontFamily:T.font}}>
      {/* Header */}
      <motion.button whileHover={{x:-3}} whileTap={{scale:0.95}} transition={{duration:0.15}} onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:13,padding:0,marginBottom:14,fontFamily:T.font}}>← All Clubs</motion.button>
      <div style={{...C.card,borderTop:`4px solid ${color}`,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <ClubLogo club={team} size={48}/>
            <div>
              <h2 style={{fontSize:24,fontWeight:900,color:T.text,margin:0}}>{team}</h2>
              <p style={{color:T.dim,fontSize:13,margin:'4px 0 0'}}>{formation} · {style} · 2024/25 Season Report</p>
            </div>
          </div>
          {rep&&(
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              {[['Wins',rep.w,T.accent],['Draws',rep.d,T.dim],['Losses',rep.l,T.text],['Goals For',rep.gf,T.accent],['Goals Against',rep.ga,T.dim],['Clean Sheets',rep.cleanSheets,T.accent],['Errors',rep.errors,T.text]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:'inherit'}}>{v}</div>
                  <div style={{fontSize:11,color:T.dim,textTransform:'uppercase',letterSpacing:0.5}}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {rep&&(
          <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap',fontSize:12,color:T.dim}}>
            {rep.topScorer&&<span>Top Scorer: <b style={{color:T.text}}>{rep.topScorer}</b></span>}
            {rep.topAssister&&<span>Top Assister: <b style={{color:T.text}}>{rep.topAssister}</b></span>}
            {rep.gk&&<span>GK: <b style={{color:T.text}}>{rep.gk}</b></span>}
          </div>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      {rep&&(rep.positives?.length>0||rep.negatives?.length>0)&&(
        <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
          {rep.positives?.length>0&&(
            <div style={{...C.card,flex:1,minWidth:180,marginBottom:0,border:`1px solid ${T.green}28`,background:T.green+'05'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <TrendUp size={13} weight="bold" color={T.accent} aria-hidden="true"/>
                <div style={{fontSize:11,fontWeight:800,color:T.accent,textTransform:'uppercase',letterSpacing:1}}>Strengths</div>
              </div>
              {rep.positives.map((s,i)=>{
                const[title]=s.split(':');
                return(<div key={i} style={{fontSize:12,fontWeight:600,color:T.text,padding:'3px 0',borderBottom:i<rep.positives.length-1?`1px solid ${T.border}`:'none'}}>{title}</div>);
              })}
            </div>
          )}
          {rep.negatives?.length>0&&(
            <div style={{...C.card,flex:1,minWidth:180,marginBottom:0,border:`1px solid rgba(43,76,94,0.4)`,background:'rgba(43,76,94,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <TrendDown size={13} weight="bold" color={T.dim} aria-hidden="true"/>
                <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1}}>Weaknesses</div>
              </div>
              {rep.negatives.map((s,i)=>{
                const[title]=s.split(':');
                return(<div key={i} style={{fontSize:12,fontWeight:600,color:T.dim,padding:'3px 0',borderBottom:i<rep.negatives.length-1?`1px solid ${T.border}`:'none'}}>{title}</div>);
              })}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {sugs.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(280px,100%),1fr))',gap:10}}>
            {sugs.map((s,i)=>{
              const active=selSug?.role===s.role;
              return(
                <motion.div key={i} onClick={()=>pickSug(s)} role="button" tabIndex={0}
                  aria-pressed={active} aria-label={`${active?'Deselect':'Select'} ${s.role}`}
                  onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickSug(s);}}}
                  animate={{borderColor:active?s.color:T.border,background:active?s.color+'0A':'rgba(255,255,255,0.02)'}}
                  whileHover={{borderColor:active?s.color:s.color+'60',background:active?s.color+'14':'rgba(255,255,255,0.04)',y:-2}}
                  whileTap={{scale:0.985}}
                  transition={{type:'spring',stiffness:220,damping:22}}
                  style={{padding:14,borderRadius:12,border:`2px solid ${T.border}`,cursor:'pointer'}}
                >
                  <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
                    <div style={{width:3,alignSelf:'stretch',minHeight:32,borderRadius:999,background:s.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:active?s.color:T.text,lineHeight:1.2,marginBottom:2}}>{s.role}</div>
                      <div style={{fontSize:11,color:T.dim,fontWeight:600}}>{POS[s.posGroup]?.label}</div>
                    </div>
                    {active&&<CheckCircle size={15} weight="fill" color={s.color} style={{flexShrink:0}} aria-hidden="true"/>}
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {s.attrs.slice(0,4).map(a=>(
                      <span key={a.k} style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:999,background:PRI_C2[a.p]+'18',color:PRI_C2[a.p],border:`1px solid ${PRI_C2[a.p]}30`}}>{a.l.split(' ')[0]}</span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div ref={searchRef} style={{borderTop:`1px solid ${T.border}`,marginBottom:20,paddingTop:20}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <MagnifyingGlass size={14} weight="bold" color={T.accent} aria-hidden="true"/>
          <div style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>
            {selSug?selSug.role:'Player Search'}
          </div>
          {selSug&&<span style={C.tag(selSug.color||T.accent)}>{POS[selSug.posGroup]?.label}</span>}
        </div>
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
// Collapsible panel — progressive disclosure to reduce filter clutter
function Collapsible({title,summary,badge,defaultOpen=false,icon,children}){
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

// Single attribute category — collapsible to tame the priorities wall
// Segmented priority control — replaces 5 scattered buttons
const PRI_SEG=[
  {k:'none',   label:'Off',  short:'—'},
  {k:'low',    label:'Low',  short:'L'},
  {k:'medium', label:'Med',  short:'M'},
  {k:'high',   label:'High', short:'H'},
  {k:'required',label:'Must',short:'!'},
];
const PRI_SEG_C={required:'#1A65D3',high:'#3B82F6',medium:'#2B4C5E',low:'#374151',none:'transparent'};
const PRI_SEG_TEXT={required:'#F2F2F2',high:'#F2F2F2',medium:'#93C5FD',low:'#9CA3AF',none:'#6B7280'};

function PrioritySegment({attrKey,label,value,onChange}){
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

function AttrCategory({g,priorities,thresholds,uP,uT,gP,tooltip,setTooltip,defaultOpen}){
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

function Search({data,onSearch,clubCtx,forceValues,sidebar}){
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
              <div style={{display:'flex',alignItems:'center',gap:7,padding:'5px 12px',borderRadius:999,background:clubCtx.color+'14',border:`1px solid ${clubCtx.color}28`}}>
                <ClubLogo club={clubCtx.team} size={14}/>
                <span style={{fontSize:12,fontWeight:700,color:clubCtx.color}}>{clubCtx.team}</span>
                <span style={{fontSize:11,color:T.dim}}>· {clubCtx.formation}</span>
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
          <motion.button whileHover={{x:-3}} whileTap={{scale:0.95}} transition={{duration:0.15}} onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:13,padding:0,marginBottom:6,fontFamily:T.font}}>← Search</motion.button>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>{devMode?'Development Scouting':'Scouting Results'}</h2>
          {devMode&&<p style={{fontSize:12,color:T.accent,margin:'2px 0 0'}}>Sorted by potential score — showing players aged 26 and under</p>}
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setDevMode(m=>!m)} style={{...C.btn(devMode,T.accent),padding:'7px 14px',fontSize:12,border:`1px solid ${T.accent}80`,borderRadius:999}}>
              {devMode?'Dev Mode ON':'Dev Mode'}
            </button>
            <button onClick={onShortlist} style={{...C.btn(false,T.yellow),padding:'7px 14px',fontSize:12,border:`1px solid ${T.yellow}30`,borderRadius:999}}>
              <Star size={12} weight="fill" style={{display:'inline',verticalAlign:'middle',marginRight:4}}/> Shortlist {shortlist?.length>0?`(${shortlist.length})`:''}
            </button>
          </div>
          <div style={{textAlign:'right'}} aria-live="polite" aria-atomic="true">
            <div style={{fontSize:22,fontWeight:800,color:T.accent}}>{devMode?top.length:results.length}</div>
            <div style={{fontSize:12,color:T.dim}}>{devMode?'prospects found':'matches found'}</div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        <span style={C.tag()}>{posL}</span>
        <span style={C.tag()}>{req?.ageMin}–{req?.ageMax} yrs</span>
        {req?.budgetMax&&<span style={C.tag()}>{req.budgetMin?`€${(req.budgetMin/1e6).toFixed(0)}M`:'€0'}–€{(req.budgetMax/1e6).toFixed(0)}M</span>}
        {req?.similarTo&&<span style={C.tag(T.accent2)}>Like: {req.similarTo}</span>}
      </div>

      {top.map((p,i)=>{
        const starred=shortlist?.includes(p.Player);
        return(
        <motion.div
          key={`${p.Player}-${i}`}
          initial={{opacity:0,x:-12,filter:'blur(3px)'}}
          animate={{opacity:1,x:0,filter:'blur(0px)'}}
          transition={{type:'spring',stiffness:100,damping:20,delay:Math.min(i*0.038,0.9)}}
          whileHover={{x:4,borderColor:i===0?T.accent+'80':'rgba(255,255,255,0.14)'}}
          whileTap={{scale:0.995}}
          style={{display:'flex',alignItems:'center',gap:14,padding:'12px 14px',marginBottom:5,background:i===0?T.accent+'0C':T.card,border:`1px solid ${i===0?T.accent+'40':T.border}`,borderRadius:12,cursor:'pointer'}}>
          <span style={{fontSize:10,fontWeight:800,color:i<3?T.accent:T.dim,width:20,textAlign:'center',fontFamily:T.mono,letterSpacing:'-0.02em'}}>{i+1}</span>
          {/* Player photo */}
          <div style={{flexShrink:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            <PlayerAvatar name={p.Player} playerId={p._player_id} size={52} style={{borderRadius:8}}/>
          </div>
          {/* Score badge — match score in normal mode, potential score in dev mode */}
          {devMode?(
            <div style={{flexShrink:0,cursor:'pointer',position:'relative'}} onClick={()=>onSelect(p,i)}>
              <div style={{width:42,height:42,borderRadius:999,display:'flex',alignItems:'center',justifyContent:'center',background:T.accent,color:'#F2F2F2',fontWeight:900,fontSize:14,fontFamily:T.mono,boxShadow:`0 0 0 2px rgba(0,0,0,0.5),0 0 0 3.5px ${T.accent}50`,flexDirection:'column',gap:0}}>
                <span style={{lineHeight:1}}>{p._potential_score}</span>
                <span style={{fontSize:7,fontWeight:800,letterSpacing:'0.05em',color:'rgba(255,255,255,0.7)',lineHeight:1,marginTop:1}}>POT</span>
              </div>
            </div>
          ):(
            <div style={{flexShrink:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
              <div style={{width:42,height:42,borderRadius:999,display:'flex',alignItems:'center',justifyContent:'center',background:sc(p.matchScore),color:'#F2F2F2',fontWeight:900,fontSize:14,fontFamily:T.mono,boxShadow:`0 0 0 2px rgba(0,0,0,0.5),0 0 0 3.5px ${sc(p.matchScore)}45`,flexDirection:'column',gap:0}}>
                <span style={{lineHeight:1}}>{p.matchScore}</span>
                <span style={{fontSize:7,fontWeight:800,letterSpacing:'0.05em',color:'rgba(255,255,255,0.7)',lineHeight:1,marginTop:1}}>FIT</span>
              </div>
            </div>
          )}
          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              {i===0&&!devMode&&<span style={{...C.tag(T.accent),fontSize:11}}>TOP MATCH</span>}
              {i===0&&devMode&&<span style={{...C.tag(T.accent),fontSize:11}}>TOP PROSPECT</span>}
              <span style={{fontWeight:700,color:T.text,fontSize:14}}>{p.Player}</span>
              {p._trajectory&&<span style={{fontSize:11,fontWeight:700,color:TRJ[p._trajectory]?.c}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
              {p._potential_tier&&<span style={{fontSize:11,padding:'1px 6px',borderRadius:3,background:PTL[p._potential_tier]?.c+'20',color:PTL[p._potential_tier]?.c,fontWeight:700}}>{p._potential_tier}</span>}
              {p._injury_risk&&p._injury_risk!=='Low'&&<span style={{fontSize:11,padding:'1px 5px',borderRadius:3,background:IRK[p._injury_risk]?.c+'20',color:IRK[p._injury_risk]?.c,fontWeight:700}}>{p._injury_risk} Risk</span>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:T.dim,marginTop:2,flexWrap:'wrap'}}>
              <ClubLogo club={p.Squad} size={14}/>
              <span>{p.Squad} · {p.league} · {p._ml_role||p.Pos||p.position} · {p.Age}y{p.height?` · ${p.height}cm`:''}{p.Min?` · ${p.Min}'`:''}{ p.whoscored_rating>0?` · ${(+p.whoscored_rating).toFixed(2)}`:''}</span>
            </div>
          </div>
          <div style={{textAlign:'right',cursor:'pointer'}} onClick={()=>onSelect(p,i)}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>{mv(p)}</div>
            <div style={{fontSize:11,color:T.dim,fontFamily:T.mono}}>{+(p.goals||p.Gls||0)}G · {+(p.assists||p.Ast||0)}A</div>
          </div>
          <button onClick={e=>{e.stopPropagation();onToggleShortlist(p);}} aria-label={starred?`Remove ${p.Player} from shortlist`:`Add ${p.Player} to shortlist`} aria-pressed={starred} style={{background:'none',border:'none',cursor:'pointer',color:starred?T.yellow:T.dim,padding:'4px 6px',lineHeight:1,flexShrink:0}}>
            <Star size={20} weight={starred?'fill':'regular'}/>
          </button>
        </motion.div>
        );
      })}
    </div>
  );
}

// ─── SECTION WRAPPER — defined outside Report so React never remounts it on re-render ───
function Sec({icon,title,tag,children,accent,style,className}){
  const ac=accent||T.accent;
  const Icon=typeof icon==='function'?icon:null;
  return(
    <div className={className} style={{...C.card,border:accent?`1px solid ${accent}55`:C.card.border,...style}}>
      <div style={{position:'absolute',top:0,left:'8%',right:'8%',height:1,background:`linear-gradient(90deg,transparent,${ac},transparent)`,pointerEvents:'none'}}/>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        {Icon
          ?<Icon size={16} weight="bold" color={ac} aria-hidden="true"/>
          :<div style={{width:2,height:16,borderRadius:999,background:ac,flexShrink:0}}/>}
        <span style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>{title}</span>
        {tag&&<span style={C.tag(ac)}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── PLAYER DRAWER ───
// Slides in from right — compact summary, Full Report button navigates to /scout-report
function PlayerDrawer({player:p,data,req,shortlist,onToggle,onClose,onViewFull}){
  const pg=req?.posGroup!=='ALL'?req?.posGroup:'FW';
  const prof=useMemo(()=>getProfile(p,data.current,pg),[p,data,pg]);
  const top5=prof.slice(0,5);
  const starred=shortlist?.includes(p.Player);
  const verdict=p.matchScore>=90?{r:'Top Match',c:T.accent}:p.matchScore>=80?{r:'Recommended',c:T.accent}:p.matchScore>=70?{r:'Monitor',c:T.accent2}:{r:'Conditional',c:T.dim};

  useEffect(()=>{
    const onKey=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[onClose]);

  return createPortal(
    <>
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      transition={{duration:0.28,ease:EASE}}
      onClick={onClose} aria-hidden="true"
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:199}}
    />
    <motion.div
      role="dialog" aria-modal="true" aria-label={`${p.Player} player profile`}
      initial={{x:'100%',opacity:0}} animate={{x:0,opacity:1}} exit={{x:'100%',opacity:0}}
      transition={{duration:0.28,ease:EASE}}
      className="scout-player-drawer"
      style={{position:'fixed',right:0,top:0,maxHeight:'100dvh',background:'#060608',
        borderLeft:'1px solid rgba(255,255,255,0.09)',borderBottomLeftRadius:18,overflowY:'auto',zIndex:200,
        boxShadow:'-24px 0 60px rgba(0,0,0,0.7)',display:'flex',flexDirection:'column'}}
    >
      {/* Header bar */}
      <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontSize:10,fontWeight:800,letterSpacing:2.5,color:T.accent,textTransform:'uppercase'}}>Player Profile</span>
        <button onClick={onClose} aria-label="Close player panel" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:999,width:30,height:30,cursor:'pointer',color:T.dim,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>✕</button>
      </div>

      {/* Identity */}
      <div style={{padding:'22px 22px 0',flexShrink:0}}>
        <div style={{display:'flex',gap:14,alignItems:'flex-start',marginBottom:18}}>
          <div style={{position:'relative',flexShrink:0}}>
            <PlayerAvatar name={p.Player} playerId={p._player_id} size={76} style={{borderRadius:12}}/>
            <div style={{position:'absolute',bottom:-6,right:-6,width:26,height:26,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',background:sc(p.matchScore),color:'#F2F2F2',fontWeight:900,fontSize:11}}>{p.matchScore}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontSize:18,fontWeight:900,color:T.text,margin:'0 0 4px',lineHeight:1.2}}>{p.Player}</h2>
            <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}>
              <ClubLogo club={p.Squad} size={14}/>
              <span style={{fontSize:12,color:T.dim}}>{p.Squad}</span>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <span style={{...C.tag(T.accent2),fontSize:10}}>{p._ml_role||p.Pos}</span>
              <span style={{...C.tag(verdict.c),fontSize:10}}>{verdict.r}</span>
              {p._trajectory&&<span style={{fontSize:10,color:TRJ[p._trajectory]?.c,fontWeight:700}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
            </div>
          </div>
        </div>

        {/* Quick stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:18}}>
          {[['Goals',+(p.goals||p.Gls||0)],['Assists',+(p.Ast||0)],['Age',p.Age||'—'],['Value',mv(p)],['Contract',p.contract_expires||'—'],['Mins',p.Min||'—']].map(([l,v])=>(
            <div key={l} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:9,padding:'9px 8px',textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:800,color:T.text,lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
              <div style={{fontSize:9,color:T.dim,fontWeight:700,textTransform:'uppercase',marginTop:3,letterSpacing:0.5}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Top attribute bars */}
        {top5.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={C.label}>Top Attributes vs Position</div>
            {top5.map(a=>(
              <div key={a.k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                <span style={{width:96,fontSize:11,color:T.dim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{a.l}</span>
                <div style={{flex:1,height:4,borderRadius:3,background:T.border,overflow:'hidden'}}>
                  <div style={{width:`${a.percentile}%`,height:'100%',borderRadius:3,background:rc(a.percentile)}}/>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:rc(a.percentile),width:32,textAlign:'right',flexShrink:0}}>P{a.percentile}</span>
              </div>
            ))}
          </div>
        )}

        {/* Risk / potential tags */}
        {(p._injury_risk&&p._injury_risk!=='Low'||p._potential_tier)&&(
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:16}}>
            {p._injury_risk&&p._injury_risk!=='Low'&&<span style={C.tag(IRK[p._injury_risk]?.c)}>{p._injury_risk} Injury Risk</span>}
            {p._potential_tier&&<span style={C.tag(PTL[p._potential_tier]?.c||T.dim)}>{p._potential_tier} · {p._potential_score}/100</span>}
          </div>
        )}

        {/* Full report — kept up here so it's visible without scrolling to the bottom */}
        {onViewFull&&(
          <motion.button onClick={onViewFull} whileHover={{scale:1.01}} whileTap={{scale:0.97}}
            style={{width:'100%',padding:'12px 20px',borderRadius:999,cursor:'pointer',fontSize:13,fontWeight:800,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:7,background:T.accent,color:'#F2F2F2',border:'none',marginBottom:18}}>
            <FileText size={14} weight="bold"/> View Full Report
          </motion.button>
        )}
      </div>

      {/* Action footer — flows right after the content, no large gap */}
      <div style={{padding:'16px 22px 28px',flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:9}}>
        <motion.button onClick={()=>onToggle(p)} whileHover={{scale:1.01}} whileTap={{scale:0.97}}
          style={{width:'100%',padding:'11px 20px',borderRadius:999,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:starred?'rgba(250,204,21,0.08)':'rgba(255,255,255,0.04)',color:starred?'#facc15':T.dim,border:`1px solid ${starred?'rgba(250,204,21,0.25)':'rgba(255,255,255,0.09)'}`}}>
          <Star size={13} weight={starred?'fill':'regular'}/> {starred?'Shortlisted — Remove':'Add to Shortlist'}
        </motion.button>
      </div>
    </motion.div>
    </>,
    document.body
  );
}

// ─── SUGGESTIONS PANEL ───
// Right panel content before search runs — club recruitment priorities
function SuggestionsPanel({clubCtx,teamReports,selSug,onPickSug,onBackToClubs}){
  const BackToClubs=()=>(
    <button onClick={onBackToClubs} aria-label="Back to all clubs" style={{background:'none',border:'none',color:T.dim,cursor:'pointer',fontSize:12,padding:0,fontFamily:'inherit',fontWeight:600,display:'flex',alignItems:'center',gap:5,marginBottom:16,transition:'color 0.15s'}} onMouseEnter={e=>e.currentTarget.style.color=T.accent} onMouseLeave={e=>e.currentTarget.style.color=T.dim}>
      <CaretRight size={12} weight="bold" style={{transform:'rotate(180deg)'}} aria-hidden="true"/>
      <span>All Clubs</span>
    </button>
  );
  const leagueCtx=useMemo(()=>computeLeagueCtx(teamReports),[teamReports]);
  const rep=clubCtx?teamReports?.[clubCtx.team]:null;
  const sugs=useMemo(()=>{if(!rep||!leagueCtx)return[];return getSuggestions(rep,clubCtx?.team,leagueCtx);},[rep,clubCtx,leagueCtx]);
  const PRI_C2={required:'#1A65D3',high:T.accent,medium:T.accent2,low:T.dim};
  const[openReportItem,setOpenReportItem]=useState(null);
  useEffect(()=>{setOpenReportItem(null);},[clubCtx?.team]);

  if(!clubCtx){
    return(
      <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:360,padding:'24px 28px'}}>
        <BackToClubs/>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{textAlign:'center',maxWidth:260}}>
            <div style={{width:48,height:48,borderRadius:999,background:'rgba(26,101,211,0.1)',border:'1px solid rgba(26,101,211,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <MagnifyingGlass size={22} weight="duotone" color={T.accent} aria-hidden="true"/>
            </div>
            <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:6}}>Ready to search</div>
            <p style={{color:T.dim,fontSize:13,lineHeight:1.6,margin:0}}>Set position and priorities below, then hit Search.</p>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:'24px 28px',overflowY:'auto'}}>
      <BackToClubs/>
      {/* Club header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:10,flexWrap:'wrap'}}>
        <ClubLogo club={clubCtx.team} size={44}/>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontSize:22,fontWeight:900,color:T.text,margin:'0 0 2px'}}>{clubCtx.team}</h2>
          <p style={{color:T.dim,fontSize:14,margin:0}}>{clubCtx.formation} · {clubCtx.style} · 2024/25 Season</p>
        </div>
        {rep&&<div style={{display:'flex',gap:14,flexShrink:0}}>
          {[['W',rep.w,T.accent],['D',rep.d,T.dim],['L',rep.l,T.text]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:900,color:c}}>{v}</div>
              <div style={{fontSize:9,color:T.dim,textTransform:'uppercase',letterSpacing:0.5}}>{l}</div>
            </div>
          ))}
        </div>}
      </div>
      {rep&&<div style={{display:'flex',gap:16,marginBottom:20,borderBottom:'1px solid rgba(255,255,255,0.06)',paddingBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:12}}>
          {[['W',rep.w,T.accent],['D',rep.d,T.dim],['L',rep.l,'rgba(255,255,255,0.3)']].map(([l,v,c])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:15,fontWeight:900,color:c,lineHeight:1}}>{v}</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:700,textTransform:'uppercase'}}>{l}</span>
            </div>
          ))}
        </div>
        {rep.gf!==undefined&&<span style={{fontSize:12,color:T.dim,marginLeft:'auto'}}><b style={{color:T.text}}>{rep.gf}</b> GF · <b style={{color:T.text}}>{rep.ga}</b> GA</span>}
      </div>}

      {rep&&(rep.positives?.length>0||rep.negatives?.length>0)&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Team Report</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {rep.positives?.length>0&&(
              <div style={{flex:1,minWidth:160,padding:12,borderRadius:12,border:`1px solid ${T.accent}28`,background:T.accent+'08'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <TrendUp size={12} weight="bold" color={T.accent} aria-hidden="true"/>
                  <span style={{fontSize:10,fontWeight:800,color:T.accent,textTransform:'uppercase',letterSpacing:0.8}}>Strengths</span>
                </div>
                {rep.positives.map((s,i)=>{
                  const[title,...rest]=s.split(':');
                  const detail=rest.join(':').trim();
                  const key=`p-${i}`;const open=openReportItem===key;
                  return(
                    <div key={i} style={{borderBottom:i<rep.positives.length-1?'1px solid rgba(255,255,255,0.06)':'none'}}>
                      <button onClick={()=>setOpenReportItem(open?null:key)} aria-expanded={open} style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'3px 0',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                        <span style={{flex:1,fontSize:12,fontWeight:600,color:T.text}}>{title}</span>
                        {detail&&<CaretDown size={11} weight="bold" color={T.dim} aria-hidden="true" style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.15s',flexShrink:0}}/>}
                      </button>
                      {detail&&open&&<div style={{fontSize:11.5,color:T.dim,lineHeight:1.5,padding:'0 0 8px'}}>{detail}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {rep.negatives?.length>0&&(
              <div style={{flex:1,minWidth:160,padding:12,borderRadius:12,border:'1px solid rgba(147,154,158,0.25)',background:'rgba(147,154,158,0.05)'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <TrendDown size={12} weight="bold" color={T.dim} aria-hidden="true"/>
                  <span style={{fontSize:10,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:0.8}}>Weaknesses</span>
                </div>
                {rep.negatives.map((s,i)=>{
                  const[title,...rest]=s.split(':');
                  const detail=rest.join(':').trim();
                  const key=`n-${i}`;const open=openReportItem===key;
                  return(
                    <div key={i} style={{borderBottom:i<rep.negatives.length-1?'1px solid rgba(255,255,255,0.06)':'none'}}>
                      <button onClick={()=>setOpenReportItem(open?null:key)} aria-expanded={open} style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'3px 0',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                        <span style={{flex:1,fontSize:12,fontWeight:600,color:T.dim}}>{title}</span>
                        {detail&&<CaretDown size={11} weight="bold" color={T.dim} aria-hidden="true" style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.15s',flexShrink:0}}/>}
                      </button>
                      {detail&&open&&<div style={{fontSize:11.5,color:T.dim,lineHeight:1.5,padding:'0 0 8px'}}>{detail}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {sugs.length>0&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
          {sugs.map((s,i)=>{
            const active=selSug?.role===s.role;
            return(
              <div key={i} className="scout-card-btn" role="button" tabIndex={0}
                aria-pressed={active} aria-label={`${active?'Deselect':'Select'} recruitment role ${s.role}`}
                onClick={()=>onPickSug(active?null:s)}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPickSug(active?null:s);}}}
                style={{padding:14,borderRadius:12,border:`2px solid ${active?s.color:T.border}`,background:active?s.color+'0A':'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.13s',position:'relative'}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.borderColor=s.color+'60';e.currentTarget.style.background='rgba(255,255,255,0.04)';}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background='rgba(255,255,255,0.02)';}}}
              >
                <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
                  <div style={{width:3,alignSelf:'stretch',minHeight:36,borderRadius:999,background:s.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:800,color:active?s.color:T.text,lineHeight:1.2,marginBottom:2}}>{s.role}</div>
                    <div style={{fontSize:11,color:T.dim,fontWeight:600}}>{POS[s.posGroup]?.label}</div>
                  </div>
                  {active&&<CheckCircle size={16} weight="fill" color={s.color} style={{flexShrink:0,marginTop:1}} aria-hidden="true"/>}
                </div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {s.attrs?.slice(0,4).map(a=>(
                    <span key={a.k} style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:999,background:PRI_C2[a.p]+'18',color:PRI_C2[a.p],border:`1px solid ${PRI_C2[a.p]}30`}}>{a.l.split(' ')[0]}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>}
      {sugs.length===0&&<div style={{padding:'32px 0',textAlign:'center',color:T.dim,fontSize:13}}>
        No recruitment priorities computed — set filters in the sidebar and search manually.
      </div>}
    </div>
  );
}

// ─── MAIN LAYOUT ───
// Two-column layout: left sidebar (filters) + right panel (suggestions or compact results)
// Replaces the old sequential clubreport → search → results → report views
function MainLayout({data,clubCtx,teamReports,shortlist,onToggleShortlist,onBackToClubs,onShortlistView}){
  const[results,setResults]=useState(null);
  const[req,setReq]=useState(null);
  const[sel,setSel]=useState(null);
  const[fullReport,setFullReport]=useState(null);
  const[selSug,setSelSug]=useState(null);
  const searchRef=useRef(null);

  const handleSearch=useCallback(f=>{
    setReq(f);
    const pool=clubCtx?data.current.filter(p=>p.Squad!==clubCtx.team):data.current;
    setResults(search(pool,f));
    setSel(null);
  },[data,clubCtx]);

  const handlePickSug=useCallback(s=>{
    setSelSug(s);
    setResults(null);
    if(s){
      setTimeout(()=>{
        searchRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
      },80);
    }
  },[]);


  const showResults=results!==null;

  // Full player report — opened from the compact drawer's "Full Report" button.
  // Shows every section (shot map, match log, radar, trends, comparisons, ML similarity).
  if(fullReport){
    const selIdx=results?results.findIndex(x=>x.Player===fullReport.Player):-1;
    return(
      <div style={{fontFamily:T.font}}>
        <Report
          player={fullReport} idx={selIdx<0?0:selIdx} results={results||[]} data={data} req={req||{posGroup:'FW'}}
          shortlist={shortlist} onToggleShortlist={onToggleShortlist}
          onBack={()=>setFullReport(null)} onShortlist={onShortlistView}
        />
      </div>
    );
  }

  return(
    <div style={{fontFamily:T.font}}>

      {/* ── Pre-search: 2-column split ── */}
      <AnimatePresence mode="wait">
        {!showResults&&(
          <motion.div key="search-layout" className="layout-main-split" style={{alignItems:'start'}}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0,x:40}}
            transition={{type:'spring',stiffness:140,damping:24}}
          >
            {/* LEFT: Club context + role suggestions */}
            <div style={{minWidth:0,borderRight:'1px solid rgba(255,255,255,0.06)'}}>
              <SuggestionsPanel clubCtx={clubCtx} teamReports={teamReports} selSug={selSug} onPickSug={handlePickSug} onBackToClubs={onBackToClubs}/>
            </div>

            {/* RIGHT: Search form — sticky */}
            <div ref={searchRef} style={{position:'sticky',top:64,maxHeight:'calc(100dvh - 64px)',overflowY:'auto',minWidth:0,scrollbarWidth:'none'}}>
              <Search
                data={data}
                clubCtx={clubCtx?{...clubCtx,autoWeights:selSug?.weights||{}}:null}
                forceValues={selSug?{posGroup:selSug.posGroup,priorities:selSug.weights,thresholds:selSug.thresholds||{}}:null}
                onSearch={handleSearch}
                sidebar={true}
              />
            </div>
          </motion.div>
        )}

        {/* ── Post-search: full-width results grid ── */}
        {showResults&&(
          <motion.div key="results-layout" className="scout-results-view"
            initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            transition={{type:'spring',stiffness:120,damping:22}}
          >
            {/* Results header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12,paddingTop:24}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <button onClick={()=>setResults(null)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:999,background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.dim,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  <ArrowLeft size={13} weight="bold"/>
                  Modify search
                </button>
                <div style={{display:'flex',alignItems:'baseline',gap:5}}>
                  <span style={{fontSize:26,fontWeight:900,color:T.accent,lineHeight:1}}>{results.length}</span>
                  <span style={{fontSize:13,color:T.dim,fontWeight:600}}>matches</span>
                </div>
                <span style={C.tag()}>{POS[req?.posGroup]?.label||'All'}</span>
                {req?.ageMin&&req.ageMin!==18&&<span style={C.tag()}>{req.ageMin}–{req.ageMax}y</span>}
                {req?.budgetMax&&<span style={C.tag()}>≤€{(req.budgetMax/1e6).toFixed(0)}M</span>}
                {req?.nationality&&<span style={C.tag()}>{req.nationality}</span>}
              </div>
              <button onClick={onShortlistView} style={{...C.btn(shortlist?.length>0,T.accent),padding:'7px 16px',fontSize:12,border:`1px solid ${shortlist?.length>0?T.accent:T.border}`,borderRadius:999,display:'flex',alignItems:'center',gap:6}}>
                <Star size={13} weight={shortlist?.length>0?'fill':'regular'} aria-hidden="true"/>
                {shortlist?.length>0?`Shortlist (${shortlist.length})`:'Shortlist'}
              </button>
            </div>

            {/* Player grid */}
            <div className="scout-results-grid">
              {results.slice(0,50).map((p,i)=>{
                const starred=shortlist?.includes(p.Player);
                const isSelected=sel?.Player===p.Player;
                return(
                  <motion.div
                    key={`${p.Player}-${i}`}
                    className="scout-result-card"
                    role="button" tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${p.Player}, ${p.Squad}, match score ${p.matchScore}. View details`}
                    initial={{opacity:0,y:10,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
                    transition={{type:'spring',stiffness:110,damping:20,delay:Math.min(i*0.028,0.7)}}
                    whileHover={{y:-3,borderColor:isSelected?T.accent+'88':T.accent+'40'}}
                    whileTap={{scale:0.98}}
                    onClick={()=>setSel(isSelected?null:p)}
                    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSel(isSelected?null:p);}}}
                    style={{
                      display:'flex',flexDirection:'column',alignItems:'center',gap:12,
                      padding:'18px 16px 14px',
                      background:isSelected?T.accent+'10':i===0?T.accent+'06':'rgba(255,255,255,0.02)',
                      border:`1px solid ${isSelected?T.accent+'55':i===0?T.accent+'22':T.border}`,
                      borderRadius:14,cursor:'pointer',
                      transition:'border-color 0.12s,background 0.12s',
                      position:'relative',minWidth:0,
                    }}
                  >
                    {/* Rank + score row */}
                    <div style={{position:'absolute',top:12,left:14,fontSize:10,fontWeight:900,color:i<3?T.accent:T.dim}}>
                      #{i+1}
                    </div>
                    <div style={{position:'absolute',top:10,right:10,width:34,height:34,borderRadius:999,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',background:sc(p.matchScore),boxShadow:`0 0 0 2px rgba(0,0,0,0.5),0 0 0 3.5px ${sc(p.matchScore)}45`}}>
                      <span style={{fontSize:11,fontWeight:900,color:'#F2F2F2',lineHeight:1}}>{p.matchScore}</span>
                      <span style={{fontSize:7,fontWeight:800,color:'rgba(255,255,255,0.7)',letterSpacing:0.3}}>FIT</span>
                    </div>

                    {/* Avatar */}
                    <PlayerAvatar name={p.Player} playerId={p._player_id} size={62} style={{borderRadius:999,border:`2px solid ${isSelected?T.accent+'60':'rgba(255,255,255,0.08)'}`}}/>

                    {/* Name + badges */}
                    <div style={{textAlign:'center',minWidth:0,width:'100%'}}>
                      <div style={{fontWeight:800,color:T.text,fontSize:14,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingInline:4}}>{p.Player}</div>
                      <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'center',marginTop:4,flexWrap:'wrap'}}>
                        {p._trajectory&&<span style={{fontSize:9,color:TRJ[p._trajectory]?.c,fontWeight:800}}>{TRJ[p._trajectory]?.i}</span>}
                        {p._injury_risk&&p._injury_risk!=='Low'&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:3,background:IRK[p._injury_risk]?.c+'18',color:IRK[p._injury_risk]?.c,fontWeight:800}}>{p._injury_risk} Risk</span>}
                      </div>
                    </div>

                    {/* Club + position */}
                    <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.dim}}>
                      <ClubLogo club={p.Squad} size={12}/>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{p.Squad}</span>
                      <span>·</span>
                      <span>{p.Age}y</span>
                    </div>

                    {/* Stats row */}
                    <div style={{display:'flex',gap:14,justifyContent:'center',borderTop:`1px solid ${T.border}`,paddingTop:10,width:'100%'}}>
                      {[[+(p.goals||p.Gls||0),'G'],[+(p.Ast||0),'A'],[(+(p.xG||p.npxG||0)).toFixed(1),'xG']].map(([v,l])=>(
                        <div key={l} style={{textAlign:'center'}}>
                          <div style={{fontSize:14,fontWeight:900,color:T.text,lineHeight:1}}>{v}</div>
                          <div style={{fontSize:9,color:T.dim,fontWeight:700,textTransform:'uppercase',marginTop:2}}>{l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Value + shortlist row */}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
                      <span style={{fontSize:11,color:T.dim,fontWeight:600}}>{mv(p)}</span>
                      <button onClick={e=>{e.stopPropagation();onToggleShortlist(p);}} aria-label={starred?`Remove ${p.Player} from shortlist`:`Add ${p.Player} to shortlist`}
                        style={{background:'none',border:'none',cursor:'pointer',color:starred?'#facc15':T.dim,padding:'4px',display:'flex',alignItems:'center'}}
                      ><Star size={15} weight={starred?'fill':'regular'}/></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player drawer (quick scan) — Full Report button opens the inline report ── */}
      <AnimatePresence>
        {sel&&(
          <PlayerDrawer
            player={sel} data={data} req={req}
            shortlist={shortlist} onToggle={onToggleShortlist}
            onClose={()=>setSel(null)}
            onViewFull={()=>{setFullReport(sel);setSel(null);}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PLAYER REPORT ───
function Report({player:p,idx,results,data,req,shortlist,onToggleShortlist,onBack,onShortlist}){
  const pg=req.posGroup!=='ALL'?req.posGroup:'FW';
  const [isMob,setIsMob]=useState(()=>typeof window!=='undefined'&&window.innerWidth<=600);
  useEffect(()=>{const h=()=>setIsMob(window.innerWidth<=600);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);
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
          <PlayerAvatar name={p.Player} playerId={p._player_id} size={108} style={{borderRadius:12}}/>
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
                  <PlayerAvatar name={x.Player} playerId={x._player_id} size={32} style={{borderRadius:4,flexShrink:0}}/>
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
            <PlayerAvatar name={s.name} playerId={simPlayer?._player_id} size={40} style={{borderRadius:6,flexShrink:0}}/>
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
          const topZ=Object.entries(rp.z_scores).filter(([k,v])=>v>0.3).sort((a,b)=>b[1]-a[1]).slice(0,5);
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

// ─── SHORTLIST VIEW ───
function ShortlistView({data,shortlist,onToggle,onSelect,onBack}){
  const players=useMemo(()=>data.current.filter(p=>shortlist.includes(p.Player)),[data,shortlist]);
  return(
    <div style={{maxWidth:920,margin:'0 auto',padding:20,fontFamily:T.font}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <motion.button whileHover={{x:-3}} whileTap={{scale:0.95}} transition={{duration:0.15}} onClick={onBack} style={{background:'none',border:'none',color:T.accent,cursor:'pointer',fontSize:13,padding:0,marginBottom:6,fontFamily:T.font}}>← Back</motion.button>
          <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:0}}>Shortlist</h2>
          <p style={{color:T.dim,fontSize:13,marginTop:2}}>{players.length} saved player{players.length!==1?'s':''}</p>
        </div>
      </div>
      {players.length===0&&<div style={{...C.card,textAlign:'center',padding:40}}>
        <Star size={40} style={{color:T.dim,marginBottom:12}}/>
        <p style={{color:T.dim,fontSize:14}}>No players shortlisted yet. Hit the star on any result card or player report.</p>
      </div>}
      {players.map((p,i)=>(
        <div key={p.Player} style={{display:'flex',alignItems:'center',gap:14,padding:12,marginBottom:4,background:T.card,border:`1px solid ${T.border}`,borderRadius:10}}>
          <PlayerAvatar name={p.Player} playerId={p._player_id} size={48} style={{borderRadius:7,flexShrink:0}}/>
          <div className="scout-card-btn" role="button" tabIndex={0} aria-label={`Open scout report for ${p.Player}`}
            style={{flex:1,minWidth:0,cursor:'pointer',borderRadius:6}} onClick={()=>onSelect(p,i)}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(p,i);}}}>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,color:T.text,fontSize:14}}>{p.Player}</span>
              {p._trajectory&&<span style={{fontSize:11,fontWeight:700,color:TRJ[p._trajectory]?.c}}>{TRJ[p._trajectory]?.i} {p._trajectory}</span>}
              {p._injury_risk&&p._injury_risk!=='Low'&&<span style={{fontSize:11,padding:'1px 6px',borderRadius:4,background:IRK[p._injury_risk]?.c+'20',color:IRK[p._injury_risk]?.c,fontWeight:700}}>{p._injury_risk} Risk</span>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:T.dim,marginTop:2}}><ClubLogo club={p.Squad} size={14}/><span>{p.Squad} · {p.league} · {p._ml_role||p.Pos||p.position} · {p.Age}y</span></div>
          </div>
          <div style={{textAlign:'right',marginRight:8}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>{mv(p)}</div>
            <div style={{fontSize:11,color:T.dim}}>{p.contract_expires||'—'}</div>
          </div>
          <button onClick={()=>onToggle(p)} aria-label={`Remove ${p.Player} from shortlist`} aria-pressed={true} style={{background:'none',border:'none',cursor:'pointer',color:T.yellow,padding:4,display:'inline-flex',alignItems:'center'}}><Star size={20} weight="fill"/></button>
        </div>
      ))}
    </div>
  );
}

// ─── APP ───
export default function App(){
  const navigate=useNavigate();
  const[data,setData]=useState(null);
  const[teamReports,setTeamReports]=useState(null);
  const[view,setView]=useState('upload');
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
    // Extras-only update (shot maps + match logs lazy-loaded after primary)
    if(!d.current){
      if(d.shotMaps||d.matchLogs) setData(prev=>prev?{...prev,shotMaps:{...prev.shotMaps,...(d.shotMaps||{})},matchLogs:{...prev.matchLogs,...(d.matchLogs||{})}}:prev);
      return;
    }
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
      // Wide attackers misclassified as FW: FBref tags many wingers as plain "FW" with no MF
      // component, so the ML model clusters them with strikers. High crossing + take-ons +
      // low aerial duels is a winger signal even when role says "Complete Forward".
      if(posGroup==='FW'){
        const crosses=+(p.crosses_per90||0);
        const takeons=+(p.successful_takeons_per90||0);
        const aerial=+(p.aerial_won_per90||0);
        let wgScore=0;
        wgScore+=crosses>=4.0?3:crosses>=2.5?2:crosses>=1.5?1:0;
        wgScore+=takeons>=2.0?1:0;
        wgScore+=aerial<1.0?1:aerial>=1.8?-1:0;
        const mlSaidCentral=role==='Target Man'||role==='Goal Poacher';
        if(!mlSaidCentral&&wgScore>=3){
          posGroup='WG';
          role=goals>=0.5?'Inverted Winger':'Creative Winger';
        }
      }
      // Wingers misclassified as midfielders: the ML k-means clusters creative wide
      // forwards (Olise, L. Díaz, Grealish) as "Attacking Midfielder". FBref lists them
      // forward-first (Pos starts "FW"), unlike genuine central AMs (De Bruyne, Wirtz)
      // whose Pos starts "MF". The primary position cleanly separates the two.
      if(posGroup==='MF'&&/^FW/.test((p.Pos||'').trim())){
        const takeons=+(p.successful_takeons_per90||0);
        const crosses=+(p.crosses_per90||0);
        const progC=+(p.prog_carries_per90||0);
        // Confirm an attacking wide profile before moving them out of midfield.
        if(takeons>=1.0||crosses>=1.5||progC>=3.0){
          posGroup='WG';
          role=goals>=0.4?'Inverted Winger':'Creative Winger';
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
      // Extract numeric ID from /images/players/ID.png for PlayerAvatar (TM CDN fallback)
      const rawImg=p.img_url||'';
      const tmIdMatch=rawImg.match(/\/images\/players\/(\d+)\.(png|jpg)$/);
      const _player_id=tmIdMatch?tmIdMatch[1]:null;
      // Manual market-value correction for source mis-maps (e.g. namesake collisions)
      const mvOverride=getMarketValueOverride(p.Player);
      return{...p, _player_id, xg_over_raw: xg>0 ? +(goals-xg).toFixed(2) : null,
        ...(mvOverride!==undefined?{market_value_eur:mvOverride}:{}),
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
    api.get('/api/team-reports').then(r=>setTeamReports(r.data?.items?r.data.items.reduce((acc,item)=>{const k=item.Team||item.team;if(k)acc[k]=item;return acc;},{}):(r.data||{}))).catch(()=>{});
    setView('club');
  };

  const handleClubSelect=ctx=>{setClubCtx(ctx);setView('main');};
  const handleClubSkip=()=>{setClubCtx(null);setView('main');};

  const renderView=()=>{
    switch(view){
      case 'upload':    return <Upload onLoad={handleLoad}/>;
      case 'club':      return <ClubSelect teamReports={teamReports} onSelect={handleClubSelect} onSkip={handleClubSkip}/>;
      case 'main':      return data?<MainLayout data={data} clubCtx={clubCtx} teamReports={teamReports} shortlist={shortlist} onToggleShortlist={toggleShortlist} onBackToClubs={()=>setView('club')} onShortlistView={()=>setView('shortlist')}/>:null;
      case 'shortlist': return data?<ShortlistView data={data} shortlist={shortlist} onToggle={toggleShortlist} onSelect={p=>navigate('/scout-report',{state:{player:{name:p.Player,position:p._ml_role||p.Pos||'—',club:p.Squad||'—',nationality:p.citizenship||'—',age:+(p.Age||0),rating:Math.min(10,(+(p.matchScore||50))/10),xg:+(p.xG||p.npxG||0),xa:+(p.xAG||p.xA||0),apps:Math.round(+(p['90s']||0)),goals:+(p.goals||p.Gls||0),assists:+(p.Ast||0),minutesPlayed:+(p.Min||0),recentInjuries:+(p.recent_injuries||0),recentDaysMissed:+(p.recent_days_missed||0),playerId:p._player_id||null}}})} onBack={()=>setView('main')}/>:null;
      default:          return null;
    }
  };
  return(
    <div className="scoutlab-root" role="main" aria-label="Scout Lab player search" style={{background:T.bg,color:T.text,minHeight:'100%'}}>
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{opacity:0,y:14,filter:'blur(3px)'}}
          animate={{opacity:1,y:0,filter:'blur(0px)'}}
          exit={{opacity:0,y:-8,filter:'blur(2px)'}}
          transition={{duration:0.28,ease:EASE}}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}