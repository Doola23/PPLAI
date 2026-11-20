import { T } from "./constants";
import type { PosGroup, Priority } from "./types";

export interface TeamReport {
  gfPerGame?: number;
  gaPerGame?: number;
  cleanSheets?: number;
  errors?: number;
  w?: number;
  d?: number;
  l?: number;
  gf?: number;
  topScorer?: string;
  topAssister?: string;
  gk?: string;
  recruitmentPriorities?: { position: string; reason: string }[];
}

export interface LeagueCtx {
  n: number;
  avgGF: number;
  avgGA: number;
  avgCS: number;
  avgErr: number;
  gfRank: (v: number) => number;
  gaRank: (v: number) => number;
  csRank: (v: number) => number;
  errRank: (v: number) => number;
}

export interface Suggestion {
  role: string;
  posGroup: PosGroup;
  icon: string;
  color: string;
  attrs: { k: string; l: string; p: Priority }[];
  weights: Record<string, Priority>;
  thresholds?: Record<string, number>;
  because: string;
}

// ─── LEAGUE CONTEXT ───
export const ordinal = (n: number): string => ['1st', '2nd', '3rd'][n - 1] || `${n}th`;

export function computeLeagueCtx(teamReports: Record<string, TeamReport> | null | undefined): LeagueCtx | null {
  const reps=Object.values(teamReports||{});
  if(!reps.length)return null;
  const avg=(arr: number[])=>arr.reduce((a,b)=>a+b,0)/arr.length;
  const gfA=reps.map(r=>r.gfPerGame||0);
  const gaA=reps.map(r=>r.gaPerGame||0);
  const csA=reps.map(r=>r.cleanSheets||0);
  const eA=reps.map(r=>r.errors||0);
  // rank: 1 = best. rD → higher val better. rA → lower val better.
  const rD=(v: number,a: number[])=>[...a].sort((x,y)=>y-x).findIndex(x=>x<=v)+1;
  const rA=(v: number,a: number[])=>[...a].sort((x,y)=>x-y).findIndex(x=>x>=v)+1;
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
export function getSuggestions(rep: TeamReport | null | undefined, team: string, ctx: LeagueCtx | null): Suggestion[] {
  if(!rep)return[];
  const{n=20,avgGF=1.47,avgGA=1.47,avgCS=8.9,avgErr=25.3,gfRank,gaRank,csRank,errRank}: Partial<LeagueCtx>=ctx||{};
  const{gaPerGame=0,gfPerGame=0,cleanSheets=0,errors=0,w=0,d=0,l=0,gf=0,topScorer='',topAssister='',gk=''}=rep;
  const total=w+d+l||1;
  const pts=3*w+d;

  // Parse top scorer/assister names, goal and assist counts
  const sGoals=parseInt((topScorer.match(/\((\d+)g\)/)||['','0'])[1])||0;
  const sName=topScorer.replace(/\s*\(\d+g\)$/,'').trim();
  const sShare=gf>0?sGoals/gf:0;
  const aGoals=parseInt((topAssister.match(/\((\d+)a\)/)||['','0'])[1])||0;
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
  const sc: Record<string, number>={
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
  const build=(key: string): Suggestion | null=>{
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
  const pgCount: Partial<Record<PosGroup, number>>={};
  const sugs: Suggestion[]=[];
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
  const PRIO_PG: Record<string, PosGroup>={'Centre-Forward':'FW','Clinical Striker':'FW','Forward / Winger':'WG',
    'Attacking Forward / Winger':'WG','Goalkeeper':'GK','Creative Midfielder':'MF',
    'Midfielder':'MF','Centre-Back':'DF','Aerial Centre-Back':'DF','Defender':'DF',
    'Left Back':'DF','Right Back':'DF','Full-Back':'DF'};
  const PRIO_ICON: Record<PosGroup, string>={FW:'',WG:'',GK:'',MF:'',DF:''};
  const PRIO_COLOR: Record<PosGroup, string>={FW:'#1A65D3',WG:'#2B4C5E',GK:'#939A9E',MF:'#4F82D6',DF:'#6E7E8A'};
  const PRIO_ATTRS: Record<PosGroup, Suggestion['attrs']>={
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
