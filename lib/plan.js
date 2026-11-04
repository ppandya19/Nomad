// Collection-plan selection sync: the planned day(s) mirror the checked posts.
// Stops the user added by hand (no `saved-` place_id) are always kept.
import { haversineKm } from './route.js';

export function savedPrefix(collId){ return `saved-${collId}-`; }

function wantedPlaces(posts, picks){
  const wanted = new Set();
  posts.forEach((p,i)=>{ if(picks.includes(i)) wanted.add(p.place); });
  return wanted;
}

function isDroppedStop(s, collId, wanted){
  return (s.place_id||'').startsWith(savedPrefix(collId)) && !wanted.has(s.name);
}

export function applyCollectionSelection(day, collId, posts, picks){
  const wanted = wantedPlaces(posts, picks);
  const kept = (day||[]).filter(s=>!isDroppedStop(s, collId, wanted));
  const have = new Set(kept.map(s=>s.name));
  const adds = [];
  posts.forEach((p,i)=>{
    if(picks.includes(i) && !have.has(p.place)){
      adds.push({ place_id:`${savedPrefix(collId)}${i}`, name:p.place, address:p.place, lat:p.lat, lng:p.lng });
      have.add(p.place);
    }
  });
  return [...kept, ...adds];
}

export function dropDeselected(days, collId, posts, picks){
  const wanted = wantedPlaces(posts, picks);
  return days.map(d=>(d||[]).filter(s=>!isDroppedStop(s, collId, wanted)));
}

const normName = (s)=>(s.name||'').trim().toLowerCase();

// A place lives at most once per trip: repeated plans used to stack the same
// stop into several days, which also made every day cover identical.
export function dedupeTrip(days){
  const seen = new Set();
  return (days||[]).map(d=>(d||[]).filter(s=>{
    const k = normName(s);
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  }));
}

// Remove every stop this collection placed, anywhere. Hand-added stops and
// other collections are untouched. Lets auto-create rebuild the spread.
export function stripCollection(days, collId){
  return (days||[]).map(d=>(d||[]).filter(s=>!(s.place_id||'').startsWith(savedPrefix(collId))));
}

// Snake-deal rank indices across dayCount days: round one goes 0..N, round
// two goes N..0, and so on, keeping top ranks spread over all days.
export function snakeDeal(count, dayCount){
  const n = Math.max(1, dayCount);
  const days = Array.from({ length:n }, ()=>[]);
  for(let rank=0; rank<count; rank++){
    const round = Math.floor(rank/n), pos = rank%n;
    days[round%2===0 ? pos : n-1-pos].push(rank);
  }
  return days;
}

// Resize the day list: grow with empty days; shrink by merging removed
// days' stops into the last kept day (deduped), so reduction never loses stops.
export function resizeDays(days, n){
  const count = Math.max(1, n);
  const kept = (days||[]).slice(0, count).map(d=>[...(d||[])]);
  while(kept.length < count) kept.push([]);
  if((days||[]).length > count){
    const orphans = (days||[]).slice(count).flat();
    kept[kept.length-1] = [...kept[kept.length-1], ...orphans];
  }
  return dedupeTrip(kept);
}

// Move one stop to another day; if the target already has it, the source
// copy is just dropped. Invalid moves return the input unchanged.
export function moveStop(days, from, idx, to){
  const next = (days||[]).map(d=>[...(d||[])]);
  if(from===to || !next[from] || !next[to] || idx<0 || idx>=next[from].length) return days;
  const [s] = next[from].splice(idx,1);
  if(!next[to].some(x=>normName(x)===normName(s))) next[to].push(s);
  return next;
}

// Group stops by proximity (single-linkage within maxKm): each group is one
// city area. Groups come in discovery order; stops keep input order inside.
const hasCoords = (s)=>Number.isFinite(s?.lat) && Number.isFinite(s?.lng);
export function clusterByCity(stops, maxKm=40){
  const groups = [];
  for(const s of stops||[]){
    const near = [];
    groups.forEach((g,gi)=>{
      if(hasCoords(s) && g.some(m=>hasCoords(m) && haversineKm(m, s)<=maxKm)) near.push(gi);
    });
    if(!near.length){ groups.push([s]); continue; }
    const into = groups[near[0]];
    into.push(s);
    for(let k=near.length-1;k>0;k--) into.push(...groups.splice(near[k],1)[0]);
  }
  return groups;
}

// Spread stops across n days, one city per day when possible: whole city
// groups are snake-dealt while groups outnumber days; otherwise extra days
// go to the biggest groups (capped at their stop count) and each group is
// snake-split across its days. Dedupes by name; never drops a stop.
export function spreadAcrossDays(stops, n){
  const count = Math.max(1, n||1);
  const flat = [];
  const seen = new Set();
  for(const s of stops||[]){
    const k = normName(s);
    if(!seen.has(k)){ seen.add(k); flat.push(s); }
  }
  const days = Array.from({ length:count }, ()=>[]);
  if(!flat.length) return days;
  const groups = clusterByCity(flat);
  if(groups.length>=count){
    snakeDeal(groups.length, count).forEach((ranks, day)=>{
      ranks.forEach(r=>days[day].push(...groups[r]));
    });
    return days;
  }
  const shares = groups.map(()=>1);
  let extras = count-groups.length;
  const bySize = groups.map((g,i)=>i).sort((a,b)=>groups[b].length-groups[a].length);
  while(extras>0){
    let placed = false;
    for(const i of bySize){
      if(!extras) break;
      if(shares[i]<groups[i].length){ shares[i]++; extras--; placed = true; }
    }
    if(!placed) break;
  }
  let di = 0;
  groups.forEach((g,gi)=>{
    snakeDeal(g.length, shares[gi]).forEach((ranks)=>{
      if(di>=count) return;
      ranks.forEach(r=>days[di].push(g[r]));
      di++;
    });
  });
  return days;
}

// Merge a fresh spread into existing days: only stops not already planned
// anywhere are appended, so hand-placed stops never move.
export function mergeSpread(days, spread){
  const have = new Set();
  (days||[]).forEach(d=>(d||[]).forEach(s=>have.add(normName(s))));
  return (days||[]).map((d,i)=>{
    const out = [...(d||[])];
    for(const s of (spread||[])[i]||[]){
      const k = normName(s);
      if(!have.has(k)){ have.add(k); out.push(s); }
    }
    return out;
  });
}

// Named items (e.g. food picks) not already in the stops list, by
// case-insensitive name. Keeps input order.
export function notInStops(items, stops){
  const have = new Set((stops||[]).map(s=>(s.name||'').trim().toLowerCase()));
  return (items||[]).filter(r=>r && !have.has((r.name||'').trim().toLowerCase()));
}

// Ranked picks topped up with live extras to n: ranked items not in stops
// first, then extras missing from both stops and ranked.
export function fillPicks(items, extra, stops, n){
  const count = Math.max(0, n||0);
  const base = notInStops(items, stops).slice(0, count);
  const fill = notInStops(extra, [...(stops||[]), ...(items||[])]).slice(0, count-base.length);
  return [...base, ...fill];
}

// Indices of checked posts not already planned in a different day.
export function picksNotElsewhere(posts, picks, days, day){
  const elsewhere = new Set();
  (days||[]).forEach((d,di)=>{ if(di!==day) (d||[]).forEach(s=>elsewhere.add(normName(s))); });
  return picks.filter(i=>posts[i] && !elsewhere.has(normName({ name:posts[i].place })));
}
