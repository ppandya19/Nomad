// Reelmap Score: quality 40 + reel buzz 30 + vibe match 20 + trust 10.
// Missing data falls back to documented neutrals (never hidden zeros that
// punish unscored stops, except buzz which is genuinely zero without reels).

export function parseViews(v){
  const m = /^([\d.]+)([MK])?$/.exec(v || '');
  if(!m) return 0;
  return parseFloat(m[1]) * (m[2]==='M' ? 1e6 : m[2]==='K' ? 1e3 : 1);
}

export function parseCount(v){
  if(typeof v === 'number') return v;
  if(typeof v === 'string' && /^[\d.,]+k$/i.test(v.trim())) return parseFloat(v)*1000;
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

const TAG_RULES = [
  [/market|tacos|pizza|food|restaur|caf[eé]|coffee|bar\b|eats/i, 'Foodie'],
  [/museum|art\b|galler|cathedral|church|historic|memorial/i, 'Culture lover'],
  [/club|rooftop|night|bar\b|goat|taco/i, 'Nightlife'],
  [/park|beach|trail|garden|hike|high line|pier/i, 'Outdoors'],
];

export function tagsFor(name, extra=[]){
  const tags = new Set(extra);
  for(const [re, tag] of TAG_RULES) if(re.test(name || '')) tags.add(tag);
  return [...tags];
}

const CATEGORY_LABELS = {
  'Food spot': { en: 'Food spot', zh: '美食点', hi: 'खाने की जगह', es: 'Sitio de comida', fr: 'Adresse food', it: 'Posto food' },
  'Museum': { en: 'Museum', zh: '博物馆', hi: 'संग्रहालय', es: 'Museo', fr: 'Musée', it: 'Museo' },
  'Park': { en: 'Park', zh: '公园', hi: 'पार्क', es: 'Parque', fr: 'Parc', it: 'Parco' },
  'Viewpoint': { en: 'Viewpoint', zh: '观景点', hi: 'व्यू पॉइंट', es: 'Mirador', fr: 'Belvédère', it: 'Belvedere' },
  'Landmark': { en: 'Landmark', zh: '地标', hi: 'लैंडमार्क', es: 'Emblema', fr: 'Monument', it: 'Monumento' },
};

export function categoryFor(name, lang='en'){
  const n = name || '';
  const key = /market|food|restaurant|tacos|pizza|caf[eé]|coffee/i.test(n) ? 'Food spot'
    : /museum|galler/i.test(n) ? 'Museum'
    : /park|garden|beach|high line/i.test(n) ? 'Park'
    : /miradouro|viewpoint|top|tower|bridge|square/i.test(n) ? 'Viewpoint'
    : 'Landmark';
  return (CATEGORY_LABELS[key] && (CATEGORY_LABELS[key][lang] || CATEGORY_LABELS[key].en)) || key;
}

export function sumReelViews(name, reels){
  return (reels[name] || []).reduce((t,r)=>t+parseViews(r.views), 0);
}

export function reelmapScore(stop, ctx={}){
  const { reels = {}, persona = [] } = ctx;
  const quality = stop.rating!=null
    ? Math.round(stop.rating/5*40)
    : 22;
  const views = sumReelViews(stop.name, reels);
  const buzz = views>0
    ? Math.min(30, Math.round(Math.log10(1+views)/Math.log10(1+5e6)*30))
    : 0;
  const tags = tagsFor(stop.name, stop.tags || []);
  const shared = tags.filter(t=>persona.includes(t)).length;
  const vibe = shared>0 ? Math.min(20, 8+6*shared) : 6;
  const n = parseCount(stop.reviews ?? stop.ratings_total);
  const trust = n>0
    ? Math.min(10, Math.round(Math.log10(1+n)/Math.log10(1+20000)*10))
    : 4;
  return { total: quality+buzz+vibe+trust, parts:{ quality, buzz, vibe, trust } };
}
