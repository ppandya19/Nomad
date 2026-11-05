import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import collections from '../../../data/collections.json';
import restaurants from '../../../data/restaurants.json';
import rentals from '../../../data/rentals.json';
import reels from '../../../data/reels.json';
import { validatePdfPayload, renderTripPdf } from '../../../lib/trip-pdf.js';
import { ensurePdfFonts, fontsOkFor } from '../../../lib/pdf-fonts.js';
import { resolveDayCovers, resolveStopThumbs } from '../../../lib/pdf-covers.js';
import { foodPicksFor } from '../../../lib/food.js';
import { foodCatLabel } from '../../../lib/i18n.js';

const FOOD_CATS = ['local special', 'coffee', 'lunch', 'dinner', 'fine dine'];

// POST { title, sub, headline, lang, city, collId, days[] } -> trip PDF.
// Day covers (cached/generated), per-stop thumbs, food picks, and rental
// agencies resolve server-side; non-Latin scripts need their subset font
// or the route answers 503.
export const maxDuration = 60;

export async function POST(req){
  let payload;
  try{
    payload = validatePdfPayload(await req.json());
  }catch(e){
    console.warn(`[nomad] pdf rejected: ${e.message}`);
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
  const ready = await ensurePdfFonts(payload.lang);
  if(!fontsOkFor(payload.lang, ready)){
    console.warn(`[nomad] pdf fonts unavailable for ${payload.lang}`);
    return Response.json({ error: `pdf fonts unavailable for ${payload.lang}` }, { status: 503 });
  }
  try{
    const publicDir = join(process.cwd(), 'public');
    const coll = payload.collId ? (collections.find((c)=>c.id===payload.collId) || null) : null;
    const dayStops = payload.days.map((d)=>d.stops.map((s)=>({ name: s.name })));
    const [covers, thumbs] = await Promise.all([
      resolveDayCovers(dayStops, { city: payload.city, coll, publicDir, readFile, writeFile, mkdir,
        modelKey: process.env.MODEL_API_KEY || '', fallbacks: false }),
      Promise.all(dayStops.map((stops)=>resolveStopThumbs(stops, payload.city, { publicDir, readFile, fallbacks: false }))),
    ]);
    const tripNames = payload.days.flatMap((d)=>d.stops.map((s)=>({ name: s.name })));
    const spots = restaurants[payload.city] || [];
    const foods = payload.days.map((d)=>{
      const dayLoc = d.stops.map((s)=>({ name: s.name, lat: s.lat, lng: s.lng }));
      return FOOD_CATS.map((cat)=>({
        label: foodCatLabel(cat, payload.lang),
        picks: foodPicksFor(spots, { category: cat, stops: dayLoc, exclude: tripNames, limit: 2 })
          .map((r)=>({ name: r.name, rating: r.rating ?? null, reviews: r.reviews ?? null,
            cuisine: r.cuisine || '', reserve: r.reserve || null })),
      })).filter((g)=>g.picks.length);
    });
    const buf = await renderTripPdf(payload, { covers, thumbs, foods,
      agencies: rentals[payload.city] || [], reels, ready });
    return new Response(buf, { status: 200, headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="nomad-trip.pdf"',
      'Content-Length': String(buf.length),
    } });
  }catch(e){
    console.warn(`[nomad] pdf failed: ${e.message}`);
    return Response.json({ error: `pdf render failed: ${String(e.message || e).slice(0, 120)}` }, { status: 500 });
  }
}
