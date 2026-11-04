export async function GET(req){
  const q = new URL(req.url).searchParams.get('q') || 'New York';
  const r = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${process.env.GOOGLE_SERVER_KEY}`
  ).then(r=>r.json());
  const loc = r.results?.[0]?.geometry?.location || { lat: 40.7128, lng: -74.0060 };
  return Response.json({ ...loc, name: r.results?.[0]?.formatted_address || q });
}
