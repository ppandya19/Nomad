// Structured stop edits for Nomad Assistant (native tool calling).
// The model proposes edits; the client resolves names, the traveler confirms,
// and only then does Page state change. Nothing here touches storage.
export const CHAT_TOOLS = [
  { type:'function', function:{
      name:'add_stop',
      description:'Add a place to the trip. Use when the traveler asks to add, include, or visit somewhere new. Names only — never invent ids or coordinates.',
      parameters:{ type:'object', properties:{
        name:{ type:'string', description:'Place name exactly as the traveler said it' },
        day:{ type:'integer', description:'1-based day number, only if the traveler named a day' },
      }, required:['name'] },
  }},
  { type:'function', function:{
      name:'remove_stop',
      description:'Remove a stop already on the trip. Use when the traveler asks to remove, drop, skip, or delete a stop. Match the name against the itinerary context.',
      parameters:{ type:'object', properties:{
        name:{ type:'string', description:'Stop name, matching the itinerary as closely as possible' },
        day:{ type:'integer', description:'1-based day number, only if the traveler named a day' },
      }, required:['name'] },
  }},
  { type:'function', function:{
      name:'search_places',
      description:'Look up real places with Google ratings. Call before recommending or listing any places so names, ratings, and review counts are grounded.',
      parameters:{ type:'object', properties:{
        query:{ type:'string', description:'What to search, e.g. pizza in Chelsea Market' },
        city:{ type:'string', description:'City to search near; omit to use the trip city' },
      }, required:['query'] },
  }},
];

export const EDIT_RULES = `EDITING STOPS (tool use)
- When the traveler asks to add, include, remove, drop, skip, or delete a stop, call exactly one tool (add_stop or remove_stop) instead of describing the change.
- Pass the place name exactly as said; pass day only when a day number is stated.
- One edit per reply. For anything else (questions, advice, summaries), answer in prose with no tool call.
- After the traveler confirms, the app applies the edit — never claim it is already done.`;

export const SEARCH_RULES = `GROUNDING RECOMMENDATIONS (search_places)
- Whenever you recommend or list places (food, sights, anything), first call search_places for each query you need (up to 3), then answer using ONLY the returned names, ratings, and review counts.
- Every place you name in a recommendation must show its rating inline as ★4.7 (12k). If a result has no rating, write "rating unavailable" for it — never invent a number.
- Prefer results already near the trip city in context.`;

// Accumulates streamed tool_call deltas (OpenAI shape) into parsed calls.
export function createToolAcc(){
  const byIndex = new Map();
  return {
    push(delta){
      if(!delta) return;
      const key = delta.index ?? 0;
      let e = byIndex.get(key);
      if(!e){ e = { id:'', name:'', args:'' }; byIndex.set(key, e); }
      if(delta.id && !e.id) e.id = delta.id;
      if(delta.function && typeof delta.function.name==='string') e.name += delta.function.name;
      if(delta.function && typeof delta.function.arguments==='string') e.args += delta.function.arguments;
    },
    calls(){
      const out = [];
      for(const e of byIndex.values()){
        if(!e.name) continue;
        try{ out.push({ id:e.id, name:e.name, args:e.args ? JSON.parse(e.args) : {} }); }
        catch{ /* incomplete streamed JSON — skip */ }
      }
      return out;
    }
  };
}

const norm = (s)=>(s||'').toLowerCase().trim().replace(/\s+/g,' ');

// Merge live ratings into resolved candidates: search values win, the
// resolvePlace top-up fills gaps, null when neither has one.
export function withRatings(candidates, topped){
  return candidates.map((c,i)=>{
    const top = topped[i];
    return {
      ...c,
      rating: c.rating ?? top?.rating ?? null,
      reviews: c.reviews ?? top?.ratings_total ?? null,
    };
  });
}

// Follow-up messages answering one round of tool calls (OpenAI shape).
// calls: [{id,name,args}], results: {id: object|string}.
export function toolRoundMessages(accText, calls, results){
  const answered = calls.filter(c=>c && c.id && results[c.id]!==undefined);
  const assistant = {
    role:'assistant',
    content: accText || null,
    tool_calls: answered.map(c=>({ id:c.id, type:'function', function:{ name:c.name, arguments:JSON.stringify(c.args || {}) } })),
  };
  const tools = answered.map(c=>{
    const r = results[c.id];
    return { role:'tool', tool_call_id:c.id, content: typeof r==='string' ? r : JSON.stringify(r ?? null) };
  });
  return [assistant, ...tools];
}

// Compact model-facing digest of one search_places result batch.
export function summarizeSearchResults(places){
  const list = (places||[]).filter(p=>p && p.name).slice(0,5);
  if(!list.length) return 'No matches.';
  return list.map(p=>`- ${p.name}${p.rating!=null ? ` ★${p.rating} (${p.ratings_total ?? '?'})` : ' (rating unavailable)'}${p.address ? ` — ${p.address}` : ''}`).join('\n');
}

export const fmtReviews = (n)=>n>=1000 ? `${(n/1000).toFixed(1).replace('.0','')}k` : `${n}`;

// User-facing safety net: rated names for replies that forgot them.
export function ratingsFootnote(places){
  const seen = new Map();
  for(const p of places||[]){
    if(p && p.name && p.rating!=null && !seen.has(p.name.toLowerCase())) seen.set(p.name.toLowerCase(), p);
  }
  if(!seen.size) return '';
  return 'Ratings: ' + [...seen.values()].map(p=>`${p.name} ★${p.rating}${p.ratings_total!=null ? ` (${fmtReviews(p.ratings_total)})` : ''}`).join(' · ');
}

// Fuzzy stop matching for remove intents: exact > startsWith > includes.
export function matchStops(stops, name){
  const q = norm(name);
  if(!q) return [];
  const scored = [];
  for(const s of stops){
    const n = norm(s.name);
    if(!n) continue;
    let score = -1;
    if(n===q) score = 0;
    else if(n.startsWith(q) || q.startsWith(n)) score = 1;
    else if(n.includes(q) || q.includes(n)) score = 2;
    if(score>=0) scored.push({ stop:s, score });
  }
  return scored.sort((a,b)=>a.score-b.score).map(x=>x.stop);
}
