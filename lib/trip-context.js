// Compress a trip into a compact prompt block for the chat agent.
// Caps days, stops per day, and total size so prompts stay small.
export function buildTripContext(trip){
  const city = trip.city || 'Unknown city';
  const days = Array.isArray(trip.days) ? trip.days : [];
  const lines = [`Trip: ${city}`, `Days: ${days.length}`];
  days.slice(0,7).forEach((d,i)=>{
    const stops = Array.isArray(d) ? d : [];
    const names = stops.slice(0,8).map(s=>s.rating!=null ? `${s.name} (${s.rating})` : `${s.name}`);
    lines.push(`Day ${i+1} (${stops.length} stops): ${names.join(' → ')||'empty'}${stops.length>8 ? ` +${stops.length-8} more` : ''}`);
  });
  const food = Array.isArray(trip.food) ? trip.food.slice(0,6) : [];
  if(food.length) lines.push(`Food picks: ${food.map(f=>f.name).join(', ')}`);
  const persona = Array.isArray(trip.persona) ? trip.persona : [];
  if(persona.length) lines.push(`Traveler persona: ${persona.join(', ')}`);
  const out = lines.join('\n');
  return out.length>4000 ? out.slice(0,4000) : out;
}

// Compact top-rated restaurant list so the agent can recommend food
// outside the itinerary without inventing ratings.
export function restaurantContext(city, byCity){
  const list = (byCity && byCity[city]) || [];
  const ranked = list
    .filter(r=>r && r.name)
    .map(r=>({ ...r, score: parseFloat(r.rating) || 0 }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,8);
  if(!ranked.length) return '';
  const lines = [`Top-rated in ${city}:`];
  ranked.forEach(r=>{
    const bits = [r.cuisine, r.rating!=null ? `★${r.rating}` : null].filter(Boolean);
    lines.push(`- ${r.name}${bits.length ? ` (${bits.join(', ')})` : ''}`);
  });
  return lines.join('\n');
}
