import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { foodReserveTag, stopReserveTag, reserveLabel } from '../lib/reserve.js';

describe('foodReserveTag', ()=>{
  it('stays silent for counters and cafes regardless of volume', ()=>{
    assert.equal(foodReserveTag({ cat: 'coffee', meal: 'coffee', reviews: '50k' }), null);
    assert.equal(foodReserveTag({ cat: 'local special', meal: 'lunch', reviews: '21k' }), null);
  });
  it('tiers dinner and fine dine by review volume', ()=>{
    assert.equal(foodReserveTag({ cat: 'fine dine', meal: 'dinner', reviews: '12.1k' }), 'required');
    assert.equal(foodReserveTag({ cat: 'fine dine', meal: 'dinner', reviews: '5.6k' }), 'recommended');
    assert.equal(foodReserveTag({ cat: 'mexican', meal: 'dinner', reviews: 9000 }), 'recommended');
    assert.equal(foodReserveTag({ cat: 'fine dine', meal: 'dinner', reviews: '800' }), null);
  });
});

describe('stopReserveTag', ()=>{
  it('never tags open-air places even when huge', ()=>{
    assert.equal(stopReserveTag({ name: 'Central Park', ratings_total: 303628, views: 6900000 }), null);
    assert.equal(stopReserveTag({ name: 'Times Square', ratings_total: 249537, views: 2100000 }), null);
    assert.equal(stopReserveTag({ name: 'Brooklyn Bridge', ratings_total: 94561, views: 5140000 }), null);
    assert.equal(stopReserveTag({ name: 'Gateway of India', ratings_total: 389850, views: 4420000 }), null);
  });
  it('tiers ticketed venues by review volume', ()=>{
    assert.equal(stopReserveTag({ name: 'Colosseum', ratings_total: 511047, views: 3980000 }), 'required');
    assert.equal(stopReserveTag({ name: 'Vatican Museums', ratings_total: 213264, views: 2340000 }), 'required');
    assert.equal(stopReserveTag({ name: 'Sistine Chapel', ratings_total: 98629, views: 2730000 }), 'recommended');
    assert.equal(stopReserveTag({ name: 'Willis Tower', ratings_total: 24605, views: 100000 }), null);
  });
  it('falls back to reel fame without review counts', ()=>{
    assert.equal(stopReserveTag({ name: 'Willis Tower', ratings_total: null, views: 2710000 }), 'recommended');
    assert.equal(stopReserveTag({ name: 'Uffizi Gallery', ratings_total: null, views: 100 }), null);
  });
});

describe('reserveLabel', ()=>{
  it('words each level', ()=>{
    assert.equal(reserveLabel('required'), 'Reservations required');
    assert.equal(reserveLabel('recommended'), 'Reservation recommended');
    assert.equal(reserveLabel(null), null);
  });
});
