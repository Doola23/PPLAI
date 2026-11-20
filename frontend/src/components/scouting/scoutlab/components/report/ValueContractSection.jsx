import { Scales } from "@phosphor-icons/react";
import { T } from "../../constants";
import { mv } from "../../engine";
import { Sec } from "../Section";

export function ValueContractSection({ p, vmv, goals }) {
  return (
    <>
      {/* Value & Contract */}
      <Sec icon={Scales} title="Value & Contract Analysis"><div>
        {/* Key metrics */}
        <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
          {[
            ['Market Value', mv(p)],
            ['Goals/€M', vmv>0?(goals/(vmv/1e6)).toFixed(2):'—'],
            ['Score/€M', vmv>0?(p.matchScore/(vmv/1e6)).toFixed(1):'—'],
          ].map(([l,v])=>(
            <div key={l}><div style={{fontSize:11,color:T.dim}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:T.text,fontFamily:T.mono}}>{v}</div></div>
          ))}
        </div>
      
        {/* Contract Bargain Alert */}
        {(()=>{
          const exp = p.contract_expires;
          if (!exp) return <p style={{fontSize:12,color:T.dim}}>Contract expiry data unavailable</p>;
      
          const expDate = new Date(exp);
          const today = new Date();
          const monthsLeft = Math.round((expDate - today) / (1000 * 60 * 60 * 24 * 30));
          const expired = monthsLeft < 0;
          const expiresThisSummer = monthsLeft >= 0 && monthsLeft <= 2;
          const within6 = monthsLeft > 2 && monthsLeft <= 6;
          const within12 = monthsLeft > 6 && monthsLeft <= 12;
          const within18 = monthsLeft > 12 && monthsLeft <= 18;
      
          let alertColor, alertTitle, alertMsg;
      
          if (expired || expiresThisSummer) {
            alertColor = T.red;
            alertTitle = expired ? 'CONTRACT EXPIRED' : 'CONTRACT EXPIRES THIS SUMMER';
            alertMsg = expired
              ? `Contract expired in ${exp}. Player is a free agent or on temporary extension. Available for zero transfer fee.`
              : `Contract ends ${exp}. Player available for free this summer. No transfer fee required — only wages.`;
          } else if (within6) {
            alertColor = T.orange;
            alertTitle = 'EXPIRING IN UNDER 6 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Club must sell now or lose player for free. Strong negotiating position for buyer.`;
          } else if (within12) {
            alertColor = T.yellow;
            alertTitle = 'EXPIRING IN UNDER 12 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Player entering final year — selling club likely to accept below market value rather than risk losing for free.`;
          } else if (within18) {
            alertColor = T.accent;
            alertTitle = 'EXPIRING IN UNDER 18 MONTHS';
            alertMsg = `Contract ends ${exp} (${monthsLeft} months). Pre-contract discussions could begin in ~6 months. Window to negotiate at discount.`;
          } else {
            alertColor = T.green;
            alertTitle = 'CONTRACT SECURED';
            alertMsg = `Contract runs until ${exp} (${monthsLeft} months). Full market value applies. No leverage from contract situation.`;
          }
      
          return (
            <div style={{padding:14,borderRadius:8,background:alertColor+'10',border:`1px solid ${alertColor}30`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:alertColor,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:800,color:alertColor,textTransform:'uppercase',letterSpacing:0.8}}>{alertTitle}</span>
              </div>
              <p style={{fontSize:13,color:T.text,margin:0,lineHeight:1.6}}>{alertMsg}</p>
              {(expired||expiresThisSummer||within6)&&vmv>0&&(
                <div style={{marginTop:10,padding:'8px 12px',background:alertColor+'15',borderRadius:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:alertColor}}>
                    Estimated saving: €{(vmv/1e6).toFixed(0)}M–€{(vmv*0.7/1e6).toFixed(0)}M vs full market value
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div></Sec>
    </>
  );
}
