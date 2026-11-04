import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/chat/route.js';

describe('/api/chat tools', ()=>{
  const realFetch = global.fetch, realKey = process.env.MODEL_API_KEY;
  afterEach(()=>{
    global.fetch = realFetch;
    if(realKey===undefined) delete process.env.MODEL_API_KEY;
    else process.env.MODEL_API_KEY = realKey;
  });
  it('sends the edit tools with every request', async ()=>{
    process.env.MODEL_API_KEY = 'K';
    let seen;
    global.fetch = async (url, opts)=>{ seen = JSON.parse(opts.body); return { ok: true, body: 'x' }; };
    await POST({ json: async ()=>({ messages: [{ role: 'user', content: 'hi' }], trip: { city: '', days: [] } }) });
    assert.deepEqual(seen.tools.map(x=>x.function.name), ['add_stop', 'remove_stop', 'search_places']);
    assert.equal(seen.tool_choice, 'auto');
    assert.match(seen.messages[0].content, /EDITING STOPS/);
  });
});

describe('/api/chat language', ()=>{
  const realFetch = global.fetch, realKey = process.env.MODEL_API_KEY;
  afterEach(()=>{
    global.fetch = realFetch;
    if(realKey===undefined) delete process.env.MODEL_API_KEY;
    else process.env.MODEL_API_KEY = realKey;
  });
  const call = async (body)=>{
    let seen;
    global.fetch = async (url, opts)=>{ seen = JSON.parse(opts.body); return { ok: true, body: 'x' }; };
    await POST({ json: async ()=>body });
    return seen.messages[0].content;
  };
  it('steers replies to the requested language', async ()=>{
    process.env.MODEL_API_KEY = 'K';
    const sys = await call({ messages: [{ role: 'user', content: 'hi' }], trip: { city: 'Rome', days: [] }, lang: 'hi' });
    assert.match(sys, /Reply in Hindi\./);
  });
  it('adds no steering without a valid language', async ()=>{
    process.env.MODEL_API_KEY = 'K';
    const sys = await call({ messages: [{ role: 'user', content: 'hi' }], trip: { city: '', days: [] } });
    assert.doesNotMatch(sys, /Reply in/);
    const sysEn = await call({ messages: [{ role: 'user', content: 'hi' }], trip: { city: '', days: [] }, lang: 'en' });
    assert.doesNotMatch(sysEn, /Reply in/);
  });
});
