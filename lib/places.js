// Resolve a stop's display name to a live Google place (id + rating).
// Collection/food/stay stops carry synthetic ids (saved-/food-/stay-/local-),
// so with billing on we look up the top search hit and use its rating instead.
const cache = {};

const norm = (s)=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();

function samePlace(a, b){
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
}

export function isSyntheticId(id){
  return !id || /^(saved|food|stay|local)-/.test(id);
}

export async function resolvePlace(name, city){
  const key = `${city}::${(name||'').toLowerCase()}`;
  if(cache[key]!==undefined) return cache[key];
  try{
    const d = await fetch(`/api/search?q=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`).then(r=>r.json());
    const hit = Array.isArray(d) && d.length ? d[0] : null;
    const ok = hit && hit.name && samePlace(hit.name, name)
      ? { place_id: hit.place_id || null, rating: hit.rating ?? null, ratings_total: hit.ratings_total ?? null, lat: hit.lat ?? null, lng: hit.lng ?? null }
      : null;
    if(ok && (ok.rating!=null || !isSyntheticId(ok.place_id))) cache[key] = ok;
    return ok;
  }catch{
    return null;
  }
}
