// Generate collection-post thumbnails with Meta Muse Image (muse-image-1.0).
// Usage: node scripts/gen-thumbs.mjs [--limit N]
// Reads MODEL_API_KEY from .env.local in-process; skips files that exist.
// Output: public/thumbs/<collectionId>-<postIndex>.jpg
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const env = readFileSync(new URL('./.env.local', root), 'utf8');
const key = (env.match(/^MODEL_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!key) { console.error('MODEL_API_KEY missing in .env.local'); process.exit(1); }
const cols = JSON.parse(readFileSync(new URL('./data/collections.json', root), 'utf8'));
const outDir = new URL('./public/thumbs/', root);
mkdirSync(outDir, { recursive: true });

const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const jobs = [];
for (const c of cols) c.posts.forEach((p, i) => jobs.push({ c, p, i }));
const todo = jobs.slice(0, limit).filter((j) => !existsSync(new URL(`./public/thumbs/${j.c.id}-${j.i}.jpg`, root)));
console.log(`posts=${jobs.length} todo=${todo.length} (existing skipped)`);

async function one(j, n) {
  const file = `${j.c.id}-${j.i}.jpg`;
  const prompt = `Photorealistic daytime travel photo of ${j.p.place}, ${j.c.city}. Clear frontal view of the landmark, blue sky, no people in the foreground, no text, no watermark, square composition.`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch('https://api.meta.ai/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'muse-image-1.0', prompt, n: 1, size: '1024x1024' }),
      });
      const d = await r.json().catch(() => null);
      const item = d?.data?.[0];
      let buf = null;
      if (item?.b64_json) buf = Buffer.from(item.b64_json, 'base64');
      else if (item?.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer());
      if (!buf || !buf.length) throw new Error(`no image data (http=${r.status} ${JSON.stringify(d).slice(0, 160)})`);
      writeFileSync(new URL(`./public/thumbs/${file}`, root), buf);
      console.log(`[${n}/${todo.length}] ${file} ok ${Math.round(buf.length / 1024)}KB`);
      return true;
    } catch (e) {
      if (attempt === 2) { console.log(`[${n}/${todo.length}] ${file} FAIL ${e.message.slice(0, 160)}`); return false; }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

let ok = 0, fail = 0, idx = 0;
const workers = Array.from({ length: 3 }, async () => {
  while (idx < todo.length) {
    const n = ++idx;
    if (await one(todo[n - 1], n)) ok++; else fail++;
  }
});
await Promise.all(workers);
console.log(`done ok=${ok} fail=${fail}`);
if (fail) process.exit(1);
