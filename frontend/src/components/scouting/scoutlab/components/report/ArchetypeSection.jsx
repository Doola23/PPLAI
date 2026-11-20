import { Brain } from "@phosphor-icons/react";
import { T } from "../../constants";
import { Sec } from "../Section";

export function ArchetypeSection({ mlRole, data }) {
  return (
    <>
      {/* ML Role Classification */}
      {mlRole&&<Sec icon={Brain} title="Player Archetype" tag="K-Means Clustering"><div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
          <div style={{padding:'8px 16px',borderRadius:8,background:T.accent+'15',border:`1px solid ${T.accent}30`}}>
            <div style={{fontSize:16,fontWeight:800,color:T.accent}}>{mlRole.role}</div>
          </div>
          <div style={{fontSize:12,color:T.dim}}>
            Automatically classified by ML based on statistical profile.
            <br/>Cluster determined by k-means analysis of 13 per-90 metrics across {data.ml?.modelInfo?.total_players_clustered||'1700'} players.
          </div>
        </div>
        {data.ml?.roleProfiles?.[String(mlRole.cluster)]&&(()=>{
          const rp=data.ml.roleProfiles[String(mlRole.cluster)];
          const topZ=Object.entries(rp.z_scores).filter(([,v])=>v>0.3).sort((a,b)=>b[1]-a[1]).slice(0,5);
          return topZ.length>0?(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.dim,marginBottom:6}}>DEFINING CHARACTERISTICS OF THIS ROLE:</div>
              {topZ.map(([k,v])=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{width:130,fontSize:11,color:T.dim}}>{k.replace(/_per90/g,'').replace(/_/g,' ')}</span>
                  <div style={{flex:1,height:5,borderRadius:3,background:T.border,overflow:'hidden'}}>
                    <div style={{width:`${Math.min(100,50+v*20)}%`,height:'100%',borderRadius:3,background:v>1?T.green:T.accent}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:v>1?T.green:T.accent,fontFamily:T.mono}}>{v>0?'+':''}{v.toFixed(2)}σ</span>
                </div>
              ))}
              <p style={{fontSize:11,color:T.dim,marginTop:6}}>Cluster size: {rp.size} players with similar profiles</p>
            </div>
          ):null;
        })()}
      </div></Sec>}
    </>
  );
}
