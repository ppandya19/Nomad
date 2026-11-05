// PDF-safe text: latin runs render in built-in Helvetica (WinAnsi), so emoji,
// arrows, and CJK punctuation are mapped to ASCII first, and each string is
// segmented into latin/devanagari/CJK runs for per-run font routing.
// All non-ASCII is built from code points so this file stays pure ASCII.
const cp = (...codes)=>String.fromCodePoint(...codes);
const range = (lo, hi)=>`${cp(lo)}-${cp(hi)}`;

export const PDF_MID_DOT = cp(0x00B7);

const ARROWS = new RegExp(`[${range(0x2190, 0x21FF)}]`, 'g');
const SYMBOLS = new RegExp(`[${range(0x2600, 0x27BF)}${range(0x2B00, 0x2BFF)}${range(0x1F000, 0x1FAFF)}${range(0xFE00, 0xFE0F)}${cp(0x200D)}]`, 'gu');
const CJK_PUNCT = {
  [cp(0x3002)]:'.', [cp(0xFF0C)]:',', [cp(0x3001)]:',', [cp(0xFF1A)]:':',
  [cp(0xFF1B)]:';', [cp(0xFF1F)]:'?', [cp(0xFF01)]:'!', [cp(0xFF08)]:'(',
  [cp(0xFF09)]:')', [cp(0x300C)]:'"', [cp(0x300D)]:'"', [cp(0x300E)]:'"',
  [cp(0x300F)]:'"', [cp(0xFF5E)]:'~', [cp(0x30FB)]:PDF_MID_DOT, [cp(0x2026)]:'...',
  [cp(0x3000)]:' ',
};
const CJK_PUNCT_RE = new RegExp(`[${Object.keys(CJK_PUNCT).join('')}]`, 'g');
const RIGHT_ARROW = cp(0x2192);

export function pdfSafe(text){
  return String(text ?? '')
    .replace(ARROWS, (ch)=> ch===RIGHT_ARROW ? '->' : '')
    .replace(SYMBOLS, '')
    .replace(CJK_PUNCT_RE, (ch)=>CJK_PUNCT[ch])
    .replace(/\s+/g, ' ')
    .trim();
}

const DEVA_RE = new RegExp(`[${range(0x0900, 0x097F)}]`);
const CJK_RE = new RegExp(`[${range(0x3000, 0x303F)}${range(0x3400, 0x4DBF)}${range(0x4E00, 0x9FFF)}${range(0xF900, 0xFAFF)}${range(0xFF00, 0xFFEF)}]`);
const scriptOf = (ch)=> DEVA_RE.test(ch) ? 'deva' : CJK_RE.test(ch) ? 'cjk' : 'latin';

export function segmentRuns(text){
  const runs = [];
  for(const ch of String(text ?? '')){
    const script = scriptOf(ch);
    const last = runs[runs.length-1];
    if(last && last.script===script) last.text += ch;
    else runs.push({ script, text: ch });
  }
  return runs.length ? runs : [{ script:'latin', text:'' }];
}

// Client-safe one-liner for a failed /api/pdf call: the status plus the
// server's capped error cause, or a plain fallback for non-JSON bodies.
export function pdfFailureDetail(status, body){
  let err = '';
  try{ err = (body && JSON.parse(body).error) || ''; }catch{ /* non-JSON body */ }
  const cause = String(err).replace(/\s+/g, ' ').trim().slice(0, 80) || 'pdf failed';
  return `${status} ${cause}`;
}
