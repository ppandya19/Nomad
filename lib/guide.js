// Travel-guide voice for trip and day summaries (overview + share text).
// Every line is data-grounded: stop names, counts, Reelmap scores, and
// travel times only — enthusiasm comes from phrasing, never invention.
// Each locale owns its templates (word order differs), defaulting to en.
import { reelmapScore } from './score.js';
import { daysUnit, stopsUnit, dayName, paceWord, travelDur, t, CITY_SLUG } from './i18n.js';
import { foodPicksFor } from './food.js';

const isFood = (s)=>String(s.place_id||'').startsWith('food-');
const isStay = (s)=>String(s.place_id||'').startsWith('stay-');

function ranked(stops, ctx){
  return stops
    .map(s=>({ stop:s, score:reelmapScore({ name:s.name, rating:s.rating ?? null, ratings_total:s.ratings_total ?? null, tags:s.tags || [] }, ctx).total }))
    .sort((a,b)=>b.score-a.score);
}

const T = {
  en: {
    day: (n)=>dayName(n, 'en'),
    empty: (d)=>`${d} is wide open — add stops to shape it.`,
    one: (star, d, food, stay)=>`${star} takes ${d} — one icon, zero rush${food?`, fueled by ${food}`:''}${stay?`, overnight at ${stay}`:''}.`,
    two: (star, other, d, pace, food, stay, move)=>`${star} plus ${other} — a ${pace} ${d}${food?`, fueled by ${food}`:''}${stay?`, overnight at ${stay}`:''}${move}.`,
    multi: (star, second, rest, pace, d, food, stay, move)=>`${star} leads ${d}: ${second} and ${rest} more stop${rest>1?'s':''}, ${pace} but doable${food?`, fueled by ${food}`:''}${stay?`, overnight at ${stay}`:''}${move}.`,
    move: (dur)=>` · ~${dur} on the move`,
    stars: (a, b)=>b ? `${a} and ${b}` : a,
    head: (city, stars, bits)=>`Your ${city} story, starring ${stars}: ${bits}.`,
    headBlank: (city)=>`Your ${city} story is still blank — add stops to begin.`,
    foodBit: (n)=>`${n} food break${n>1?'s':''}`,
    reelBit: (n)=>`${n} reel${n>1?'s':''} to preview`,
    moveBit: (dur)=>`~${dur} on the move`,
    top: (name)=>`Don't miss ${name} — your trip's standout.`,
    packed: (d, n)=>`${d} packs ${n} stops — a big day out; move one for breathing room.`,
    fullest: (d, n)=>`${d} is your fullest at ${n} stops — a great problem to have.`,
    blank: (d)=>`${d} is still a blank page — add stops or auto-create again.`,
    long: (a, b, m, d)=>`Longest ride: ${a} → ${b} (~${m} min, ${d}) — grab a window seat.`,
    shareHead: (city, days, stops, top)=>`My ${city} trip: ${days}, ${stops} — don't miss ${top}!`,
    shareBlank: (city, days)=>`My ${city} trip is taking shape — ${days} and counting!`,
    shareOpen: 'open day',
  },
  zh: {
    day: (n)=>dayName(n, 'zh'),
    empty: (d)=>`${d}完全开放 — 加站点来规划。`,
    one: (star, d, food, stay)=>`${star}承包${d} — 一个地标，不赶时间${food?`，在${food}补充能量`:''}${stay?`，夜宿${stay}`:''}。`,
    two: (star, other, d, pace, food, stay, move)=>`${star}加${other} — ${d}很${pace}${food?`，在${food}补充能量`:''}${stay?`，夜宿${stay}`:''}${move}。`,
    multi: (star, second, rest, pace, d, food, stay, move)=>`${star}领衔${d}：${second}还有${rest}站，${pace}但可行${food?`，在${food}补充能量`:''}${stay?`，夜宿${stay}`:''}${move}。`,
    move: (dur)=>` · 路上约${dur}`,
    stars: (a, b)=>b ? `${a}和${b}` : a,
    head: (city, stars, bits)=>`你的${city}故事，主角是${stars}：${bits}。`,
    headBlank: (city)=>`你的${city}故事还是空白 — 加站点开始吧。`,
    foodBit: (n)=>`${n}次美食`,
    reelBit: (n)=>`可预览${n}条短片`,
    moveBit: (dur)=>`路上约${dur}`,
    top: (name)=>`别错过${name} — 你此行的亮点。`,
    packed: (d, n)=>`${d}有${n}站 — 满满一天，移走一个更轻松。`,
    fullest: (d, n)=>`${d}最满，有${n}站 — 幸福的烦恼。`,
    blank: (d)=>`${d}还是白纸一张 — 加站点或重新自动创建。`,
    long: (a, b, m, d)=>`最长车程：${a} → ${b}（约${m}分钟，${d}） — 抢个靠窗座。`,
    shareHead: (city, days, stops, top)=>`我的${city}之旅：${days}，${stops} — 别错过${top}！`,
    shareBlank: (city, days)=>`我的${city}之旅正在成形 — ${days}，继续加！`,
    shareOpen: '空闲日',
  },
  hi: {
    day: (n)=>dayName(n, 'hi'),
    empty: (d)=>`${d} बिल्कुल खाली है — स्टॉप जोड़ें।`,
    one: (star, d, food, stay)=>`${star} ${d} की शान — एक आइकन, कोई जल्दी नहीं${food?`, ${food} से ऊर्जा`:''}${stay?`, ${stay} में रात`:''}।`,
    two: (star, other, d, pace, food, stay, move)=>`${star} और ${other} — ${d} ${pace}${food?`, ${food} से ऊर्जा`:''}${stay?`, ${stay} में रात`:''}${move}।`,
    multi: (star, second, rest, pace, d, food, stay, move)=>`${star} ${d} की अगुवाई: ${second} और ${rest} स्टॉप, ${pace} पर हो जाएगा${food?`, ${food} से ऊर्जा`:''}${stay?`, ${stay} में रात`:''}${move}।`,
    move: (dur)=>` · ~${dur} सफ़र`,
    stars: (a, b)=>b ? `${a} और ${b}` : a,
    head: (city, stars, bits)=>`तुम्हारी ${city} कहानी, ${stars} के साथ: ${bits}।`,
    headBlank: (city)=>`तुम्हारी ${city} कहानी अभी खाली है — स्टॉप जोड़कर शुरू करो।`,
    foodBit: (n)=>`${n} फ़ूड ब्रेक`,
    reelBit: (n)=>`देखने के लिए ${n} रील्स`,
    moveBit: (dur)=>`~${dur} सफ़र`,
    top: (name)=>`${name} न छोड़ें — आपकी यात्रा की शान।`,
    packed: (d, n)=>`${d} में ${n} स्टॉप — बड़ा दिन; सांस के लिए एक हटाएं।`,
    fullest: (d, n)=>`${d} सबसे भरा है (${n} स्टॉप) — अच्छी दिक्कत है।`,
    blank: (d)=>`${d} अभी खाली पन्ना है — स्टॉप जोड़ें।`,
    long: (a, b, m, d)=>`सबसे लंबा सफ़र: ${a} → ${b} (~${m} मिनट, ${d}) — खिड़की वाली सीट पकड़ो।`,
    shareHead: (city, days, stops, top)=>`मेरी ${city} यात्रा: ${days}, ${stops} — ${top} न छोड़ें!`,
    shareBlank: (city, days)=>`मेरी ${city} यात्रा बन रही है — ${days}, और भी!`,
    shareOpen: 'खाली दिन',
  },
  es: {
    day: (n)=>dayName(n, 'es'),
    empty: (d)=>`${d} está en blanco — añade paradas.`,
    one: (star, d, food, stay)=>`${star} protagoniza ${d}: un icono, sin prisa${food?`, con parada en ${food}`:''}${stay?`, noche en ${stay}`:''}.`,
    two: (star, other, d, pace, food, stay, move)=>`${star} más ${other}: ${d} ${pace}${food?`, con parada en ${food}`:''}${stay?`, noche en ${stay}`:''}${move}.`,
    multi: (star, second, rest, pace, d, food, stay, move)=>`${star} lidera ${d}: ${second} y ${rest} más, ${pace} pero factible${food?`, con parada en ${food}`:''}${stay?`, noche en ${stay}`:''}${move}.`,
    move: (dur)=>` · ~${dur} en ruta`,
    stars: (a, b)=>b ? `${a} y ${b}` : a,
    head: (city, stars, bits)=>`Tu historia en ${city}, con ${stars}: ${bits}.`,
    headBlank: (city)=>`Tu historia en ${city} está en blanco — añade paradas.`,
    foodBit: (n)=>`${n} paradas para comer`,
    reelBit: (n)=>`${n} reels para ver`,
    moveBit: (dur)=>`~${dur} en ruta`,
    top: (name)=>`No te pierdas ${name} — la joya del viaje.`,
    packed: (d, n)=>`${d} trae ${n} paradas — día grande; mueve una para respirar.`,
    fullest: (d, n)=>`${d} es el más lleno con ${n} paradas — un gran problema.`,
    blank: (d)=>`${d} sigue en blanco — añade paradas.`,
    long: (a, b, m, d)=>`Trayecto largo: ${a} → ${b} (~${m} min, ${d}) — pide ventanilla.`,
    shareHead: (city, days, stops, top)=>`Mi viaje por ${city}: ${days}, ${stops}. ¡No te pierdas ${top}!`,
    shareBlank: (city, days)=>`Mi viaje por ${city} toma forma: ${days} ¡y subiendo!`,
    shareOpen: 'día libre',
  },
  fr: {
    day: (n)=>dayName(n, 'fr'),
    empty: (d)=>`${d} est grand ouvert — ajoutez des étapes.`,
    one: (star, d, food, stay)=>`${star} porte ${d} : une icône, sans se presser${food?`, avec une pause chez ${food}`:''}${stay?`, nuit à ${stay}`:''}.`,
    two: (star, other, d, pace, food, stay, move)=>`${star} plus ${other} : ${d} ${pace}${food?`, avec une pause chez ${food}`:''}${stay?`, nuit à ${stay}`:''}${move}.`,
    multi: (star, second, rest, pace, d, food, stay, move)=>`${star} mène ${d} : ${second} et ${rest} autres, ${pace} mais faisable${food?`, avec une pause chez ${food}`:''}${stay?`, nuit à ${stay}`:''}${move}.`,
    move: (dur)=>` · ~${dur} de route`,
    stars: (a, b)=>b ? `${a} et ${b}` : a,
    head: (city, stars, bits)=>`Votre histoire à ${city}, avec ${stars} : ${bits}.`,
    headBlank: (city)=>`Votre histoire à ${city} est encore blanche — ajoutez des étapes.`,
    foodBit: (n)=>`${n} pauses repas`,
    reelBit: (n)=>`${n} reels à voir`,
    moveBit: (dur)=>`~${dur} de route`,
    top: (name)=>`Ne manquez pas ${name} — le clou du voyage.`,
    packed: (d, n)=>`${d} compte ${n} arrêts — grosse journée ; déplacez-en une pour respirer.`,
    fullest: (d, n)=>`${d} est le plus chargé avec ${n} arrêts — un beau problème.`,
    blank: (d)=>`${d} est encore vide — ajoutez des étapes.`,
    long: (a, b, m, d)=>`Plus long trajet : ${a} → ${b} (~${m} min, ${d}) — prenez le hublot.`,
    shareHead: (city, days, stops, top)=>`Mon voyage à ${city} : ${days}, ${stops} — ne manquez pas ${top} !`,
    shareBlank: (city, days)=>`Mon voyage à ${city} prend forme : ${days}, et ça continue !`,
    shareOpen: 'jour libre',
  },
  it: {
    day: (n)=>dayName(n, 'it'),
    empty: (d)=>`${d} è tutto libero — aggiungi tappe.`,
    one: (star, d, food, stay)=>`${star} è tutto ${d}: un'icona, senza fretta${food?`, con sosta da ${food}`:''}${stay?`, pernottamento a ${stay}`:''}.`,
    two: (star, other, d, pace, food, stay, move)=>`${star} più ${other}: ${d} ${pace}${food?`, con sosta da ${food}`:''}${stay?`, pernottamento a ${stay}`:''}${move}.`,
    multi: (star, second, rest, pace, d, food, stay, move)=>`${star} guida ${d}: ${second} e altre ${rest}, ${pace} ma fattibile${food?`, con sosta da ${food}`:''}${stay?`, pernottamento a ${stay}`:''}${move}.`,
    move: (dur)=>` · ~${dur} in viaggio`,
    stars: (a, b)=>b ? `${a} e ${b}` : a,
    head: (city, stars, bits)=>`La tua storia a ${city}, con ${stars}: ${bits}.`,
    headBlank: (city)=>`La tua storia a ${city} è ancora bianca — aggiungi tappe.`,
    foodBit: (n)=>`${n} soste per mangiare`,
    reelBit: (n)=>`${n} reel da vedere`,
    moveBit: (dur)=>`~${dur} in viaggio`,
    top: (name)=>`Non perderti ${name} — il pezzo forte.`,
    packed: (d, n)=>`${d} ha ${n} tappe — giornatona; spostane una per respirare.`,
    fullest: (d, n)=>`${d} è il più pieno con ${n} tappe — un bel problema.`,
    blank: (d)=>`${d} è ancora vuoto — aggiungi tappe.`,
    long: (a, b, m, d)=>`Tratta lunga: ${a} → ${b} (~${m} min, ${d}) — prendi il finestrino.`,
    shareHead: (city, days, stops, top)=>`Il mio viaggio a ${city}: ${days}, ${stops} — non perderti ${top}!`,
    shareBlank: (city, days)=>`Il mio viaggio a ${city} prende forma: ${days} e oltre!`,
    shareOpen: 'giorno libero',
  },
};

const tpl = (lang)=>T[lang] || T.en;

export function dayHighlight(day, { dayNum=1, driveMin=0, reels={}, persona=[], lang='en' }={}){
  const x = tpl(lang);
  const d = x.day(dayNum);
  if(!day.length) return x.empty(d);
  const order = ranked(day, { reels, persona });
  const star = order[0].stop;
  const food = day.filter(isFood);
  const stay = day.filter(isStay);
  const foodName = food.length ? food[0].name : null;
  const stayName = stay.length ? stay[0].name : null;
  const move = driveMin>0 ? x.move(travelDur(driveMin, lang)) : '';
  if(day.length===1) return x.one(star.name, d, foodName, stayName);
  if(day.length===2) return x.two(star.name, order[1].stop.name, d, paceWord(2, lang), foodName, stayName, move);
  const rest = day.length-2;
  return x.multi(star.name, order[1].stop.name, rest, paceWord(day.length, lang), d, foodName, stayName, move);
}

export function tripHeadline({ city='Unknown city', days=[], driveMin=0, reels={}, persona=[], lang='en' }={}){
  const x = tpl(lang);
  const stops = days.flat();
  if(!stops.length) return x.headBlank(city);
  const order = ranked(stops, { reels, persona });
  const stars = x.stars(order[0].stop.name, order.length>1 && order[1].stop.name!==order[0].stop.name ? order[1].stop.name : null);
  const foodN = stops.filter(isFood).length;
  const reelN = stops.reduce((t,s)=>t+Math.min((reels[s.name]||[]).length,5),0);
  const bits = [daysUnit(days.length, lang), stopsUnit(stops.length, lang)];
  if(foodN) bits.push(x.foodBit(foodN));
  if(reelN) bits.push(x.reelBit(reelN));
  if(driveMin>0) bits.push(x.moveBit(travelDur(driveMin, lang)));
  return x.head(city, stars, bits.join(' · '));
}

export function tripHighlights({ days=[], reels={}, persona=[], legMin=null, lang='en' }={}){
  const x = tpl(lang);
  const out = [];
  const stops = days.flat();
  if(stops.length){
    const top = ranked(stops, { reels, persona })[0];
    out.push(x.top(top.stop.name));
  }
  const counts = days.map(d=>d.length);
  const mx = Math.max(0, ...counts);
  if(mx>=6) out.push(x.packed(x.day(counts.indexOf(mx)+1), mx));
  else if(mx>=3) out.push(x.fullest(x.day(counts.indexOf(mx)+1), mx));
  const empty = counts.findIndex(c=>c===0);
  if(empty>=0) out.push(x.blank(x.day(empty+1)));
  if(legMin){
    let longest = null;
    days.forEach((d,di)=>{ for(let i=0;i<d.length-1;i++){ const m = legMin(d[i], d[i+1]); if(!longest||m>longest.m) longest = { m, a:d[i].name, b:d[i+1].name, day:di+1 }; } });
    if(longest && longest.m>=20) out.push(x.long(longest.a, longest.b, longest.m, x.day(longest.day)));
  }
  return out.slice(0,4);
}

const SHARE_CATS = ['local special', 'coffee', 'lunch', 'dinner', 'fine dine'];
const numRate = (v)=>{ const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// Top-3 rated food picks near the day's stops, skipping trip-added spots.
function shareFoodFor(d, { restaurants, tripStops, lang }){
  if(!restaurants.length) return null;
  const seen = new Set();
  const picks = [];
  for(const cat of SHARE_CATS){
    for(const r of foodPicksFor(restaurants, { category:cat, stops:d, exclude:tripStops, limit:2 })){
      const k = (r.name||'').toLowerCase();
      if(!k || seen.has(k)) continue;
      seen.add(k);
      picks.push(r);
    }
  }
  picks.sort((a,b)=>numRate(b.rating)-numRate(a.rating));
  const top = picks.slice(0, 3);
  if(!top.length) return null;
  return `🍽️ *${t(lang, 'share.foodnear')}:* ${top.map((r)=>r.rating!=null ? `${r.name} (${r.rating})` : r.name).join(', ')}`;
}

// Trip-level travel-agent digest reusing the tips page copy. Structured
// data is shared with the PDF renderer; the text formatter joins it up.
export function tipsDigestData({ city, rentals, lang }){
  const slug = CITY_SLUG[city] || 'nyc';
  const agencies = (rentals||[]).filter((a)=>a && a.name && a.url).map((a)=>({ name:a.name, url:a.url }));
  return { title:t(lang, 'tips.title'), rows:[
    { label:t(lang, 'tips.around.t'), body:t(lang, `tips.around.${slug}`) },
    { label:t(lang, 'tips.car.t'), body:t(lang, 'tips.car.1'), agencies },
    { label:t(lang, 'tips.flight.t'), body:t(lang, 'tips.flight.1') },
    { label:t(lang, 'tips.pack.t'), body:t(lang, 'tips.pack.1') },
    { label:t(lang, 'tips.stay.t'), body:t(lang, 'tips.stay.1') },
  ]};
}

const TIP_ICONS = ['🧭', '🚗', '✈️', '🎒', '🏨'];

function shareTipsDigest({ city, rentals, lang }){
  const d = tipsDigestData({ city, rentals, lang });
  const names = (rentals||[]).map((a)=>a.name).filter(Boolean);
  return [`💡 *${d.title}:*`, ...d.rows.map((r, i)=>{
    const body = r.agencies ? (names.length ? `${names.join(', ')} — ${r.body}` : r.body) : r.body;
    return `${TIP_ICONS[i] || '-'} *${r.label}:* ${body}`;
  })].join('\n');
}

export function shareTripText({ city='Unknown city', days=[], reels={}, persona=[], lang='en', restaurants=[], rentals=[], dayMoveMin=[] }={}){
  const x = tpl(lang);
  const stops = days.flat();
  const head = stops.length
    ? x.shareHead(city, daysUnit(days.length, lang), stopsUnit(stops.length, lang), ranked(stops, { reels, persona })[0].stop.name)
    : x.shareBlank(city, daysUnit(days.length, lang));
  const lines = days.map((d,i)=>{
    const move = dayMoveMin[i]>0 ? ` (${x.moveBit(travelDur(dayMoveMin[i], lang))})` : '';
    const stopsLine = `📍 *${x.day(i+1)}*${move}: ${d.length ? d.map(s=>s.name).join(' → ') : x.shareOpen}`;
    const food = shareFoodFor(d, { restaurants, tripStops:stops, lang });
    return food ? `${stopsLine}\n  ${food}` : stopsLine;
  });
  return [`🗺️ ${head}`, ...lines, '', shareTipsDigest({ city, rentals, lang })].join('\n');
}
