import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowLeft } from "@phosphor-icons/react";
import PlayerAvatar from "../../../ui/PlayerAvatar";
import ClubLogo from "../../../ui/ClubLogo";
import { POS, IRK, TRJ, T, C } from "../constants";
import { sc, mv, search } from "../engine";
import { Search } from "./SearchPanel";
import { PlayerDrawer } from "./PlayerDrawer";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { Report } from "./Report";

export function MainLayout({data,clubCtx,teamReports,shortlist,onToggleShortlist,onBackToClubs,onShortlistView}){
  const[results,setResults]=useState(null);
  const[req,setReq]=useState(null);
  const[sel,setSel]=useState(null);
  const[fullReport,setFullReport]=useState(null);
  const[selSug,setSelSug]=useState(null);
  const[pickedPos,setPickedPos]=useState(null);
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
    if(s){setPickedPos(s.posGroup||'FW');}
  },[]);

  const handleBackToPos=useCallback(()=>{
    setPickedPos(null);
    setResults(null);
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

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Suggestions only ── */}
        {!pickedPos&&!showResults&&(
          <motion.div key="suggestions"
            initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}
            transition={{type:'spring',stiffness:140,damping:24}}
          >
            <SuggestionsPanel clubCtx={clubCtx} teamReports={teamReports} selSug={selSug} onPickSug={handlePickSug} onBackToClubs={onBackToClubs}/>
          </motion.div>
        )}

        {/* ── STEP 2: Search form (full-width, position chosen) ── */}
        {pickedPos&&!showResults&&(
          <motion.div key="search-form"
            initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:30}}
            transition={{type:'spring',stiffness:140,damping:24}}
          >
            {/* Back arrow */}
            <div style={{padding:'16px 20px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <motion.button
                whileHover={{color:T.text,borderColor:'rgba(255,255,255,0.2)'}}
                whileTap={{scale:0.97}}
                onClick={handleBackToPos}
                style={{display:'inline-flex',alignItems:'center',gap:7,padding:'7px 14px',borderRadius:999,background:'transparent',border:'1px solid rgba(255,255,255,0.08)',color:T.dim,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}
              >
                <ArrowLeft size={13} weight="bold"/>
                Back to positions
              </motion.button>
            </div>

            <div ref={searchRef}>
              <Search
                data={data}
                clubCtx={clubCtx?{...clubCtx,autoWeights:selSug?.weights||{}}:null}
                forceValues={{
                  posGroup:pickedPos,
                  ...(selSug?{priorities:selSug.weights,thresholds:selSug.thresholds||{}}:{}),
                }}
                onSearch={handleSearch}
                sidebar={false}
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
                <button onClick={handleBackToPos} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:999,background:'transparent',border:`1px solid ${T.border}`,color:T.dim,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  Change position
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
                    <PlayerAvatar name={p.Player} src={p._img_url||undefined} playerId={p._player_id} size={62} style={{borderRadius:999,border:`2px solid ${isSelected?T.accent+'60':'rgba(255,255,255,0.08)'}`}}/>

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
