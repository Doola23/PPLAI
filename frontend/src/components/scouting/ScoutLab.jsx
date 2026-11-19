import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";
import { getMarketValueOverride } from "../../utils/marketValueOverrides";
import { getFootOverride } from "../../utils/footOverrides";
import { fetchPrimary } from "./scoutlab/data";
import { EASE, T } from "./scoutlab/constants";
import { calcInjuryRisk, calcTrajectory, calcPotential } from "./scoutlab/engine";
import { Upload } from "./scoutlab/components/Upload";
import { ClubSelect } from "./scoutlab/components/ClubSelect";
import { MainLayout } from "./scoutlab/components/MainLayout";
import { ShortlistView } from "./scoutlab/components/ShortlistView";

export { prewarmScouting } from "./scoutlab/data";

// ─── APP ───
export default function App(){
  const navigate=useNavigate();
  const[data,setData]=useState(null);
  const[teamReports,setTeamReports]=useState(null);
  // Start on 'club' immediately — ClubSelect needs no data, fetch runs in background
  const[view,setView]=useState('club');
  const[dataReady,setDataReady]=useState(false);
  const[clubCtx,setClubCtx]=useState(null);
  const[shortlist,setShortlist]=useState(()=>{try{return JSON.parse(localStorage.getItem('scoutlab_shortlist')||'[]');}catch{return[];}});
  const toggleShortlist=useCallback(player=>{
    setShortlist(prev=>{
      const next=prev.includes(player.Player)?prev.filter(n=>n!==player.Player):[...prev,player.Player];
      localStorage.setItem('scoutlab_shortlist',JSON.stringify(next));
      return next;
    });
  },[]);

  // Kick off background fetch immediately on mount — ClubSelect shows while this loads
  useEffect(()=>{
    fetchPrimary()
      .then(d=>{
        if(!d.current?.length||!d.meta) return;
        handleLoad(d);
      })
      .catch(()=>{});
  },[]);

  const handleLoad=d=>{
    if(!d.current) return;
    const mlRoles=d.ml?.roles||{};
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
        const avgY=(p.shot_count||0)>=3?+p.shot_avg_y:null;
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
        if((p.shot_count||0)>=5){
          const avgY=+p.shot_avg_y;
          lateralSide=avgY<0.48?'R':avgY>0.52?'L':null;
        }
      }
      const _trajectory=calcTrajectory(p, prevByName[key]||null);
      const _posGroup=posGroup;
      const {score:_potential_score,tier:_potential_tier}=calcPotential(p,_posGroup,_trajectory);
      // Build absolute image URL — img_url is a relative backend path like /images/players/ID.png
      const rawImg=p.img_url||'';
      const tmIdMatch=rawImg.match(/\/images\/players\/(\d+)\.(png|jpg)$/);
      const _player_id=tmIdMatch?tmIdMatch[1]:null;
      const _api_base=(import.meta.env.VITE_API_URL||'http://localhost:3001');
      const _img_url=rawImg.startsWith('http')?rawImg:rawImg?`${_api_base}${rawImg}`:null;
      // Manual market-value correction for source mis-maps (e.g. namesake collisions)
      const mvOverride=getMarketValueOverride(p.Player);
      const footOverride=getFootOverride(p.Player);
      return{...p, _player_id, _img_url, xg_over_raw: xg>0 ? +(goals-xg).toFixed(2) : null,
        ...(mvOverride!==undefined?{market_value_eur:mvOverride}:{}),
        ...(footOverride?{foot:footOverride}:{}),
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
    setDataReady(true);
    api.get('/api/team-reports').then(r=>setTeamReports(r.data?.items?r.data.items.reduce((acc,item)=>{const k=item.Team||item.team;if(k)acc[k]=item;return acc;},{}):(r.data||{}))).catch(()=>{});
  };

  const handleClubSelect=ctx=>{
    setClubCtx(ctx);
    if(dataReady){ setView('main'); return; }
    // Data still loading — show upload spinner until ready, then auto-advance
    setView('upload');
    fetchPrimary().then(()=>{ setView('main'); }).catch(()=>{});
  };
  const handleClubSkip=()=>{
    setClubCtx(null);
    if(dataReady){ setView('main'); return; }
    setView('upload');
    fetchPrimary().then(()=>{ setView('main'); }).catch(()=>{});
  };

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
