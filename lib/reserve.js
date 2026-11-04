// Reservation tags from popularity, with venue-type guards so the tag
// never lands on walk-in places (coffee counters, parks, plazas).
// Food: fine dine or dinner venues tiered by review volume.
// Stops: open-air names excluded, then review volume, then reel fame.
import { parseCount } from './score.js';
import { t } from './i18n.js';

const OPEN_AIR = /park|garden|square|piazza|bridge|beach|chowpatty|market|fountain|steps|canal|drive|high line|pier|trail|house|apartment|sea face|zoo|mile|walk|gateway|monument|\bgate\b|terminus|station/i;

export function foodReserveTag({ cat, meal, reviews }={}){
  if(cat!=='fine dine' && meal!=='dinner') return null;
  const n = parseCount(reviews);
  if(n>=10000) return 'required';
  if(n>=3000) return 'recommended';
  return null;
}

export function stopReserveTag({ name, ratings_total, views }={}){
  if(OPEN_AIR.test(name || '')) return null;
  const n = parseCount(ratings_total);
  if(n>=150000) return 'required';
  if(n>=30000) return 'recommended';
  if((views || 0)>=2500000) return 'recommended';
  return null;
}

export function reserveLabel(tag, lang='en'){
  if(tag==='required') return t(lang, 'reserve.required');
  if(tag==='recommended') return t(lang, 'reserve.recommended');
  return null;
}
