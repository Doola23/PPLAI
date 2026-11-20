import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Star } from "@phosphor-icons/react";
import PlayerAvatar from "../../../ui/PlayerAvatar";
import ClubLogo from "../../../ui/ClubLogo";
import { POS, IRK, TRJ, PTL, T, C } from "../constants";
import { sc, mv } from "../engine";

// ─── RESULTS ───
export function Results({results,req,shortlist,onToggleShortlist,onSelect,onBack,onShortlist}){
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
            <PlayerAvatar name={p.Player} src={p._img_url||undefined} playerId={p._player_id} size={52} style={{borderRadius:8}}/>
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
