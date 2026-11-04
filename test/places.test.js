import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlace, isSyntheticId } from '../lib/places.js';

describe('resolvePlace', ()=>{
  const realFetch = global.fetch;
  afterEach(()=>{ global.fetch = realFetch; });
  it('passes live coordinates through', async ()=>{
    global.fetch = async ()=>({ json: async ()=>[{ place_id: 'ChIJx', name: "Joe's Pizza", rating: 4.6, ratings_total: 9000, lat: 40.73, lng: -74.0 }] });
    const r = await resolvePlace("Joe's Pizza", 'New York');
    assert.equal(r.lat, 40.73);
    assert.equal(r.lng, -74.0);
    assert.equal(r.rating, 4.6);
  });
  it('rejects mismatched top hits', async ()=>{
    global.fetch = async ()=>({ json: async ()=>[{ place_id: 'ChIJy', name: 'Shake Shack', rating: 4.5 }] });
    assert.equal(await resolvePlace("Joe's Pizza", 'Chicago'), null);
  });
});

describe('isSyntheticId', ()=>{
  it('flags generated ids', ()=>{
    assert.equal(isSyntheticId('food-abc'), true);
    assert.equal(isSyntheticId('ChIJx'), false);
  });
});
