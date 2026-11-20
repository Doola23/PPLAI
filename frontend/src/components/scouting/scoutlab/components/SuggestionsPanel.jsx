import { useState, useMemo, useEffect } from "react";
import { TrendUp, TrendDown, CaretDown, MagnifyingGlass, CaretRight, CheckCircle } from "@phosphor-icons/react";
import ClubLogo from "../../../ui/ClubLogo";
import { POS, T } from "../constants";
import { computeLeagueCtx, getSuggestions } from "../clubContext";

// ─── SUGGESTIONS PANEL ───
// Right panel content before search runs — club recruitment priorities
export function SuggestionsPanel({clubCtx,teamReports,selSug,onPickSug,onBackToClubs}){
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
  const[reportOpen,setReportOpen]=useState(false);
  useEffect(()=>{setOpenReportItem(null);setReportOpen(false);},[clubCtx?.team]);

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
          <button onClick={()=>setReportOpen(o=>!o)} aria-expanded={reportOpen} style={{display:'flex',alignItems:'center',gap:6,width:'100%',background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:reportOpen?10:0,fontFamily:'inherit'}}>
            <span style={{fontSize:11,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,flex:1,textAlign:'left'}}>Team Report</span>
            <CaretDown size={12} weight="bold" color={T.dim} style={{transform:reportOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}} aria-hidden="true"/>
          </button>
          {reportOpen&&<div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
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
          </div>}
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
