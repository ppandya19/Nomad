// Trip PDF document built with React createElement (no JSX — plain lib module
// shared by the /api/pdf route and node --test). Cover page with hero image,
// one page per day with cover photo, blurb, and clean per-stop list.
import React from 'react';
import { Document, Page, View, Text, Image, Link, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { fallbackDriveMin, estimateModes } from './route.js';
import { t } from './i18n.js';
import { categoryFor, parseViews, sumReelViews } from './score.js';
import { stopReserveTag, reserveLabel } from './reserve.js';
import { tipsDigestData } from './guide.js';
import { pdfSafe, segmentRuns, PDF_MID_DOT } from './pdf-text.js';
import { pdfFontFamily } from './pdf-fonts.js';

const el = React.createElement;
const ACCENT = '#E1306C';
const INK = '#1a1a1a';
const MUTED = '#6b6b6b';
const LINK = '#0095F6';
const LANGS = ['en', 'zh', 'hi', 'es', 'fr', 'it'];

export const fmtK = (n)=> n>=1000 ? `${(n/1000).toFixed(1).replace('.0','')}k` : `${n}`;

export function formatStopMeta(stop){
  if(stop.rating==null) return null;
  return stop.reviews!=null
    ? `${stop.rating} ${PDF_MID_DOT} ${fmtK(stop.reviews)} Google reviews`
    : `${stop.rating} ${PDF_MID_DOT} Google`;
}

const numOrNull = (v)=> typeof v==='number' && Number.isFinite(v) ? v : null;

// Live legs print plain, estimates carry ~ (mirrors formatLeg honesty);
// walking legs of 15+ min are dropped like the day view does.
export function formatPdfLeg(leg, a, b, lang){
  const words = { drive:t(lang, 'pdf.drive'), transit:t(lang, 'pdf.transit'), walk:t(lang, 'pdf.walk'), min:t(lang, 'pdf.min') };
  let modes = null, live = false;
  if(leg && numOrNull(leg.drive)!=null && numOrNull(leg.transit)!=null && numOrNull(leg.walk)!=null){
    modes = { drive:leg.drive, transit:leg.transit, walk:leg.walk };
    live = leg.live;
  }else if(a && b && [a.lat, a.lng, b.lat, b.lng].every((v)=>typeof v==='number' && Number.isFinite(v))){
    modes = estimateModes(fallbackDriveMin(a, b));
  }else return null;
  const ok = (m)=> live===true || (live && typeof live==='object' && !!live[m]);
  const parts = [
    `${words.drive} ${ok('drive')?'':'~'}${modes.drive}`,
    `${words.transit} ${ok('transit')?'':'~'}${modes.transit}`,
  ];
  if(modes.walk<15) parts.push(`${words.walk} ${ok('walk')?'':'~'}${modes.walk}`);
  return `${parts.join(` ${PDF_MID_DOT} `)} ${words.min}`;
}

export const mapUrl = (name, city)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city}`)}`;

export function topReelFor(name, reels){
  const list = (reels && reels[name]) || [];
  if(!list.length) return null;
  return list.slice().sort((a,b)=>parseViews(b.views)-parseViews(a.views))[0];
}

export function formatFoodMeta(pick, lang){
  const bits = [];
  if(pick.rating!=null) bits.push(pick.reviews!=null
    ? `${pick.rating} (${typeof pick.reviews==='number' ? fmtK(pick.reviews) : pick.reviews})`
    : `${pick.rating}`);
  if(pick.cuisine) bits.push(pick.cuisine);
  const tag = pick.reserve ? reserveLabel(pick.reserve, lang) : null;
  if(tag) bits.push(tag);
  return bits.length ? bits.join(` ${PDF_MID_DOT} `) : null;
}

const cap = (v, n)=>String(v ?? '').slice(0, n);
const intOrNull = (v)=> typeof v==='number' && Number.isFinite(v) ? Math.round(v) : null;
const normLive = (v)=>{
  if(v===true) return true;
  if(v && typeof v==='object') return { drive:!!v.drive, transit:!!v.transit, walk:!!v.walk };
  return false;
};
const bad = (what)=>{ const e = new Error(`bad pdf payload: ${what}`); e.status = 400; return e; };

export function validatePdfPayload(p){
  if(!p || typeof p!=='object' || Array.isArray(p)) throw bad('payload');
  const lang = LANGS.includes(p.lang) ? p.lang : 'en';
  if(!Array.isArray(p.days) || !p.days.length || p.days.length>14) throw bad('days');
  const city = cap(p.city, 60);
  if(!city) throw bad('city');
  let stopCount = 0;
  const days = p.days.map((d, di)=>{
    if(!d || typeof d!=='object') throw bad(`day ${di}`);
    if(!Array.isArray(d.stops) || d.stops.length>40) throw bad(`day ${di} stops`);
    const stops = d.stops.map((s, si)=>{
      if(!s || typeof s!=='object') throw bad(`stop ${di}.${si}`);
      const name = cap(s.name, 120);
      if(!name) throw bad(`stop ${di}.${si} name`);
      return { name, rating:numOrNull(s.rating), reviews:intOrNull(s.reviews),
        address:cap(s.address, 300), lat:numOrNull(s.lat), lng:numOrNull(s.lng) };
    });
    stopCount += stops.length;
    let legs = null;
    if(d.legs!=null){
      if(!Array.isArray(d.legs)) throw bad(`day ${di} legs`);
      legs = d.legs.map((l)=> l==null ? null : { drive:numOrNull(l.drive),
        transit:numOrNull(l.transit), walk:numOrNull(l.walk), live:normLive(l.live) });
    }
    return { title:cap(d.title, 60) || `Day ${di+1}`, blurb:cap(d.blurb, 800), stops, legs };
  });
  if(stopCount>120) throw bad('too many stops');
  return { title:cap(p.title, 120) || 'Trip', sub:cap(p.sub, 200), headline:cap(p.headline, 600),
    lang, city, collId: typeof p.collId==='string' ? p.collId.slice(0, 80) : null, days };
}

const S = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, color: INK, fontSize: 11 },
  hero: { width: '100%', height: 260, objectFit: 'cover', borderRadius: 10, marginBottom: 18 },
  coverTitle: { fontSize: 30, marginBottom: 6 },
  coverSub: { fontSize: 13, color: MUTED, marginBottom: 10 },
  headline: { fontSize: 12, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 9, color: MUTED, textAlign: 'center' },
  dayTitle: { fontSize: 20, marginBottom: 6 },
  rule: { width: 44, height: 3, backgroundColor: ACCENT, borderRadius: 2, marginBottom: 12 },
  dayImg: { width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 12 },
  blurb: { fontSize: 11, color: MUTED, lineHeight: 1.5, marginBottom: 6 },
  stopRow: { flexDirection: 'row', marginTop: 10 },
  stopNum: { width: 22, fontSize: 13, color: ACCENT },
  stopName: { fontSize: 13 },
  stopMeta: { fontSize: 10, color: MUTED, marginTop: 2 },
  legLine: { fontSize: 10, color: MUTED, marginLeft: 22, marginTop: 4 },
  stopThumb: { width: 52, height: 40, objectFit: 'cover', borderRadius: 6, marginRight: 8 },
  stopLink: { fontSize: 13, color: LINK, textDecoration: 'underline' },
  catLine: { fontSize: 10, color: MUTED, marginTop: 2 },
  reelLine: { fontSize: 10, color: LINK, marginTop: 2 },
  foodHead: { fontSize: 13, marginTop: 14, marginBottom: 4 },
  foodCat: { fontSize: 10, color: MUTED, marginTop: 6 },
  foodName: { fontSize: 11, color: LINK, marginTop: 2 },
  tipLabel: { fontSize: 12, marginTop: 10 },
  tipBody: { fontSize: 10, color: MUTED, lineHeight: 1.45, marginTop: 2 },
  agencyLink: { fontSize: 10, color: LINK },
});

// Rich text: sanitized + segmented so each run picks its script font.
function RT({ lang, ready, bold=false, style=null, children }){
  const runs = segmentRuns(pdfSafe(children));
  return el(Text, { style }, runs.map((r, i)=>el(Text,
    { key:i, style:{ fontFamily: pdfFontFamily(r.script, lang, ready), fontWeight: bold ? 'bold' : 'normal' } },
    r.text)));
}

// Rich link: same run routing inside a clickable annotation.
function RL({ lang, ready, bold=false, style=null, href, children }){
  const runs = segmentRuns(pdfSafe(children));
  return el(Link, { src:href, style }, runs.map((r, i)=>el(Text,
    { key:i, style:{ fontFamily: pdfFontFamily(r.script, lang, ready), fontWeight: bold ? 'bold' : 'normal' } },
    r.text)));
}

const foot = (key)=>el(Text, { key, style:S.footer, fixed:true,
  render:({ pageNumber, totalPages })=>`${pageNumber} / ${totalPages}` });

function CoverPage({ payload, cover, ready }){
  const lang = payload.lang;
  return el(Page, { size:'A4', style:S.page },
    cover && cover.src ? el(Image, { src:cover.src, style:S.hero }) : null,
    el(RT, { lang, ready, bold:true, style:S.coverTitle }, payload.title),
    el(RT, { lang, ready, style:S.coverSub }, payload.sub),
    payload.headline ? el(RT, { lang, ready, style:S.headline }, payload.headline) : null,
    foot());
}

function DayPage({ day, cover, thumbs, foods, reels, city, lang, ready }){
  const kids = [
    el(RT, { key:'h', lang, ready, bold:true, style:S.dayTitle }, day.title),
    el(View, { key:'r', style:S.rule }),
  ];
  if(cover && cover.src) kids.push(el(Image, { key:'img', src:cover.src, style:S.dayImg }));
  if(day.blurb) kids.push(el(RT, { key:'b', lang, ready, style:S.blurb }, day.blurb));
  const liveLegs = Array.isArray(day.legs) && day.legs.length===day.stops.length-1 ? day.legs : [];
  day.stops.forEach((s, si)=>{
    const meta = formatStopMeta(s);
    const tag = stopReserveTag({ name:s.name, ratings_total:s.reviews, views:sumReelViews(s.name, reels || {}) });
    const catLine = `${categoryFor(s.name, lang)}${tag ? ` ${PDF_MID_DOT} ${reserveLabel(tag, lang)}` : ''}`;
    const reel = topReelFor(s.name, reels);
    const thumb = (thumbs || [])[si];
    const colKids = [
      el(RL, { key:'n', lang, ready, bold:true, style:S.stopLink, href:mapUrl(s.name, city) }, s.name),
    ];
    if(meta) colKids.push(el(RT, { key:'m', lang, ready, style:S.stopMeta }, meta));
    colKids.push(el(RT, { key:'c', lang, ready, style:S.catLine }, catLine));
    if(s.address) colKids.push(el(RT, { key:'a', lang, ready, style:S.stopMeta }, s.address));
    if(reel && reel.url) colKids.push(el(RL, { key:'r', lang, ready, style:S.reelLine, href:reel.url },
      `${t(lang, 'pdf.reel')} ${PDF_MID_DOT} ${reel.views}`));
    kids.push(el(View, { key:`s${si}`, style:S.stopRow },
      el(RT, { lang, ready, bold:true, style:S.stopNum }, `${si+1}`),
      thumb && thumb.src ? el(Image, { src:thumb.src, style:S.stopThumb }) : null,
      el(View, { style:{ flex:1 } }, colKids)));
    if(si<day.stops.length-1){
      const line = formatPdfLeg(liveLegs[si] ?? null, s, day.stops[si+1], lang);
      if(line) kids.push(el(RT, { key:`l${si}`, lang, ready, style:S.legLine }, line));
    }
  });
  const foodGroups = (foods || []).filter((g)=>g.picks && g.picks.length);
  if(foodGroups.length){
    kids.push(el(RT, { key:'fh', lang, ready, bold:true, style:S.foodHead }, t(lang, 'share.foodnear')));
    foodGroups.forEach((g, gi)=>{
      kids.push(el(RT, { key:`fc${gi}`, lang, ready, bold:true, style:S.foodCat }, g.label));
      g.picks.forEach((p, pi)=>{
        kids.push(el(RL, { key:`fn${gi}.${pi}`, lang, ready, style:S.foodName, href:mapUrl(p.name, city) }, p.name));
        const foodMeta = formatFoodMeta(p, lang);
        if(foodMeta) kids.push(el(RT, { key:`fm${gi}.${pi}`, lang, ready, style:S.stopMeta }, foodMeta));
      });
    });
  }
  kids.push(foot('f'));
  return el(Page, { size:'A4', style:S.page }, kids);
}

function TipsPage({ digest, lang, ready }){
  const kids = [
    el(RT, { key:'h', lang, ready, bold:true, style:S.dayTitle }, digest.title),
    el(View, { key:'r', style:S.rule }),
  ];
  digest.rows.forEach((row, i)=>{
    kids.push(el(RT, { key:`l${i}`, lang, ready, bold:true, style:S.tipLabel }, row.label));
    if(row.agencies && row.agencies.length){
      const links = [];
      row.agencies.forEach((a, ai)=>{
        if(ai>0) links.push(el(RT, { key:`s${ai}`, lang, ready, style:{ fontSize:10, color:MUTED } }, ` ${PDF_MID_DOT} `));
        links.push(el(RL, { key:`a${ai}`, lang, ready, style:S.agencyLink, href:a.url }, a.name));
      });
      kids.push(el(View, { key:`g${i}`, style:{ flexDirection:'row', flexWrap:'wrap', marginTop:4 } }, links));
    }
    kids.push(el(RT, { key:`b${i}`, lang, ready, style:S.tipBody }, row.body));
  });
  kids.push(foot('f'));
  return el(Page, { size:'A4', style:S.page }, kids);
}

export function TripDoc({ payload, assets }){
  const ready = assets.ready || {};
  const covers = assets.covers || [];
  const digest = tipsDigestData({ city:payload.city, rentals:assets.agencies || [], lang:payload.lang });
  return el(Document, { title: pdfSafe(payload.title), author: 'Nomad' },
    el(CoverPage, { payload, cover: covers[0] || null, ready }),
    ...payload.days.map((day, i)=>el(DayPage, { key:i, day, cover: covers[i] || null,
      thumbs:(assets.thumbs || [])[i] || [], foods:(assets.foods || [])[i] || [],
      reels:assets.reels || {}, city:payload.city, lang:payload.lang, ready })),
    el(TipsPage, { digest, lang:payload.lang, ready }));
}

export function renderTripPdf(payload, assets){
  return renderToBuffer(el(TripDoc, { payload, assets }));
}
