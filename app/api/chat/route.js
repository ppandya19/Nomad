import { readFile } from 'fs/promises';
import { join } from 'path';
import { buildTripContext, restaurantContext } from '../../../lib/trip-context.js';
import { LANG_NAMES } from '../../../lib/i18n.js';
import { CHAT_TOOLS, EDIT_RULES } from '../../../lib/chat-edit.js';

const SYSTEM = `You are Nomad's trip assistant inside a travel-planning app. Help with the traveler's trip using the context below plus general travel knowledge: days, stops, food, timing. Also recommend places and restaurants in and around the trip city that are NOT on the itinerary — e.g. a pizza spot near a stop — preferring the city's top-rated list in context when it fits, otherwise famous spots from your own knowledge. Reference real stop names and day numbers from the context. Be concise: short paragraphs or bullets, no fluff. Never invent ratings, review counts, or opening hours — only cite numbers shown in the context.`;

// POST { messages: [{role, content}], trip } -> streamed chat completion.
// Key stays server-side; the browser never sees MODEL_API_KEY.
export async function POST(req){
  const body = await req.json().catch(()=>null);
  const key = process.env.MODEL_API_KEY;
  if(!key) return Response.json({ error:'Agent unavailable — add MODEL_API_KEY to .env.local' }, { status: 503 });
  if(!body || !Array.isArray(body.messages) || body.messages.length===0){
    return Response.json({ error:'No messages' }, { status: 400 });
  }
  const history = body.messages
    .filter(m=>m && (m.role==='user' || m.role==='assistant') && typeof m.content==='string')
    .slice(-20)
    .map(m=>({ role:m.role, content:m.content.slice(0,2000) }));
  if(!history.length || history[history.length-1].role!=='user'){
    return Response.json({ error:'Last message must be from the user' }, { status: 400 });
  }
  const trip = body.trip && typeof body.trip==='object' ? body.trip : { city:'', days:[] };
  const langTail = body.lang && body.lang!=='en' && LANG_NAMES[body.lang] ? `\nReply in ${LANG_NAMES[body.lang]}.` : '';
  let context = buildTripContext(trip);
  try{
    const byCity = JSON.parse(await readFile(join(process.cwd(), 'data', 'restaurants.json'), 'utf8'));
    const foodCtx = restaurantContext(trip.city, byCity);
    if(foodCtx) context += `\n${foodCtx}`;
  }catch{ /* food context is optional */ }
  let upstream;
  try{
    upstream = await fetch('https://api.meta.ai/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
      body: JSON.stringify({
        model:'muse-spark-1.3',
        stream:true,
        tools:CHAT_TOOLS,
        tool_choice:'auto',
        messages:[{ role:'system', content:`${SYSTEM}\n\nTRIP CONTEXT\n${context}${langTail}\n\n${EDIT_RULES}` }, ...history]
      })
    });
  }catch{
    return Response.json({ error:'Agent request failed — try again' }, { status: 502 });
  }
  if(!upstream.ok || !upstream.body){
    return Response.json({ error:'Agent request failed — try again' }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers:{ 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', Connection:'keep-alive' }
  });
}
