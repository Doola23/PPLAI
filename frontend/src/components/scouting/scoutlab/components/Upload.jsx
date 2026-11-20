import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Spinner from "../../../ui/Spinner";
import { fetchPrimary } from "../data";
import { EASE, T } from "../constants";

// ─── UPLOAD ───
export function Upload({onLoad}){
  const[err,setErr]=useState(null);
  const fetchedRef=useRef(false);

  useEffect(()=>{
    if(fetchedRef.current)return;
    fetchedRef.current=true;

    fetchPrimary()
      .then(d=>{
        if(!d.current?.length||!d.meta){setErr('Scouting data is empty. Check ml/scouting/data/scouting_bundle.json on the server.');return;}
        onLoad(d);
      })
      .catch(e=>setErr(e.response?.data?.error||e.message));
  },[]);

  if(err)return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:500,height:500,background:'radial-gradient(circle,rgba(247,87,87,0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6,ease:EASE}} style={{textAlign:'center',maxWidth:420,padding:32,background:T.card,borderRadius:16,border:'1px solid rgba(247,87,87,0.2)'}}>
        <div style={{fontSize:32,marginBottom:12,color:T.red}}>!</div>
        <h2 style={{color:T.text,marginBottom:8}}>Scouting Data Unavailable</h2>
        <p style={{color:T.dim,fontSize:13,lineHeight:1.6}}>{err}</p>
      </motion.div>
    </motion.div>
  );

  return(
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg}}>
      <Spinner size={300} label="Scanning player database…"/>
    </div>
  );
}
