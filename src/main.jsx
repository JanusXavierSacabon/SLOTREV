import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Clock3, Trophy, Sparkles, RotateCcw, Trash2, Zap, Gift, CircleHelp, Check, Gamepad2, IceCream, Utensils, Timer, History } from "lucide-react";
import "./style.css";

const COLORS = [
  {name:"Ruby", hex:"#f05b75"}, {name:"Ocean", hex:"#4d9cf5"},
  {name:"Mint", hex:"#42c99a"}, {name:"Violet", hex:"#a78bfa"},
  {name:"Amber", hex:"#f5b94c"}, {name:"Rose", hex:"#ed82c5"}
];
const GOLD = {name:"Gold", hex:"#f5d36b"};
const SEGMENTS = [
  {id:"t1", label:"TIER 1", color:"#4d9cf5", weight:40},
  {id:"t2", label:"TIER 2", color:"#42c99a", weight:30},
  {id:"t3", label:"TIER 3", color:"#a78bfa", weight:20},
  {id:"bonus", label:"BONUS", color:"#f5b94c", weight:8},
  {id:"jackpot", label:"JACKPOT", color:"#f05b75", weight:2}
];
const BONUS = [
  {id:"75", label:"75%", weight:40, color:"#4d9cf5", desc:"Complete 75% of a 30-minute study block (22.5 min)."},
  {id:"50", label:"50%", weight:30, color:"#42c99a", desc:"Complete 50% of a 30-minute study block (15 min)."},
  {id:"25", label:"25%", weight:20, color:"#a78bfa", desc:"Complete 25% of a 30-minute study block (7.5 min)."},
  {id:"free", label:"FREE", weight:8, color:"#f5b94c", desc:"Collect one free clip."},
  {id:"extra", label:"EXTRA", weight:2, color:"#f05b75", desc:"Spin the bonus wheel two more times."}
];
const DEFAULT = {
  clips: [], sessions: [], spins: [], totalMinutes: 0, streak: 0, lastStudyDate: null,
  rewardLog: [], pendingBonus: false, bonusQueue: 0, timerSeconds: 1800, timerRunning: false,
  customNotes: ""
};
function load(){ try { return {...DEFAULT, ...JSON.parse(localStorage.getItem("ccnp-jackpot") || "{}")}; } catch { return DEFAULT; } }
function weightedPick(items){
  const total = items.reduce((s,x)=>s+x.weight,0);
  let n = Math.random()*total;
  for(const item of items){ n -= item.weight; if(n < 0) return item; }
  return items[items.length-1];
}
function dateKey(){ return new Date().toLocaleDateString("en-CA"); }
function formatTime(sec){ return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`; }
function Wheel({segments, rotation, spinning, small=false}){
  const total = segments.reduce((s,x)=>s+x.weight,0);
  let acc=0;
  const stops=segments.map(s=>{const start=acc/total*100; acc+=s.weight; return `${s.color} ${start}% ${acc/total*100}%`;}).join(", ");
  return <div className={`wheel-wrap ${small?"small":""}`}>
    <div className="pointer"/>
    <div className="wheel" style={{background:`conic-gradient(${stops})`, transform:`rotate(${rotation}deg)`, transition:spinning?"transform 5.5s cubic-bezier(.12,.75,.12,1)":"none"}}>
      {segments.map((s,i)=>{
        const mid=(segments.slice(0,i).reduce((a,x)=>a+x.weight,0)+s.weight/2)/total*360;
        return <span key={s.id} className="wheel-label" style={{transform:`translate(-50%,-50%) rotate(${mid}deg) translateY(-${small?75:116}px) rotate(${-mid}deg)`}}>{s.label}</span>;
      })}
      <div className="wheel-hub"><Sparkles size={small?16:23}/></div>
    </div>
  </div>;
}
function App(){
  const [data,setData]=useState(load);
  const [rotation,setRotation]=useState(0), [spinning,setSpinning]=useState(false);
  const [bonusRotation,setBonusRotation]=useState(0), [bonusSpinning,setBonusSpinning]=useState(false);
  const [message,setMessage]=useState("Complete a focused study session to earn your first clip.");
  const [result,setResult]=useState(null), [bonusResult,setBonusResult]=useState(null);
  const [showRules,setShowRules]=useState(false);
  const [activeTab,setActiveTab]=useState("dashboard");
  const [customReward,setCustomReward]=useState("");
  const [studyTopic,setStudyTopic]=useState("CCNP ENCOR / ENARSI");
  const [remaining,setRemaining]=useState(1800);

  useEffect(()=>{localStorage.setItem("ccnp-jackpot",JSON.stringify(data));},[data]);
  useEffect(()=>{
    if(!data.timerRunning) return;
    const id=setInterval(()=>setRemaining(v=>{
      if(v<=1){clearInterval(id);setData(d=>({...d,timerRunning:false}));setMessage("Your 30-minute study timer is complete. Log your session to earn a clip.");return 0;}
      return v-1;
    }),1000);
    return ()=>clearInterval(id);
  },[data.timerRunning]);
  const counts=useMemo(()=>COLORS.map(c=>({...c,count:data.clips.filter(x=>x.name===c.name).length})),[data.clips]);
  const tier2=counts.some(c=>c.count>=2);
  const tier3=counts.some(c=>c.count>=3)||data.clips.some(c=>c.name==="Gold");
  const goldCount=data.clips.filter(c=>c.name==="Gold").length;
  const eligible=SEGMENTS.filter(s=>s.id==="t1"||s.id==="bonus"||s.id==="jackpot"||(s.id==="t2"&&tier2)||(s.id==="t3"&&tier3));
  const sessionCount=data.sessions.length;
  const totalClips=data.clips.length;

  function startTimer(){setRemaining(1800);setData(d=>({...d,timerRunning:true}));setMessage("Study timer running. Focus on your CCNP material.");}
  function pauseTimer(){setData(d=>({...d,timerRunning:false}));}
  function logSession(){
    const now=new Date();
    const session={id:Date.now(),date:now.toISOString(),topic:studyTopic,minutes:30};
    const clip=Math.random()<1/7?GOLD:COLORS[Math.floor(Math.random()*COLORS.length)];
    const today=dateKey();
    setData(d=>({...d,clips:[...d.clips,{...clip,id:Date.now()+1,earnedAt:now.toISOString()}],sessions:[session,...d.sessions],totalMinutes:d.totalMinutes+30,streak:d.lastStudyDate===today?d.streak:(d.lastStudyDate===new Date(Date.now()-86400000).toLocaleDateString("en-CA")?d.streak+1:1),lastStudyDate:today,timerRunning:false}));
    setRemaining(1800);
    setMessage(`Session logged! You earned a ${clip.name.toUpperCase()} clip.`);
    setResult({type:"clip",item:clip});
  }
  function spinMain(){
    if(spinning)return;
    const pick=weightedPick(eligible);
    const full=eligible.reduce((s,x)=>s+x.weight,0);
    const idx=eligible.findIndex(x=>x.id===pick.id);
    const before=eligible.slice(0,idx).reduce((s,x)=>s+x.weight,0);
    const target=(before+pick.weight/2)/full*360;
    const next=rotation+360*6+(360-target-(rotation%360));
    setSpinning(true);setRotation(next);
    setTimeout(()=>{
      setSpinning(false);
      if(pick.id==="bonus"){setData(d=>({...d,pendingBonus:true}));setMessage("BONUS! Your bonus wheel is ready.");setResult({type:"main",item:pick});return;}
      const reward={t1:"10 minutes of scrolling / reading manga",t2:"One full game match",t3:"Eat fast food",jackpot:"Ice cream"}[pick.id];
      setData(d=>({...d,spins:[{id:Date.now(),result:pick.label,reward,date:new Date().toISOString()},...d.spins],rewardLog:[{id:Date.now()+1,tier:pick.label,reward,date:new Date().toISOString()},...d.rewardLog]}));
      setResult({type:"main",item:pick,reward});setMessage(`${pick.label}! You won: ${reward}.`);
    },5600);
  }
  function spinBonus(){
    if(bonusSpinning)return;
    const pick=weightedPick(BONUS);
    const idx=BONUS.findIndex(x=>x.id===pick.id);
    const target=(BONUS.slice(0,idx).reduce((s,x)=>s+x.weight,0)+pick.weight/2)/100*360;
    setBonusSpinning(true);setBonusRotation(v=>v+360*5+(360-target-(v%360)));
    setTimeout(()=>{
      setBonusSpinning(false);setBonusResult(pick);
      if(pick.id==="free"){
        const c=COLORS[Math.floor(Math.random()*COLORS.length)];
        setData(d=>({...d,clips:[...d.clips,{...c,id:Date.now(),earnedAt:new Date().toISOString()}],pendingBonus:false}));
        setMessage(`FREE clip! You earned ${c.name}.`);
      } else if(pick.id==="extra"){setData(d=>({...d,bonusQueue:d.bonusQueue+2}));setMessage("EXTRA! You earned two additional bonus spins.");}
      else {setData(d=>({...d,pendingBonus:false}));setMessage(`${pick.label} bonus! Complete ${pick.id}% of a 30-minute study block within 10 minutes to earn a clip.`);}
    },5600);
  }
  function resetAll(){if(confirm("Reset all CCNP Jackpot progress, clips, and history? This cannot be undone.")){setData(DEFAULT);setRemaining(1800);setResult(null);setBonusResult(null);setMessage("Fresh start. Your next study session earns your first clip.");}}
  function removeClip(id){setData(d=>({...d,clips:d.clips.filter(c=>c.id!==id)}));}
  function redeem(name,qty){const matching=data.clips.filter(c=>c.name===name);if(matching.length<qty)return;const ids=new Set(matching.slice(0,qty).map(c=>c.id));setData(d=>({...d,clips:d.clips.filter(c=>!ids.has(c.id))}));setMessage(`${qty} ${name} clips cashed in. Tier unlocked for your next spin.`);}
  const unlockedTier=tier3?"Tier 3":tier2?"Tier 2":"Tier 1";
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><Zap size={19}/></span><span>CCNP <b>JACKPOT</b></span></a>
      <div className="top-actions"><span className="save-state"><span className="live-dot"/> Saved on this device</span><button className="icon-btn" onClick={()=>setShowRules(true)} title="Rules"><CircleHelp size={19}/></button></div>
    </header>
    <main className="container">
      <section className="hero">
        <div><div className="eyebrow"><span/> YOUR PERSONAL STUDY REWARD SYSTEM</div><h1>Study. Earn. <em>Spin.</em></h1><p>Turn every focused CCNP study session into a chance to win something you love.</p></div>
        <div className="hero-stats"><div><span>STUDY TIME</span><b>{Math.floor(data.totalMinutes/60)}h {data.totalMinutes%60}m</b></div><div><span>SESSIONS</span><b>{sessionCount}</b></div><div><span>STREAK</span><b>{data.streak} days</b></div></div>
      </section>
      <nav className="tabs">
        {[["dashboard","Dashboard"],["clips","Clip inventory"],["history","History"]].map(([id,label])=><button key={id} className={activeTab===id?"active":""} onClick={()=>setActiveTab(id)}>{label}</button>)}
      </nav>
      {activeTab==="dashboard"&&<>
        <div className="dashboard-grid">
          <section className="panel study-panel">
            <div className="panel-heading"><div><span className="kicker">01 / FOCUS SESSION</span><h2>Put in the work.</h2></div><span className="panel-icon"><BookOpen/></span></div>
            <p className="muted">Complete at least 30 minutes of focused CCNP study to earn one random clip.</p>
            <label className="field-label">WHAT ARE YOU STUDYING?</label>
            <input className="text-input" value={studyTopic} onChange={e=>setStudyTopic(e.target.value)} />
            <div className="timer-card"><div className="timer-caption"><Timer size={15}/> FOCUS TIMER</div><div className="timer-value">{formatTime(remaining)}</div><div className="timer-track"><span style={{width:`${(1-remaining/1800)*100}%`}}/></div><div className="timer-actions">{!data.timerRunning?<button className="primary-btn" onClick={startTimer}>{remaining<1800?"Resume session":"Start 30-minute session"}</button>:<button className="secondary-btn" onClick={pauseTimer}>Pause timer</button>}<button className="text-btn" onClick={()=>{setRemaining(1800);setData(d=>({...d,timerRunning:false}));}}>Reset</button></div></div>
            <button className="claim-btn" onClick={logSession}><Check size={17}/> Log completed 30-minute session <span>+1 clip</span></button>
            <p className="tiny-note">Be honest with your session log. The timer is a focus aid, not a lock.</p>
          </section>
          <section className="panel inventory-panel">
            <div className="panel-heading"><div><span className="kicker">02 / YOUR COLLECTION</span><h2>Clip inventory.</h2></div><span className="count-pill">{totalClips} total</span></div>
            <div className="clip-grid">
              {counts.map(c=><div className="clip-card" key={c.name}><span className="paperclip" style={{"--clip":c.hex}}/><span className="clip-name">{c.name}</span><b>{c.count}</b></div>)}
              <div className="clip-card gold-card"><span className="paperclip" style={{"--clip":GOLD.hex}}/><span className="clip-name">Gold</span><b>{goldCount}</b></div>
            </div>
            <div className="unlock-list"><div className="unlock-row"><span className={tier2?"unlock-dot on":"unlock-dot"}/><div><b>Tier 2</b><small>2 matching regular clips</small></div><strong>{tier2?"UNLOCKED":"LOCKED"}</strong></div><div className="unlock-row"><span className={tier3?"unlock-dot on":"unlock-dot"}/><div><b>Tier 3</b><small>3 matching clips OR 1 gold clip</small></div><strong>{tier3?"UNLOCKED":"LOCKED"}</strong></div></div>
            <div className="tier-status"><span>Highest unlocked</span><b>{unlockedTier}</b></div>
            <button className="secondary-btn full" onClick={()=>setActiveTab("clips")}>Manage clips &amp; cash in</button>
          </section>
        </div>
        <section className="panel wheel-panel">
          <div className="panel-heading"><div><span className="kicker">03 / YOUR REWARD ENGINE</span><h2>Take your chance.</h2><p className="muted">Eligible tiers appear on the wheel. Locked tiers are excluded until you earn the clips.</p></div><span className="panel-icon"><Sparkles/></span></div>
          <div className="wheel-layout"><div className="wheel-area"><Wheel segments={eligible} rotation={rotation} spinning={spinning}/></div><div className="wheel-info"><div className="odds-list">{SEGMENTS.map(s=><div className={`odds-row ${!eligible.some(e=>e.id===s.id)?"dim":""}`} key={s.id}><i style={{background:s.color}}/><span>{s.label}</span><b>{s.weight}%</b>{!eligible.some(e=>e.id===s.id)&&<small>locked</small>}</div>)}</div><button className="spin-btn" disabled={spinning} onClick={spinMain}><Sparkles size={18}/>{spinning?"Spinning...":"SPIN THE WHEEL"}</button><p className="tiny-note">Odds are normalized across currently eligible outcomes.</p></div></div>
          {result&&<div className="result-banner"><div className="result-icon">{result.type==="clip"?<span className="paperclip" style={{"--clip":result.item.hex}}/>:<Trophy/>}</div><div><small>{result.type==="clip"?"CLIP EARNED":"YOUR RESULT"}</small><b>{result.type==="clip"?`${result.item.name} clip`:result.item.label}</b>{result.reward&&<span>{result.reward}</span>}</div><button onClick={()=>setResult(null)}>Dismiss</button></div>}
          {data.pendingBonus&&<div className="bonus-box"><div><span className="kicker">BONUS ROUND</span><h3>You landed on BONUS!</h3><p>Spin the bonus wheel for a discounted study challenge or extra reward.</p></div><div className="bonus-wheel-row"><Wheel segments={BONUS} rotation={bonusRotation} spinning={bonusSpinning} small/><button className="primary-btn" disabled={bonusSpinning} onClick={spinBonus}>Spin bonus wheel</button></div>{bonusResult&&<div className="bonus-result"><b>{bonusResult.label}</b> · {bonusResult.desc}</div>}</div>}
          {data.bonusQueue>0&&<div className="bonus-queue">You have {data.bonusQueue} extra bonus spin(s). <button onClick={()=>{setData(d=>({...d,pendingBonus:true,bonusQueue:d.bonusQueue-1}));setBonusResult(null);}}>Use one</button></div>}
        </section>
        <section className="panel rewards-panel"><div className="panel-heading"><div><span className="kicker">04 / YOUR PRIZE LADDER</span><h2>What you're playing for.</h2></div><Gift className="muted-icon"/></div><div className="reward-grid">{[{tier:"TIER 1",name:"Manga break",desc:"10 minutes of scrolling / reading manga",icon:<BookOpen/>,color:"blue"},{tier:"TIER 2",name:"One full game match",desc:"Play one complete match",icon:<Gamepad2/>,color:"green"},{tier:"TIER 3",name:"Fast food",desc:"Enjoy a fast-food treat",icon:<Utensils/>,color:"purple"},{tier:"JACKPOT",name:"Ice cream",desc:"A sweet jackpot treat",icon:<IceCream/>,color:"pink"}].map(r=><div className="reward-card" key={r.tier}><div className={`reward-icon ${r.color}`}>{r.icon}</div><small>{r.tier}</small><b>{r.name}</b><span>{r.desc}</span></div>)}</div></section>
      </>}
      {activeTab==="clips"&&<section className="panel"><div className="panel-heading"><div><span className="kicker">YOUR COLLECTION</span><h2>Manage your clips.</h2><p className="muted">Cash in matching clips to unlock higher reward tiers. Gold immediately unlocks Tier 3.</p></div></div><div className="manage-grid">{counts.map(c=><div className="manage-card" key={c.name}><span className="paperclip" style={{"--clip":c.hex}}/><div><b>{c.name}</b><small>{c.count} available</small></div><div className="manage-actions"><button disabled={c.count<2} onClick={()=>redeem(c.name,2)}>Cash 2 · Tier 2</button><button disabled={c.count<3} onClick={()=>redeem(c.name,3)}>Cash 3 · Tier 3</button></div></div>)}<div className="manage-card"><span className="paperclip" style={{"--clip":GOLD.hex}}/><div><b>Gold</b><small>{goldCount} available</small></div><div className="manage-actions"><button disabled={goldCount<1} onClick={()=>redeem("Gold",1)}>Cash 1 · Tier 3</button></div></div></div><h3 className="subhead">Individual clips</h3>{data.clips.length===0?<p className="muted">No clips yet. Complete a study session to earn one.</p>:<div className="clip-list">{data.clips.map(c=><div className="clip-list-item" key={c.id}><span className="paperclip small-clip" style={{"--clip":c.hex}}/><b>{c.name}</b><small>{new Date(c.earnedAt).toLocaleString()}</small><button className="icon-btn" onClick={()=>removeClip(c.id)} title="Remove clip"><Trash2 size={15}/></button></div>)}</div>}</section>}
      {activeTab==="history"&&<section className="panel"><div className="panel-heading"><div><span className="kicker">YOUR ACTIVITY</span><h2>Study history.</h2><p className="muted">Your sessions and reward results are saved on this device.</p></div><History className="muted-icon"/></div><div className="history-stats"><div><b>{sessionCount}</b><small>Sessions</small></div><div><b>{Math.floor(data.totalMinutes/60)}h {data.totalMinutes%60}m</b><small>Study time</small></div><div><b>{data.spins.length}</b><small>Wheel spins</small></div></div><h3 className="subhead">Study sessions</h3>{data.sessions.length===0?<p className="muted">No study sessions logged yet.</p>:<div className="clip-list">{data.sessions.map(s=><div className="clip-list-item" key={s.id}><BookOpen size={18}/><b>{s.topic}</b><small>{new Date(s.date).toLocaleString()} · {s.minutes} min</small></div>)}</div>}<h3 className="subhead">Reward history</h3>{data.rewardLog.length===0?<p className="muted">No rewards won yet.</p>:<div className="clip-list">{data.rewardLog.map(r=><div className="clip-list-item" key={r.id}><Trophy size={18}/><b>{r.tier}</b><small>{r.reward} · {new Date(r.date).toLocaleString()}</small></div>)}</div>}</section>}
      <footer><span>CCNP JACKPOT</span><span>Progress saved locally in this browser.</span><button className="text-btn danger" onClick={resetAll}><RotateCcw size={14}/> Reset all progress</button></footer>
    </main>
    {showRules&&<div className="modal-backdrop" onClick={()=>setShowRules(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowRules(false)}>×</button><span className="kicker">HOW TO PLAY</span><h2>Your rules of the game.</h2><ul><li>Complete at least 30 minutes of focused CCNP study to earn one random clip.</li><li>There are six regular clip colors and one special gold clip. The app currently gives each of the seven types an equal chance.</li><li>Two matching regular clips unlock Tier 2.</li><li>Three matching regular clips unlock Tier 3.</li><li>One gold clip immediately unlocks Tier 3.</li><li>Unlocked tiers join the main wheel. The listed odds are normalized among eligible outcomes.</li><li>Tier 1: 10 minutes of manga. Tier 2: one full game match. Tier 3: fast food. Jackpot: ice cream.</li><li>Bonus wheel: 75%, 50%, 25%, FREE, or EXTRA. The original guide's 10-minute challenge timer is a follow-up enhancement.</li></ul><button className="primary-btn full" onClick={()=>setShowRules(false)}>Got it</button></div></div>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
