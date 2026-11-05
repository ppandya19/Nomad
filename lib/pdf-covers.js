// Server-side image resolution for the trip PDF. Day covers mirror the
// overview cascade (pinned, cached generated cover, on-demand generation,
// Wikimedia, picsum); stop thumbs are cache-or-Wikimedia only. With
// fallbacks:false only pinned/cached images resolve (the route's choice —
// a missing image renders clean, never a stock photo). Everything
// comes back as a data-URI (mime sniffed — webp/unknown skipped, the
// renderer only takes jpeg/png) or null; the renderer never fetches, so a
// missing image is a visible log line here instead of a silent blank.
import { join } from 'path';

// Mirror of slugPart in app/api/cover/route.js (keep in sync).
const slugPart = (s)=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const isHttp = (s)=>/^https?:\/\//.test(s||'');

export function sniffMime(buf){
  if(!buf || buf.length<12) return null;
  if(buf[0]===0xFF && buf[1]===0xD8 && buf[2]===0xFF) return 'image/jpeg';
  if(buf[0]===0x89 && buf[1]===0x50 && buf[2]===0x4E && buf[3]===0x47) return 'image/png';
  return null;
}

const toDataUri = (buf)=>{
  const mime = sniffMime(buf);
  return mime ? { src:`data:${mime};base64,${buf.toString('base64')}` } : null;
};

// Timeout wrapper with an unref'd, always-cleared timer so hanging
// upstreams fall through fast without holding the event loop.
function withTimeout(promise, ms){
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>reject(new Error('pdf fetch timeout')), ms);
    if(timer.unref) timer.unref();
    promise.then((v)=>{ clearTimeout(timer); resolve(v); }, (e)=>{ clearTimeout(timer); reject(e); });
  });
}

// Same first-unused-stop rule as the overview coverStop.
export function coverNameForDay(dayStops, taken){
  if(!dayStops.length) return null;
  const pick = dayStops.find((s)=>!taken.has((s.name||'').toLowerCase())) || dayStops[0];
  taken.add((pick.name||'').toLowerCase());
  return pick.name || null;
}

const genPending = new Map();

async function generateCover(name, city, file, { modelKey, fetchFn, writeFile, mkdir, publicDir, readFile, timeoutMs=45000, fetchTimeoutMs=20000 }){
  if(!modelKey) return null;
  if(genPending.has(file)){
    try{ await genPending.get(file); }catch{ /* fall through to re-read */ }
    try{ return await readFile(join(publicDir, 'covers', file)); }catch{ return null; }
  }
  const job = (async()=>{
    await mkdir(join(publicDir, 'covers'), { recursive:true });
    const prompt = `Wide panoramic photorealistic daytime travel photo of ${name}${city ? `, ${city}` : ''}. Sweeping view of the landmark with its surroundings, blue sky, no people in the foreground, no text, no watermark, landscape 3:2 composition.`;
    const r = await withTimeout(fetchFn('https://api.meta.ai/v1/images/generations', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${modelKey}` },
      body: JSON.stringify({ model:'muse-image-1.0', prompt, n:1, size:'1536x1024' }),
    }), timeoutMs);
    const d = await r.json().catch(()=>null);
    const item = d && d.data && d.data[0];
    let buf = null;
    if(item && item.b64_json) buf = Buffer.from(item.b64_json, 'base64');
    else if(item && item.url) buf = Buffer.from(await (await withTimeout(fetchFn(item.url), fetchTimeoutMs)).arrayBuffer());
    if(!buf || !buf.length || !sniffMime(buf)) throw new Error('no supported image data');
    await writeFile(join(publicDir, 'covers', file), buf);
    return buf;
  })();
  genPending.set(file, job);
  try{ return await job; }
  catch{ return null; }
  finally{ genPending.delete(file); }
}

function logOutcome(i, how){ console.info(`[nomad] pdf cover day ${i+1}: ${how}`); }

export async function resolveDayCovers(days, { city='', coll=null, publicDir='', readFile, writeFile, mkdir, fetchFn=fetch, modelKey='', timeoutMs=45000, fetchTimeoutMs=20000, fallbacks=true }={}){
  // Claim names sequentially (dedup order matches the overview), then
  // resolve images in parallel.
  const taken = new Set();
  const plans = days.map((dayStops, i)=>{
    const pinned = coll && Array.isArray(coll.covers) ? coll.covers[i] : null;
    if(typeof pinned==='string' && isHttp(pinned)) return { remote: pinned };
    if(typeof pinned==='string' && pinned.startsWith('/')) return { local: pinned };
    let name = null;
    if(typeof pinned==='string' && pinned){ taken.add(pinned.toLowerCase()); name = pinned; }
    else name = coverNameForDay(dayStops, taken);
    return { name };
  });
  return Promise.all(plans.map((plan, i)=>resolvePlan(plan, i)));

  async function resolvePlan(plan, i){
    if(plan.remote){
      const hit = await fetchImage(plan.remote);
      logOutcome(i, hit ? 'pinned' : 'none');
      return hit;
    }
    if(plan.local){
      const hit = await readLocal(plan.local);
      logOutcome(i, hit ? 'pinned-file' : 'none');
      return hit;
    }
    if(!plan.name){ logOutcome(i, 'none'); return null; }
    const file = `${slugPart(city)}-${slugPart(plan.name)}.jpg`;
    const cached = await readLocal(`/covers/${file}`);
    if(cached){ logOutcome(i, 'cached'); return cached; }
    // No fallbacks: only the collection's own pinned/cached images — a
    // missing image renders a clean imageless layout, never a stock photo.
    if(!fallbacks){ logOutcome(i, 'none'); return null; }
    const gen = await generateCover(plan.name, city, file, { modelKey, fetchFn, writeFile, mkdir, publicDir, readFile, timeoutMs, fetchTimeoutMs });
    if(gen){ logOutcome(i, 'generated'); return toDataUri(gen); }
    const wiki = await wikiThumb(plan.name, 640, 3);
    if(wiki){ logOutcome(i, 'wiki'); return wiki; }
    const seed = await fetchImage(`https://picsum.photos/seed/${encodeURIComponent(`${slugPart(city)}-${slugPart(plan.name)}`)}/960/640`);
    logOutcome(i, seed ? 'picsum' : 'none');
    return seed;
  }
  async function readLocal(p){
    try{ return toDataUri(await readFile(join(publicDir, p.replace(/^\//, '')))); }
    catch{ return null; }
  }
  async function fetchImage(url){
    try{
      const r = await withTimeout(fetchFn(url), fetchTimeoutMs);
      if(!r.ok) return null;
      return toDataUri(Buffer.from(await r.arrayBuffer()));
    }catch{ return null; }
  }
  async function wikiThumb(name, size, limit){
    try{
      const q = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=${size}&generator=search&gsrsearch=${encodeURIComponent(`${name} ${city} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=${limit}`;
      const d = await (await withTimeout(fetchFn(q), fetchTimeoutMs)).json();
      const pages = d && d.query && d.query.pages ? Object.values(d.query.pages) : [];
      const hit = pages.filter((p)=>p.thumbnail && p.thumbnail.source).sort((a,b)=>(a.index||0)-(b.index||0))[0];
      if(!hit) return null;
      return await fetchImage(hit.thumbnail.source);
    }catch{ return null; }
  }
}

export async function resolveStopThumbs(stops, city, { publicDir='', readFile, fetchFn=fetch, fetchTimeoutMs=20000, fallbacks=true }={}){
  return Promise.all(stops.map(async (s)=>{
    const name = s.name || '';
    if(!name) return null;
    try{
      const hit = toDataUri(await readFile(join(publicDir, 'covers', `${slugPart(city)}-${slugPart(name)}.jpg`)));
      if(hit) return hit;
    }catch{ /* wikimedia below */ }
    if(!fallbacks) return null;
    try{
      const q = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=200&generator=search&gsrsearch=${encodeURIComponent(`${name} ${city} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=2`;
      const d = await (await withTimeout(fetchFn(q), fetchTimeoutMs)).json();
      const pages = d && d.query && d.query.pages ? Object.values(d.query.pages) : [];
      const hit = pages.filter((p)=>p.thumbnail && p.thumbnail.source).sort((a,b)=>(a.index||0)-(b.index||0))[0];
      if(!hit) return null;
      const r = await withTimeout(fetchFn(hit.thumbnail.source), fetchTimeoutMs);
      if(!r.ok) return null;
      return toDataUri(Buffer.from(await r.arrayBuffer()));
    }catch{ return null; }
  }));
}
