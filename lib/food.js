// Category food picks ranked by closeness to the day's stops.
// Pure: live Google resolutions are passed in, nothing is fetched here.
// exclude (default stops) is the wider added list used only for exclusion,
// so a spot added on any day stops being recommended everywhere.
// Lunch/dinner match the meal across cuisines; located spots farther than
// FOOD_MAX_KM from every stop are dropped. Spots without coordinates survive
// (shown city-wide, never with a walk claim); with no stops, rating wins.
import { notInStops } from './plan.js';
import { foodReserveTag } from './reserve.js';

export const FOOD_MAX_KM = 10;

const CAT_MATCH = {
  'local special': r=>r.cat==='local special',
  'coffee': r=>r.cat==='coffee',
  'lunch': r=>r.meal==='lunch',
  'dinner': r=>r.meal==='dinner',
  'fine dine': r=>r.cat==='fine dine',
};

export const inFoodCat = (r, category)=> CAT_MATCH[category] ? !!CAT_MATCH[category](r) : false;

const R = 6371, rad = Math.PI/180;
const km = (a,b,c,d)=>{
  const h = Math.sin((c-a)*rad/2)**2 + Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};
const fmtCount = (n)=> n>=1000 ? `${(n/1000).toFixed(1).replace('.0','')}k` : `${n}`;
const num = (v)=>{ const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const FAR = 1e12;

function nearestKm(r, stops){
  if(r.lat==null || r.lng==null || !stops.length) return FAR;
  let bd = FAR;
  for(const s of stops){
    if(s.lat==null || s.lng==null) continue;
    const d = km(r.lat, r.lng, s.lat, s.lng);
    if(d<bd) bd = d;
  }
  return bd;
}

export function foodPicksFor(spots, { category, stops=[], exclude=null, liveByName={}, limit=4, maxKm=FOOD_MAX_KM }={}){
  const match = CAT_MATCH[category] || (()=>false);
  return notInStops(spots.filter(match), exclude ?? stops)
    .map(r=>{
      const lv = liveByName[r.name];
      const merged = { ...r,
        rating: lv?.rating ?? r.rating,
        reviews: lv?.ratings_total!=null ? fmtCount(lv.ratings_total) : r.reviews,
        lat: lv?.lat ?? r.lat,
        lng: lv?.lng ?? r.lng };
      return { ...merged, reserve: foodReserveTag({ cat: merged.cat, meal: merged.meal, reviews: merged.reviews }) };
    })
    .filter(r=>!stops.length || r.lat==null || r.lng==null || nearestKm(r, stops)<=maxKm)
    .sort((a,b)=>nearestKm(a,stops)-nearestKm(b,stops) || num(b.rating)-num(a.rating))
    .slice(0,limit);
}
