import type { CSSProperties } from "react";
import { SoccerBall, Sparkle, Wind, PaperPlaneTilt, ShieldChevron, Barbell, HandPalm, type Icon } from "@phosphor-icons/react";
import type { Attr, AttrCategory, InjuryRisk, PosFilter, PosGroup, PotentialTier, Priority, ScoutPlayer, Trajectory } from "./types";

// Phosphor icon for each attribute category (replaces former emoji)
export const CAT_ICON: Record<string, Icon> = {
  "Attacking": SoccerBall,
  "Creativity & Chance Creation": Sparkle,
  "Ball Carrying & Pace": Wind,
  "Passing & Distribution": PaperPlaneTilt,
  "Defending & Pressing": ShieldChevron,
  "Physical & Athletic": Barbell,
  "Goalkeeping": HandPalm,
};

export const EASE = [0.16, 1, 0.3, 1] as const;

/* ═══════════════════════════════════════════════════════════
   SCOUTLAB — Professional Football Scouting Platform
   ═══════════════════════════════════════════════════════════ */

// ─── POSITION GROUPS ───
const str = (v: unknown): string => (v ? String(v) : '');

export const POS: Record<PosGroup, { label: string; sub: string; fn: (p: ScoutPlayer) => boolean }> = {
  FW: { label: "Forward", sub: "ST · SS · CF", fn: p => {
    // 1. WhoScored position is most reliable tiebreaker
    if(p.ws_position) return p.ws_position === 'FW';
    // 2. FBref strict forward — but only if Understat agrees (not a winger)
    if(p.Pos === 'FW'){
      // Check Understat — if has M it's a winger not a striker
      const u = str(p.position);
      if(/F/.test(u) && /M/.test(u)) return false; // Understat says winger
      return true;
    }
    // 3. Understat forward only (no midfielder component)
    if(/^F/.test(str(p.position)) && !/M/.test(str(p.position))) return true;
    // 4. TM attack but not a midfielder
    if(str(p.main_position).toLowerCase() === 'attack' && p.Pos !== 'MF' && !/M/.test(str(p.position).replace(/S/g,''))) return true;
    return false;
  }},
  WG: { label: "Winger", sub: "LW · RW · IF", fn: p => {
    if(p.ws_position) return p.ws_position === 'WG';
    const pos = p.Pos || '';
    const u = str(p.position);
    if(pos==='MF,FW' || pos==='FW,MF') return true;
    if(/F/.test(u) && /M/.test(u)) return true; // Understat hybrid = winger
    if(str(p.main_position).toLowerCase()==='attack' && pos==='MF') return true;
    return false;
  }},
  MF: { label: "Midfielder", sub: "CM · DM · AM", fn: p => {
    if(p.ws_position) return p.ws_position === 'MF';
    const pos = p.Pos || '';
    const u = str(p.position);
    if(pos==='MF' || pos==='MF,DF' || pos==='DF,MF') return true;
    if(/M/.test(u) && !/F/.test(u) && !/D/.test(u)) return true;
    if(str(p.main_position).toLowerCase()==='midfield' && !pos) return true;
    return false;
  }},
  DF: { label: "Defender", sub: "CB · FB · WB", fn: p => {
    if(p.ws_position) return p.ws_position === 'DF';
    const pos = p.Pos || '';
    const u = str(p.position);
    if(pos==='DF') return true;
    if(/D/.test(u) && !/F/.test(u) && !/M/.test(u)) return true;
    if(str(p.main_position).toLowerCase()==='defender' && !pos) return true;
    return false;
  }},
  GK: { label: "Goalkeeper", sub: "GK", fn: p => {
    if(p.ws_position) return p.ws_position === 'GK';
    return (p.Pos||'')==='GK' || str(p.main_position).toLowerCase()==='goalkeeper';
  }},
};

// ─── ATTRIBUTES ───
export const ATTR_CATS: AttrCategory[] = [
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

export const ALL_A: Attr[] = ATTR_CATS.flatMap(g=>g.attrs);

// Per-threshold input config: {min, max, step} matched to real football data ranges
export function thresholdCfg(key?: string): { min: number; max?: number; step: number; placeholder?: string } {
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

export const PRI: Record<Priority, number> = {required:4,high:3,medium:2,low:1,none:0};

export const PRI_C: Record<Priority, string> = {required:"#1A65D3",high:"#3B82F6",medium:"#2B4C5E",low:"#4B5563",none:"transparent"};

export const PRI_LABELS: Record<Priority, string> = {required:"Required",high:"High",medium:"Med",low:"Low",none:"Off"};

export const BUDGET: { l: string; v: number | '' }[] = [
  {l:"Any",v:""},{l:"€100K",v:1e5},{l:"€500K",v:5e5},{l:"€1M",v:1e6},
  ...[5,10,15,20,25,30,35,40,50,60,70,80,100,120,150,200].map(n=>({l:`€${n}M`,v:n*1e6}))
];

// ─── SCOUT TEMPLATES ─── (preset priority sets; not yet wired into the search UI)
export const SCOUT_TEMPLATES: Record<string, Record<string, Priority>> = {
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

export const POS_PRESETS: Record<PosFilter, Record<string, Priority>> = {
  FW:{goals:"high",shots:"high",xg_over:"medium",assists:"low",aerial:"medium",pressing:"medium"},
  WG:{goals:"medium",shots:"medium",assists:"high",key_passes:"high",prog_carry:"high",takeons:"high",cross:"medium"},
  MF:{assists:"medium",key_passes:"high",sca:"medium",pass_pct:"high",prog_pass:"high",tackles:"medium",interceptions:"medium",pressing:"medium",buildup:"medium"},
  DF:{tackles:"high",interceptions:"high",blocks:"high",aerial:"high",pass_pct:"medium",pressing:"medium"},
  GK:{gk_saves:"required",gk_cs:"high",gk_ga90:"high",gk_dist:"medium",gk_sweeper:"medium"},
  ALL:{}
};

export const IRK: Record<InjuryRisk, { c: string }> = {High:{c:'#1A65D3'},Medium:{c:'#6E7E8A'},Low:{c:'#939A9E'}};

export const TRJ: Record<Trajectory, { c: string; i: string }> = {Improving:{c:'#1A65D3',i:'↑'},Stable:{c:'#939A9E',i:'→'},Declining:{c:'#2B4C5E',i:'↓'}};

export const PTL: Record<PotentialTier, { c: string }> = {'Elite Prospect':{c:'#1A65D3'},'High Potential':{c:'#2B4C5E'},'Developing':{c:'#939A9E'}};

// ─── CLUB META ───
export const CLUB_META: Record<string, { color: string; formation: string; style: string }> = {
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
export const T = {
  bg:"#000000",card:"rgba(26,101,211,0.38)",card2:"rgba(26,101,211,0.52)",border:"rgba(255,255,255,0.08)",
  text:"#F2F2F2",dim:"#939A9E",accent:"#1A65D3",accent2:"#2B4C5E",
  green:"#1A65D3",yellow:"#939A9E",orange:"#939A9E",red:"#2B4C5E",
  font:"inherit",mono:"inherit",
};

export const C: {
  card: CSSProperties;
  label: CSSProperties;
  input: CSSProperties;
  btn: (active: boolean, color?: string) => CSSProperties;
  tag: (color?: string) => CSSProperties;
} = {
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

// Single attribute category — collapsible to tame the priorities wall
// Segmented priority control — replaces 5 scattered buttons
export const PRI_SEG: { k: Priority; label: string; short: string }[] = [
  {k:'none',   label:'Off',  short:'—'},
  {k:'low',    label:'Low',  short:'L'},
  {k:'medium', label:'Med',  short:'M'},
  {k:'high',   label:'High', short:'H'},
  {k:'required',label:'Must',short:'!'},
];

export const PRI_SEG_C: Record<Priority, string> = {required:'#1A65D3',high:'#3B82F6',medium:'#2B4C5E',low:'#374151',none:'transparent'};

export const PRI_SEG_TEXT: Record<Priority, string> = {required:'#F2F2F2',high:'#F2F2F2',medium:'#93C5FD',low:'#9CA3AF',none:'#6B7280'};

// ─── MAIN LAYOUT ───
// Two-column layout: left sidebar (filters) + right panel (suggestions or compact results)
// Replaces the old sequential clubreport → search → results → report views
export const POS_CARDS: { k: PosGroup; label: string; sub: string }[] = [
  {k:'FW',label:'Forward',sub:'Striker · False 9 · Complete Forward'},
  {k:'WG',label:'Winger',sub:'Inverted · Creative · Wide Forward'},
  {k:'MF',label:'Midfielder',sub:'Box-to-Box · DM · AM · Playmaker'},
  {k:'DF',label:'Defender',sub:'Centre-Back · Full-Back · Wing-Back'},
  {k:'GK',label:'Goalkeeper',sub:'Shot-Stopper · Sweeper-Keeper'},
];
