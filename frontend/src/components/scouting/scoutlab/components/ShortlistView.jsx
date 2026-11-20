import { useMemo } from "react";
import { motion } from "framer-motion";
import { Star } from "@phosphor-icons/react";
import PlayerAvatar from "../../../ui/PlayerAvatar";
import ClubLogo from "../../../ui/ClubLogo";
import { mv } from "../engine";
import { IRK, TRJ, T, C } from "../constants";

// ─── SHORTLIST VIEW ───
export function ShortlistView({data,shortlist,onToggle,onSelect,onBack}){
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
          <PlayerAvatar name={p.Player} src={p._img_url||undefined} playerId={p._player_id} size={48} style={{borderRadius:7,flexShrink:0}}/>
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
