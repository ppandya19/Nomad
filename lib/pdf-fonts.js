// Subset Noto fonts for the non-Latin PDF scripts (latin runs use built-in
// Helvetica, so no fetch there). Pinned fontsource files, fetched lazily per
// language and registered once as Buffers (one download, no render-time
// fetch); any failure leaves the family unregistered and the route answers
// 503 instead of rendering tofu.
import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FILES = {
  hi: { family: 'NomadDeva',
    normal: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-devanagari@5.3.0/files/noto-sans-devanagari-devanagari-400-normal.woff',
    bold: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-devanagari@5.3.0/files/noto-sans-devanagari-devanagari-700-normal.woff' },
  zh: { family: 'NomadSC',
    normal: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.3.1/files/noto-sans-sc-chinese-simplified-400-normal.woff',
    bold: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.3.1/files/noto-sans-sc-chinese-simplified-700-normal.woff' },
};

const registered = new Set();

// Same unref'd-timer shape as the cover fetches: a hung font CDN fails
// the language fast instead of stalling the whole share.
function withTimeout(promise, ms){
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>reject(new Error('pdf font timeout')), ms);
    if(timer.unref) timer.unref();
    promise.then((v)=>{ clearTimeout(timer); resolve(v); }, (e)=>{ clearTimeout(timer); reject(e); });
  });
}

export function fontsOkFor(lang, ready){
  if(lang==='hi') return !!ready.hi;
  if(lang==='zh') return !!ready.zh;
  return true;
}

export function pdfFontFamily(script, lang, ready){
  if(script==='deva' && lang==='hi' && ready.hi) return 'NomadDeva';
  if(script==='cjk' && lang==='zh' && ready.zh) return 'NomadSC';
  return 'Helvetica';
}

export async function ensurePdfFonts(lang, fetchFn=fetch, timeoutMs=20000){
  const ready = { hi:false, zh:false };
  try{
    const spec = PDF_FONT_FILES[lang];
    if(!spec) return ready;
    if(registered.has(spec.family)){ ready[lang] = true; return ready; }
    const bufs = await Promise.all([spec.normal, spec.bold].map(async (url)=>{
      const r = await withTimeout(fetchFn(url), timeoutMs);
      if(!r.ok) throw new Error(`font http=${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    }));
    Font.register({ family: spec.family, fonts: [
      { src: bufs[0], fontWeight: 'normal' },
      { src: bufs[1], fontWeight: 'bold' },
    ] });
    registered.add(spec.family);
    ready[lang] = true;
  }catch{ /* caller 503s via fontsOkFor */ }
  return ready;
}
