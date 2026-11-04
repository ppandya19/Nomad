export async function GET(req){
  const id = new URL(req.url).searchParams.get('place_id') || '';
  if(!id) return Response.json({ summary: null });
  const key = process.env.GOOGLE_SERVER_KEY;
  if(key && key!=='TEST_KEY'){
    try{
      const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
        headers:{
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews'
        }
      });
      const d = await r.json().catch(()=>null);
      if(r.ok && d){
        const texts = (d.reviews||[]).map(x=>x.text?.text).filter(Boolean);
        return Response.json({
          summary: texts.length ? texts.slice(0,3).join(' ') : null,
          rating: d.rating ?? null,
          ratings_total: d.userRatingCount ?? null
        });
      }
      console.warn(`[nomad] Place details http=${r.status}${d?.error?.message ? ` : ${d.error.message}` : ''}`);
    }catch(e){
      console.warn(`[nomad] Place details threw: ${e.message}`);
    }
  }
  return Response.json({ summary: null });
}
