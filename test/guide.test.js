import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dayHighlight, tripHeadline, tripHighlights, shareTripText } from '../lib/guide.js';

const CTX = { reels: {}, persona: ['Foodie'] };
const star = { place_id: 'local-chelsea', name: 'Chelsea Market', rating: 5, ratings_total: 20000 };
const mid = { place_id: 'local-highline', name: 'The High Line', rating: 4, ratings_total: 100 };
const low = { place_id: 'local-toprock', name: 'Top of the Rock', rating: 3, ratings_total: 10 };
const food = { place_id: 'food-1', name: 'Joe Pizza', rating: 4.5, ratings_total: 5000 };
const stay = { place_id: 'stay-1', name: 'Plaza Hotel', rating: 4, ratings_total: 1000 };

describe('dayHighlight', ()=>{
  it('invites planning on an empty day', ()=>{
    const s = dayHighlight([], { dayNum: 2 });
    assert.match(s, /Day 2/);
    assert.match(s, /add stops/);
  });
  it('leads a single-stop day with the star', ()=>{
    assert.match(dayHighlight([mid], { dayNum: 1, ...CTX }), /^The High Line takes Day 1/);
  });
  it('names the top-scored stop first on a two-stop day', ()=>{
    const s = dayHighlight([low, star], { dayNum: 1, ...CTX });
    assert.ok(s.indexOf('Chelsea Market') < s.indexOf('Top of the Rock'));
  });
  it('weaves in food, stay, and travel time', ()=>{
    const s = dayHighlight([star, mid, food, stay], { dayNum: 3, driveMin: 25, ...CTX });
    assert.match(s, /fueled by Joe Pizza/);
    assert.match(s, /overnight at Plaza Hotel/);
    assert.match(s, /~25 min/);
  });
  it('calls a six-stop day packed', ()=>{
    const big = [star, mid, low, food, stay, { ...mid, place_id: 'local-x', name: 'Central Park' }];
    assert.match(dayHighlight(big, { dayNum: 1, ...CTX }), /packed/);
  });
});

describe('tripHeadline', ()=>{
  it('stars the top stop with counts', ()=>{
    const s = tripHeadline({ city: 'New York', days: [[star, mid], [low]], ...CTX });
    assert.match(s, /New York/);
    assert.match(s, /2 days/);
    assert.match(s, /3 stops/);
    assert.match(s, /starring Chelsea Market/);
  });
  it('handles an empty trip', ()=>{
    assert.match(tripHeadline({ city: 'Miami', days: [[], []] }), /Miami/);
  });
});

describe('tripHighlights', ()=>{
  it('opens with the unmissable stop and no score number', ()=>{
    const [first] = tripHighlights({ days: [[low, star]], ...CTX });
    assert.match(first, /Don't miss Chelsea Market/);
    assert.doesNotMatch(first, /\d/);
  });
  it('caps at four with day nudges intact', ()=>{
    const packed = [star, mid, low, stay, { ...mid, place_id: 'a', name: 'A' }, { ...mid, place_id: 'b', name: 'B' }];
    const out = tripHighlights({ days: [packed, []], legMin: () => 30, ...CTX });
    assert.equal(out.length, 4);
    assert.match(out.join('\n'), /Day 2 is still a blank page/);
  });
  it('nudges the food-less day by number', ()=>{
    const out = tripHighlights({ days: [[star, mid]], ...CTX });
    assert.match(out.join('\n'), /Day 1 has no food break/);
  });
});

describe('locales', ()=>{
  it('renders day highlights per locale', ()=>{
    assert.match(dayHighlight([star, mid, low], { dayNum: 1, lang: 'zh', ...CTX }), /第1天/);
    assert.match(dayHighlight([star], { dayNum: 2, lang: 'es', ...CTX }), /Día 2/);
    assert.match(dayHighlight([], { dayNum: 1, lang: 'hi' }), /दिन 1/);
  });
  it('renders headlines, highlights, and shares per locale', ()=>{
    assert.match(tripHeadline({ city: 'Roma', days: [[star]], lang: 'it', ...CTX }), /La tua storia/);
    assert.match(tripHighlights({ days: [[star]], lang: 'fr', ...CTX }).join('\n'), /Ne manquez pas/);
    assert.match(shareTripText({ city: 'Miami', days: [[star], []], lang: 'zh', ...CTX }), /空闲日/);
  });
});

describe('shareTripText', ()=>{
  it('headlines the trip and routes each day', ()=>{
    const s = shareTripText({ city: 'Chicago', days: [[star, mid], []], ...CTX });
    assert.match(s, /Chicago/);
    assert.match(s, /don't miss Chelsea Market/);
    assert.match(s, /Day 1: Chelsea Market → The High Line/);
    assert.match(s, /Day 2: open day/);
  });
});
