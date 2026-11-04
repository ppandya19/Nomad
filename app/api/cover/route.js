import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Dynamic day covers: GET ?place=&city= -> { url }.
// Serves a cached Muse-generated cover when one exists for the place,
// otherwise generates, caches under public/covers, and returns it.
// { url:null } lets the client fall back to Wikimedia/picsum.
const pending = new Map();
const slugPart = (s)=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);

export async function GET(req){
  const params = new URL(req.url).searchParams;
  const place = (params.get('place')||'').trim();
  const city = (params.get('city')||'').trim();
  if(!place) return Response.json({ url:null });
  const file = `${slugPart(city)}-${slugPart(place)}.jpg`;
  const abs = join(process.cwd(), 'public', 'covers', file);
  try{
    await readFile(abs);
    return Response.json({ url:`/covers/${file}` });
  }catch{ /* not cached — generate below */ }
  const key = process.env.MODEL_API_KEY;
  if(!key) return Response.json({ url:null });
  if(pending.has(file)){
    try{ await pending.get(file); return Response.json({ url:`/covers/${file}` }); }
    catch{ return Response.json({ url:null }); }
  }
  const job = (async()=>{
    await mkdir(join(process.cwd(), 'public', 'covers'), { recursive:true });
    const prompt = `Wide panoramic photorealistic daytime travel photo of ${place}${city ? `, ${city}` : ''}. Sweeping view of the landmark with its surroundings, blue sky, no people in the foreground, no text, no watermark, landscape 3:2 composition.`;
    const r = await fetch('https://api.meta.ai/v1/images/generations', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
      body: JSON.stringify({ model:'muse-image-1.0', prompt, n:1, size:'1536x1024' })
    });
    const d = await r.json().catch(()=>null);
    const item = d?.data?.[0];
    let buf = null;
    if(item?.b64_json) buf = Buffer.from(item.b64_json, 'base64');
    else if(item?.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer());
    if(!buf || !buf.length) throw new Error(`no image data (http=${r.status})`);
    await writeFile(abs, buf);
  })();
  pending.set(file, job);
  try{
    await job;
    return Response.json({ url:`/covers/${file}` });
  }catch(e){
    console.warn(`[nomad] cover gen failed for ${place}: ${e.message}`);
    return Response.json({ url:null });
  }finally{
    pending.delete(file);
  }
}
