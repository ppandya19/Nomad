import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTripContext, restaurantContext } from '../lib/trip-context.js';

const stop = (name, rating)=>({ name, rating: rating ?? null, ratings_total: null, place_id: `saved-x-${name}` });

describe('buildTripContext', ()=>{
  it('keeps city, days and stop names', ()=>{
    const out = buildTripContext({ city:'New York', days:[[stop('Times Square', 4.7)],[stop('Chelsea Market')]], food:[{ name:'Loude Superfood' }], persona:['Foodie'] });
    assert.ok(out.includes('New York'));
    assert.ok(out.includes('Day 1 (1 stops): Times Square (4.7)'));
    assert.ok(out.includes('Day 2 (1 stops): Chelsea Market'));
    assert.ok(out.includes('Loude Superfood'));
    assert.ok(out.includes('Foodie'));
  });
  it('truncates long days with a remainder count', ()=>{
    const day = Array.from({ length:12 }, (_,i)=>stop(`Stop ${i+1}`));
    const out = buildTripContext({ city:'X', days:[day] });
    assert.ok(out.includes('+4 more'));
    assert.ok(!out.includes('Stop 12'));
  });
  it('caps the whole block at 4000 chars', ()=>{
    const day = Array.from({ length:200 }, (_,i)=>stop(`Very long stop name number ${i+1} with extra padding text`));
    const out = buildTripContext({ city:'X', days:[day, day, day] });
    assert.ok(out.length<=4000);
  });
  it('handles empty trips', ()=>{
    const out = buildTripContext({ city:'Rome', days:[[]] });
    assert.ok(out.includes('Day 1 (0 stops): empty'));
  });
});

describe('restaurantContext', ()=>{
  const byCity = {
    'New York': [
      { name:'Los Tacos No.1', cuisine:'Mexican', rating:'4.7' },
      { name:'Joe Pizza', cuisine:'Pizza', rating:'4.4' },
      { name:'Le Bernardin', cuisine:'French', rating:'4.8' },
    ],
  };
  it('ranks by rating with cuisine and stars', ()=>{
    const out = restaurantContext('New York', byCity);
    assert.ok(out.includes('Top-rated in New York:'));
    assert.ok(out.indexOf('Le Bernardin (French, ★4.8)') < out.indexOf('Los Tacos No.1 (Mexican, ★4.7)'));
    assert.ok(out.indexOf('Los Tacos No.1') < out.indexOf('Joe Pizza (Pizza, ★4.4)'));
  });
  it('caps the list at eight', ()=>{
    const many = { X: Array.from({ length:12 }, (_,i)=>({ name:`R${i}`, rating:'4.0' })) };
    assert.equal(restaurantContext('X', many).split('\n').length, 9);
  });
  it('returns empty for unknown cities and skips nameless entries', ()=>{
    assert.equal(restaurantContext('Nowhere', byCity), '');
    assert.equal(restaurantContext('New York', { 'New York':[{ cuisine:'Pizza' }] }), '');
  });
});
