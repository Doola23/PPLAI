import { POS, ALL_A, PRI } from "./constants";

// ─── UTILS ───
export const gv = (p,cols,fn) => { if(fn){const r=fn(p);if(r!==null&&!isNaN(r))return r;} for(const c of cols){const v=p[c];if(v!==undefined&&v!==null&&v!==''&&!isNaN(v))return+v;} return null; };

export const pct = (v,arr) => { const s=arr.filter(x=>x!==null&&!isNaN(x)).sort((a,b)=>a-b); if(!s.length)return 50; const i=s.findIndex(x=>x>=v); return i<0?100:Math.round(i/s.length*100); };

export const rl = p => p>=95?"World Class":p>=90?"Elite":p>=75?"Very Good":p>=50?"Good":p>=25?"Average":"Below Avg";

// Brand-only sequential ramp (high → low): Celtic Blue → Dark Slate → Spanish Gray
export const rc = p => p>=66?"#1A65D3":p>=33?"#2B4C5E":"#5B6166";

export const sc = s => s>=80?"#1A65D3":s>=65?"#2B4C5E":"#5B6166";

export const mv = p => { const v=+(p.market_value_eur||0); return v>0?`€${v>=1e6?(v/1e6).toFixed(0)+'M':(v/1e3).toFixed(0)+'K'}`:"N/A"; };

export const hasC = (d,cols) => d?.length>0&&cols.some(c=>d[0][c]!==undefined&&d[0][c]!==null&&d[0][c]!=='');

// ─── INJURY RISK ───
export function calcInjuryRisk(p){
  const ri=+(p.recent_injuries||0),rd=+(p.recent_days_missed||0),ti=+(p.total_injuries||0);
  let s=0;
  s+=ri>=4?4:ri>=3?3:ri>=2?2:ri>=1?1:0;
  s+=rd>=90?3:rd>=45?2:rd>=14?1:0;
  s+=ti>=10?2:ti>=6?1:0;
  return s>=6?'High':s>=3?'Medium':'Low';
}

// ─── TRAJECTORY ───
export function calcTrajectory(cur,prev){
  if(!prev)return null;
  const ms=['goals_per90','assists_per90','npxg_per90','xag_per90','shots_per90','key_passes_per90','tackles_per90','interceptions_per90'];
  const ch=[];
  for(const m of ms){const c=+(cur[m]||0),pv=+(prev[m]||0);if(!c&&!pv)continue;ch.push((c-pv)/(Math.abs(pv)+0.01));}
  if(ch.length<3)return null;
  const avg=ch.reduce((a,b)=>a+b,0)/ch.length;
  return avg>0.12?'Improving':avg<-0.12?'Declining':'Stable';
}

// ─── POTENTIAL ───
export function calcPotential(p, pg, trajectory){
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

// ─── SCORING ───
export function score(player, req, all, refProf) {
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

export function findSim(name,data){if(!name?.trim())return null;const n=name.trim().toLowerCase();return data.find(p=>(p.Player||'').toLowerCase().includes(n))||null;}

export function simProf(ref,all){const p={};for(const a of ALL_A){const rv=gv(ref,a.c,a.custom);if(rv===null)continue;const vals=all.map(x=>gv(x,a.c,a.custom)).filter(v=>v!==null);const m=vals.reduce((a,b)=>a+b,0)/vals.length;const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-m)**2,0)/vals.length);p[a.k]=sd>0?(rv-m)/sd:0;}return p;}

export function search(data,req){
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
  // Strict: when a foot is chosen, require a known matching foot. (Players with missing
  // foot data are excluded rather than let through, so e.g. a "Left" search can't surface
  // right-footed players whose foot field is blank.)
  if(foot&&foot!=='Any')f=f.filter(p=>p.foot&&(p.foot+'').toLowerCase().includes(foot.toLowerCase()));
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

export function getProfile(player,data,pg){
  const isGK=pg==='GK';
  const attrs=ALL_A.filter(a=>isGK?a.k.startsWith('gk_'):!a.k.startsWith('gk_'));
  const pp=pg&&pg!=='ALL'?data.filter(p=>POS[pg]?.fn(p)):data;
  return attrs.map(a=>{const v=gv(player,a.c,a.custom);if(v===null)return null;const vals=pp.map(p=>gv(p,a.c,a.custom)).filter(x=>x!==null);const p=pct(v,vals);return{...a,value:v,percentile:p,rating:rl(p)};}).filter(Boolean).sort((a,b)=>b.percentile-a.percentile);
}
