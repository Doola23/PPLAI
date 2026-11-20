import { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Star, FileText } from "@phosphor-icons/react";
import PlayerAvatar from "../../../ui/PlayerAvatar";
import ClubLogo from "../../../ui/ClubLogo";
import { EASE, IRK, TRJ, PTL, T, C } from "../constants";
import { rc, sc, mv, getProfile } from "../engine";

// ─── PLAYER DRAWER ───
// Slides in from right — compact summary, Full Report button navigates to /scout-report
export function PlayerDrawer({player:p,data,req,shortlist,onToggle,onClose,onViewFull}){
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
            <PlayerAvatar name={p.Player} src={p._img_url||undefined} playerId={p._player_id} size={76} style={{borderRadius:12}}/>
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
