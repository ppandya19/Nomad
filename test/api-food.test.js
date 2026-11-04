import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/food/route.js';

describe('/api/food', ()=>{
  const realFetch = global.fetch, realKey = process.env.GOOGLE_SERVER_KEY;
  afterEach(()=>{
    global.fetch = realFetch;
    if(realKey===undefined) delete process.env.GOOGLE_SERVER_KEY;
    else process.env.GOOGLE_SERVER_KEY = realKey;
  });
  it('queries Places with the meal type and bias, mapping results', async ()=>{
    process.env.GOOGLE_SERVER_KEY = 'K';
    let seen;
    global.fetch = async (url, opts)=>{
      seen = JSON.parse(opts.body);
      return { ok: true, json: async ()=>({ places: [
        { id: 'a', displayName: { text: 'Trattoria' }, formattedAddress: 'x', location: { latitude: 1, longitude: 2 }, rating: 4.5, userRatingCount: 100 }
      ] }) };
    };
    const res = await GET({ url: 'http://x/api/food?cat=dinner&city=Italy&lat=41.9&lng=12.5' });
    assert.equal(seen.includedType, 'restaurant');
    assert.match(seen.textQuery, /dinner restaurant Italy/);
    assert.equal(seen.locationBias.circle.center.latitude, 41.9);
    assert.deepEqual(await res.json(), [{ place_id: 'a', name: 'Trattoria', address: 'x', lat: 1, lng: 2, rating: 4.5, ratings_total: 100 }]);
  });
  it('returns [] without a key, unknown cats, or failures', async ()=>{
    delete process.env.GOOGLE_SERVER_KEY;
    assert.deepEqual(await (await GET({ url: 'http://x/api/food?cat=lunch&city=X' })).json(), []);
    process.env.GOOGLE_SERVER_KEY = 'K';
    assert.deepEqual(await (await GET({ url: 'http://x/api/food?cat=sushi&city=X' })).json(), []);
    assert.deepEqual(await (await GET({ url: 'http://x/api/food?cat=mexican&city=X' })).json(), []);
    global.fetch = async ()=>{ throw new Error('down'); };
    assert.deepEqual(await (await GET({ url: 'http://x/api/food?cat=lunch&city=X' })).json(), []);
  });
});
