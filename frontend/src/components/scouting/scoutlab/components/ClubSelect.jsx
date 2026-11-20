import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import ClubLogo from "../../../ui/ClubLogo";
import PageBanner from "../../../dashboard/PageBanner";
import { EASE, CLUB_META, T } from "../constants";

// ─── CLUB SELECT ───
export function ClubSelect({teamReports,onSelect,onSkip}){
  const teams=Object.keys(CLUB_META);
  const[hoveredIdx,setHoveredIdx]=useState(null);

  const doSelect=(team)=>{
    const meta=CLUB_META[team];
    const rep=teamReports?.[team];
    onSelect({team,...meta,formation:rep?.formation||meta.formation,style:rep?.style||meta.style,teamReport:rep});
  };

  const getDockScale=(i)=>{
    if(hoveredIdx===null) return 1;
    const d=Math.abs(i-hoveredIdx);
    if(d===0) return 1.22;
    if(d===1) return 1.09;
    if(d===2) return 1.03;
    return 1;
  };

  return(
    <div style={{fontFamily:T.font}}>

      <PageBanner title="Scout" titleAccent="Search" description="Choose Your Club" />

      {/* ── Badge grid with dock magnification ── */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 40px 0',display:'flex',flexWrap:'wrap',justifyContent:'center',alignItems:'center',gap:'36px 44px',marginBottom:60}}>
        {teams.map((team,i)=>(
          <motion.button
            key={team}
            initial={{opacity:0,y:18,filter:'blur(8px)'}}
            animate={{
              opacity:1,
              y:0,
              filter:'blur(0px)',
              scale:getDockScale(i),
            }}
            transition={{
              opacity:{duration:0.5,ease:EASE,delay:0.12+i*0.033},
              y:{duration:0.5,ease:EASE,delay:0.12+i*0.033},
              filter:{duration:0.5,delay:0.12+i*0.033},
              scale:{type:'spring',stiffness:280,damping:24},
            }}
            whileTap={{scale:0.93}}
            onMouseEnter={()=>setHoveredIdx(i)}
            onMouseLeave={()=>setHoveredIdx(null)}
            onClick={()=>doSelect(team)}
            aria-label={`Scout ${team}`}
            style={{
              background:'none',border:'none',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:9,
              padding:'4px 2px',fontFamily:'inherit',
              filter: hoveredIdx===i
                ? 'drop-shadow(0 4px 20px rgba(26,101,211,0.45)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))'
                : 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))',
              transition:'filter 220ms ease',
            }}
          >
            <ClubLogo club={team} size={88}/>
            <span style={{fontSize:12,fontWeight:600,letterSpacing:'0.03em',whiteSpace:'nowrap',color:'#F2F2F2'}}>
              {team}
            </span>
          </motion.button>
        ))}
      </div>

      {/* ── No club context ── */}
      <div style={{textAlign:'center',paddingBottom:72}}>
        <motion.button
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.85}}
          whileHover={{borderColor:'rgba(255,255,255,0.22)',color:'#F2F2F2'}} whileTap={{scale:0.97}}
          onClick={onSkip}
          style={{
            display:'inline-flex',alignItems:'center',gap:7,
            padding:'11px 24px',borderRadius:999,
            border:'1px solid rgba(255,255,255,0.1)',
            background:'transparent',color:T.dim,
            fontSize:12,fontWeight:700,cursor:'pointer',
            fontFamily:'inherit',transition:'all 0.2s',letterSpacing:'0.04em',
          }}
        >
          No club context <ArrowRight size={13} weight="bold"/>
        </motion.button>
      </div>

    </div>
  );
}
