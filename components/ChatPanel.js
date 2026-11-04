import { useState, useRef, useEffect } from 'react';
import { t, dayName } from '../lib/i18n';
import { createToolAcc } from '../lib/chat-edit';

const fmtC = (n)=>n>=1000 ? `${(n/1000).toFixed(1).replace('.0','')}k` : `${n}`;

async function streamChat(payload, onToken){
  const r = await fetch('/api/chat', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  if(!r.ok || !r.body){
    const d = await r.json().catch(()=>null);
    throw new Error(d?.error || 'Agent request failed — try again');
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  const acc = createToolAcc();
  let buf = '';
  for(;;){
    const { done, value } = await reader.read();
    if(done) break;
    buf += dec.decode(value, { stream:true });
    const parts = buf.split('\n\n');
    buf = parts.pop();
    for(const p of parts){
      const line = p.split('\n').find(l=>l.startsWith('data:'));
      if(!line) continue;
      const data = line.slice(5).trim();
      if(!data || data==='[DONE]') continue;
      try{
        const choice = JSON.parse(data)?.choices?.[0];
        const tok = choice?.delta?.content || '';
        if(tok) onToken(tok);
        const dcalls = choice?.delta?.tool_calls;
        if(Array.isArray(dcalls)) dcalls.forEach(d=>acc.push(d));
        const mcalls = choice?.message?.tool_calls;
        if(Array.isArray(mcalls)) mcalls.forEach(d=>acc.push({
          index:0, id:d.id,
          function:{
            name:(d.function && d.function.name) || '',
            arguments:typeof (d.function && d.function.arguments)==='string' ? d.function.arguments : JSON.stringify((d.function && d.function.arguments) || {})
          }
        }));
      }catch{ /* ignore partial frames */ }
    }
  }
  return acc.calls();
}

export default function ChatWidget({ trip, lang='en', onEditStart=null, onEditApply=null }){
  const [open,setOpen] = useState(false);
  const [msgs,setMsgs] = useState([]);
  const [input,setInput] = useState('');
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState(null);
  const bottomRef = useRef(null);
  const idRef = useRef(1);
  const suggestions = [t(lang, 'chat.s0'), t(lang, 'chat.s1'), t(lang, 'chat.s2')];

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ block:'end' }); },[msgs, open]);

  const runEditCall = async (c)=>{
    const op = c && (c.name==='add_stop' ? 'add' : c.name==='remove_stop' ? 'remove' : null);
    const name = c && c.args && typeof c.args.name==='string' ? c.args.name.trim() : '';
    if(!op || !name || typeof onEditStart!=='function') return;
    const day = c.args && Number.isFinite(+c.args.day) ? Math.floor(+c.args.day) : null;
    let res = null;
    try{ res = await onEditStart({ op, name, day }); }
    catch{ res = { status:'none', op }; }
    if(!res || res.status!=='pick' || !Array.isArray(res.candidates) || !res.candidates.length){
      setMsgs(m=>[...m, { role:'assistant', text:t(lang, 'chat.edit.none') }]);
      return;
    }
    const id = idRef.current++;
    setMsgs(m=>[...m, { role:'assistant', kind:'confirm', id, op:res.op||op, dayIdx:res.dayIdx ?? null, candidates:res.candidates, picked:0, status:'pending' }]);
  };

  const pickCard = (id, i)=>{
    setMsgs(m=>m.map(x=>x.kind==='confirm' && x.id===id && x.status==='pending' ? { ...x, picked:i } : x));
  };

  const resolveCard = async (id, ok)=>{
    const card = msgs.find(m=>m.kind==='confirm' && m.id===id);
    if(!card || card.status!=='pending') return;
    if(!ok){
      setMsgs(m=>m.map(x=>x===card ? { ...x, status:'cancelled' } : x));
      setMsgs(m=>[...m, { role:'assistant', text:t(lang, 'chat.edit.kept') }]);
      return;
    }
    const cand = card.candidates[card.picked] || card.candidates[0];
    let res = null;
    try{ res = typeof onEditApply==='function' ? await onEditApply({ op:card.op, candidate:cand, dayIdx:card.dayIdx }) : null; }
    catch{ res = null; }
    setMsgs(m=>m.map(x=>x===card ? { ...x, status:'done' } : x));
    if(res && res.ok){
      const dayTxt = dayName((res.dayIdx ?? card.dayIdx ?? 0)+1, lang);
      setMsgs(m=>[...m, { role:'assistant', text: card.op==='add' ? t(lang, 'chat.edit.added', { day:dayTxt }) : t(lang, 'chat.edit.removed', { day:dayTxt }) }]);
    } else {
      setMsgs(m=>[...m, { role:'assistant', text:t(lang, res && res.reason==='dupe' ? 'chat.edit.dupe' : 'chat.edit.none') }]);
    }
  };

  const send = async (text)=>{
    const q = (typeof text==='string' ? text : input).trim();
    if(!q || busy) return;
    setErr(null);
    setInput('');
    const next = [...msgs, { role:'user', text:q }];
    setMsgs(next);
    setBusy(true);
    try{
      let accText = '';
      setMsgs(m=>[...m, { role:'assistant', text:'' }]);
      const calls = await streamChat(
        { messages: next.filter(m=>typeof m.text==='string').map(m=>({ role:m.role, content:m.text })), trip, lang },
        (tok)=>{ accText += tok; setMsgs(m=>{ const c = [...m]; c[c.length-1] = { role:'assistant', text:accText }; return c; }); }
      );
      if(!accText) setMsgs(m=>{ const c = [...m]; const l = c[c.length-1]; if(l && l.role==='assistant' && l.text==='' && !l.kind) c.pop(); return c; });
      for(const c of (calls||[]).slice(0,3)){
        await runEditCall(c);
      }
    }catch(e){
      setErr(e.message || t(lang, 'chat.err'));
      setMsgs(m=>m.filter(x=>!(x.role==='assistant' && x.text==='')));
    }finally{
      setBusy(false);
    }
  };

  return (
    <div>
      {!open && (
        <button onClick={()=>setOpen(true)} aria-label={t(lang, 'chat.ask')}
          title={t(lang, 'chat.ask')}
          style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
          className="fixed bottom-4 right-4 z-50 w-12 h-12 grid place-items-center rounded-full shadow-lg t-ink motion-safe:active:scale-95">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 2.5c4.4 0 7.5 2.9 7.5 6.3 0 1.5-.7 2.9-1.9 3.9l.5 3-3.4-1.6c-.8.3-1.7.4-2.7.4-4.4 0-7.5-2.9-7.5-6.3S5.6 2.5 10 2.5z" />
          </svg>
        </button>
      )}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] h-[480px] max-h-[72vh] bg-white border border-hairline rounded-xl shadow-xl flex flex-col overflow-hidden animate-pop">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <div className="font-bold">{t(lang, 'chat.title')}</div>
            <button onClick={()=>setOpen(false)} aria-label={t(lang, 'chat.close')}
              className="text-xs text-igblue font-semibold">{t(lang, 'chat.close')}</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {msgs.length===0 && !err && (
              <div className="flex flex-col gap-2">
                <div className="text-xs opacity-60">{t(lang, 'chat.hint')}</div>
                {suggestions.map(s=>(
                  <button key={s} onClick={()=>send(s)} disabled={busy}
                    className="text-left text-xs font-semibold border border-hairline rounded-lg px-3 py-2 hover:bg-ground disabled:opacity-40">{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m,i)=>(
              m.kind==='confirm' ? (
                <div key={i} className="self-start bg-white border border-hairline rounded-lg px-3 py-2 text-sm max-w-[94%] shadow-sm">
                  <div className="font-bold">{m.op==='add' ? t(lang, 'chat.edit.addq') : t(lang, 'chat.edit.remq')}</div>
                  {m.candidates.length>1 && <div className="text-[11px] opacity-60 mt-0.5">{t(lang, 'chat.edit.pick')}</div>}
                  <div className="mt-1 flex flex-col gap-1">
                    {m.candidates.map((c,ci)=>(
                      <button key={ci} disabled={m.status!=='pending'} onClick={()=>pickCard(m.id, ci)}
                        className={`text-left border rounded-lg px-2 py-1.5 ${m.picked===ci ? 'border-ink bg-ground' : 'border-hairline'} disabled:opacity-70`}>
                        <div className="font-semibold">{c.name}{c.dupe ? ` · ${t(lang, 'chat.edit.dupe')}` : ''}</div>
                        {c.rating!=null && (<div className="text-[11px]"><span className="font-bold">{c.rating}</span><span className="opacity-60">{c.reviews!=null ? ` · ${fmtC(c.reviews)} Google reviews` : ' Google'}</span></div>)}
                        {c.sub ? <div className="text-[11px] opacity-60">{c.sub}</div> : null}
                      </button>
                    ))}
                  </div>
                  {m.status==='pending' ? (
                    <div className="mt-2 flex gap-2">
                      <button onClick={()=>resolveCard(m.id, true)}
                        style={{background:'linear-gradient(45deg,#833ab4,#fd1d1d 55%,#fcb045)', color:'#fff'}}
                        className="h-9 px-4 rounded-lg text-xs font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'chat.edit.yes')}</button>
                      <button onClick={()=>resolveCard(m.id, false)}
                        className="h-9 px-4 border border-hairline bg-white rounded-lg text-xs font-semibold t-ink motion-safe:active:scale-[0.98]">{t(lang, 'chat.edit.no')}</button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role==='user' ? 'self-end bg-igblue text-white' : 'self-start bg-ground'}`}>
                  {m.text || '…'}
                </div>
              )
            ))}
            {err && <div className="text-xs opacity-60">{err}</div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={(e)=>{ e.preventDefault(); send(); }}
            className="flex items-center gap-2 px-3 py-2 border-t border-hairline">
            <input value={input} onChange={e=>setInput(e.target.value)}
              placeholder={t(lang, 'chat.ph')}
              aria-label={t(lang, 'chat.ph')}
              className="flex-1 h-10 bg-ground rounded-lg px-3 text-sm font-medium placeholder:text-ink/50" />
            <button type="submit" disabled={busy || !input.trim()} aria-label={t(lang, 'chat.send')}
              style={{backgroundColor:'#0095F6', color:'#fff'}}
              className="h-10 w-10 shrink-0 grid place-items-center rounded-full disabled:opacity-40 t-ink motion-safe:active:scale-95">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 1L6.5 7.5M12 1L8.5 12l-2-4.5L2 5.5 12 1z" /></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
