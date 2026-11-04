// Live top-up for thin food categories: real Places results for one
// cuisine near the day, merged after static picks. [] when unreachable.
const QUERIES = {
  'coffee': { text: 'coffee', type: 'cafe' },
  'lunch': { text: 'lunch restaurant', type: 'restaurant' },
  'dinner': { text: 'dinner restaurant', type: 'restaurant' },
  'fine dine': { text: 'fine dining' },
  'local special': { text: 'traditional local restaurant' },
};

export async function GET(req){
  const params = new URL(req.url).searchParams;
  const cat = params.get('cat') || '';
  const city = params.get('city') || '';
  const lat = Number(params.get('lat')), lng = Number(params.get('lng'));
  const q = QUERIES[cat];
  const key = process.env.GOOGLE_SERVER_KEY;
  if(!q || !key || key==='TEST_KEY') return Response.json([]);
  try{
    const body = { textQuery: `${q.text} ${city}`.trim(), maxResultCount: 5 };
    if(q.type) body.includedType = q.type;
    if(Number.isFinite(lat) && Number.isFinite(lng)) body.locationBias = { circle:{ center:{ latitude:lat, longitude:lng }, radius:5000 } };
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount'
      },
      body: JSON.stringify(body)
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
    console.warn(`[nomad] Places food searchText http=${r.status}${d?.error?.message ? ` : ${d.error.message}` : ''}`);
  }catch(e){
    console.warn(`[nomad] Places food searchText threw: ${e.message}`);
  }
  return Response.json([]);
}
