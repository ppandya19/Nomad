import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { foodPicksFor, inFoodCat, FOOD_MAX_KM } from '../lib/food.js';

const spots = [
  { name: 'A Cafe', cat: 'coffee', cuisine: 'Coffee', meal: 'coffee', rating: '4.5', reviews: '1k', lat: 40.0, lng: -74.0 },
  { name: 'B Coffee', cat: 'coffee', cuisine: 'Coffee', meal: 'coffee', rating: '4.8', reviews: '2k', lat: 40.05, lng: -74.0 },
  { name: 'C Tacos', cat: 'mexican', cuisine: 'Mexican', meal: 'lunch', rating: '4.9', reviews: '3k', lat: 40.001, lng: -74.0 },
  { name: 'D Roast', cat: 'coffee', cuisine: 'Coffee', meal: 'coffee' },
  { name: 'E Far', cat: 'coffee', cuisine: 'Coffee', meal: 'coffee', rating: '5.0', reviews: '9k', lat: 42.0, lng: -74.0 },
  { name: 'F Steak', cat: 'fine dine', cuisine: 'Steak', meal: 'dinner', rating: '4.7', reviews: '12k', lat: 40.002, lng: -74.0 },
  { name: 'G Deli', cat: 'local special', cuisine: 'Deli', meal: 'lunch', lat: 40.003, lng: -74.0 },
];
const near = [{ name: 'S', lat: 40.0, lng: -74.0 }];
const live = { 'B Coffee': { rating: 4.9, ratings_total: 1500, lat: 40.002, lng: -74.0 } };
const names = (picks)=>picks.map(p=>p.name);

describe('inFoodCat', ()=>{
  it('matches lunch and dinner by meal across cuisines', ()=>{
    assert.equal(inFoodCat({ cat: 'mexican', meal: 'lunch' }, 'lunch'), true);
    assert.equal(inFoodCat({ cat: 'mexican', meal: 'lunch' }, 'dinner'), false);
    assert.equal(inFoodCat({ cat: 'fine dine', meal: 'dinner' }, 'dinner'), true);
    assert.equal(inFoodCat({ cat: 'local special', meal: 'lunch' }, 'local special'), true);
    assert.equal(inFoodCat({ cat: 'coffee', meal: 'coffee' }, 'coffee'), true);
  });
  it('rejects unknown and retired categories', ()=>{
    assert.equal(inFoodCat({ cat: 'coffee', meal: 'coffee' }, 'sushi'), false);
    assert.equal(inFoodCat({ cat: 'mexican', meal: 'lunch' }, 'mexican'), false);
  });
});

describe('foodPicksFor', ()=>{
  it('keeps only the requested category', ()=>{
    assert.deepEqual(names(foodPicksFor(spots, { category: 'coffee', stops: near })), ['A Cafe', 'B Coffee', 'D Roast']);
    assert.deepEqual(names(foodPicksFor(spots, { category: 'lunch', stops: near })), ['C Tacos', 'G Deli']);
    assert.deepEqual(names(foodPicksFor(spots, { category: 'dinner', stops: near })), ['F Steak']);
  });
  it('ranks by closeness using live coords, unlocated last', ()=>{
    const picks = foodPicksFor(spots, { category: 'coffee', stops: near, liveByName: live });
    assert.deepEqual(names(picks), ['A Cafe', 'B Coffee', 'D Roast']);
    assert.equal(picks[1].lat, 40.002);
  });
  it('drops located spots past the radius, keeps unlocated ones', ()=>{
    assert.equal(FOOD_MAX_KM, 10);
    const picks = foodPicksFor(spots, { category: 'coffee', stops: near });
    assert.ok(!names(picks).includes('E Far'));
    assert.ok(names(picks).includes('D Roast'));
  });
  it('keeps everything with no stops to anchor to', ()=>{
    assert.deepEqual(names(foodPicksFor(spots, { category: 'coffee', stops: [] })), ['E Far', 'B Coffee', 'A Cafe', 'D Roast']);
  });
  it('merges live rating and review counts', ()=>{
    const [b] = foodPicksFor(spots, { category: 'coffee', stops: near, liveByName: live }).filter(p=>p.name==='B Coffee');
    assert.equal(b.rating, 4.9);
    assert.equal(b.reviews, '1.5k');
  });
  it('excludes spots already in the day', ()=>{
    const picks = foodPicksFor(spots, { category: 'coffee', stops: [...near, { name: 'A Cafe', lat: 40.0, lng: -74.0 }] });
    assert.ok(!names(picks).includes('A Cafe'));
  });
  it('excludes spots added on other days via exclude', ()=>{
    const other = [{ name: 'B Coffee', lat: 41.0, lng: -74.0 }];
    const picks = foodPicksFor(spots, { category: 'coffee', stops: near, exclude: [...near, ...other] });
    assert.ok(!names(picks).includes('B Coffee'));
    assert.ok(names(picks).includes('A Cafe'));
  });
  it('still anchors proximity to the day stops, not exclude', ()=>{
    const farDay = [{ name: 'X', lat: 42.0, lng: -74.0 }];
    const picks = foodPicksFor(spots, { category: 'coffee', stops: near, exclude: [...near, ...farDay], maxKm: 1 });
    assert.ok(names(picks).includes('A Cafe'));
    assert.ok(!names(picks).includes('E Far'));
  });
  it('falls back to rating order with no stops, unrated last', ()=>{
    assert.deepEqual(names(foodPicksFor(spots, { category: 'coffee', stops: [], liveByName: live })), ['E Far', 'B Coffee', 'A Cafe', 'D Roast']);
  });
  it('flags reservation pressure on fine dine', ()=>{
    const [f] = foodPicksFor([{ name: 'F', cat: 'fine dine', cuisine: 'Italian', meal: 'dinner', rating: '4.8', reviews: '12k' }], { category: 'fine dine', stops: [] });
    assert.equal(f.reserve, 'required');
  });
  it('respects the limit and empties unknown categories', ()=>{
    assert.equal(foodPicksFor(spots, { category: 'coffee', stops: near, limit: 2 }).length, 2);
    assert.deepEqual(foodPicksFor(spots, { category: 'sushi', stops: near }), []);
  });
});
