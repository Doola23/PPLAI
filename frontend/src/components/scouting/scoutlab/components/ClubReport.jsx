import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { TrendUp, TrendDown, MagnifyingGlass, CheckCircle } from "@phosphor-icons/react";
import ClubLogo from "../../../ui/ClubLogo";
import { POS, T, C } from "../constants";
import { computeLeagueCtx, getSuggestions } from "../clubContext";
import { Search } from "./SearchPanel";

// ─── CLUB REPORT ───
export function ClubReport({clubCtx,data,teamReports,onSearch,onBack}){
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
