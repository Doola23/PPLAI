import { UsersThree } from "@phosphor-icons/react";
import PlayerAvatar from "../../../../ui/PlayerAvatar";
import ClubLogo from "../../../../ui/ClubLogo";
import { T } from "../../constants";
import { Sec } from "../Section";

export function SimilarPlayersSection({ mlSim, data }) {
  return (
    <>
      {/* ML Similar Players */}
      {mlSim.length>0&&<Sec icon={UsersThree} title="ML Player Similarity" tag="Cosine Similarity"><div>
        <p style={{fontSize:11,color:T.dim,marginTop:-6,marginBottom:10}}>Players with the most similar statistical profiles across all per-90 metrics (machine learning cosine similarity)</p>
        {mlSim.slice(0,8).map((s,i)=>{
          // Find player in data to get their image
          const simPlayer = data.current?.find(p=>(p.Player||'').toLowerCase().trim()===s.name.toLowerCase().trim());
          return(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,padding:'6px 8px',borderRadius:6,background:i<3?T.accent+'08':'transparent'}}>
            <span style={{fontSize:11,fontWeight:800,color:T.dim,width:18,fontFamily:T.mono}}>#{i+1}</span>
            {/* Mini photo */}
            <PlayerAvatar name={s.name} src={simPlayer?._img_url||undefined} playerId={simPlayer?._player_id} size={40} style={{borderRadius:6,flexShrink:0}}/>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:600,color:T.text}}>{s.name}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:T.dim,marginLeft:8,verticalAlign:'middle'}}><ClubLogo club={s.team} size={13}/>{s.team} · {s.league}</span>
              {s.role&&<span style={{fontSize:11,marginLeft:6,padding:'1px 5px',borderRadius:3,background:T.accent+'20',color:T.accent}}>{s.role}</span>}
            </div>
            <div style={{width:90,height:6,borderRadius:3,background:T.border,overflow:'hidden'}}>
              <div style={{width:`${s.similarity*100}%`,height:'100%',borderRadius:3,background:s.similarity>0.95?T.green:s.similarity>0.9?T.accent:T.yellow}}/>
            </div>
            <span style={{fontSize:12,fontWeight:700,color:s.similarity>0.95?T.green:s.similarity>0.9?T.accent:T.yellow,fontFamily:T.mono,width:45,textAlign:'right'}}>{(s.similarity*100).toFixed(1)}%</span>
          </div>
          );
        })}
      </div></Sec>}
    </>
  );
}
