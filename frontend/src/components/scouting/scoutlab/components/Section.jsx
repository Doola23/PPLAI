import { T, C } from "../constants";

// ─── SECTION WRAPPER — defined outside Report so React never remounts it on re-render ───
export function Sec({icon,title,tag,children,accent,style,className}){
  const ac=accent||T.accent;
  const Icon=typeof icon==='function'?icon:null;
  return(
    <div className={className} style={{...C.card,border:accent?`1px solid ${accent}55`:C.card.border,...style}}>
      <div style={{position:'absolute',top:0,left:'8%',right:'8%',height:1,background:`linear-gradient(90deg,transparent,${ac},transparent)`,pointerEvents:'none'}}/>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        {Icon
          ?<Icon size={16} weight="bold" color={ac} aria-hidden="true"/>
          :<div style={{width:2,height:16,borderRadius:999,background:ac,flexShrink:0}}/>}
        <span style={{fontSize:13,fontWeight:800,color:T.text,textTransform:'uppercase',letterSpacing:1}}>{title}</span>
        {tag&&<span style={C.tag(ac)}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}
