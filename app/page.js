'use client'
import { useState, useEffect, useLayoutEffect, useRef, Fragment, useMemo } from 'react';
import Image from 'next/image';
import MapView from '../components/MapView';
import ChatWidget from '../components/ChatPanel';
import reels from '../data/reels.json';
import collections from '../data/collections.json';
import restaurants from '../data/restaurants.json';
import stays from '../data/stays.json';
import { optimizeOrder, routeKm, estimateModes, formatLeg, fallbackDriveMin } from '../lib/route';
import { dedupeTrip, stripCollection, resizeDays, spreadAcrossDays, mergeSpread, notInStops, fillPicks, moveStop as moveStopToDay } from '../lib/plan';
import { resolvePlace, isSyntheticId } from '../lib/places';
import { parseViews, reelmapScore, categoryFor, sumReelViews } from '../lib/score';
import { dayHighlight, tripHeadline, tripHighlights, shareTripText } from '../lib/guide';
import { foodPicksFor, inFoodCat, FOOD_MAX_KM } from '../lib/food';
import { stopReserveTag, foodReserveTag, reserveLabel } from '../lib/reserve';
import { matchStops, withRatings } from '../lib/chat-edit';
import { LOCALES, t, daysUnit, dayName, stopsUnit, clipsUnit, postsUnit, footDays, foodCatLabel, mealLabel, stopOfLine, totalDriveLine, nearStopLine, inCityLine, storedLang, GUIDE_STEP_KEYS, guideSeen, HINT_KEYS, hintDoneViews } from '../lib/i18n';
import places from '../data/places.json';

const DEFAULT_STOPS = [
  { place_id:'chelsea', name:'Chelsea Market', address:'75 9th Ave', lat:40.7424, lng:-74.0061 },
  { place_id:'highline', name:'The High Line', address:'High Line', lat:40.7479, lng:-74.0049 },
  { place_id:'toprock', name:'Top of the Rock', address:'30 Rockefeller', lat:40.7587, lng:-73.9787 }
];

const CITY_SLUG = { 'New York':'nyc', 'Chicago':'chi', 'Miami':'mia', 'Italy':'ita', 'Mumbai':'bom' };
const CITY_CENTER = {
  'New York': { lat: 40.7128, lng: -74.006 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Italy': { lat: 41.9028, lng: 12.4964 },
  'Mumbai': { lat: 19.076, lng: 72.8777 }
};
const tripKey = (city)=>`nomad-trip-${CITY_SLUG[city]||'nyc'}`;
const readTrip = (city)=>{
  try{
    const raw = localStorage.getItem(tripKey(city));
    if(raw){
      const v = JSON.parse(raw);
      if(Array.isArray(v)) return { days:dedupeTrip([v]), active:0 };
      if(v && Array.isArray(v.days)) return { days:dedupeTrip(v.days.length?v.days:[[]]), active:Math.min(v.active||0, Math.max(v.days.length-1,0)) };
    }
  }catch{ /* corrupted trip or SSR */ }
  return { days:[city==='New York' ? DEFAULT_STOPS : []], active:0 };
};

const ACCENT = { bg:'#E1306C', fg:'#FFFFFF' };
const BOOT_ID = Date.now();
let chatSeq = 0;
const FOOD_CATS = ['local special','coffee','lunch','dinner','fine dine'];

const km = (a,b,c,d)=>{
  const R = 6371, r = Math.PI/180;
  const h = Math.sin((c-a)*r/2)**2 + Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};
const fmtCount = (n)=> n>=1000 ? `${(n/1000).toFixed(1).replace('.0','')}k` : `${n}`;
// Syncs stored language before paint (no flash) without the SSR layout-effect warning.
const useIsoLayoutEffect = typeof window==='undefined' ? useEffect : useLayoutEffect;

function ReelRail({ name, embedState, lang='en' }){
  const list = (reels[name]||[]).slice().sort((a,b)=>parseViews(b.views)-parseViews(a.views)).slice(0,5);
  if(!list.length) return null;
  return (
    <div className="-mx-4 px-4 flex gap-3 mt-2 overflow-x-auto rail-scroll pb-2" style={{scrollSnapType:'x proximity'}}>
      {list.map((r,j)=>(
        (j===0 && r.embed && r.playable!==false && embedState!=='failed') ? (
          <div key={j} className="reel-card w-[328px] max-w-full shrink-0 animate-pop" style={{position:'relative', scrollSnapAlign:'start', animationDelay:`${Math.min(j,4)*45}ms`}} data-reel-tile={r.url} data-reel-views={r.views} data-reel-color={r.color}>
            <span style={{position:'absolute', top:10, left:10, zIndex:2, display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px 4px 8px', borderRadius:999, background:'rgba(255,255,255,0.94)', color:'#262626', fontSize:12, boxShadow:'0 1px 4px rgba(38,38,38,0.25)', pointerEvents:'none', fontVariantNumeric:'tabular-nums'}}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4c0 .8.9 1.3 1.6.9l8-5.2c.6-.4.6-1.4 0-1.8l-8-5.2c-.7-.4-1.6.1-1.6.9z"/></svg>
              <b>{r.views}</b>
              <span style={{fontSize:10, fontWeight:800, letterSpacing:'0.08em'}}>{t(lang, 'reels.top')}</span>
            </span>
            <blockquote className="instagram-media" data-instgrm-permalink={r.embed} data-instgrm-version="14">
              <a href={r.embed} target="_blank" rel="noreferrer">View this post on Instagram</a>
            </blockquote>
          </div>
        ) : (
          <a key={j} href={r.url} target="_blank" rel="noreferrer" aria-label={t(lang, 'reels.open', { views: r.views })}
            className="reel-tile shrink-0 animate-pop"
            style={{backgroundColor:r.color, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, width:144, aspectRatio:'9/16', borderRadius:14, color:'#fff', position:'relative', overflow:'hidden', textDecoration:'none', alignSelf:'center', scrollSnapAlign:'start', animationDelay:`${Math.min(j,4)*45}ms`}}>
            <span className="reel-tile-play" aria-hidden="true" style={{display:'grid', placeItems:'center', width:44, height:44, borderRadius:999, background:'rgba(255,255,255,0.92)', color:'#262626'}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4c0 .8.9 1.3 1.6.9l8-5.2c.6-.4.6-1.4 0-1.8l-8-5.2c-.7-.4-1.6.1-1.6.9z"/></svg>
            </span>
            <span style={{display:'inline-flex', alignItems:'center', padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,0.94)', color:'#262626', fontSize:12, fontWeight:700, fontVariantNumeric:'tabular-nums'}}>{r.views}</span>
          </a>
        )
      ))}
    </div>
  );
}

const coverCache = {};
function DayCover({ title, seed, pick=0, direct=null, genPlace=null, genCity='' }){
  const wantGen = !direct && !!genPlace;
  const [genSrc,setGenSrc] = useState(undefined);
  useEffect(()=>{
    if(!wantGen) return;
    let live = true;
    fetch(`/api/cover?place=${encodeURIComponent(genPlace)}&city=${encodeURIComponent(genCity)}`)
      .then(r=>r.json())
      .then(d=>{ if(live) setGenSrc(d && d.url ? d.url : null); })
      .catch(()=>{ if(live) setGenSrc(null); });
    return ()=>{ live = false; };
  },[wantGen, genPlace, genCity]);
  if(wantGen && genSrc===undefined) return (<div className="absolute inset-0 animate-pulse bg-ink/10" aria-hidden="true" />);
  const eff = direct || (typeof genSrc==='string' ? genSrc : null);
  return (<DayCoverImg key={eff || `${title}::${pick}`} title={title} seed={seed} pick={pick} direct={eff} />);
}
function DayCoverImg({ title, seed, pick=0, direct=null }){
  const key = direct || `${title}::${pick}`;
  const fb = `https://picsum.photos/seed/${seed}/480/320`;
  const [src,setSrc] = useState(()=>direct || coverCache[key] || null);
  const [dead,setDead] = useState(false);
  useEffect(()=>{
    if(direct || coverCache[key]) return;
    let live = true;
    (async()=>{
      try{
        const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=480&generator=search&gsrsearch=${encodeURIComponent(`${title} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=5`;
        const d = await fetch(u).then(r=>r.json());
        const pages = d && d.query && d.query.pages ? Object.values(d.query.pages) : [];
        const hits = pages.filter(p=>p.thumbnail && p.thumbnail.source).sort((a,b)=>(a.index||0)-(b.index||0));
        const hit = hits.length ? hits[pick % hits.length] : null;
        if(live && hit){ coverCache[key] = hit.thumbnail.source; setSrc(hit.thumbnail.source); }
      }catch{ /* picsum fallback below */ }
    })();
    return ()=>{ live = false; };
  },[key, title, pick, direct]);
  if(dead) return null;
  return (
    <Image src={src || fb} alt="" fill sizes="(max-width: 768px) 128px, 192px" className="object-cover"
      onError={()=>{ if(src) setSrc(null); else setDead(true); }} />
  );
}

function StopRating({ stop, city, views, lang='en' }){
  const [res,setRes] = useState(null);
  const direct = stop.rating!=null;
  useEffect(()=>{
    if(direct) return;
    let live = true;
    resolvePlace(stop.name, city).then(r=>{ if(live) setRes(r); }).catch(()=>{});
    return ()=>{ live = false; };
  },[direct, stop.name, city]);
  const rating = stop.rating ?? res?.rating;
  const total = stop.ratings_total ?? res?.ratings_total;
  if(rating==null) return null;
  const tag = stopReserveTag({ name: stop.name, ratings_total: total, views });
  return (<Fragment><span className="font-bold">{rating}</span><span className="opacity-60">{total!=null ? ` · ${fmtCount(total)} Google reviews` : ' Google'}{tag ? ` · ${reserveLabel(tag, lang)}` : ''} · </span></Fragment>);
}

export default function Page(){
  const [city,setCity] = useState(()=>{
    try{
      const saved = localStorage.getItem('nomad-city');
      return saved && CITY_CENTER[saved] ? saved : 'New York';
    }catch{ return 'New York'; }
  });
  const [dayCount,setDayCount] = useState(()=>readTrip(city).days.length || 1);
  const [activeDay,setActiveDay] = useState(()=>readTrip(city).active || 0);
  const [stops,setStops] = useState(()=>{ const o = readTrip(city); return o.days[o.active] || []; });
  const [center,setCenter] = useState(()=>({ ...CITY_CENTER[city] }));
  const [view,setView] = useState('collections');
  const [selColl,setSelColl] = useState(null);
  const [selPosts,setSelPosts] = useState([]);
  const [planDays,setPlanDays] = useState(()=>readTrip('New York').days.length || 3);
  const [tripColl,setTripColl] = useState(()=>{ try{ return localStorage.getItem('nomad-tripcoll'); }catch{ return null; } });
  const [collQ,setCollQ] = useState('');
  const [persona] = useState(()=>{
    try{
      const saved = JSON.parse(localStorage.getItem('nomad-persona') || 'null');
      return Array.isArray(saved) && saved.length ? saved : ['Foodie'];
    }catch{ return ['Foodie']; }
  });
  const [foodCat,setFoodCat] = useState(()=>{
    try{
      const saved = localStorage.getItem('nomad-foodcat');
      return FOOD_CATS.includes(saved) ? saved : 'local special';
    }catch{ return 'local special'; }
  });
  // SSR-identical defaults; the stored language syncs in on mount (see below).
  const [lang,setLang] = useState('en');
  const [langPicking,setLangPicking] = useState(true);
  const [guideOpen,setGuideOpen] = useState(false);
  const [guideStep,setGuideStep] = useState(0);
  const [hintsDone,setHintsDone] = useState({});
  const [hintOpen,setHintOpen] = useState(null);
  const [helpMenu,setHelpMenu] = useState(false);
  const [spotRect,setSpotRect] = useState(null);
  useIsoLayoutEffect(()=>{
    const s = storedLang();
    if(s){ setLang(s); setLangPicking(false); }
    if(!guideSeen()) setGuideOpen(true);
    setHintsDone(hintDoneViews());
  },[]);
  const [q,setQ] = useState('');
  const [results,setResults] = useState([]);
  const [searching,setSearching] = useState(false);
  const searchSeq = useRef(0);
  const [deadPics,setDeadPics] = useState({});

  // save city + active day trip JSON + persona + trip collection
  useEffect(()=>{
    try{
      localStorage.setItem('nomad-city', city);
      localStorage.setItem('nomad-persona', JSON.stringify(persona));
      localStorage.setItem('nomad-foodcat', foodCat);
      if(tripColl) localStorage.setItem('nomad-tripcoll', tripColl);
      const o = readTrip(city);
      o.days[activeDay] = stops;
      o.active = activeDay;
      while(o.days.length < dayCount) o.days.push([]);
      localStorage.setItem(tripKey(city), JSON.stringify(o));
    }catch{ /* storage unavailable */ }
  },[stops, city, activeDay, dayCount, persona, tripColl, foodCat]);
  useEffect(()=>{ try{ document.documentElement.lang = lang; }catch{} },[lang]);

  const onType = async (v)=>{
    setQ(v);
    if(v.length < 2){ setResults([]); setSearching(false); return; }
    const id = ++searchSeq.current;
    setSearching(true);
    try{
      const d = await fetch(`/api/search?q=${encodeURIComponent(v)}&city=${encodeURIComponent(city)}`).then(r=>r.json());
      if(id===searchSeq.current) setResults(d);
    }finally{
      if(id===searchSeq.current) setSearching(false);
    }
  };

  const [stayQ,setStayQ] = useState('');
  const [stayResults,setStayResults] = useState([]);
  const [staySearching,setStaySearching] = useState(false);
  const staySeq = useRef(0);

  const onTypeStay = async (v)=>{
    setStayQ(v);
    if(v.length < 2){ setStayResults([]); setStaySearching(false); return; }
    const id = ++staySeq.current;
    setStaySearching(true);
    try{
      const d = await fetch(`/api/search?q=${encodeURIComponent(v)}&city=${encodeURIComponent(city)}`).then(r=>r.json());
      if(id===staySeq.current) setStayResults(d);
    }finally{
      if(id===staySeq.current) setStaySearching(false);
    }
  };

  const addStay = (r)=>{
    addStop({ place_id:`stay-${(r.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, name:r.name, address:r.address||r.area, lat:r.lat, lng:r.lng });
    setStayQ(''); setStayResults([]);
  };

  const addStop = (p)=>{
    setStops([...stops, p]);
    setCenter({ lat:p.lat, lng:p.lng });
    setQ(''); setResults([]);
  };

  // Assistant edits: resolve a tool call to confirmable candidates…
  const resolveEdit = async ({ op, name, day })=>{
    const o = readTrip(city);
    const days = o.days.map((d,i)=>i===activeDay ? stops : (d||[]));
    const dayIdx = day!=null && Number.isFinite(+day) ? Math.max(0, Math.min(days.length-1, Math.floor(+day)-1)) : activeDay;
    if(op==='add'){
      const d = await fetch(`/api/search?q=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`).then(r=>r.json()).catch(()=>[]);
      const list = (Array.isArray(d)?d:[]).filter(r=>r && r.name).slice(0,3);
      if(!list.length) return { status:'none', op };
      const topped = await Promise.all(list.map(r=>r.rating!=null ? null : resolvePlace(r.name, city).catch(()=>null)));
      const inDay = new Set((days[dayIdx]||[]).map(s=>(s.name||'').toLowerCase()));
      const base = list.map(r=>({ name:r.name, sub:r.address||'', rating:r.rating ?? null, reviews:r.ratings_total ?? null, dupe:inDay.has((r.name||'').toLowerCase()), raw:r }));
      return { status:'pick', op, dayIdx, candidates:withRatings(base, topped) };
    }
    const pool = [];
    days.forEach((d,di)=>{ if(day==null || di===dayIdx) (d||[]).forEach(s=>pool.push({ ...s, dayIdx:di })); });
    const hits = matchStops(pool, name).slice(0,3);
    if(!hits.length) return { status:'none', op };
    return { status:'pick', op, candidates:hits.map(s=>({ name:s.name, sub:dayName(s.dayIdx+1, lang), rating:s.rating ?? null, reviews:s.ratings_total ?? null, raw:s })) };
  };

  // …then apply the confirmed pick. Active-day writes go through state
  // (the persist effect saves them); other days write the trip directly.
  const applyEdit = ({ op, candidate, dayIdx })=>{
    if(op==='add'){
      const r = candidate.raw || {};
      const cc = CITY_CENTER[city] || CITY_CENTER['New York'];
      const stop = { place_id:r.place_id || `chat-${BOOT_ID}-${++chatSeq}`, name:candidate.name, address:r.address||'', lat:r.lat ?? cc.lat, lng:r.lng ?? cc.lng, rating:candidate.rating ?? r.rating ?? null, ratings_total:candidate.reviews ?? r.ratings_total ?? null };
      const di = dayIdx ?? activeDay;
      const dupe = (arr)=>(arr||[]).some(s=>(s.name||'').toLowerCase()===(stop.name||'').toLowerCase());
      if(di===activeDay){
        if(dupe(stops)) return { ok:false, reason:'dupe' };
        setStops([...stops, stop]);
        setCenter({ lat:stop.lat, lng:stop.lng });
      } else {
        const o = readTrip(city);
        o.days[di] = o.days[di] || [];
        if(dupe(o.days[di])) return { ok:false, reason:'dupe' };
        o.days[di].push(stop);
        try{ localStorage.setItem(tripKey(city), JSON.stringify(o)); }catch{}
        bumpTripVer(v=>v+1);
      }
      return { ok:true, dayIdx:di };
    }
    const target = candidate.raw || {};
    const di = target.dayIdx ?? activeDay;
    if(di===activeDay){
      setStops(stops.filter(s=>s.place_id!==target.place_id));
    } else {
      const o = readTrip(city);
      o.days[di] = (o.days[di]||[]).filter(s=>s.place_id!==target.place_id);
      try{ localStorage.setItem(tripKey(city), JSON.stringify(o)); }catch{}
      bumpTripVer(v=>v+1);
    }
    return { ok:true, dayIdx:di };
  };

  const selectDay = (n)=>{
    const o = readTrip(city);
    const day = Math.max(0, Math.min(n, o.days.length-1));
    setActiveDay(day);
    const s = o.days[day] || [];
    setStops(s);
    if(s.length) setCenter({ lat:s[0].lat, lng:s[0].lng });
  };

  const changeDayCount = (n)=>{
    n = Math.max(1, Math.min(7, n));
    const o = readTrip(city);
    const days = spreadAcrossDays(o.days.flat(), n);
    const day = Math.min(o.active||0, n-1);
    try{ localStorage.setItem(tripKey(city), JSON.stringify({ days, active: day })); }catch{}
    setDayCount(n);
    setActiveDay(day);
    setStops(days[day] || []);
    if(days[day]?.length) setCenter({ lat:days[day][0].lat, lng:days[day][0].lng });
  };

  const planFromCollection = (c, indices)=>{
    const picks = indices || c.posts.map((_,i)=>i);
    const o = readTrip(c.city);
    const n = Math.max(1, Math.min(7, planDays));
    o.days = stripCollection(resizeDays(o.days, n), c.id);
    const fresh = [];
    const seen = new Set();
    picks.forEach((idx)=>{
      const p = c.posts[idx];
      const k = p && p.place.trim().toLowerCase();
      if(!p || seen.has(k)) return;
      seen.add(k);
      fresh.push({ place_id:`saved-${c.id}-${idx}`, name:p.place, address:p.place, lat:p.lat, lng:p.lng });
    });
    o.days = mergeSpread(o.days, spreadAcrossDays(fresh, n));
    const day = Math.min(o.active||0, n-1);
    o.active = day;
    try{ localStorage.setItem(tripKey(c.city), JSON.stringify(o)); }catch{}
    setCity(c.city);
    setDayCount(n);
    setActiveDay(day);
    setStops(o.days[day] || []);
    setTripColl(c.id);
    if(o.days[day]?.length) setCenter({ lat:o.days[day][0].lat, lng:o.days[day][0].lng });
    setView('overview');
  };

  const autoCreate = (c)=>{
    const o = readTrip(c.city);
    const n = Math.max(1, Math.min(7, planDays));
    o.days = stripCollection(resizeDays(o.days, n), c.id);
    const picks = c.posts.filter((_,i)=>selPosts.includes(i));
    const ranked = [...new Map(picks.map(p=>[p.place, p])).values()]
      .map(p=>({ p, s: reelmapScore({ name:p.place }, { reels, persona }).total }))
      .sort((a,b)=>b.s-a.s)
      .map(({ p })=>({ place_id:`saved-${c.id}-${p.place}`, name:p.place, address:p.place, lat:p.lat, lng:p.lng }));
    o.days = mergeSpread(o.days, spreadAcrossDays(ranked, n));
    const active = Math.min(o.active||0, n-1);
    try{ localStorage.setItem(tripKey(c.city), JSON.stringify({ days:o.days, active })); }catch{}
    setCity(c.city);
    setDayCount(n);
    setActiveDay(active);
    setStops(o.days[active] || []);
    setTripColl(c.id);
    setView('overview');
  };

  const dragRef = useRef(null);
  const listRef = useRef(null);
  const [dragging,setDragging] = useState(null);

  const moveStop = (from,to)=>{
    if(from===null || from===undefined || from===to) return;
    const next = [...stops];
    const [m] = next.splice(from,1);
    next.splice(to,0,m);
    setStops(next);
  };

  const rowIndexAt = (y)=>{
    const rows = listRef.current?.querySelectorAll('[data-row]');
    if(!rows || !rows.length) return null;
    for(let i=0;i<rows.length;i++){
      const r = rows[i].getBoundingClientRect();
      if(y < r.top + r.height/2) return i;
    }
    return rows.length-1;
  };

  const startDrag = (e,i)=>{
    if(e.pointerType==='mouse' && e.button!==0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { cur:i };
    setDragging(i);
  };
  const moveDrag = (e)=>{
    const d = dragRef.current;
    if(!d) return;
    const idx = rowIndexAt(e.clientY);
    if(idx===null || idx===d.cur) return;
    moveStop(d.cur, idx);
    d.cur = idx;
    setDragging(idx);
  };
  const endDrag = ()=>{ dragRef.current = null; setDragging(null); };

  const [optMsg,setOptMsg] = useState(null);
  const optimizeDay = ()=>{
    const order = optimizeOrder(stops);
    const same = order.every((v,i)=>v===i);
    const sig = order.map(i=>stops[i].place_id).join(',');
    if(same){ setOptMsg({ text:t(lang, 'day.opt.optimal'), sig:stops.map(s=>s.place_id).join(',') }); return; }
    const before = routeKm(stops, stops.map((_,i)=>i));
    const after = routeKm(stops, order);
    setStops(order.map(i=>stops[i]));
    setOptMsg({ text:t(lang, 'day.opt.saved', { n: Math.max(1, Math.round((before-after)/20*60)) }), sig });
  };

  const legMinutes = (a,b)=>fallbackDriveMin(a,b);

  const [compareId,setCompareId] = useState(null);
  const [moveId,setMoveId] = useState(null);
  const sendToDay = (i, day)=>{
    const o = readTrip(city);
    o.days[activeDay] = [...stops];
    const next = moveStopToDay(o.days, activeDay, i, day);
    try{ localStorage.setItem(tripKey(city), JSON.stringify({ days: next, active: activeDay })); }catch{}
    setStops(next[activeDay] || []);
    setMoveId(null);
  };
  const compareAlts = ()=>{
    const have = new Set(stops.map(x=>x.name));
    return places
      .filter(p=>p.city===city && !have.has(p.name))
      .map(p=>({ ...p, score: reelmapScore({ name:p.name }, { reels, persona }).total }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,3);
  };

  const [embedState,setEmbedState] = useState('loading');
  const [stopIdx,setStopIdx] = useState(null);
  const [detailTab,setDetailTab] = useState('reels');
  const [revSum,setRevSum] = useState({});

  useEffect(()=>{
    const coll = view==='collection' ? (collections.find(x=>x.id===selColl) || collections[0]) : null;
    const collEmbed = coll ? coll.posts.some((p,i)=>selPosts.includes(i) && (reels[p.place]||[]).some(r=>r.embed)) : false;
    const wantEmbed = stops.some(s=>(reels[s.name]||[]).some(r=>r.embed)) || collEmbed;
    if(!wantEmbed || embedState==='failed') return;
    const process = ()=>{ try{ window.instgrm.Embeds.process(); }catch{ setEmbedState('failed'); } };
    const settle = ()=>{ try{ if(window.instgrm) window.instgrm.Embeds.process(); }catch{ /* one-shot re-settle */ } };
    const settleSwap = ()=>{ settle(); swapFailed(); };
    const swapFailed = ()=>{
      document.querySelectorAll('blockquote.instagram-media').forEach((bq)=>{
        if(bq.querySelector('iframe')) return;
        const wrap = bq.closest('[data-reel-tile]');
        if(!wrap || wrap.dataset.swapped) return;
        wrap.dataset.swapped = '1';
        const a = document.createElement('a');
        a.href = wrap.dataset.reelTile; a.target = '_blank'; a.rel = 'noreferrer';
        a.className = 'reel-tile shrink-0';
        a.style.backgroundColor = wrap.dataset.reelColor || '#333';
        a.setAttribute('aria-label', t(lang, 'reels.open', { views: wrap.dataset.reelViews || '' }));
        a.style.cssText += ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:144px;aspect-ratio:9/16;border-radius:14px;color:#fff;position:relative;overflow:hidden;text-decoration:none;align-self:center;';
        a.innerHTML = '<span class="reel-tile-play" aria-hidden="true" style="display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:rgba(255,255,255,0.92);color:#262626;"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4c0 .8.9 1.3 1.6.9l8-5.2c.6-.4.6-1.4 0-1.8l-8-5.2c-.7-.4-1.6.1-1.6.9z"/></svg></span>';
        const pill = document.createElement('span');
        pill.style.cssText = 'display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.94);color:#262626;font-size:12px;font-weight:700;';
        pill.textContent = wrap.dataset.reelViews || '';
        a.appendChild(pill);
        wrap.replaceChildren(a);
        wrap.classList.remove('w-[328px]','max-w-full','reel-card');
        wrap.removeAttribute('style');
      });
    };
    if(window.instgrm){ process(); const t2 = setTimeout(settle, 2500); const t3 = setTimeout(settleSwap, 6000); const t4 = setTimeout(swapFailed, 12000); return ()=>{ clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); }; }
    if(!document.querySelector('script[data-ig-embed]')){
      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js';
      s.async = true;
      s.setAttribute('data-ig-embed','1');
      s.onload = process;
      s.onerror = ()=>setEmbedState('failed');
      document.body.appendChild(s);
    }
    const timer = setTimeout(()=>{ if(!window.instgrm) setEmbedState('failed'); }, 6000);
    const t2 = setTimeout(settle, 2500);
    const t3 = setTimeout(settleSwap, 7000);
    const t4 = setTimeout(swapFailed, 12000);
    return ()=>{ clearTimeout(timer); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  },[stops, embedState, view, selColl, selPosts, stopIdx, detailTab, lang]);

  const [,bumpTripVer] = useState(0);
  const [dayLegs,setDayLegs] = useState({});
  const legsCache = useRef(new Map());
  const sigRef = useRef('');
  const sigDays = readTrip(city).days.map((d,i)=>i===activeDay ? stops : (d||[]));
  const tripSig = `${city}::${JSON.stringify(sigDays.map(d=>d.map(s=>[s.lat,s.lng,s.place_id])))}`;
  useEffect(()=>{
    sigRef.current = tripSig;
    const mySig = tripSig;
    const days = readTrip(city).days.map((d,i)=>i===activeDay ? stops : (d||[]));
    const pruned = {};
    const jobs = [];
    days.forEach((d,di)=>{
      const key = d.length>=2 && d.every(s=>s.lat!=null && s.lng!=null) ? d.map(s=>`${s.lat},${s.lng}`).join(';') : null;
      if(key && legsCache.current.has(key)){ pruned[di] = { key, legs:legsCache.current.get(key) }; return; }
      if(key) jobs.push({ di, key });
    });
    setDayLegs(pruned);
    if(!jobs.length) return;
    let live = true;
    const timer = setTimeout(async ()=>{
      const fresh = {};
      await Promise.all(jobs.map(async ({ di, key })=>{
        try{
          const d = await fetch(`/api/directions?points=${encodeURIComponent(key)}`).then(r=>r.json());
          const legs = Array.isArray(d.legs) ? d.legs : null;
          legsCache.current.set(key, legs);
          if(legs) fresh[di] = { key, legs };
        }catch{ /* keep estimates; do not cache failures */ }
      }));
      if(live && sigRef.current===mySig && Object.keys(fresh).length) setDayLegs(m=>({...m, ...fresh}));
    }, 600);
    return ()=>{ live = false; clearTimeout(timer); };
  },[tripSig, city, activeDay, stops]);
  const liveLegs = (dayLegs[activeDay] && dayLegs[activeDay].legs) || null;

  useEffect(()=>{
    if(view!=='stop' || detailTab!=='reviews') return;
    const s = stops[stopIdx];
    if(!s || revSum[s.place_id]!==undefined) return;
    let live = true;
    (async()=>{
      try{
        let pid = s.place_id || '';
        if(isSyntheticId(pid)){
          const r = await resolvePlace(s.name, city).catch(()=>null);
          if(r?.place_id) pid = r.place_id;
        }
        if(!isSyntheticId(pid)){
          const d = await fetch(`/api/reviews?place_id=${encodeURIComponent(pid)}`).then(r=>r.json());
          if(live) setRevSum(m=>({...m, [s.place_id]: d.summary}));
        } else if(live) setRevSum(m=>({...m, [s.place_id]: null}));
      }catch{ if(live) setRevSum(m=>({...m, [s.place_id]: null})); }
    })();
    return ()=>{ live = false; };
  },[view, stopIdx, detailTab, stops, revSum, city]);

  const legMin = (i)=> liveLegs?.[i]?.drive ?? legMinutes(stops[i], stops[i+1]);
  const totalMin = stops.length>1 ? stops.slice(0,-1).reduce((sum,_,i)=>sum+legMin(i),0) : 0;
  const legLabels = useMemo(()=>stops.slice(0,-1).map((_,i)=>
    liveLegs?.[i]!=null ? formatLeg(liveLegs[i], liveLegs[i].live ?? false) : formatLeg(estimateModes(legMinutes(stops[i], stops[i+1])), false)
  ),[stops, liveLegs]);
  const reelStops = stops.filter(s=>reels[s.name]);
  const reelCount = reelStops.reduce((sum,s)=>sum+Math.min(reels[s.name].length,5),0);
  const tripDays = readTrip(city).days;
  const shareDays = tripDays.map((d,i)=> i===activeDay ? stops : d);
  const waLink = `https://wa.me/?text=${encodeURIComponent(shareTripText({ city, days:shareDays, reels, persona, lang }))}`;

  const dayDrive = (d,i)=>{ const L = dayLegs[i]?.legs; if(L && L.length===d.length-1) return L.reduce((sum,leg)=>sum+(leg.drive||0),0); let total = 0; for(let k=0;k<d.length-1;k++) total += legMinutes(d[k], d[k+1]); return total; };
  const dayBlurb = (d,i)=>dayHighlight(d, { dayNum:i+1, driveMin:dayDrive(d,i), reels, persona, lang });

  const foodContext = (f)=>{
    if(f.lat==null || f.lng==null || !stops.length) return inCityLine(city.toUpperCase(), lang);
    let bi = 0, bd = 1e9;
    stops.forEach((s,i)=>{ const d = km(f.lat,f.lng,s.lat,s.lng); if(d<bd){ bd = d; bi = i; } });
    return nearStopLine(bi+1, Math.max(1, Math.round(bd/5*60)), lang);
  };
  const [foodLive,setFoodLive] = useState({ city:null, byName:{} });
  useEffect(()=>{
    let live = true;
    (restaurants[city]||[]).forEach(r=>{
      resolvePlace(r.name, city).then(d=>{
        if(live && d?.rating!=null) setFoodLive(m=>({ city, byName:{...m.byName, [r.name]: d} }));
      }).catch(()=>{});
    });
    return ()=>{ live = false; };
  },[city]);
  const [liveCat,setLiveCat] = useState({ key:null, list:[] });
  useEffect(()=>{
    const staticN = foodPicksFor(restaurants[city]||[], { category:foodCat, stops, limit:99 }).length;
    const key = `${city}::${foodCat}`;
    if(staticN>=3 || liveCat.key===key) return;
    const c = stops[0] ?? CITY_CENTER[city];
    const timer = setTimeout(async ()=>{
      try{
        const d = await fetch(`/api/food?cat=${encodeURIComponent(foodCat)}&city=${encodeURIComponent(city)}&lat=${c.lat}&lng=${c.lng}`).then(r=>r.json());
        setLiveCat({ key, list:Array.isArray(d) ? d : [] });
      }catch{ setLiveCat({ key, list:[] }); }
    }, 600);
    return ()=>clearTimeout(timer);
  },[city, foodCat, stops, liveCat]);
  const foodPicks = fillPicks(
    foodPicksFor(restaurants[city]||[], { category: foodCat, stops, liveByName: foodLive.city===city ? foodLive.byName : {} }),
    (liveCat.key===`${city}::${foodCat}` ? liveCat.list : [])
      .filter(h=>!stops.length || stops.some(s=>s.lat!=null && s.lng!=null && h.lat!=null && h.lng!=null && km(h.lat,h.lng,s.lat,s.lng)<=FOOD_MAX_KM))
      .map(h=>({ ...h, meal:mealLabel('Nearby', lang), cuisine:t(lang, 'food.cuisine.live'),
      reviews: h.ratings_total!=null ? fmtCount(h.ratings_total) : h.reviews,
      reserve: foodReserveTag({ cat: foodCat, meal: foodCat==='dinner' ? 'dinner' : h.meal, reviews: h.ratings_total }), _live: true })),
    stops, 4);
  const [stayLive,setStayLive] = useState({ city:null, byName:{} });
  useEffect(()=>{
    let live = true;
    (stays[city]||[]).forEach(r=>{
      resolvePlace(r.name, city).then(d=>{
        if(live && d?.rating!=null) setStayLive(m=>({ city, byName:{...m.byName, [r.name]: d} }));
      }).catch(()=>{});
    });
    return ()=>{ live = false; };
  },[city]);
  const stayPicks = notInStops(stays[city]||[], stops)
    .map(r=>{
      const lv = stayLive.city===city ? stayLive.byName[r.name] : undefined;
      return { ...r,
        rating: lv?.rating ?? r.rating,
        reviews: lv?.ratings_total!=null ? fmtCount(lv.ratings_total) : r.reviews };
    })
    .sort((a,b)=>(parseFloat(b.rating)||0)-(parseFloat(a.rating)||0))
    .slice(0,4);

  const I = (paths)=>(
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{paths}</svg>
  );
  const steps = [
    { n:'1', label:t(lang, 'nav.trip'), value: city, action:()=>setView('overview'),
      icon: I(<path d="M2 14V8h3v6M7 14V4h3v10M11 14V9h3v5M1 14h14" />) },
    { n:'2', label:t(lang, 'nav.stops'), value: `${stops.length}`, href:'#stops',
      icon: I(<Fragment><circle cx="4" cy="4" r="2" /><circle cx="12" cy="12" r="2" /><path d="M5.4 5.4l5.2 5.2" /></Fragment>) },
    { n:'4', label:t(lang, 'nav.map'), value: '', href:'#map',
      icon: I(<Fragment><path d="M6 2L2 4v10l4-2 4 2 4-2V2l-4 2-4-2z" /><path d="M6 2v10M10 4v10" /></Fragment>) },
    { n:'5', label:t(lang, 'nav.reels'), value: `${reelCount}`, href:'#reels',
      icon: I(<Fragment><rect x="2" y="2" width="12" height="12" rx="3.5" /><path d="M7 5.8l3.2 2.2L7 10.2z" /></Fragment>) },
    { n:'6', label:t(lang, 'nav.food'), value: `${foodPicks.length}`, href:'#food',
      icon: I(<Fragment><path d="M2 12.5h12" /><path d="M4.5 12.5a3.5 3.5 0 017 0" /><path d="M8 9V7.5" /></Fragment>) },
    { n:'7', label:t(lang, 'nav.stay'), value: `${stayPicks.length}`, action:()=>setView('stays'),
      icon: I(<Fragment><path d="M2 13V5" /><path d="M2 10.5h12V13" /><path d="M6 10.5V8h6v2.5" /></Fragment>) },
  ];

  const col = 'mx-auto w-full max-w-[430px] md:max-w-2xl lg:max-w-3xl px-4';

  // Per-view page hints: numbered dots at anchors + one panel slot per view.
  // First visit auto-opens at step 0; Got-it dismisses per view (persisted).
  const hintList = (view, flags)=>(HINT_KEYS[view]||[]).map(([tk,dk],k)=>({ k, tk, dk })).filter((_,k)=>!flags || flags[k]!==false);
  const hintPosAt = (view)=>{
    if(hintOpen && hintOpen.view===view) return hintOpen.pos;
    return hintsDone[view] ? -1 : 0;
  };
  const scrollHintDot = (view, pos)=>{
    setTimeout(()=>{
      const el = document.getElementById(`hint-${view}-${pos}`);
      if(!el) return;
      const pop = document.getElementById(`hintpop-${view}-${pos}`);
      const r = el.getBoundingClientRect();
      const p = pop ? pop.getBoundingClientRect() : r;
      const top = Math.min(r.top, p.top) - 8, bottom = Math.max(r.bottom, p.bottom) + 8;
      const left = Math.min(r.left, p.left), right = Math.max(r.right, p.right);
      if(top>=0 && bottom<=window.innerHeight && left>=0 && right<=window.innerWidth) return;
      const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      el.scrollIntoView({ behavior: smooth?'smooth':'auto', block:'center' });
    }, 60);
  };
  const openHint = (view, pos)=>{
    setHintOpen(hintPosAt(view)===pos ? { view, pos:-1 } : { view, pos });
    scrollHintDot(view, pos);
  };
  const dismissHints = (view)=>{
    const next = { ...hintsDone, [view]: true };
    setHintsDone(next);
    try{ localStorage.setItem('nomad-hintsdone', JSON.stringify(next)); }catch{}
    if(hintOpen && hintOpen.view===view) setHintOpen(null);
  };
  const replayHints = ()=>{
    try{ localStorage.removeItem('nomad-hintsdone'); }catch{}
    setHintsDone({});
    setHintOpen({ view, pos: 0 });
    setHelpMenu(false);
    scrollHintDot(view, 0);
  };
  const hintListFor = (v)=>{
    if(v==='collections'){
      const n = collections.filter(c=>`${c.name} ${c.city}`.toLowerCase().includes(collQ.trim().toLowerCase())).length;
      return hintList(v, [true, n>0]);
    }
    if(v==='day') return hintList(v, [true, true, true, true, stops.length>2]);
    return hintList(v);
  };
  // Spotlight geometry: re-measured every render plus on scroll/resize so the
  // ring tracks its target; equality-guarded so idle renders don't loop.
  useIsoLayoutEffect(()=>{
    const measure = ()=>{
      if(langPicking || guideOpen || helpMenu || hintsDone[view]){ setSpotRect(prev=>prev===null?prev:null); return; }
      const pos = hintPosAt(view);
      const list = hintListFor(view);
      const cur = pos>=0 && list.length ? list[Math.min(pos, list.length-1)] : null;
      const el = cur ? document.getElementById(`hintsec-${view}-${cur.k}`) : null;
      if(!el){ setSpotRect(prev=>prev===null?prev:null); return; }
      const r = el.getBoundingClientRect();
      const nx = { view, k: cur.k, top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
      setSpotRect(prev=>prev && prev.view===nx.view && prev.k===nx.k && prev.top===nx.top && prev.left===nx.left && prev.w===nx.w && prev.h===nx.h ? prev : nx);
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return ()=>{ window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure); };
  });
  const hintSpotlight = (v, list)=>{
    if(langPicking || guideOpen || helpMenu) return null;
    const pos = hintPosAt(v);
    if(pos<0 || !list.length) return null;
    const cur = list[Math.min(pos, list.length-1)];
    if(!cur || !spotRect || spotRect.view!==v || spotRect.k!==cur.k) return null;
    const pad = 6;
    const geo = { top: spotRect.top-pad, left: spotRect.left-pad, width: spotRect.w+pad*2, height: spotRect.h+pad*2 };
    return (
      <Fragment>
        <div aria-hidden="true" className="hint-dim"
          style={{position:'fixed', zIndex:10, pointerEvents:'none', borderRadius:12, boxShadow:'0 0 0 9999px rgba(25,24,23,0.38)', ...geo}} />
        <div aria-hidden="true"
          style={{position:'fixed', inset:0, zIndex:15}} />
        <div aria-hidden="true" className="hint-ring"
          style={{position:'fixed', zIndex:25, pointerEvents:'none', borderRadius:12, border:'3px solid #fff', boxShadow:'0 0 0 1px rgba(38,38,38,0.3), 0 6px 24px rgba(0,0,0,0.35)', ...geo}} />
      </Fragment>
    );
  };
  const hintDot = (view, list, k, opts={})=>{
    const pos = list.findIndex(h=>h.k===k);
    if(pos<0 || hintsDone[view]) return null;
    const open = hintPosAt(view)===pos;
    const last = pos>=list.length-1;
    const cur = list[pos];
    const dimmed = !open && hintPosAt(view)>=0;
    return (
      <span className={`relative inline-flex shrink-0 pointer-events-auto z-30 ${dimmed?'opacity-40':''}`}>
        <button id={`hint-${view}-${pos}`} onClick={()=>openHint(view, pos)}
          aria-label={t(lang, 'guide.step', { n: pos+1, total: list.length })}
          className="hint-dot tnum"
          style={{position:'relative', zIndex:1, display:'grid', placeItems:'center', width:22, height:22, borderRadius:999,
            backgroundColor:ACCENT.bg, color:'#fff', fontSize:12, fontWeight:800, lineHeight:1, cursor:'pointer',
            boxShadow: open ? '0 0 0 3px #fff, 0 0 0 5px var(--color-igpink)' : '0 0 0 2px #fff, 0 1px 4px rgba(38,38,38,0.35)',
            transform: open ? 'scale(1.2)' : undefined, animationDelay:`${pos*90}ms`}}>
          <span className="hint-ping" aria-hidden="true"
            style={{position:'absolute', inset:0, borderRadius:999, border:`2px solid ${ACCENT.bg}`, pointerEvents:'none'}} />
          {pos+1}
        </button>
        {open && (
          <div id={`hintpop-${view}-${pos}`} className="animate-pop absolute rounded-lg border border-hairline bg-white p-3 text-left"
            style={{width:280, maxWidth:'78vw', boxShadow:'0 24px 48px -12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2), 0 0 0 2px #fff',
              ...(opts.above ? { bottom:'calc(100% + 8px)' } : { top:'calc(100% + 8px)' }),
              ...(opts.align==='right' ? { right:0 } : { left:0 })}}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{t(lang, cur.tk)}</div>
                <p className="text-[13px] mt-0.5 opacity-80 leading-snug">{t(lang, cur.dk)}</p>
              </div>
              <button onClick={()=>setHintOpen({ view, pos:-1 })} aria-label={t(lang, 'chat.close')}
                className="text-base leading-none opacity-50 px-1 shrink-0">×</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] tnum opacity-60 mr-auto">{t(lang, 'guide.step', { n: pos+1, total: list.length })}</span>
              {pos>0 && (
                <button onClick={()=>{ setHintOpen({ view, pos: pos-1 }); scrollHintDot(view, pos-1); }}
                  className="h-8 px-3 border border-hairline bg-white rounded-lg text-xs font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'guide.back')}</button>
              )}
              {!last ? (
                <button onClick={()=>{ setHintOpen({ view, pos: pos+1 }); scrollHintDot(view, pos+1); }}
                  style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
                  className="h-8 px-3 rounded-lg text-xs font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'guide.next')}</button>
              ) : (
                <button onClick={()=>dismissHints(view)}
                  style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
                  className="h-8 px-3 rounded-lg text-xs font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'hint.gotit')}</button>
              )}
            </div>
            {!last && (
              <button onClick={()=>dismissHints(view)} className="mt-1.5 text-[11px] text-igblue font-semibold">{t(lang, 'hint.gotit')}</button>
            )}
          </div>
        )}
      </span>
    );
  };

  const masthead = (sub)=>(
    <header className="bg-white border-b border-hairline">
      <div className={`${col} py-3 flex items-baseline justify-between gap-3`}>
        <div className="font-bold text-xl tracking-tight">Nomad</div>
        <div className="flex items-center gap-2">
          <div className="text-xs opacity-60">{sub}</div>
          <button onClick={()=>setHelpMenu(true)} aria-label={t(lang, 'guide.help')}
            className="text-[11px] font-bold border border-hairline rounded-full w-6 h-6 grid place-items-center t-ink">?</button>
          <button onClick={()=>setLangPicking(true)} aria-label="Language"
            className="text-[11px] font-bold border border-hairline rounded-full px-2 py-0.5 t-ink">{(lang||'en').toUpperCase()}</button>
        </div>
      </div>
      <div className="h-1 ig-gradient" />
      {hintSpotlight(view, hintListFor(view))}
      {helpMenu && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label={t(lang, 'guide.help')}>
          <div className="absolute inset-0 bg-black/40" onClick={()=>setHelpMenu(false)} />
          <div className={`${col} absolute top-0 left-0 right-0 pt-3`}>
            <div className="animate-pop bg-white rounded-xl border border-hairline shadow-xl p-3 flex flex-col gap-2">
              <button onClick={()=>{ setHelpMenu(false); setGuideStep(0); setGuideOpen(true); }}
                style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
                className="w-full h-12 rounded-lg font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'guide.menu.how')}</button>
              <button onClick={replayHints}
                className="w-full h-12 rounded-lg font-semibold border border-hairline bg-white t-ink motion-safe:active:scale-[0.98]">{t(lang, 'guide.menu.hints')}</button>
              <button onClick={()=>setHelpMenu(false)}
                className="w-full py-1 text-sm text-igblue font-semibold">{t(lang, 'chat.close')}</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );

  const collPic = (seed, cls, thumb)=>(
    !deadPics[seed] ? (
      <div className={`relative overflow-hidden bg-hairline ${cls}`}>
        <Image src={thumb && !deadPics['t:'+seed] ? thumb : `https://picsum.photos/seed/${seed}/300/300`} alt=""
          fill sizes="120px" className="object-cover"
          onError={()=>setDeadPics(p=>({...p, ...(thumb && !p['t:'+seed] ? { ['t:'+seed]:1 } : { [seed]:1 })}))} />
      </div>
    ) : null
  );

  if(langPicking || !lang){
    const pick = (code)=>{ try{ localStorage.setItem('nomad-lang', code); }catch{} setLang(code); setLangPicking(false); };
    return (
      <div key="lang" className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(t(lang||'en', 'mast.saved'))}
        <main className={`${col} pb-4`}>
          <h2 className="font-bold text-3xl tracking-tight mt-8">{t(lang||'en', 'gate.title')}</h2>
          <p className="text-sm opacity-60 mt-1">{t(lang||'en', 'gate.sub')}</p>
          <div className="mt-4 flex flex-col gap-2">
            {LOCALES.map(l=>(
              <button key={l.code} onClick={()=>pick(l.code)}
                className={`w-full h-14 border rounded-lg font-semibold text-lg t-ink motion-safe:active:scale-[0.99] ${lang===l.code ? 'border-ink bg-white' : 'border-hairline bg-white'}`}>
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={()=>setLangPicking(false)} className="mt-4 text-sm text-igblue font-semibold">{t(lang||'en', 'gate.back')}</button>
          <p className="text-xs opacity-60 mt-4">{t(lang||'en', 'gate.note')}</p>
        </main>
      </div>
    );
  }

  if(guideOpen){
    const total = GUIDE_STEP_KEYS.length;
    const step = Math.min(guideStep, total-1);
    const [titleKey, descKey] = GUIDE_STEP_KEYS[step];
    const closeGuide = ()=>{ try{ localStorage.setItem('nomad-guide-seen','1'); }catch{} setGuideStep(0); setGuideOpen(false); };
    return (
      <div key="guide" className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(t(lang, 'guide.top'))}
        <main className={`${col} pb-4`}>
          <p className="font-mono text-[11px] tnum mt-8 opacity-60">{t(lang, 'guide.step', { n: step+1, total })}</p>
          <h2 className="font-bold text-3xl tracking-tight mt-1">{t(lang, titleKey)}</h2>
          <p className="text-sm mt-2 opacity-80 leading-relaxed">{t(lang, descKey)}</p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {GUIDE_STEP_KEYS.map((_,i)=>(
              <span key={i} className="h-1.5 flex-1 rounded-full" style={{backgroundColor: i===step ? ACCENT.bg : 'var(--color-hairline)'}} />
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            {step>0 && (
              <button onClick={()=>setGuideStep(step-1)}
                className="h-12 px-5 border border-hairline bg-white rounded-lg font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'guide.back')}</button>
            )}
            <button onClick={()=>{ if(step<total-1) setGuideStep(step+1); else closeGuide(); }}
              style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
              className="flex-1 h-12 font-semibold rounded-lg t-ink motion-safe:active:scale-[0.98]">
              {step<total-1 ? t(lang, 'guide.next') : t(lang, 'guide.start')}
            </button>
          </div>
          <button onClick={closeGuide} className="mt-4 text-sm text-igblue font-semibold">{t(lang, 'guide.skip')}</button>
        </main>
      </div>
    );
  }

  if(view==='collections'){
    const shown = collections.filter(c=>`${c.name} ${c.city}`.toLowerCase().includes(collQ.trim().toLowerCase()));
    const collsList = hintList('collections', [true, shown.length>0]);
    return (
      <div key="collections" className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(t(lang, 'mast.saved'))}
        <main className={`${col} pb-4`}>
          <section className="pt-6">
            <h2 className="font-bold text-3xl tracking-tight">{t(lang, 'coll.title')}</h2>
            <p className="text-sm opacity-60 mt-1">{t(lang, 'coll.sub')}</p>
            <div className="relative mt-4" id="hintsec-collections-0">
              <input value={collQ} onChange={e=>setCollQ(e.target.value)}
                placeholder={t(lang, 'coll.search')}
                className="w-full h-12 bg-white border border-hairline rounded-lg px-4 font-medium placeholder:text-ink/50" />
              <span className="absolute right-3 top-0 bottom-0 flex items-center">{hintDot('collections', collsList, 0, { align:'right' })}</span>
            </div>
            <div className="mt-2 flex flex-col gap-2 relative" id="hintsec-collections-1">
              <span className="absolute -top-2 right-2">{hintDot('collections', collsList, 1, { align:'right' })}</span>
              {shown.map(c=>(
                <button key={c.id} onClick={()=>{ setSelColl(c.id); setSelPosts(c.posts.map((_,i)=>i)); setPlanDays(readTrip(c.city).days.length); setView('collection'); }}
                  className="w-full flex items-center gap-3 border border-hairline bg-white rounded-lg p-3 text-left t-ink motion-safe:active:scale-[0.99]">
                    <div className="flex shrink-0">
                      {c.posts.slice(0,3).map((p,i)=>(
                        <Fragment key={i}>{collPic(p.img, `w-14 h-14 ${i>0 ? '-ml-5 ring-2 ring-white' : ''}`, `/thumbs/${c.id}-${i}.jpg`)}</Fragment>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs opacity-60">{postsUnit(c.posts.length, lang)} · {c.city}</div>
                    </div>
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M1 1l7 7-7 7" />
                    </svg>
                </button>
              ))}
              {shown.length===0 && (
                <div className="border border-hairline rounded-lg bg-white px-4 py-3 text-sm opacity-60">{t(lang, 'coll.empty')}</div>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if(view==='collection'){
    const c = collections.find(x=>x.id===selColl) || collections[0];
    const o = readTrip(c.city);
    const picks = c.posts.filter((_,i)=>selPosts.includes(i));
    const newAny = picks.filter(p=>!o.days.some(d=>d.some(s=>s.name===p.place))).length;
    const collnList = hintList('collection');
    return (
      <div key={`coll-${c.id}`} className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(t(lang, 'mast.saved'))}
        <main className={`${col} pb-4`}>
          <button onClick={()=>setView('collections')}
            className="mt-4 text-sm text-igblue font-semibold">{t(lang, 'colln.back')}</button>
          <h2 className="font-bold text-3xl tracking-tight mt-2">{c.name}</h2>
          <p className="text-sm opacity-60 mt-1">{postsUnit(c.posts.length, lang)} · {c.city}</p>
          <div className="mt-4 flex items-center gap-3" id="hintsec-collection-0">
            <span className="text-xs opacity-60">{t(lang, 'colln.days')}</span>
            <button onClick={()=>setPlanDays(Math.max(1, planDays-1))}
              disabled={planDays<=1}
              className="w-9 h-9 border border-hairline bg-white rounded-lg text-lg leading-none disabled:opacity-30 t-ink motion-safe:active:scale-95">−</button>
            <span className="font-bold text-3xl tnum w-8 text-center">{planDays}</span>
            <button onClick={()=>setPlanDays(Math.min(7, planDays+1))}
              disabled={planDays>=7}
              className="w-9 h-9 border border-hairline bg-white rounded-lg text-lg leading-none disabled:opacity-30 t-ink motion-safe:active:scale-95">+</button>
            {hintDot('collection', collnList, 0)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px bg-hairline border border-hairline relative" id="hintsec-collection-1">
            <span className="absolute top-2 right-2">{hintDot('collection', collnList, 1, { align:'right' })}</span>
            {c.posts.map((p,i)=>{
              const on = selPosts.includes(i);
              const tkey = `t:${c.id}-${i}`;
              const thumb = `/thumbs/${c.id}-${i}.jpg`;
              const psrc = `https://picsum.photos/seed/${p.img}/300/300`;
              return (
                <button key={i} onClick={()=>setSelPosts(on ? selPosts.filter(x=>x!==i) : [...selPosts, i])}
                  className="bg-white text-left">
                  <div className="relative aspect-square">
                    {!deadPics[p.img] && (
                      <Image src={deadPics[tkey] ? psrc : thumb} alt={p.place}
                        fill sizes="(max-width: 768px) 33vw, 220px" className={`object-cover ${on?'':'opacity-40'}`}
                        onError={()=>setDeadPics(x=>(!x[tkey] ? {...x, [tkey]:1} : {...x, [p.img]:1}))} />
                    )}
                    <span className={`absolute top-1 right-1 w-5 h-5 rounded-full grid place-items-center ${on?'bg-igblue text-white':'border border-white/80'}`} aria-hidden="true">
                      {on && (<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 5l3 3 5-6" /></svg>)}
                    </span>
                  </div>
                  <div className="px-1.5 py-1 text-[11px] font-medium truncate">{p.place}</div>
                </button>
              );
            })}
          </div>
          {picks.some(p=>reels[p.place]?.length) && (
            <section className="mt-8">
              <h3 className="font-bold text-xl tracking-tight">{t(lang, 'colln.reels')}</h3>
              {picks.filter(p=>reels[p.place]?.length).map((p,idx)=>(
                <div key={`${p.place}-${idx}`} className="mt-4">
                  <div className="font-semibold">{p.place}</div>
                  <ReelRail name={p.place} embedState={embedState} lang={lang} />
                </div>
              ))}
            </section>
          )}
          <div className={`sticky bottom-0 z-20 bg-ground pt-2 pb-4 mt-4 flex flex-col gap-2 ${hintPosAt('collection')>=0?'pointer-events-none':''}`}>
            <div className="relative" id="hintsec-collection-2">
              <span className="absolute -top-2 right-3">{hintDot('collection', collnList, 2, { align:'right', above:true })}</span>
              <button onClick={()=>planFromCollection(c, selPosts)} disabled={picks.length===0}
                style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
                className="w-full h-12 font-semibold rounded-lg t-ink motion-safe:active:scale-[0.98] disabled:opacity-40">
                {picks.length===0 ? t(lang, 'colln.plan.none') : newAny>0 ? t(lang, 'colln.plan.new', { n: newAny }) : t(lang, 'colln.plan.some')}
              </button>
            </div>
            <div className="relative" id="hintsec-collection-3">
              <span className="absolute -top-2 right-3">{hintDot('collection', collnList, 3, { align:'right', above:true })}</span>
              <button onClick={()=>autoCreate(c)} disabled={picks.length===0}
                className="w-full h-11 bg-white border border-hairline rounded-lg font-semibold t-ink motion-safe:active:scale-[0.98] disabled:opacity-40">
                {t(lang, 'colln.auto', { days: daysUnit(planDays, lang) })}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if(view==='overview'){
    const coll = collections.find(x=>x.id===tripColl);
    const tripName = coll ? coll.name : t(lang, 'trip.fallback', { city });
    const takenCovers = new Set();
    const coverStop = (d)=>{
      if(!d.length) return null;
      const pick = d.find(s=>!takenCovers.has((s.name||'').toLowerCase())) || d[0];
      takenCovers.add((pick.name||'').toLowerCase());
      return pick.name;
    };
    const coverFor = (d,i)=>{
      const pinned = coll && Array.isArray(coll.covers) ? coll.covers[i] : null;
      if(typeof pinned==='string' && /^https?:\/\//.test(pinned)) return { direct:pinned };
      if(pinned){ takenCovers.add(pinned.toLowerCase()); return { name:pinned }; }
      return { name:coverStop(d) };
    };
    const driveTotal = tripDays.reduce((sum,d,i)=>sum+dayDrive(d,i),0);
    const tripTips = tripHighlights({ days:tripDays, reels, persona, legMin:legMinutes, lang });
    const ovList = hintList('overview');
    return (
      <div key="overview" className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(`${tripName} · ${daysUnit(dayCount, lang)}`)}
        <main className={`${col} pb-4`}>
          <button onClick={()=>{ if(coll){ setSelColl(coll.id); setPlanDays(readTrip(coll.city).days.length); setView('collection'); } else setView('collections'); }}
            className="mt-4 text-sm text-igblue font-semibold">‹ {coll ? coll.name : t(lang, 'mast.saved')}</button>
          <section className="pt-4">
            <h2 className="font-bold text-3xl tracking-tight">{tripName}</h2>
            <p className="text-sm opacity-60 mt-1">{city} · {daysUnit(dayCount, lang)} · {t(lang, 'ov.tap')}</p>
            <div className="flex items-center gap-2 mt-6">
              <h3 className="font-bold text-xl tracking-tight">{t(lang, 'ov.days')}</h3>
              {hintDot('overview', ovList, 0)}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs opacity-60">{t(lang, 'colln.days')}</span>
              <button onClick={()=>changeDayCount(dayCount-1)}
                disabled={dayCount<=1}
                className="w-9 h-9 border border-hairline bg-white rounded-lg text-lg leading-none disabled:opacity-30 t-ink motion-safe:active:scale-95">−</button>
              <span className="font-bold text-3xl tnum w-8 text-center">{dayCount}</span>
              <button onClick={()=>changeDayCount(dayCount+1)}
                disabled={dayCount>=7}
                className="w-9 h-9 border border-hairline bg-white rounded-lg text-lg leading-none disabled:opacity-30 t-ink motion-safe:active:scale-95">+</button>
            </div>
            <section className="mt-4 border border-hairline bg-white rounded-lg p-4" id="hintsec-overview-1">
              <div className="flex items-center gap-2">
                <div className="font-mono text-[11px] uppercase opacity-60">{t(lang, 'ov.summary')}</div>
                {hintDot('overview', ovList, 1)}
              </div>
              <div className="font-semibold mt-1">{tripHeadline({ city, days:tripDays, driveMin:driveTotal, reels, persona, lang })}</div>
              {tripTips.length>0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {tripTips.map((tip,i)=>(<li key={i} className="text-xs opacity-80">• {tip}</li>))}
                </ul>
              )}
            </section>
            <div className="mt-4 flex flex-col gap-2" id="hintsec-overview-0">
              {tripDays.map((d,i)=>{
                const cover = coverFor(d,i);
                const q = cover.name ? `${cover.name} ${city}` : city;
                const pk = cover.name ? 0 : i;
                return (
                <button key={i} onClick={()=>{ selectDay(i); setView('day'); }}
                  className="w-full flex border border-hairline bg-white rounded-lg overflow-hidden text-left t-ink motion-safe:active:scale-[0.99]">
                  <div className="w-32 md:w-48 shrink-0 relative self-stretch min-h-24 bg-hairline">
                    <DayCover key={cover.direct || `${q}::${pk}`} title={q} pick={pk} direct={cover.direct||null} seed={`${CITY_SLUG[city]}-d${i+1}`} genPlace={cover.name||null} genCity={city} />
                  </div>
                  <div className="p-3 flex-1 min-w-0">
                    <div className="font-bold text-xl">{dayName(i+1, lang)}</div>
                    <div className="text-xs mt-1 opacity-60 line-clamp-2">{dayBlurb(d,i)}</div>
                  </div>
                  <div className="self-center pr-3 shrink-0" aria-hidden="true">
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 1l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                );
              })}
            </div>
          </section>
        </main>

        <div className={`${col} mt-8 relative`} id="hintsec-overview-2">
          <span className="absolute -top-2 right-2">{hintDot('overview', ovList, 2, { align:'right' })}</span>
          <a href={waLink} target="_blank" rel="noreferrer"
            style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
            className="flex h-12 items-center justify-center rounded-lg font-semibold t-ink motion-safe:active:scale-[0.98]">
            {t(lang, 'ov.share')}
          </a>
        </div>

        <footer className="mt-16 border-t border-hairline bg-white">
          <div className={`${col} py-4 font-mono text-[11px] tnum flex justify-between gap-3`}>
            <span>NOMAD</span>
            <span>{city.toUpperCase()} · {footDays(dayCount, lang)}</span>
          </div>
        </footer>
        <div className={hintPosAt('overview')>=0?'hidden':''}>
          <ChatWidget trip={{ city, days: tripDays.map(d=>d.map(s=>({ name:s.name, rating:s.rating ?? null }))), food: foodPicks.map(f=>({ name:f.name })), persona }} lang={lang} onEditStart={resolveEdit} onEditApply={applyEdit} />
        </div>
      </div>
    );
  }

  if(view==='stop'){
    const s = stops[stopIdx];
    const stopList = hintList('stop');
    if(!s){
      return (
        <div className="min-h-screen bg-ground text-ink font-sans">
          {masthead(`${city} · ${dayName(activeDay+1, lang)}`)}
          <main className={`${col} pb-4`}>
            <button onClick={()=>setView('day')} className="mt-4 text-sm text-igblue font-semibold">{t(lang, 'stop.back')}</button>
            <div className="mt-4 text-sm opacity-60">{t(lang, 'stop.missing')}</div>
          </main>
        </div>
      );
    }
    const ratingBit = s.rating!=null
      ? `${s.rating}${s.ratings_total!=null ? ` · ${fmtCount(s.ratings_total)} Google reviews` : ' Google'}`
      : t(lang, 'stop.norating');
    const stopTag = stopReserveTag({ name: s.name, ratings_total: s.ratings_total, views: sumReelViews(s.name, reels) });
    return (
      <div key={`stop-${s.place_id}`} className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(`${city} · ${dayName(activeDay+1, lang)}`)}
        <main className={`${col} pb-4`}>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button onClick={()=>setView('day')} className="text-sm text-igblue font-semibold shrink-0">‹ {dayName(activeDay+1, lang)}</button>
            <div className="flex gap-2 shrink-0 items-center" id="hintsec-stop-0">
              <button onClick={()=>setStopIdx(Math.max(0,stopIdx-1))} disabled={stopIdx<=0}
                className="h-8 px-3 rounded-lg border border-hairline bg-white text-xs font-semibold disabled:opacity-30">{t(lang, 'stop.prev')}</button>
              <button onClick={()=>setStopIdx(Math.min(stops.length-1,stopIdx+1))} disabled={stopIdx>=stops.length-1}
                className="h-8 px-3 rounded-lg border border-hairline bg-white text-xs font-semibold disabled:opacity-30">{t(lang, 'stop.next')}</button>
              {hintDot('stop', stopList, 0, { align:'right' })}
            </div>
          </div>
          <p className="font-mono text-[11px] tnum mt-4 opacity-60">{stopOfLine(stopIdx+1, stops.length, activeDay+1, lang)}</p>
          <h2 className="font-bold text-3xl tracking-tight mt-1">{s.name}</h2>
          <p className="text-sm mt-1 opacity-70">{ratingBit} · {categoryFor(s.name, lang)}{stopTag ? ` · ${reserveLabel(stopTag, lang)}` : ''}</p>
          <div className="mt-4 flex border-b border-hairline" id="hintsec-stop-1">
            {['reels','reviews'].map(tab=>(
              <button key={tab} onClick={()=>setDetailTab(tab)}
                className={`px-4 py-2 text-sm font-semibold capitalize -mb-px ${detailTab===tab ? 'border-b-2 border-ink' : 'opacity-50'}`}>{t(lang, tab==='reels' ? 'stop.tab.reels' : 'stop.tab.reviews')}</button>
            ))}
            <span className="ml-2 self-center">{hintDot('stop', stopList, 1)}</span>
          </div>
          {detailTab==='reels' ? (
            (reels[s.name]?.length) ? <ReelRail name={s.name} embedState={embedState} lang={lang} /> : (
              <div className="mt-4 border border-dashed border-ink/30 rounded-lg px-4 py-6 text-xs opacity-60">{t(lang, 'stop.noreels')}</div>
            )
          ) : revSum[s.place_id]===undefined ? (
            <div className="mt-4 text-xs opacity-60">{t(lang, 'stop.rev.loading')}</div>
          ) : revSum[s.place_id] ? (
            <div className="mt-4">
              <div className="font-mono text-[11px] uppercase opacity-60">{t(lang, 'stop.rev.title')}</div>
              <p className="text-sm mt-1">{revSum[s.place_id]}</p>
            </div>
          ) : (
            <div className="mt-4 border border-dashed border-ink/30 rounded-lg px-4 py-6 text-xs opacity-60">{t(lang, 'stop.rev.none')}</div>
          )}
        </main>
      </div>
    );
  }

  if(view==='stays'){
    const stayList = hintList('stays');
    return (
      <div key="stays" className="min-h-screen bg-ground text-ink font-sans animate-view">
        {masthead(`${city} · Day ${activeDay+1}`)}
        <main className={`${col} pb-4`}>
          <button onClick={()=>setView('day')}
            className="mt-4 text-sm text-igblue font-semibold">‹ {dayName(activeDay+1, lang)}</button>
          <h2 className="font-bold text-3xl tracking-tight mt-2">{t(lang, 'day.addstay')}</h2>
          <p className="text-xs opacity-60 mt-1">{t(lang, 'stay.sub', { city })}</p>
          <div className="mt-3 border border-hairline bg-white rounded-lg px-4 py-3" id="hintsec-stays-1">
            <div className="flex items-center gap-2">
              <div className="font-mono text-[11px] uppercase opacity-60">{t(lang, 'stay.tip')}</div>
              {hintDot('stays', stayList, 1)}
            </div>
            <p className="text-xs mt-1 opacity-80">{t(lang, 'stay.tip1')}</p>
            <p className="text-xs mt-1 opacity-80">{t(lang, 'stay.tip2')}</p>
          </div>
          <div className="mt-4">
            <div className="relative" id="hintsec-stays-0">
              <input value={stayQ} onChange={e=>onTypeStay(e.target.value)}
                placeholder={t(lang, 'stay.search')}
                className="w-full h-12 bg-white border border-hairline rounded-lg px-4 font-medium placeholder:text-ink/50" />
              <span className="absolute right-3 top-0 bottom-0 flex items-center">{hintDot('stays', stayList, 0, { align:'right' })}</span>
            </div>
            {(staySearching || stayQ.length>=2) && (
              <div className="border border-t-0 border-hairline rounded-b-lg bg-white overflow-hidden">
                {staySearching && <div className="px-4 py-2 text-xs opacity-60">{t(lang, 'day.searching')}</div>}
                {!staySearching && stayResults.length===0 && <div className="px-4 py-2 text-xs opacity-60">{t(lang, 'stay.none')}</div>}
                {!staySearching && stayResults.map(r=>(
                  <button key={r.place_id || r.name} onClick={()=>addStay(r)}
                    className="w-full text-left px-4 py-2 border-b border-hairline last:border-0 hover:bg-ground">
                    <div className="font-semibold">{r.name}{r.rating!=null && <span className="font-normal"> · <span className="font-bold">{r.rating}</span> <span className="text-xs opacity-60">Google</span></span>}</div>
                    <div className="text-xs opacity-60">{r.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div id="hintsec-stays-2">
          <div className="flex items-center gap-2 mt-8">
            <h3 className="font-bold text-xl tracking-tight">{t(lang, 'stay.picks')}</h3>
            {hintDot('stays', stayList, 2)}
          </div>
          {stayPicks.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {stayPicks.map((r,idx)=>(
              <div key={idx} className="border border-hairline bg-white rounded-lg p-3 animate-pop">
                <div className="font-mono text-[10px] uppercase opacity-60 truncate">{r.price} · {foodContext(r)}</div>
                <div className="font-semibold truncate mt-0.5">{r.name}</div>
                <div className="text-[11px] mt-0.5 opacity-60">{r.area}</div>
                <div className="text-[11px]"><span className="font-bold">{r.rating}</span><span className="opacity-60"> Google review ({r.reviews})</span></div>
                <button onClick={()=>addStay(r)}
                  aria-label={t(lang, 'stay.add', { name: r.name })}
                  title={t(lang, 'stay.add', { name: r.name })}
                  style={{backgroundColor:'#0095F6', color:'#fff'}}
                  className="mt-2 h-7 w-7 grid place-items-center rounded-full t-ink motion-safe:active:scale-95">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" /></svg>
                </button>
              </div>
            ))}
          </div>
          ) : (
            <div className="mt-3 border border-dashed border-ink/30 rounded-lg px-4 py-6 text-xs opacity-60">{t(lang, 'common.added')}</div>
          )}
          </div>
          {stayPicks.length>0 && !stayPicks.every(r=>(stayLive.city===city ? stayLive.byName[r.name] : undefined)?.rating!=null) && (
            <p className="text-[11px] opacity-50 mt-1">{t(lang, 'common.sample')}</p>
          )}
        </main>
      </div>
    );
  }

  const dayList = hintList('day', [true, true, true, true, stops.length>2]);

  return (
    <div key={`day-${activeDay}`} className="min-h-screen bg-ground text-ink font-sans animate-view">
      {masthead(`${city} · ${dayName(activeDay+1, lang)}`)}

      <div className={`sticky top-0 z-20 ${hintPosAt('day')>=0?'pointer-events-none':''}`}>
      <div className="border-b border-hairline bg-white relative" id="hintsec-day-0">
        <div className={`${col} flex items-center gap-1 py-2 overflow-x-auto rail-scroll`}>
          <button onClick={()=>setView('overview')}
            className="text-sm text-igblue font-semibold mr-2 shrink-0">{t(lang, 'day.alldays')}</button>
          {tripDays.map((_,i)=>(
            <button key={i} onClick={()=>selectDay(i)}
              className={`w-8 h-8 font-mono text-xs tnum rounded-full shrink-0 t-ink motion-safe:active:scale-95`}
              style={i===activeDay
                ? {backgroundColor:ACCENT.bg, color:ACCENT.fg}
                : {backgroundColor:'transparent', color:'var(--color-ink)', border:'1px solid var(--color-hairline)'}}>{i+1}</button>
          ))}
        </div>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10">{hintDot('day', dayList, 0, { align:'right' })}</span>
      </div>

      <nav className="bg-ground border-b border-hairline relative" id="hintsec-day-1">
        <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10">{hintDot('day', dayList, 1, { align:'right' })}</span>
        <div className={`${col} flex items-center gap-2 overflow-x-auto rail-scroll py-2`}>
          {steps.map(s=>s.action ? (
            <button key={s.n} onClick={s.action} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-hairline bg-white shrink-0 t-ink motion-safe:active:scale-95">
              {s.icon}
              {s.value!=='' ? (<Fragment><span className="text-[10px] uppercase tracking-wider opacity-60 whitespace-nowrap">{s.label}</span><span className="font-semibold text-base whitespace-nowrap">{s.value}</span></Fragment>) : (<span className="font-semibold text-base whitespace-nowrap">{s.label}</span>)}
            </button>
          ) : (
            <a key={s.n} href={s.href} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-hairline bg-white shrink-0 t-ink motion-safe:active:scale-95">
              {s.icon}
              {s.value!=='' ? (<Fragment><span className="text-[10px] uppercase tracking-wider opacity-60 whitespace-nowrap">{s.label}</span><span className="font-semibold text-base whitespace-nowrap">{s.value}</span></Fragment>) : (<span className="font-semibold text-base whitespace-nowrap">{s.label}</span>)}
            </a>
          ))}
        </div>
      </nav>
      </div>

      <main className={`${col} pb-4`}>
        <section id="stops" className="pt-8 scroll-mt-24">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-3xl tracking-tight">{t(lang, 'day.build')}</h2>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <button id="hintsec-day-3" onClick={()=>setView('stays')}
                  className="h-9 px-4 rounded-full border border-hairline bg-white text-sm font-semibold shrink-0 t-ink motion-safe:active:scale-95">{t(lang, 'day.addstay')}</button>
                {hintDot('day', dayList, 3, { align:'right' })}
                {stops.length>2 && (
                  <Fragment>
                  <button id="hintsec-day-4" onClick={optimizeDay}
                    style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
                    className="h-9 px-4 rounded-lg text-sm font-semibold shrink-0 t-ink motion-safe:active:scale-95 flex items-center gap-1.5">{I(<path d="M9 1.5L4 9h3L6 14.5 12 7H8.5Z" />)}{t(lang, 'day.optimize')}</button>
                  {hintDot('day', dayList, 4, { align:'right' })}
                  </Fragment>
                )}
              </div>
              <span className="text-[11px] opacity-60 self-start">{t(lang, 'day.staysnear')}</span>
            </div>
          </div>
          {optMsg && optMsg.sig===stops.map(s=>s.place_id).join(',') && (
            <div className="font-mono text-[11px] tnum mt-1 opacity-70">{optMsg.text}</div>
          )}
          {stops.length>1 && (
            <div className="font-mono text-[11px] tnum opacity-70">{totalDriveLine(totalMin, lang)}</div>
          )}
          <div className="mt-4">
            <div className="relative" id="hintsec-day-2">
              <input value={q} onChange={e=>onType(e.target.value)}
                placeholder={t(lang, 'day.search.try', { place: city==='New York' ? 'Times Square' : city==='Chicago' ? 'Cloud Gate' : city==='Italy' ? 'Colosseum' : city==='Mumbai' ? 'Gateway of India' : 'South Beach' })}
                className="w-full h-12 bg-white border border-hairline rounded-lg px-4 font-medium placeholder:text-ink/50" />
              <span className="absolute right-3 top-0 bottom-0 flex items-center">{hintDot('day', dayList, 2, { align:'right' })}</span>
            </div>
            {(searching || q.length>=2) && (
              <div className="border border-t-0 border-hairline rounded-b-lg bg-white overflow-hidden">
                {searching && <div className="px-4 py-2 text-xs opacity-60">{t(lang, 'day.searching')}</div>}
                {!searching && results.length===0 && <div className="px-4 py-2 text-xs opacity-60">{t(lang, 'day.nostops')}</div>}
                {!searching && results.map(r=>(
                  <button key={r.place_id} onClick={()=>addStop(r)}
                    className="w-full text-left px-4 py-2 border-b border-hairline last:border-0 hover:bg-ground">
                    <div className="font-semibold">{r.name}{r.rating!=null && <span className="font-normal"> · <span className="font-bold">{r.rating}</span> <span className="text-xs opacity-60">Google</span></span>}</div>
                    <div className="text-xs opacity-60">{r.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div key={`list-${activeDay}`} ref={listRef} className="mt-6 relative animate-view">
            {stops.length===0 && (
              <div className="border border-dashed border-ink/30 rounded-lg px-4 py-8 text-center">
                <div className="font-semibold text-xl">{t(lang, 'day.empty')}</div>
                <div className="text-xs mt-1 opacity-60">{t(lang, 'day.emptyhint')}</div>
              </div>
            )}
            {stops.length>0 && (
              <div className="absolute top-2 bottom-2 w-2 t-ink" style={{left:42, backgroundColor:ACCENT.bg}} aria-hidden="true" />
            )}
            {stops.map((s,i)=>(
              <Fragment key={i}>
                <div data-row className={`relative flex items-center gap-3 py-2 ${dragging===i?'opacity-60':''}`}>
                  <div onPointerDown={(e)=>startDrag(e,i)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
                    className="touch-none cursor-grab px-1 opacity-70 hover:opacity-100" title={t(lang, 'day.grip')}>
                    <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" aria-hidden="true">
                      <circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/>
                      <circle cx="3" cy="10" r="1.6"/><circle cx="9" cy="10" r="1.6"/>
                      <circle cx="3" cy="17" r="1.6"/><circle cx="9" cy="17" r="1.6"/>
                    </svg>
                  </div>
                  <div className="w-7 h-7 grid place-items-center font-bold text-base tnum shrink-0 relative z-10 rounded-full t-ink"
                    style={{backgroundColor:ACCENT.bg, color:ACCENT.fg, boxShadow:'0 0 0 3px var(--color-ground)'}}>{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <button onClick={()=>{ setStopIdx(i); setDetailTab('reels'); setView('stop'); }}
                      className="font-semibold text-lg leading-tight truncate text-left block w-full">{s.name}</button>
                    <div className="text-[11px]">
                      <StopRating stop={s} city={city} views={sumReelViews(s.name, reels)} lang={lang} />
                      <button onClick={()=>setCompareId(compareId===s.place_id?null:s.place_id)} className="text-igblue font-semibold">{t(lang, 'row.compare')}</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    {dayCount>1 && (
                      <button onClick={()=>setMoveId(moveId===s.place_id?null:s.place_id)}
                        className="text-xs text-igblue font-semibold">{t(lang, 'row.move')}</button>
                    )}
                    <button onClick={()=>setStops(stops.filter((_,j)=>j!==i))}
                      className="text-xs text-igblue font-semibold">{t(lang, 'row.remove')}</button>
                  </div>
                </div>
                {i<stops.length-1 && (
                  <div className="pl-[72px] pb-1 font-mono text-[12px] font-semibold tnum">{legLabels[i]}</div>
                )}
                {moveId===s.place_id && (
                  <div className="ml-[72px] mb-2 border border-hairline rounded-lg bg-white overflow-hidden animate-pop">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider opacity-60">{t(lang, 'row.movetoday')}</div>
                    <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-hairline">
                      {Array.from({length:dayCount},(_,d)=>d).filter(d=>d!==activeDay).map(d=>(
                        <button key={d} onClick={()=>sendToDay(i,d)}
                          className="h-8 px-3 rounded-lg border border-hairline text-xs font-semibold t-ink motion-safe:active:scale-95">{dayName(d+1, lang)}</button>
                      ))}
                    </div>
                  </div>
                )}
                {compareId===s.place_id && (
                  <div className="ml-[72px] mb-2 border border-hairline rounded-lg bg-white overflow-hidden animate-pop">
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider opacity-60">{t(lang, 'row.cmpsimilar')}</div>
                    {compareAlts().map(a=>(
                      <div key={a.place_id} className="flex items-center gap-2 px-3 py-1.5 border-t border-hairline">
                        <span className="flex-1 min-w-0 truncate text-sm font-medium">{a.name}</span>
                        <button onClick={()=>{ addStop({ place_id:a.place_id, name:a.name, address:a.address, lat:a.lat, lng:a.lng }); setCompareId(null); }}
                          className="text-xs text-igblue font-semibold shrink-0">{t(lang, 'row.add')}</button>
                      </div>
                    ))}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
          {stops.length>1 && (
            <div className="mt-3 font-mono text-[11px] tnum opacity-70">{totalDriveLine(totalMin, lang)}</div>
          )}
          {stops.length>0 && (
            <button onClick={()=>{setStops([]); try{ const o=readTrip(city); o.days[activeDay]=[]; localStorage.setItem(tripKey(city), JSON.stringify(o)); }catch{} }}
              className="mt-4 text-xs text-igblue font-semibold">{t(lang, 'day.clear')}</button>
          )}
        </section>

        <section id="map" className="pt-12 scroll-mt-24">
          <h2 className="font-bold text-3xl tracking-tight">{t(lang, 'map.title')}</h2>
          <div className="mt-4"><MapView center={center} stops={stops} ink={ACCENT.bg} legs={legLabels} day={activeDay+1} city={city} lang={lang} /></div>
        </section>

        <section id="food" className="pt-12 scroll-mt-24">
          <h2 className="font-bold text-3xl tracking-tight">{t(lang, 'food.title')}</h2>
          <p className="text-xs opacity-60 mt-1">{stops.length ? t(lang, 'food.sub.near', { cat: foodCatLabel(foodCat, lang) }) : t(lang, 'food.sub.top', { cat: foodCatLabel(foodCat, lang), city })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FOOD_CATS.map(v=>(
              <button key={v} onClick={()=>setFoodCat(v)}
                className={`h-8 px-3 rounded-full border text-xs font-semibold t-ink motion-safe:active:scale-95 ${foodCat===v ? 'bg-ink text-ground border-ink' : 'bg-white border-hairline'}`}>{foodCatLabel(v, lang)}</button>
            ))}
          </div>
          {foodPicks.length ? (
          <div className="mt-3 flex gap-2 overflow-x-auto rail-scroll pb-2">
            {foodPicks.map((r,idx)=>(
              <div key={idx} className="w-60 shrink-0 border border-hairline bg-white rounded-lg p-3 animate-pop">
                <div className="font-mono text-[10px] uppercase opacity-60 truncate">{mealLabel(r.meal, lang)} · {foodContext(r)}</div>
                <div className="font-semibold truncate mt-0.5">{r.name}</div>
                <div className="text-[11px] mt-0.5 opacity-60">{r.cuisine}</div>
                {r.reserve && (<div className="mt-1"><span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${r.reserve==='required' ? 'bg-ink text-ground' : 'border border-hairline'}`}>{reserveLabel(r.reserve, lang)}</span></div>)}
                {r.rating!=null && (<div className="text-[11px]"><span className="font-bold">{r.rating}</span><span className="opacity-60"> Google review ({r.reviews})</span></div>)}
                <button onClick={()=>{ addStop({ place_id:`food-${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, name:r.name, address:r.address||r.cuisine, lat:r.lat, lng:r.lng }); const el=document.getElementById('stops'); if(el){ const smooth=!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; setTimeout(()=>el.scrollIntoView({behavior:smooth?'smooth':'auto', block:'start'}), 60); } }}
                  aria-label={t(lang, 'stay.add', { name: r.name })}
                  title={t(lang, 'stay.add', { name: r.name })}
                  style={{backgroundColor:'#0095F6', color:'#fff'}}
                  className="mt-2 h-7 w-7 grid place-items-center rounded-full t-ink motion-safe:active:scale-95">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" /></svg>
                </button>
              </div>
            ))}
          </div>
          ) : (
            <div className="mt-3 border border-dashed border-ink/30 rounded-lg px-4 py-6 text-xs opacity-60">{(restaurants[city]||[]).some(r=>inFoodCat(r, foodCat)) ? t(lang, 'common.added') : t(lang, 'food.empty.none', { cat: foodCatLabel(foodCat, lang), city })}</div>
          )}
          {foodPicks.length>0 && !foodPicks.every(r=>r._live || (foodLive.city===city ? foodLive.byName[r.name] : undefined)?.rating!=null) && (
            <p className="text-[11px] opacity-50 mt-1">{t(lang, 'common.sample')}</p>
          )}
        </section>

        <section id="reels" className="pt-12 scroll-mt-24">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-bold text-3xl tracking-tight text-balance">{t(lang, 'nav.reels')}</h2>
            {reelCount>0 && <span className="tnum text-sm font-semibold opacity-60 shrink-0">{clipsUnit(reelCount, lang)}</span>}
          </div>
          {stops.length===0 ? (
            <div className="mt-4 border border-dashed border-ink/30 rounded-lg px-4 py-6 text-xs opacity-60">{t(lang, 'reels.none')}</div>
          ) : stops.map((s,i)=>(
            <div key={s.place_id||s.name} className="mt-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 grid place-items-center font-bold text-base tnum shrink-0 rounded-full"
                  style={{backgroundColor:ACCENT.bg, color:ACCENT.fg}}>{i+1}</div>
                <div className="font-semibold text-xl">{s.name}</div>
              </div>
              {(reels[s.name]?.length) ? <ReelRail name={s.name} embedState={embedState} lang={lang} /> : (
                <div className="mt-2 border border-dashed border-ink/30 rounded-lg px-4 py-6 text-xs opacity-60">{t(lang, 'stop.noreels')}</div>
              )}
            </div>
          ))}
        </section>
      </main>

      <footer className="mt-16 border-t border-hairline bg-white">
        <div className={`${col} py-4 font-mono text-[11px] tnum flex justify-between gap-3`}>
          <span>NOMAD</span>
          <span>{city.toUpperCase()} · {dayName(activeDay+1, lang).toUpperCase()} · {stopsUnit(stops.length, lang).toUpperCase()}{stops.length>1 ? ` · ${totalMin} MIN` : ''}</span>
        </div>
      </footer>
      <div className={hintPosAt('day')>=0?'hidden':''}>
        <ChatWidget trip={{ city, days: shareDays.map(d=>d.map(s=>({ name:s.name, rating:s.rating ?? null }))), food: foodPicks.map(f=>({ name:f.name })), persona }} lang={lang} onEditStart={resolveEdit} onEditApply={applyEdit} />
      </div>
    </div>
  );
}
