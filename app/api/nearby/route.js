import { readFile } from 'fs/promises';
import { join } from 'path';

// Nearby restaurants around a day stop, to top up the Add-food row.
// Falls back to the static city list when Places is unreachable.
export async function GET(req){
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get('lat')), lng = Number(params.get('lng'));
  const city = params.get('city') || '';
  if(!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json([]);
  const key = process.env.GOOGLE_SERVER_KEY;
  if(key && key!=='TEST_KEY'){
    try{
      const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount'
        },
        body: JSON.stringify({
          includedTypes:['restaurant'],
          maxResultCount: 10,
          locationRestriction:{ circle:{ center:{ latitude:lat, longitude:lng }, radius:2000 } }
        })
      });
      const d = await r.json().catch(()=>null);
      if(r.ok && d?.places?.length){
        return Response.json(d.places.map(p=>({
          place_id: p.id,
          name: p.displayName?.text,
          address: p.formattedAddress,
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          rating: p.rating,
          ratings_total: p.userRatingCount
        })).filter(p=>p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng)));
      }
      console.warn(`[nomad] Places searchNearby http=${r.status}${d?.error?.message ? ` : ${d.error.message}` : ''}`);
    }catch(e){
      console.warn(`[nomad] Places searchNearby threw: ${e.message}`);
    }
  }
  try{
    const byCity = JSON.parse(await readFile(join(process.cwd(), 'data', 'restaurants.json'), 'utf8'));
    return Response.json(((city && byCity[city]) || []).map(r=>({
      place_id:`local-food-${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
      name:r.name, address:r.cuisine||'', lat:r.lat, lng:r.lng,
      rating:parseFloat(r.rating)||undefined, ratings_total:undefined
    })));
  }catch{
    return Response.json([]);
  }
}
