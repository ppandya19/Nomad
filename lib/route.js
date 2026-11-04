// Pure route helpers: nearest-neighbor + 2-opt over haversine distances.
// First stop stays fixed (start where you are); the rest get ordered.

export function haversineKm(a, b){
  const R = 6371, r = Math.PI/180;
  const h = Math.sin((b.lat-a.lat)*r/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

export function routeKm(pts, order){
  let t = 0;
  for(let i=0;i<order.length-1;i++) t += haversineKm(pts[order[i]], pts[order[i+1]]);
  return t;
}

// Offline fallback: distance-based drive minutes (city streets under 60 km,
// highway speed beyond). Keeps estimates sane without live directions.
export function fallbackDriveMin(a, b){
  const km = haversineKm(a, b);
  const h = km > 60 ? 85 : 28;
  return Math.max(3, Math.round(km / h * 60));
}

// Offline fallback: scale transit/walk off a drive-time estimate.
export function estimateModes(driveMin){
  const d = Math.max(1, Math.round(driveMin));
  return { drive: d, transit: Math.max(1, Math.round(d*1.5+4)), walk: Math.max(1, Math.round(d*3.2+8)) };
}

export function formatLeg(m, live){
  if(live && typeof live==='object'){
    const part = (icon, v, ok)=>`${ok ? '' : '~'}${icon} ${v}`;
    const walk = m.walk<15 ? ` · ${part('🚶', m.walk, live.walk)}` : '';
    return `${part('🚗', m.drive, live.drive)} · ${part('🚇', m.transit, live.transit)}${walk}`;
  }
  const base = `🚗 ${m.drive} · 🚇 ${m.transit}`;
  const walk = m.walk<15 ? ` · 🚶 ${m.walk}` : '';
  return `${live ? '' : '~'}${base}${walk}`;
}

export function nearestNeighbor(pts, start=0){
  const order = [start];
  const seen = new Set([start]);
  while(order.length<pts.length){
    let bi = -1, bd = 1e18;
    for(let i=0;i<pts.length;i++){
      if(seen.has(i)) continue;
      const d = haversineKm(pts[order[order.length-1]], pts[i]);
      if(d<bd){ bd = d; bi = i; }
    }
    order.push(bi);
    seen.add(bi);
  }
  return order;
}

export function twoOpt(pts, order, fixStart=true){
  let best = [...order];
  let bestCost = routeKm(pts, best);
  let improved = true, guard = 0;
  const lo = fixStart ? 1 : 0;
  while(improved && guard++<100){
    improved = false;
    for(let i=lo;i<best.length-1;i++){
      for(let k=i+1;k<best.length;k++){
        const next = [...best.slice(0,i), ...best.slice(i,k+1).reverse(), ...best.slice(k+1)];
        const c = routeKm(pts, next);
        if(c<bestCost-1e-9){ best = next; bestCost = c; improved = true; }
      }
    }
  }
  return best;
}

export function exactOrder(pts){
  const rest = pts.map((_,i)=>i).slice(1);
  let best = [0, ...rest], bestCost = routeKm(pts, best);
  const perm = (arr,l)=>{
    if(l===arr.length){
      const order = [0, ...arr], c = routeKm(pts, order);
      if(c<bestCost){ bestCost = c; best = order; }
      return;
    }
    for(let i=l;i<arr.length;i++){
      const t = arr[l]; arr[l] = arr[i]; arr[i] = t;
      perm(arr, l+1);
      const u = arr[l]; arr[l] = arr[i]; arr[i] = u;
    }
  };
  perm(rest, 0);
  return best;
}

export function optimizeOrder(pts){
  if(pts.length<3) return pts.map((_,i)=>i);
  if(pts.length<=8) return exactOrder(pts);
  return twoOpt(pts, nearestNeighbor(pts, 0), true);
}
