import { Heartbeat } from "@phosphor-icons/react";
import { T } from "../../constants";
import { Sec } from "../Section";

export function InjurySection({ p }) {
  return (
    <>
      {/* Injury History */}
      {(()=>{
        const totalInj=+(p.total_injuries||0);
        const totalDays=+(p.total_days_missed||0);
        const recentInj=+(p.recent_injuries||0);
        const recentDays=+(p.recent_days_missed||0);
        const hasInjData=totalInj>0||totalDays>0;
        if(!hasInjData) return null;
        return(
          <Sec icon={Heartbeat} title="Injury History">
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[
                ['Career Injuries',totalInj,totalInj>=10?'#1A65D3':totalInj>=5?'#6E7E8A':T.text],
                ['Career Days Missed',totalDays,totalDays>=200?'#1A65D3':totalDays>=90?'#6E7E8A':T.text],
                ['Recent Injuries (2yr)',recentInj,recentInj>=4?'#1A65D3':recentInj>=2?'#6E7E8A':T.text],
                ['Recent Days Missed',recentDays,recentDays>=90?'#1A65D3':recentDays>=30?'#6E7E8A':T.text],
              ].map(([l,v,c])=>(
                <div key={l} style={{flex:1,minWidth:100,padding:'8px 10px',background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,color:T.dim,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:T.mono}}>{v}</div>
                </div>
              ))}
            </div>
          </Sec>
        );
      })()}
    </>
  );
}
