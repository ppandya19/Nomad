import { readFile } from 'fs/promises';
import { join } from 'path';

async function localSearch(q, city){
  const places = JSON.parse(await readFile(join(process.cwd(), 'data', 'places.json'), 'utf8'));
  const needle = q.toLowerCase();
  const hits = places
    .filter(p=>!city || p.city===city)
    .filter(p=>p.name.toLowerCase().includes(needle))
    .slice(0,5);
  if(hits.length>=5) return hits;
  let food = [];
  try{
    const byCity = JSON.parse(await readFile(join(process.cwd(), 'data', 'restaurants.json'), 'utf8'));
    const list = city && byCity[city] ? byCity[city] : Object.values(byCity).flat();
    food = list
      .filter(r=>r.name && (r.name.toLowerCase().includes(needle) || (r.cuisine||'').toLowerCase().includes(needle)))
      .slice(0, 5-hits.length)
      .map(r=>({
        place_id:`local-food-${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
        name:r.name, address:r.cuisine||city||'', lat:r.lat, lng:r.lng,
        rating:parseFloat(r.rating)||undefined, ratings_total:undefined
      }));
  }catch{ /* places only */ }
  return [...hits, ...food];
}

export async function GET(req){
  const params = new URL(req.url).searchParams;
  const q = params.get('q') || '';
  const city = params.get('city') || '';
  if(q.length < 2) return Response.json([]);
  const key = process.env.GOOGLE_SERVER_KEY;
  if(key && key!=='TEST_KEY'){
    try{
      const query = city ? `${q} ${city}` : q;
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount'
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 5 })
      });
      const d = await r.json().catch(()=>null);
      if(r.ok && d?.places?.length){
        return Response.json(d.places.slice(0,5).map(p=>({
          place_id: p.id,
          name: p.displayName?.text,
          address: p.formattedAddress,
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          rating: p.rating,
          ratings_total: p.userRatingCount
        })));
      }
      console.warn(`[nomad] Places searchText http=${r.status}${d?.error?.message ? ` : ${d.error.message}` : ''}`);
    }catch(e){
      console.warn(`[nomad] Places searchText threw: ${e.message}`);
    }
  }
  return Response.json(await localSearch(q, city));
}
