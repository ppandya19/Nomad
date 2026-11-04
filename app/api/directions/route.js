import { estimateModes, fallbackDriveMin } from '../../../lib/route.js';

// Routes API (New): legacy Directions is not enableable on new projects.
// Per-leg fill: live minutes where Google answers, distance-based
// estimates elsewhere; each leg carries per-mode live flags so the UI
// can mark estimated modes honestly. Top-level `live` means drive fully live.
export async function GET(req){
  const params = new URL(req.url).searchParams;
  const points = (params.get('points') || '').split(';').filter(Boolean);
  if(points.length < 2) return Response.json({ legs: null, live: false });
  const coords = points.map(p=>{
    const [lat, lng] = p.split(',').map(Number);
    return { lat, lng };
  });
  const est = (i)=>fallbackDriveMin(coords[i], coords[i+1]);
  const filled = (drive, transit, walk)=>points.slice(0,-1).map((_,i)=>{
    const dv = drive?.[i] ?? est(i);
    const estModes = estimateModes(dv);
    return {
      drive: dv,
      transit: transit?.[i] ?? estModes.transit,
      walk: walk?.[i] ?? estModes.walk,
      live: { drive: drive?.[i]!=null, transit: transit?.[i]!=null, walk: walk?.[i]!=null },
    };
  });
  const key = process.env.GOOGLE_SERVER_KEY;
  if(key && key!=='TEST_KEY'){
    try{
      const modes = ['DRIVE', 'TRANSIT', 'WALK'];
      const out = await Promise.all(modes.map(async (travelMode)=>{
        const [o, ...rest] = coords;
        const d = rest[rest.length-1];
        const ll = (c)=>({ location:{ latLng:{ latitude:c.lat, longitude:c.lng } } });
        const body = { origin: ll(o), destination: ll(d), travelMode, units:'METRIC' };
        if(travelMode==='TRANSIT') body.departureTime = new Date().toISOString();
        if(rest.length > 1) body.intermediates = rest.slice(0,-1).map(ll);
        const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'X-Goog-Api-Key':key, 'X-Goog-FieldMask':'routes.legs.duration' },
          body: JSON.stringify(body)
        }).then(r=>r.json());
        const legs = r.routes?.[0]?.legs;
        if(Array.isArray(legs) && legs.length===points.length-1){
          return legs.map(l=>l.duration ? Math.max(1, Math.round(parseInt(l.duration, 10)/60)) : null);
        }
        console.warn(`[nomad] Routes ${travelMode} ${r.error ? `code=${r.error.code} status=${r.error.status} : ${r.error.message}` : 'no legs'}`);
        return null;
      }));
      const driveLive = Array.isArray(out[0]) && out[0].every(m=>m!=null);
      return Response.json({ legs: filled(out[0], out[1], out[2]), live: driveLive });
    }catch{ /* fall through to estimates */ }
  }
  return Response.json({ legs: filled(null, null, null), live: false });
}
