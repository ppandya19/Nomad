import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/directions/route.js';
import { estimateModes } from '../lib/route.js';

const PTS = 'points=18.9,72.8;19.0,72.9;19.1,72.8';

describe('/api/directions', ()=>{
  const realFetch = global.fetch, realKey = process.env.GOOGLE_SERVER_KEY;
  afterEach(()=>{
    global.fetch = realFetch;
    if(realKey===undefined) delete process.env.GOOGLE_SERVER_KEY;
    else process.env.GOOGLE_SERVER_KEY = realKey;
  });
  const byMode = (legsByMode, seen)=>{
    global.fetch = async (url, opts)=>{
      const b = JSON.parse(opts.body);
      seen.push(b);
      return { json: async ()=>({ routes:[{ legs: legsByMode[b.travelMode] }] }) };
    };
  };
  it('fills per leg and flags liveness honestly', async ()=>{
    process.env.GOOGLE_SERVER_KEY = 'K';
    const seen = [];
    byMode({
      DRIVE: [{ duration:'600s' }, { duration:'1200s' }],
      TRANSIT: [{ duration:'900s' }, {}],
      WALK: [{ duration:'1800s' }, { duration:'3600s' }],
    }, seen);
    const { legs, live } = await (await GET({ url: `http://x/api/directions?${PTS}` })).json();
    assert.equal(live, true);
    assert.deepEqual(legs[0], { drive:10, transit:15, walk:30, live:{ drive:true, transit:true, walk:true } });
    assert.equal(legs[1].drive, 20);
    assert.equal(legs[1].transit, estimateModes(20).transit);
    assert.deepEqual(legs[1].live, { drive:true, transit:false, walk:true });
    const tr = seen.find(b=>b.travelMode==='TRANSIT');
    assert.match(tr.departureTime, /^\d{4}-\d{2}-\d{2}T/);
  });
  it('falls back a mode whose legs do not align', async ()=>{
    process.env.GOOGLE_SERVER_KEY = 'K';
    byMode({
      DRIVE: [{ duration:'600s' }, { duration:'1200s' }],
      TRANSIT: [{ duration:'900s' }],
      WALK: null,
    }, []);
    const { legs, live } = await (await GET({ url: `http://x/api/directions?${PTS}` })).json();
    assert.equal(live, true);
    assert.deepEqual(legs.map(l=>l.live.transit), [false, false]);
    assert.deepEqual(legs.map(l=>l.live.walk), [false, false]);
  });
  it('estimates everything without a key', async ()=>{
    delete process.env.GOOGLE_SERVER_KEY;
    const { legs, live } = await (await GET({ url: `http://x/api/directions?${PTS}` })).json();
    assert.equal(live, false);
    assert.equal(legs.length, 2);
    assert.deepEqual(legs[0].live, { drive:false, transit:false, walk:false });
  });
  it('rejects fewer than two points', async ()=>{
    const body = await (await GET({ url: 'http://x/api/directions?points=1,2' })).json();
    assert.deepEqual(body, { legs:null, live:false });
  });
});
