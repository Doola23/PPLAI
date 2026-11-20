import { CalendarBlank } from "@phosphor-icons/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../../constants";
import { Sec } from "../Section";

export function FormSection({ logs }) {
  return (
    <>
      {/* Last 10 Games */}
      <Sec icon={CalendarBlank} title="Form & Recent Matches" tag={logs?`${Math.min(10,logs.length)} games`:null}>
        {logs?(()=>{
          const last=logs.slice(0,10);
          const tG=last.reduce((s,m)=>s+m.g,0),tA=last.reduce((s,m)=>s+m.a,0),tXG=last.reduce((s,m)=>s+m.xg,0);
          const scored=last.filter(m=>m.g>0).length;
          return(<>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={last.map(m=>({date:m.d.slice(5),goals:m.g,xG:m.xg,opp:`${m.ht} v ${m.at}`})).reverse()}>
                <XAxis dataKey="date" tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.dim,fontSize:11}} axisLine={false} tickLine={false} domain={[0,'auto']}/>
                <Tooltip contentStyle={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,fontFamily:T.font}} labelStyle={{color:T.text}} itemStyle={{color:T.dim}}/>
                <Bar dataKey="goals" fill={T.green} radius={[3,3,0,0]} name="Goals"/>
                <Bar dataKey="xG" fill={T.accent+'60'} radius={[3,3,0,0]} name="xG"/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:'flex',gap:20,marginTop:8,flexWrap:'wrap'}}>
              {[[`${tG} goals`],[`${tA} assists`],[`${tXG.toFixed(1)} xG`],[`${scored}/${last.length} scored in`]].map(([v],j)=>(
                <span key={j} style={{fontSize:13,color:T.dim}}><b style={{color:T.text}}>{v}</b></span>
              ))}
            </div>
            <div style={{marginTop:12,overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {['Date','Match','Min','G','A','S','KP','xG','xA'].map(h=><th key={h} style={{padding:'4px 8px',color:T.dim,fontWeight:600,textAlign:'center',fontSize:11}}>{h}</th>)}
                </tr></thead>
                <tbody>{last.map((m,i)=>{
                  const win=m.r==='w',loss=m.r==='l';
                  return(<tr key={i} style={{borderBottom:`1px solid ${T.border}15`,background:win?T.green+'08':loss?T.red+'08':'transparent'}}>
                    <td style={{padding:'4px 8px',color:T.dim,fontSize:11,fontFamily:T.mono}}>{m.d.slice(5)}</td>
                    <td style={{padding:'4px 8px',color:T.text,fontSize:11}}>{m.ht} v {m.at}</td>
                    <td style={{padding:'4px 8px',color:T.dim,textAlign:'center',fontFamily:T.mono}}>{m.t}'</td>
                    <td style={{padding:'4px 8px',textAlign:'center',fontWeight:m.g?800:400,color:m.g?T.green:T.dim,fontFamily:T.mono}}>{m.g}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',fontWeight:m.a?800:400,color:m.a?T.accent:T.dim,fontFamily:T.mono}}>{m.a}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.dim,fontFamily:T.mono}}>{m.s}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.dim,fontFamily:T.mono}}>{m.kp}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.text,fontFamily:T.mono}}>{m.xg.toFixed(2)}</td>
                    <td style={{padding:'4px 8px',textAlign:'center',color:T.text,fontFamily:T.mono}}>{m.xa.toFixed(2)}</td>
                  </tr>);
                })}</tbody>
              </table>
            </div>
          </>);
        })():<p style={{color:T.dim,fontSize:13,textAlign:'center',padding:16}}>Match logs not available in bundle</p>}
      </Sec>
    </>
  );
}
