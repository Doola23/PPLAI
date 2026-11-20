import { Crosshair } from "@phosphor-icons/react";
import { T } from "../../constants";
import { Sec } from "../Section";

export function ShotMapSection({ shotData }) {
  return (
    <>
      {/* Shot Map */}
      <Sec icon={Crosshair} title="Shot Map" tag={shotData?`${shotData.ts} shots · ${shotData.g} goals`:null}>
        {shotData?(()=>{
          const shots = shotData.sh || [];
          const goals = shots.filter(s=>s.r==='G');
          const saved = shots.filter(s=>s.r==='S');
          const missed = shots.filter(s=>s.r==='M');
          const blocked = shots.filter(s=>s.r==='B');
          const conversion = shots.length > 0 ? ((goals.length/shots.length)*100).toFixed(1) : 0;
          const avgXg = shots.length > 0 ? (shots.reduce((a,s)=>a+s.xg,0)/shots.length).toFixed(3) : 0;
          const xgTotal = shots.reduce((a,s)=>a+s.xg,0).toFixed(1);
      
          // Pitch dimensions (SVG coordinate space)
          const PW = 420, PH = 280; // pitch width/height in SVG units
          const boxW = 132, boxH = 184; // penalty box
          const sixW = 44, sixH = 72; // six yard box
          const goalW = 30, goalH = 8;
      
          // Convert Understat coords to SVG
          // Understat: X=horizontal (0=left, 1=right), Y=vertical (0=top, 1=bottom)
          // We show attacking half only — X goes from ~0.5 to 1.0
          // Map: x → SVG_x, y → SVG_y
          const toSVG = (x, y) => ({
            // x: Understat 1.0 = goal line, 0.5 = halfway. Map 0.5-1.0 to 0-PW
            sx: Math.round((1 - x) * PW * 2),
            // y: Understat 0=top, 1=bottom. Map to SVG (center = PH/2)
            sy: Math.round(y * PH),
          });
      
          // Missed = white (the slate pitch is #2B4C5E, so the old slate dot was invisible);
          // Blocked = gray. Goal/Saved stay blue tones.
          const dotColor = (r) => r==='G'?'#1A65D3':r==='S'?'#4F82D6':r==='M'?'#F2F2F2':'#939A9E';
          const dotSize = (xg) => Math.max(4, Math.min(14, xg * 60));
      
          // Shot zone stats
          const zones = {
            'Box Center': shots.filter(s=>s.x>0.78&&s.y>0.29&&s.y<0.71),
            'Box Left': shots.filter(s=>s.x>0.78&&s.y<=0.29),
            'Box Right': shots.filter(s=>s.x>0.78&&s.y>=0.71),
            'Outside Box': shots.filter(s=>s.x<=0.78),
            'Penalty': shots.filter(s=>s.sit&&s.sit.startsWith('Pe')),
          };
      
          return(<>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
              {[
                ['Total Shots', shots.length],
                ['Goals', goals.length],
                ['xG Total', xgTotal],
                ['Avg xG/Shot', avgXg],
                ['Conversion', `${conversion}%`],
                ['On Target', saved.length + goals.length],
              ].map(([l,v])=>(
                <div key={l}><div style={{fontSize:11,color:T.dim}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:T.text,fontFamily:T.mono}}>{v}</div></div>
              ))}
            </div>
      
            {/* Pitch SVG */}
            <div style={{background:'rgba(43,76,94,0.22)',borderRadius:10,padding:12,marginBottom:12,overflowX:'auto'}}>
              <svg viewBox={`0 0 ${PW} ${PH}`} style={{width:'100%',maxWidth:500,display:'block',margin:'0 auto'}}>
                {/* Pitch markings */}
                <rect x={0} y={0} width={PW} height={PH} fill="#2B4C5E" rx={4}/>
                {/* Penalty box */}
                <rect x={0} y={(PH-boxH)/2} width={boxW} height={boxH} fill="none" stroke="#ffffff30" strokeWidth={1}/>
                {/* 6-yard box */}
                <rect x={0} y={(PH-sixH)/2} width={sixW} height={sixH} fill="none" stroke="#ffffff30" strokeWidth={1}/>
                {/* Goal */}
                <rect x={0} y={(PH-goalW)/2} width={goalH} height={goalW} fill="#ffffff20" stroke="#ffffff60" strokeWidth={1}/>
                {/* Penalty spot */}
                <circle cx={66} cy={PH/2} r={2} fill="#ffffff40"/>
                {/* Goal line */}
                <line x1={0} y1={0} x2={0} y2={PH} stroke="#ffffff50" strokeWidth={1}/>
      
                {/* Plot shots — goals on top */}
                {[...missed, ...saved, ...blocked, ...goals].map((s, i) => {
                  const {sx, sy} = toSVG(s.x, s.y);
                  const r = dotSize(s.xg);
                  const col = dotColor(s.r);
                  const isGoal = s.r === 'G';
                  return (
                    <circle key={i} cx={sx} cy={sy} r={r}
                      fill={col} fillOpacity={isGoal?0.9:0.55}
                      stroke={isGoal?'#fff':'none'} strokeWidth={isGoal?1.5:0}
                    >
                      <title>{s.r} {s.xg.toFixed(3)} xG — {s.m}' {s.st==='H'?'Head':s.st==='L'?'Left':'Right'}</title>
                    </circle>
                  );
                })}
              </svg>
              {/* Legend */}
              <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
                {[['#1A65D3','Goal'],['#4F82D6','Saved'],['#F2F2F2','Missed'],['#939A9E','Blocked']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:T.dim}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span>{l}</span>
                  </div>
                ))}
                <span style={{fontSize:11,color:T.dim}}>Dot size = xG value</span>
              </div>
            </div>
      
            {/* Shot zone breakdown */}
            <div style={{fontSize:12,fontWeight:800,color:T.dim,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Shot Zones</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {Object.entries(zones).map(([zone, zshots])=>{
                const zgoals = zshots.filter(s=>s.r==='G').length;
                const zxg = zshots.reduce((a,s)=>a+s.xg,0).toFixed(1);
                const zpct = zshots.length>0?((zgoals/zshots.length)*100).toFixed(0):0;
                return(
                  <div key={zone} style={{flex:1,minWidth:80,padding:'8px 10px',background:T.bg,borderRadius:8,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:11,color:T.dim,marginBottom:4}}>{zone}</div>
                    <div style={{fontSize:14,fontWeight:800,color:T.text,fontFamily:T.mono}}>{zshots.length}</div>
                    <div style={{fontSize:11,color:T.dim}}>{zgoals}G · {zxg}xG · {zpct}%</div>
                  </div>
                );
              })}
            </div>
      
            {/* Shot type breakdown */}
            <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
              {[['Right Foot','R'],['Left Foot','L'],['Head','H']].map(([label,code])=>{
                const ts = shots.filter(s=>s.st===code);
                const tg = ts.filter(s=>s.r==='G').length;
                if(!ts.length) return null;
                return(
                  <span key={code} style={{fontSize:13,color:T.dim}}>
                    {label}: <b style={{color:T.text}}>{ts.length} shots, {tg} goals</b>
                  </span>
                );
              })}
            </div>
          </>);
        })():<p style={{color:T.dim,fontSize:13,textAlign:'center',padding:16}}>Shot map data not available for this player</p>}
      </Sec>
    </>
  );
}
