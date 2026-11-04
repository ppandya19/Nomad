#!/usr/bin/env node
// Fetch live Google ratings (Places API New searchText) for every stop in
// data/places.json into data/live-ratings.json (scratch cache, safe to delete).
// Usage: node scripts/fetch-ratings.mjs [--limit N]
// Reads GOOGLE_SERVER_KEY from .env.local. ~65 calls, trivial under the $200/mo credit.
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const key = env.GOOGLE_SERVER_KEY;
if(!key || key==='TEST_KEY'){ console.error('GOOGLE_SERVER_KEY missing or placeholder'); process.exit(1); }

// Mirrors samePlace/norm in lib/places.js (that module calls /api/search,
// which only works in the browser, so the guard is duplicated here).
const norm = (s)=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const samePlace = (a,b)=>{ const x = norm(a), y = norm(b); return !!x && !!y && (x.includes(y) || y.includes(x)); };

const li = process.argv.findIndex(a=>a==='--limit');
const limit = li>=0 ? parseInt(process.argv[li+1], 10) : Infinity;

const places = JSON.parse(readFileSync(join(root, 'data', 'places.json'), 'utf8'));
const out = { _note:'scratch cache of live Google ratings for scoring; safe to delete', _at:new Date().toISOString(), ratings:{} };
let ok = 0, miss = 0, err = 0;
for(const p of places.slice(0, limit)){
  const k = `${p.city}::${p.name}`;
  try{
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({ textQuery: `${p.name} ${p.city}`, maxResultCount: 1 }),
      signal: AbortSignal.timeout(8000)
    });
    const d = await r.json().catch(()=>null);
    const hit = d?.places?.[0];
    if(r.ok && hit?.displayName?.text && samePlace(hit.displayName.text, p.name) && hit.rating!=null){
      out.ratings[k] = { rating: hit.rating, ratings_total: hit.userRatingCount ?? null, google_name: hit.displayName.text };
      ok++;
    } else { miss++; console.warn(`MISS ${k} -> ${hit?.displayName?.text ?? ('http '+r.status)}`); }
  }catch(e){ err++; console.warn(`ERR ${k}: ${e.cause?.message || e.message}`); }
  await new Promise(r=>setTimeout(r, 150));
}
writeFileSync(join(root, 'data', 'live-ratings.json'), JSON.stringify(out, null, 1));
console.log(`done: ${ok} ok, ${miss} miss, ${err} errors -> data/live-ratings.json`);
