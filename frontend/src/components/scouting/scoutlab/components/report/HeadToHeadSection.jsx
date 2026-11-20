import { useState, useMemo } from "react";
import { GitDiff } from "@phosphor-icons/react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import PlayerAvatar from "../../../../ui/PlayerAvatar";
import ClubLogo from "../../../../ui/ClubLogo";
import { ALL_A, T, C } from "../../constants";
import { mv, getProfile } from "../../engine";
import { Sec } from "../Section";

export function HeadToHeadSection({ p, data, pg, prof }) {
  // Standalone player comparison
  const[compareQ,setCompareQ]=useState('');
  const[compareP,setCompareP]=useState(null);
  const compareMatches=useMemo(()=>{
    const q=compareQ.trim().toLowerCase();
    if(q.length<2)return[];
    return data.current.filter(x=>x.Player&&x.Player.toLowerCase().includes(q)&&x.Player!==p.Player).slice(0,8);
  },[compareQ,data,p]);
  const comparePProf=useMemo(()=>{if(!compareP)return[];return getProfile(compareP,data.current,pg);},[compareP,data,pg]);
  const compareRadarData=useMemo(()=>{
    const cats=['goals','assists','shots','key_passes','tackles','interceptions','aerial','pressing'];
    return cats.map(k=>{
      const a=prof.find(x=>x.k===k);
      const b=comparePProf.find(x=>x.k===k);
      return{attr:ALL_A.find(x=>x.k===k)?.l?.split('/')[0]||k,me:a?.percentile||0,them:b?.percentile||0};
    }).filter(d=>d.me>0||d.them>0);
  },[prof,comparePProf]);

  return (
    <>
      {/* Head-to-Head Comparison */}
      <Sec icon={GitDiff} title="Head-to-Head Comparison" tag="Any player"><div>
        <div style={{position:'relative',marginBottom:compareP?12:0}}>
          <div style={{display:'flex',gap:8}}>
            <input
              aria-label={`Compare ${p.Player} against another player`}
              value={compareQ}
              onChange={e=>{setCompareQ(e.target.value);if(!e.target.value)setCompareP(null);}}
              placeholder={`Compare ${p.Player} against any player...`}
              style={{...C.input,flex:1}}
            />
            {compareP&&<button onClick={()=>{setCompareP(null);setCompareQ('');}} style={{...C.btn(false,'#1A65D3'),padding:'8px 12px',fontSize:11,border:`1px solid ${T.border}`}}>✕ Clear</button>}
          </div>
          {/* Dropdown — in normal flow so it extends the card and pushes content
              below down (no overlay, no see-through over other sections) */}
          {compareMatches.length>0&&!compareP&&(
            <div style={{marginTop:6,background:'rgba(0,0,0,0.25)',border:`1px solid ${T.border}`,borderRadius:10,overflow:'hidden'}}>
              {compareMatches.map((x,i)=>(
                <div key={i} onClick={()=>{setCompareP(x);setCompareQ(x.Player);}}
                  style={{padding:'8px 12px',cursor:'pointer',borderBottom:i<compareMatches.length-1?`1px solid ${T.border}`:'none',display:'flex',alignItems:'center',gap:10}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.accent+'15'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <PlayerAvatar name={x.Player} src={x._img_url||undefined} playerId={x._player_id} size={32} style={{borderRadius:4,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.text}}>{x.Player}</div>
                    <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.dim}}><ClubLogo club={x.Squad} size={13}/><span>{x.Squad} · {x.league} · {x.Pos||x.position} · {x.Age}y</span></div>
                  </div>
                  <span style={{marginLeft:'auto',fontSize:12,fontWeight:700,color:T.dim,fontFamily:T.mono}}>{mv(x)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Comparison display */}
        {compareP&&(()=>{
          const metrics=[
            {l:'Age',f:x=>x.Age},{l:'Value',f:x=>mv(x)},{l:'Match Score',f:x=>`${x.matchScore||'—'}/100`},
            {l:'Goals',f:x=>+(x.goals||x.Gls||0)},{l:'Assists',f:x=>+(x.assists||x.Ast||0)},
            {l:'G/90',f:x=>(+(x.goals_per90||0)).toFixed(2)},{l:'xG/90',f:x=>(+(x.xG_per90||x.npxg_per90||0)).toFixed(2)},
            {l:'xA/90',f:x=>(+(x.xA_per90||x.xag_per90||0)).toFixed(2)},
            {l:'Shots/90',f:x=>(+(x.shots_per90||0)).toFixed(2)},{l:'KP/90',f:x=>(+(x.key_passes_per90||0)).toFixed(2)},
            {l:'Tkl/90',f:x=>(+(x.tackles_per90||x.tackles_won_per90||0)).toFixed(2)},{l:'Int/90',f:x=>(+(x.interceptions_per90||0)).toFixed(2)},
            {l:'Pass%',f:x=>x.pass_success_pct?`${x.pass_success_pct}%`:'—'},{l:'Contract',f:x=>x.contract_expires||'—'},
          ];
          return(
            <div>
              {/* Overlay Radar */}
              {compareRadarData.length>=3&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,color:T.dim,marginBottom:8,display:'flex',gap:16}}>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:T.accent,opacity:0.8}}/>{p.Player}</span>
                    <span style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,borderRadius:2,background:T.accent2,opacity:0.8}}/>{compareP.Player}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={compareRadarData}>
                      <PolarGrid stroke={T.border}/>
                      <PolarAngleAxis dataKey="attr" tick={{fill:T.dim,fontSize:11}}/>
                      <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                      <Radar dataKey="me" name={p.Player} stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2}/>
                      <Radar dataKey="them" name={compareP.Player} stroke={T.accent2} fill={T.accent2} fillOpacity={0.2} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Stats table */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.dim,fontSize:11}}></th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:T.accent,fontWeight:800}}>{p.Player}<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:11,color:T.dim,fontWeight:400}}><ClubLogo club={p.Squad} size={13}/>{p.Squad}</div></th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:T.accent2,fontWeight:800}}>{compareP.Player}<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontSize:11,color:T.dim,fontWeight:400}}><ClubLogo club={compareP.Squad} size={13}/>{compareP.Squad}</div></th>
                  </tr></thead>
                  <tbody>{metrics.map(r=>{
                    const pv=r.f(p),cv=r.f(compareP);
                    const pn=parseFloat(pv),cn=parseFloat(cv);
                    const pBetter=!isNaN(pn)&&!isNaN(cn)&&r.l!=='Age'&&r.l!=='Value'&&r.l!=='Contract'&&pn>cn;
                    const cBetter=!isNaN(pn)&&!isNaN(cn)&&r.l!=='Age'&&r.l!=='Value'&&r.l!=='Contract'&&cn>pn;
                    return(
                      <tr key={r.l} style={{borderBottom:`1px solid ${T.border}20`}}>
                        <td style={{padding:'4px 8px',color:T.dim,fontWeight:600,fontSize:11}}>{r.l}</td>
                        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:pBetter?800:400,color:pBetter?T.green:T.text,fontFamily:T.mono}}>{pv}</td>
                        <td style={{padding:'4px 8px',textAlign:'center',fontWeight:cBetter?800:400,color:cBetter?T.green:T.dim,fontFamily:T.mono}}>{cv}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {/* Contract note */}
              <p style={{fontSize:11,color:T.dim,marginTop:8,marginBottom:0}}>
                Contract dates shown are from Transfermarkt and reflect the permanent contract. For loaned players, verify directly — loan end dates may differ.
              </p>
            </div>
          );
        })()}
        {!compareP&&!compareQ&&<p style={{fontSize:12,color:T.dim,margin:'12px 0 0'}}>Type any player name above to compare head-to-head with overlaid radar and full stats table.</p>}
      </div></Sec>
    </>
  );
}
