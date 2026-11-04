'use client'
import { useEffect, useRef, useState } from 'react';
import { resolvePlace, isSyntheticId } from '../lib/places';
import { t, mapFootLine } from '../lib/i18n';
const esc = (v)=>String(v??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtCount = (n)=> n>=1000 ? `${(n/1000).toFixed(1).replace('.0','')}k` : `${n}`;
const ratingLine = (s, lang)=>{
  if(s.rating==null) return t(lang, 'map.norating');
  return s.ratings_total!=null
    ? `<b>${esc(s.rating)}</b> · ${esc(fmtCount(s.ratings_total))} Google reviews`
    : `<b>${esc(s.rating)}</b> Google`;
};
// Module-level singleton: StrictMode remounts must never append the script twice.
let mapsLoading = null;
const ensureMaps = (key)=>{
  if(typeof window==='undefined') return Promise.resolve(false);
  if(window.google) return Promise.resolve(true);
  if(!mapsLoading){
    mapsLoading = new Promise((res)=>{
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
      s.async = true;
      s.onload = ()=>res(true);
      s.onerror = ()=>{ mapsLoading = null; res(false); };
      document.head.appendChild(s);
    });
  }
  return mapsLoading;
};
export default function MapView({ center, stops, ink, legs, day, city, lang='en' }){
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const lineRef = useRef(null);
  const infoRef = useRef(null);
  const pillsRef = useRef([]);
  const initCenter = useRef(center);
  const [unavailable,setUnavailable] = useState(false);
  const [ready,setReady] = useState(false);

  useEffect(()=>{
    (async()=>{
      const { key } = await fetch('/api/config').then(r=>r.json());
      if(!key || key==='TEST_KEY'){ setUnavailable(true); return; }
      const ok = await ensureMaps(key);
      if(!ok){ setUnavailable(true); return; }
      if(!mapRef.current){
        mapRef.current = new window.google.maps.Map(ref.current, {
          center: initCenter.current, zoom: 13, disableDefaultUI: true
        });
      }
      setReady(true);
    })();
  },[]);

  useEffect(()=>{
    if(!mapRef.current || !window.google) return;
    mapRef.current.setCenter(center);
  },[center]);

  useEffect(()=>{
    if(!ready || !mapRef.current || !window.google) return;
    markersRef.current.forEach(m=>m.setMap(null));
    markersRef.current = [];
    pillsRef.current.forEach(o=>o.setMap(null));
    pillsRef.current = [];
    if(lineRef.current) lineRef.current.setMap(null);
    if(infoRef.current) infoRef.current.close();
    if(!infoRef.current) infoRef.current = new window.google.maps.InfoWindow();
    const showPin = async (s, m)=>{
      const head = `<div style="font-weight:700;font-size:14px">${esc(s.name)}</div>`;
      const pid = s.place_id||'';
      const sub = (pid.startsWith('food-') || pid.startsWith('stay-')) && s.address
        ? `<div style="font-size:12px;margin-top:2px;opacity:0.6">${esc(s.address)}</div>` : '';
      const content = (ratingHtml)=>`${head}${sub}<div style="font-size:12px;margin-top:2px">${ratingHtml}</div>`;
      infoRef.current.setContent(content(ratingLine(s, lang)));
      infoRef.current.open(mapRef.current, m);
      if(s.rating!=null) return;
      let id = s.place_id || '';
      if(isSyntheticId(id)){
        const r = await resolvePlace(s.name, city).catch(()=>null);
        if(r?.rating!=null){
          infoRef.current.setContent(content(ratingLine(r, lang)));
          return;
        }
        id = r?.place_id || '';
      }
      if(!isSyntheticId(id)){
        try{
          const d = await fetch(`/api/reviews?place_id=${encodeURIComponent(id)}`).then(r=>r.json());
          if(d && d.rating!=null){
            infoRef.current.setContent(content(ratingLine({ rating:d.rating, ratings_total:d.ratings_total }, lang)));
          }
        }catch{ /* keep the fallback line */ }
      }
    };
    const pts = stops.map(s=>({lat:s.lat,lng:s.lng}));
    pts.forEach((p,i)=>{
      const m = new window.google.maps.Marker({ position:p, map:mapRef.current, label:`${i+1}` });
      m.addListener('click', ()=>showPin(stops[i], m));
      markersRef.current.push(m);
    });
    if(pts.length>1){
      lineRef.current = new window.google.maps.Polyline({
        path: pts, map: mapRef.current, strokeOpacity: 0,
        icons:[{icon:{path:'M 0,-1 0,1',strokeColor:ink||'#191817',strokeOpacity:1,scale:4},offset:'0',repeat:'14px'}]
      });
      class PillOverlay extends window.google.maps.OverlayView {
        constructor(pos, text){ super(); this.pos = pos; this.text = text; this.div = null; }
        onAdd(){
          const d = document.createElement('div');
          d.textContent = this.text;
          d.style.cssText = 'position:absolute;transform:translate(-50%,-50%);background:#ffffff;border:1px solid rgba(25,24,23,0.3);border-radius:999px;padding:3px 10px;font:700 12px -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#191817;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);';
          this.div = d;
          this.getPanes().overlayMouseTarget.appendChild(d);
        }
        draw(){
          const proj = this.getProjection();
          if(!proj || !this.div) return;
          const p = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(this.pos.lat, this.pos.lng));
          if(!p) return;
          this.div.style.left = `${p.x}px`;
          this.div.style.top = `${p.y}px`;
        }
        onRemove(){ this.div?.remove(); this.div = null; }
      }
      for(let i=0;i<pts.length-1;i++){
        const mid = { lat:(pts[i].lat+pts[i+1].lat)/2, lng:(pts[i].lng+pts[i+1].lng)/2 };
        const pill = new PillOverlay(mid, legs?.[i] || '');
        pill.setMap(mapRef.current);
        pillsRef.current.push(pill);
      }
      const b = new window.google.maps.LatLngBounds();
      pts.forEach(p=>b.extend(p));
      mapRef.current.fitBounds(b, 60);
    }
  },[stops, ink, legs, city, ready, lang]);

  if(unavailable){
    return (
      <div className="w-full border border-hairline rounded-lg overflow-hidden bg-white">
        <div className="h-[320px] md:h-[440px] grid place-items-center p-6 text-center">
          <div>
            <div className="font-bold text-2xl">{t(lang, 'map.offline')}</div>
            <div className="text-xs mt-1 opacity-60">{t(lang, 'map.offlineHint')}</div>
          </div>
        </div>
        <div className="border-t border-hairline px-3 py-1.5 font-mono text-[11px] tnum">{mapFootLine(day, stops.length, lang)}</div>
      </div>
    );
  }

  return (
    <div className="w-full border border-hairline rounded-lg overflow-hidden bg-white">
      <div ref={ref} className="w-full h-[320px] md:h-[440px]" />
      <div className="border-t border-hairline px-3 py-1.5 font-mono text-[11px] tnum">{mapFootLine(day, stops.length, lang)}</div>
    </div>
  );
}
