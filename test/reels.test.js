import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reels = JSON.parse(readFileSync(new URL('../data/reels.json', import.meta.url), 'utf8'));
const IG_REEL = /^https:\/\/www\.instagram\.com\/reel\/[A-Za-z0-9_-]+\/$/;

describe('reels data', ()=>{
  it('every entry has url, views, color and a well-formed embed', ()=>{
    for(const [name, list] of Object.entries(reels)){
      assert.ok(Array.isArray(list) && list.length, `${name} has reels`);
      for(const r of list){
        assert.ok(r.url && r.views && r.color, `${name} entry is complete`);
        assert.ok(r.embed === '' || (typeof r.embed === 'string' && IG_REEL.test(r.embed)), `${name} embed is blank or an IG reel URL`);
        assert.ok(r.playable === undefined || typeof r.playable === 'boolean', `${name} playable flag is boolean when present`);
      }
    }
  });
  it('keeps the user-verified Times Square lead reel playable', ()=>{
    const ts = reels['Times Square'] || [];
    const lead = ts.find((r)=>r.url.includes('DS9O2qwDMzj'));
    assert.ok(lead && lead.embed, 'lead reel listed with embed');
    assert.ok(lead.playable!==false, 'lead reel not kill-switched');
  });
  it('has no duplicate embed URLs among playable entries', ()=>{
    const seen = new Set();
    for(const list of Object.values(reels)){
      for(const r of list){
        if(!r.embed || r.playable === false) continue;
        assert.ok(!seen.has(r.embed), `duplicate embed ${r.embed}`);
        seen.add(r.embed);
      }
    }
  });
});
