import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rentals = JSON.parse(readFileSync(new URL('../data/rentals.json', import.meta.url), 'utf8'));

describe('rentals data', ()=>{
  it('covers every city with at least two agencies', ()=>{
    for(const city of ['New York','Chicago','Miami','Italy','Mumbai']){
      assert.ok(Array.isArray(rentals[city]) && rentals[city].length>=2, `${city} has agencies`);
    }
  });
  it('every agency has a name and an https booking URL', ()=>{
    for(const [city, list] of Object.entries(rentals)){
      for(const a of list){
        assert.ok(a.name, `${city} agency is named`);
        assert.match(a.url || '', /^https:\/\/[^/]+\.[a-z.]+/i, `${a.name} has a booking URL`);
      }
    }
  });
});
