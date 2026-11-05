import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { pdfSafe, segmentRuns, PDF_MID_DOT, pdfFailureDetail } from '../lib/pdf-text.js';
import { ensurePdfFonts, fontsOkFor, pdfFontFamily, PDF_FONT_FILES } from '../lib/pdf-fonts.js';
import { resolveDayCovers, resolveStopThumbs, coverNameForDay, sniffMime } from '../lib/pdf-covers.js';
import { formatStopMeta, formatPdfLeg, formatFoodMeta, mapUrl, topReelFor, validatePdfPayload, renderTripPdf } from '../lib/trip-pdf.js';
import { t } from '../lib/i18n.js';

const cp = (...codes)=>String.fromCodePoint(...codes);

// Content streams are flate-compressed with hex-encoded TJ text; inflate and
// decode them so assertions read what a viewer shows (latin runs only).
function pdfText(buf){
  const s = buf.toString('latin1');
  const out = [];
  for(const m of s.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)){
    try{
      const txt = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
      for(const h of txt.matchAll(/<([0-9A-Fa-f]+)>/g)) out.push(Buffer.from(h[1], 'hex').toString('latin1'));
    }catch{ /* not a flate stream */ }
  }
  return out.join('');
}

describe('pdfSafe', ()=>{
  it('strips emoji and symbols, keeps the middle dot', ()=>{
    assert.equal(pdfSafe(`~${cp(0x1F697)} 3 ${cp(0xB7)} ~${cp(0x1F687)} 9`), `~ 3 ${cp(0xB7)} ~ 9`);
    assert.equal(pdfSafe(`4.7 ${cp(0x2605)}`), '4.7');
  });
  it('maps arrows to ascii', ()=>{
    assert.equal(pdfSafe(`A ${cp(0x2192)} B`), 'A -> B');
    assert.equal(pdfSafe(`x${cp(0x2190)}y`), 'xy');
  });
  it('maps CJK punctuation to ascii', ()=>{
    assert.equal(pdfSafe(`${cp(0x7B2C)}${cp(0x3002)}`), `${cp(0x7B2C)}.`);
    assert.equal(pdfSafe(`${cp(0xFF08)}${cp(0x7B2C)}${cp(0xFF09)}`), `(${cp(0x7B2C)})`);
  });
  it('collapses whitespace and trims', ()=>{
    assert.equal(pdfSafe('  a   b  '), 'a b');
    assert.equal(pdfSafe(null), '');
  });
});

describe('segmentRuns', ()=>{
  it('splits latin, devanagari, and CJK runs', ()=>{
    assert.deepEqual(segmentRuns(`Day 1 ${cp(0x7B2C)}${cp(0x4E00)}`), [
      { script:'latin', text:'Day 1 ' }, { script:'cjk', text:`${cp(0x7B2C)}${cp(0x4E00)}` },
    ]);
    assert.deepEqual(segmentRuns(`${cp(0x926)}${cp(0x93F)}${cp(0x928)} 1`), [
      { script:'deva', text:`${cp(0x926)}${cp(0x93F)}${cp(0x928)}` }, { script:'latin', text:' 1' },
    ]);
  });
  it('keeps pure latin in one run', ()=>{
    assert.deepEqual(segmentRuns('Times Square 4.7'), [{ script:'latin', text:'Times Square 4.7' }]);
    assert.deepEqual(segmentRuns(''), [{ script:'latin', text:'' }]);
  });
  it('routes every locale pdf word to its own script', ()=>{
    const want = { en:'latin', es:'latin', fr:'latin', it:'latin', hi:'deva', zh:'cjk' };
    for(const [code, script] of Object.entries(want)){
      for(const key of ['pdf.drive', 'pdf.transit', 'pdf.walk', 'pdf.min']){
        const runs = segmentRuns(t(code, key));
        assert.ok(runs.length>0 && runs.every((r)=>r.script===script), `${code}:${key} routes ${script}`);
      }
    }
  });
});

describe('pdfFailureDetail', ()=>{
  it('surfaces the server cause with its status', ()=>{
    assert.equal(pdfFailureDetail(503, JSON.stringify({ error:'pdf fonts unavailable for hi' })),
      '503 pdf fonts unavailable for hi');
    assert.equal(pdfFailureDetail(400, JSON.stringify({ error:'bad pdf payload: city' })),
      '400 bad pdf payload: city');
  });
  it('falls back cleanly for non-JSON bodies and caps long causes', ()=>{
    assert.equal(pdfFailureDetail(500, '<html>oops</html>'), '500 pdf failed');
    assert.equal(pdfFailureDetail(500, ''), '500 pdf failed');
    assert.equal(pdfFailureDetail(500, JSON.stringify({ error:`x${'y'.repeat(200)}` })).length, 84);
  });
});

describe('formatStopMeta', ()=>{
  it('formats rating with compact review counts', ()=>{
    assert.equal(formatStopMeta({ rating:4.7, reviews:249500 }), `4.7 ${PDF_MID_DOT} 249.5k Google reviews`);
    assert.equal(formatStopMeta({ rating:4.5, reviews:900 }), `4.5 ${PDF_MID_DOT} 900 Google reviews`);
    assert.equal(formatStopMeta({ rating:4.5, reviews:null }), `4.5 ${PDF_MID_DOT} Google`);
    assert.equal(formatStopMeta({ rating:null, reviews:null }), null);
  });
});

describe('formatPdfLeg', ()=>{
  const live = { drive:5, transit:9, walk:12, live:{ drive:true, transit:false, walk:true } };
  it('prints live plain and estimates with tilde', ()=>{
    assert.equal(formatPdfLeg(live, null, null, 'en'), `Drive 5 ${PDF_MID_DOT} Transit ~9 ${PDF_MID_DOT} Walk 12 min`);
  });
  it('drops long walks and tolerates whole-leg flags', ()=>{
    assert.equal(formatPdfLeg({ ...live, walk:40 }, null, null, 'en'), `Drive 5 ${PDF_MID_DOT} Transit ~9 min`);
    assert.equal(formatPdfLeg({ drive:5, transit:9, walk:12, live:true }, null, null, 'en'),
      `Drive 5 ${PDF_MID_DOT} Transit 9 ${PDF_MID_DOT} Walk 12 min`);
  });
  it('estimates from coords when no leg arrives', ()=>{
    const line = formatPdfLeg(null, { lat:40.758, lng:-73.9855 }, { lat:40.759, lng:-73.9845 }, 'en');
    assert.equal(line, `Drive ~3 ${PDF_MID_DOT} Transit ~9 min`);
  });
  it('returns null without legs or coords', ()=>{
    assert.equal(formatPdfLeg(null, null, null, 'en'), null);
    assert.equal(formatPdfLeg(null, { lat:null, lng:null }, { lat:40, lng:-74 }, 'en'), null);
  });
  it('localizes mode words and falls back to english', ()=>{
    assert.match(formatPdfLeg(live, null, null, 'es'), /Coche 5/);
    assert.equal(formatPdfLeg(live, null, null, 'xx'), formatPdfLeg(live, null, null, 'en'));
  });
});

describe('pdf helpers', ()=>{
  it('links stops to a maps search', ()=>{
    assert.equal(mapUrl('Times Square', 'New York'),
      'https://www.google.com/maps/search/?api=1&query=Times%20Square%20New%20York');
  });
  it('picks the most-viewed reel with a url', ()=>{
    const reels = { 'X': [{ views:'1k', url:'https://r1' }, { views:'2M', url:'https://r2' }] };
    assert.equal(topReelFor('X', reels).url, 'https://r2');
    assert.equal(topReelFor('Y', reels), null);
    assert.equal(topReelFor('X', null), null);
  });
  it('formats food meta with rating, cuisine, and reserve tag', ()=>{
    assert.equal(formatFoodMeta({ name:'A', rating:'4.5', reviews:'5k', cuisine:'Italian', reserve:null }, 'en'),
      `4.5 (5k) ${PDF_MID_DOT} Italian`);
    assert.equal(formatFoodMeta({ name:'B', rating:4.9, reviews:8000, cuisine:'', reserve:'recommended' }, 'en'),
      `4.9 (8k) ${PDF_MID_DOT} Reservation recommended`);
    assert.equal(formatFoodMeta({ name:'C', rating:null, reviews:null, cuisine:'', reserve:null }, 'en'), null);
  });
  it('sniffs jpeg and png, rejects webp and junk', ()=>{
    assert.equal(sniffMime(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/jpeg');
    assert.equal(sniffMime(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/png');
    assert.equal(sniffMime(Buffer.from('RIFFxxxxWEBPVP8X')), null);
    assert.equal(sniffMime(Buffer.from([1, 2, 3])), null);
    assert.equal(sniffMime(null), null);
  });
});

describe('validatePdfPayload', ()=>{
  const raw = { title:'T', sub:'S', headline:'H', lang:'en', city:'New York', collId:null,
    days:[{ title:'Day 1', blurb:'B', stops:[{ name:'X', rating:1, reviews:2, address:'A', lat:40, lng:-74 }], legs:[] }] };
  it('accepts a minimal trip and defaults the language', ()=>{
    const v = validatePdfPayload(raw);
    assert.equal(v.days.length, 1);
    assert.equal(v.days[0].stops[0].name, 'X');
    assert.equal(validatePdfPayload({ ...raw, lang:'xx' }).lang, 'en');
  });
  it('rejects misshapen payloads with 400', ()=>{
    for(const p of [null, {}, { days:[] }, { days:[{ stops:[] }] }, { city:'X', days:[{ stops:[{}] }] },
        { city:'X', days:[{ stops:[], legs:{} }] }, { city:'X', days:Array(15).fill({ stops:[] }) }]){
      assert.throws(()=>validatePdfPayload(p), (e)=>e.status===400);
    }
  });
  it('truncates overlong strings', ()=>{
    assert.equal(validatePdfPayload({ ...raw, title:'x'.repeat(200) }).title.length, 120);
  });
});

describe('pdf fonts', ()=>{
  it('needs no fetch for latin languages', async ()=>{
    let called = false;
    const ready = await ensurePdfFonts('en', async ()=>{ called = true; throw new Error('no fetch'); });
    assert.deepEqual(ready, { hi:false, zh:false });
    assert.equal(called, false);
    assert.equal(fontsOkFor('en', ready), true);
  });
  it('fails closed when a subset font is unreachable', async ()=>{
    const ready = await ensurePdfFonts('hi', async ()=>{ throw new Error('down'); });
    assert.deepEqual(ready, { hi:false, zh:false });
    assert.equal(fontsOkFor('hi', ready), false);
  });
  it('times out hanging subset-font fetches instead of stalling the share', async ()=>{
    const hang = ()=>new Promise(()=>{});
    const slow = new Promise((r)=>setTimeout(()=>r('SLOW'), 3000));
    const got = await Promise.race([ensurePdfFonts('hi', hang, 20), slow]);
    assert.notEqual(got, 'SLOW');
    assert.deepEqual(got, { hi:false, zh:false });
  });
  it('routes runs to registered families or Helvetica', ()=>{
    assert.equal(pdfFontFamily('latin', 'en', {}), 'Helvetica');
    assert.equal(pdfFontFamily('cjk', 'zh', { zh:true }), 'NomadSC');
    assert.equal(pdfFontFamily('cjk', 'zh', { zh:false }), 'Helvetica');
    assert.equal(pdfFontFamily('deva', 'hi', { hi:true }), 'NomadDeva');
  });
  it('pins subset font files with exact versions', ()=>{
    assert.match(PDF_FONT_FILES.hi.normal, /noto-sans-devanagari@5\.3\.0\/files\/noto-sans-devanagari-devanagari-400-normal\.woff$/);
    assert.match(PDF_FONT_FILES.zh.bold, /noto-sans-sc@5\.3\.1\/files\/noto-sans-sc-chinese-simplified-700-normal\.woff$/);
  });
});

describe('resolveDayCovers', ()=>{
  const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = Buffer.from('RIFFxxxxWEBPVP8X');
  const readMiss = async ()=>{ throw new Error('no file'); };
  const fetchMiss = async ()=>{ throw new Error('offline'); };
  const fileOf = { writeFile:async ()=>{}, mkdir:async ()=>{} };
  it('fetches pinned urls into data uris', async ()=>{
    const fetchFn = async ()=>({ ok:true, arrayBuffer:async()=>jpg });
    const out = await resolveDayCovers([[{ name:'X' }]], { city:'New York',
      coll:{ covers:['https://img/x.jpg'] }, publicDir:'/pub', readFile:readMiss, ...fileOf, fetchFn });
    assert.ok(out[0].src.startsWith('data:image/jpeg;base64,'));
  });
  it('embeds cached covers and skips webp bytes for wikimedia', async ()=>{
    let seen = '';
    const out = await resolveDayCovers([[{ name:'Times Square' }]], { city:'New York', coll:null,
      publicDir:'/pub', readFile:async (p)=>{ seen = String(p); return jpg; }, ...fileOf, fetchFn:fetchMiss });
    assert.match(seen, /covers[/\\]new-york-times-square\.jpg$/);
    assert.ok(out[0].src.startsWith('data:image/jpeg;base64,'));
    let wikiCalls = 0;
    const wiki = async (url)=>{
      if(String(url).includes('wikimedia')){
        wikiCalls++;
        return { json:async()=>({ query:{ pages:{ 1:{ index:1, thumbnail:{ source:'https://w/thumb.jpg' } } } } }) };
      }
      return { ok:true, arrayBuffer:async()=>jpg };
    };
    const out2 = await resolveDayCovers([[{ name:'X' }]], { city:'New York', coll:null,
      publicDir:'/pub', readFile:async ()=>webp, ...fileOf, fetchFn:wiki });
    assert.equal(wikiCalls, 1);
    assert.ok(out2[0].src.startsWith('data:image/jpeg;base64,'));
  });
  it('generates missing covers and caches them', async ()=>{
    const written = {};
    const fetchFn = async (url)=>{
      if(String(url).includes('images/generations')) return { json:async()=>({ data:[{ b64_json: jpg.toString('base64') }] }) };
      throw new Error(`unexpected ${url}`);
    };
    const out = await resolveDayCovers([[{ name:'X' }]], { city:'New York', coll:null, publicDir:'/pub',
      readFile:readMiss, writeFile:async (p, b)=>{ written[String(p)] = b; }, mkdir:async()=>{}, fetchFn, modelKey:'K' });
    assert.ok(out[0].src.startsWith('data:image/jpeg;base64,'));
    const keys = Object.keys(written);
    assert.equal(keys.length, 1);
    assert.match(keys[0], /covers[/\\]new-york-x\.jpg$/);
  });
  it('falls back to picsum, then null', async ()=>{
    const seen = [];
    const pic = async (url)=>{
      seen.push(String(url));
      if(String(url).includes('wikimedia')) return { json:async()=>({}) };
      if(String(url).includes('picsum')) return { ok:true, arrayBuffer:async()=>jpg };
      throw new Error(`unexpected ${url}`);
    };
    const out = await resolveDayCovers([[{ name:'X' }]], { city:'New York', coll:null,
      publicDir:'/pub', readFile:readMiss, ...fileOf, fetchFn:pic });
    assert.ok(out[0].src.startsWith('data:image/jpeg;base64,'));
    assert.ok(seen.some((u)=>u.includes('picsum.photos/seed/new-york-x/')));
    const out2 = await resolveDayCovers([[{ name:'X' }]], { city:'New York', coll:null,
      publicDir:'/pub', readFile:readMiss, ...fileOf, fetchFn:fetchMiss });
    assert.equal(out2[0], null);
  });
  it('resolves only pinned and cached images when fallbacks are off', async ()=>{
    let calls = 0;
    const fetchFn = async ()=>{ calls++; return { ok:true, arrayBuffer:async()=>jpg }; };
    const out = await resolveDayCovers([[{ name:'X' }]], { city:'New York', coll:null,
      publicDir:'/pub', readFile:readMiss, ...fileOf, fetchFn, modelKey:'K', fallbacks:false });
    assert.equal(out[0], null);
    assert.equal(calls, 0);
    const pinned = await resolveDayCovers([[{ name:'X' }]], { city:'New York',
      coll:{ covers:['https://img/x.jpg'] }, publicDir:'/pub', readFile:readMiss, ...fileOf, fetchFn, fallbacks:false });
    assert.ok(pinned[0].src.startsWith('data:image/jpeg;base64,'));
  });
  it('times out hanging generation and falls through', async ()=>{
    const hang = ()=>new Promise(()=>{});
    const fetchFn = async (url)=>{
      if(String(url).includes('images/generations')) return hang();
      if(String(url).includes('wikimedia')) return { json:async()=>({}) };
      return { ok:true, arrayBuffer:async()=>jpg };
    };
    const out = await resolveDayCovers([[{ name:'X' }]], { city:'New York', coll:null, publicDir:'/pub',
      readFile:readMiss, ...fileOf, fetchFn, modelKey:'K', timeoutMs:15, fetchTimeoutMs:1000 });
    assert.ok(out[0].src.startsWith('data:image/jpeg;base64,'));
  });
  it('claims first-unused stops across days and skips empty days', async ()=>{
    assert.equal(coverNameForDay([], new Set()), null);
    const taken = new Set();
    assert.equal(coverNameForDay([{ name:'A' }, { name:'B' }], taken), 'A');
    assert.equal(coverNameForDay([{ name:'A' }, { name:'B' }], taken), 'B');
    const out = await resolveDayCovers([[], [{ name:'A' }]], { city:'New York', coll:null,
      publicDir:'/pub', readFile:readMiss, ...fileOf, fetchFn:fetchMiss });
    assert.equal(out[0], null);
    assert.equal(out[1], null);
  });
});

describe('resolveStopThumbs', ()=>{
  const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0]);
  it('uses the shared cache, then wikimedia, then nothing', async ()=>{
    const hit = await resolveStopThumbs([{ name:'X' }], 'New York', { publicDir:'/pub', readFile:async ()=>jpg });
    assert.ok(hit[0].src.startsWith('data:image/jpeg;base64,'));
    const wiki = async (url)=>{
      if(String(url).includes('wikimedia')) return { json:async()=>({ query:{ pages:{ 1:{ index:1, thumbnail:{ source:'https://w/thumb.jpg' } } } } }) };
      return { ok:true, arrayBuffer:async()=>jpg };
    };
    const via = await resolveStopThumbs([{ name:'X' }], 'New York',
      { publicDir:'/pub', readFile:async ()=>{ throw new Error('no'); }, fetchFn:wiki });
    assert.ok(via[0].src.startsWith('data:image/jpeg;base64,'));
    const miss = await resolveStopThumbs([{ name:'' }], 'New York', { publicDir:'/pub', readFile:async ()=>jpg });
    assert.equal(miss[0], null);
  });
  it('stays cache-only when fallbacks are off', async ()=>{
    let calls = 0;
    const out = await resolveStopThumbs([{ name:'X' }], 'New York', { publicDir:'/pub',
      readFile:async ()=>{ throw new Error('no'); },
      fetchFn:async ()=>{ calls++; throw new Error('must not fetch'); }, fallbacks:false });
    assert.equal(out[0], null);
    assert.equal(calls, 0);
  });
  it('times out hanging thumbnail fetches', async ()=>{
    const hang = ()=>new Promise(()=>{});
    const out = await resolveStopThumbs([{ name:'X' }], 'New York', { publicDir:'/pub',
      readFile:async ()=>{ throw new Error('no'); }, fetchFn:hang, fetchTimeoutMs:15 });
    assert.equal(out[0], null);
  });
});

describe('renderTripPdf', ()=>{
  const raw = { title:'NYC Weekend', sub:'New York · 2 days', headline:'Starring Times Square.',
    lang:'en', city:'New York', collId:null, days:[
      { title:'Day 1', blurb:'Big day out.', stops:[
        { name:'Times Square', rating:4.7, reviews:249500, address:'Manhattan, NY', lat:40.758, lng:-73.9855 },
        { name:'Joe Pizza', rating:4.5, reviews:5000, address:'Broadway', lat:40.759, lng:-73.9845 } ],
        legs:[{ drive:5, transit:9, walk:12, live:{ drive:true, transit:false, walk:true } }] },
      { title:'Day 2', blurb:'Slow morning.', stops:[{ name:'Central Park', rating:null, reviews:null, address:'', lat:null, lng:null }], legs:[] },
    ] };
  it('renders cover, days, and tips pages with latin text embedded', async ()=>{
    const buf = await renderTripPdf(validatePdfPayload(raw), { covers:[null, null] });
    assert.ok(Buffer.isBuffer(buf));
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
    const text = pdfText(buf);
    assert.ok(text.includes('Times Square'));
    assert.ok(text.includes('Drive 5'));
    assert.ok(text.includes('Day 1'));
    assert.ok(text.includes('Travel tips'));
    const pages = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || [];
    assert.equal(pages.length, 4);
  });
  it('embeds data-uri covers as images', async ()=>{
    const px = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buf = await renderTripPdf(validatePdfPayload(raw), { covers:[{ src:`data:image/png;base64,${px}` }, null] });
    assert.ok(buf.includes('/Subtype /Image'));
  });
  it('links stops and reels, and lists food and agencies', async ()=>{
    const buf = await renderTripPdf(validatePdfPayload(raw), {
      covers:[null, null], thumbs:[[null], []],
      foods:[[{ label:'Coffee', picks:[{ name:'Blue Bottle', rating:'4.8', reviews:'2k', cuisine:'Coffee', reserve:null }] }], []],
      agencies:[{ name:'Enterprise', url:'https://www.enterprise.com' }],
      reels:{ 'Times Square':[{ views:'1.5M', url:'https://www.instagram.com/p/x/' }] },
    });
    const text = pdfText(buf);
    assert.ok(text.includes('Blue Bottle'));
    assert.ok(text.includes('Enterprise'));
    assert.ok(text.includes('Top reel'));
    const wire = buf.toString('latin1');
    assert.ok(wire.includes('/URI'));
    assert.ok(wire.includes('google.com'));
    assert.ok(wire.includes('instagram.com'));
  });
});
