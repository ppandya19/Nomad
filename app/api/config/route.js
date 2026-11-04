export async function GET(){
  return Response.json({ key: process.env.GOOGLE_BROWSER_KEY });
}
