import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stays = JSON.parse(readFileSync(new URL('../data/stays.json', import.meta.url), 'utf8'));

describe('stays data', ()=>{
  it('covers every city with at least three stays', ()=>{
    for(const city of ['New York','Chicago','Miami','Italy','Mumbai']){
      assert.ok(Array.isArray(stays[city]) && stays[city].length>=3, `${city} has stays`);
    }
  });
  it('every stay has name, area, rating and coordinates', ()=>{
    for(const [city, list] of Object.entries(stays)){
      for(const s of list){
        assert.ok(s.name && s.area, `${city} stay is named`);
        const r = parseFloat(s.rating);
        assert.ok(r>0 && r<=5, `${s.name} rating parses`);
        assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lng), `${s.name} has coords`);
      }
    }
  });
});
