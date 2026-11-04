import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_TOOLS, EDIT_RULES, SEARCH_RULES, createToolAcc, matchStops, withRatings, toolRoundMessages, summarizeSearchResults, ratingsFootnote, fmtReviews } from '../lib/chat-edit.js';

describe('CHAT_TOOLS', ()=>{
  it('offers edits plus grounded search with name-first schemas', ()=>{
    assert.deepEqual(CHAT_TOOLS.map(x=>x.function.name), ['add_stop', 'remove_stop', 'search_places']);
    for(const x of CHAT_TOOLS) assert.equal(x.type, 'function');
    assert.deepEqual(CHAT_TOOLS[2].function.parameters.required, ['query']);
  });
  it('keeps the edit rules tight', ()=>{
    assert.match(EDIT_RULES, /exactly one tool/);
    assert.match(EDIT_RULES, /never claim it is already done/);
    assert.match(SEARCH_RULES, /search_places/);
    assert.match(SEARCH_RULES, /never invent a number/);
  });
});

describe('tool rounds', ()=>{
  it('echoes answered calls with their results', ()=>{
    const out = toolRoundMessages('hi', [
      { id:'a', name:'search_places', args:{ query:'pizza' } },
      { id:'b', name:'add_stop', args:{ name:'X' } },
      { id:'', name:'search_places', args:{} },
    ], { a:'A-data', b:{ status:'pending_user_confirmation' } });
    assert.equal(out.length, 3);
    assert.equal(out[0].role, 'assistant');
    assert.deepEqual(out[0].tool_calls.map(c=>c.id), ['a', 'b']);
    assert.equal(out[1].tool_call_id, 'a');
    assert.equal(out[2].content, '{"status":"pending_user_confirmation"}');
  });
  it('digests search batches for the model', ()=>{
    assert.equal(summarizeSearchResults([]), 'No matches.');
    const s = summarizeSearchResults([
      { name:'A', rating:4.7, ratings_total:12000, address:'x' },
      { name:'B' },
      { name:'' },
    ]);
    assert.match(s, /A ★4\.7 \(12000\) — x/);
    assert.match(s, /B \(rating unavailable\)/);
  });
  it('footnotes rated names once', ()=>{
    assert.equal(ratingsFootnote([]), '');
    assert.equal(ratingsFootnote([{ name:'A' }]), '');
    assert.equal(
      ratingsFootnote([{ name:'A', rating:4.7, ratings_total:12100 }, { name:'a', rating:4.1 }, { name:'B', rating:4.5 }]),
      'Ratings: A ★4.7 (12.1k) · B ★4.5'
    );
    assert.equal(fmtReviews(999), '999');
    assert.equal(fmtReviews(1500), '1.5k');
  });
});

describe('createToolAcc', ()=>{
  it('rebuilds one call spread across streamed chunks', ()=>{
    const acc = createToolAcc();
    acc.push({ index:0, id:'call_1', function:{ name:'add_', arguments:'' } });
    acc.push({ index:0, function:{ name:'stop', arguments:'{"name":"Sushi' } });
    acc.push({ index:0, function:{ arguments:' Yasaka"}' } });
    assert.deepEqual(acc.calls(), [{ id:'call_1', name:'add_stop', args:{ name:'Sushi Yasaka' } }]);
  });
  it('keeps parallel calls separate by index', ()=>{
    const acc = createToolAcc();
    acc.push({ index:0, id:'a', function:{ name:'add_stop', arguments:'{"name":"X"}' } });
    acc.push({ index:1, id:'b', function:{ name:'remove_stop', arguments:'{"name":"Y"}' } });
    assert.deepEqual(acc.calls().map(c=>c.name), ['add_stop', 'remove_stop']);
  });
  it('skips nameless and half-JSON calls', ()=>{
    const acc = createToolAcc();
    acc.push(null);
    acc.push({ index:0, function:{ arguments:'{"name":' } });
    acc.push({ index:1, id:'c', function:{ name:'add_stop', arguments:'{"name":' } });
    assert.deepEqual(acc.calls(), []);
  });
});

describe('withRatings', ()=>{
  it('prefers search values, fills gaps from top-up', ()=>{
    const out = withRatings(
      [
        { name:'A', rating:4.5, reviews:100 },
        { name:'B', rating:null, reviews:null },
        { name:'C', rating:null, reviews:null },
      ],
      [{ rating:4.9, ratings_total:9 }, { rating:4.1, ratings_total:22 }, null]
    );
    assert.deepEqual(out.map(c=>[c.rating, c.reviews]), [[4.5, 100], [4.1, 22], [null, null]]);
    assert.equal(out[0].name, 'A');
  });
});

describe('matchStops', ()=>{
  const stops = [{ name:'The High Line' }, { name:'Highland Park' }, { name:'Chelsea Market' }];
  it('ranks exact above prefix above substring', ()=>{
    assert.deepEqual(matchStops(stops, 'chelsea market').map(s=>s.name), ['Chelsea Market']);
    assert.deepEqual(matchStops(stops, 'high').map(s=>s.name), ['Highland Park', 'The High Line']);
    assert.deepEqual(matchStops(stops, 'line').map(s=>s.name), ['The High Line']);
  });
  it('tolerates case, spacing, and longer queries', ()=>{
    assert.deepEqual(matchStops(stops, '  CHELSEA   market ').map(s=>s.name), ['Chelsea Market']);
    assert.deepEqual(matchStops(stops, 'the high line park').map(s=>s.name), ['The High Line']);
  });
  it('returns empty on blank or missing names', ()=>{
    assert.deepEqual(matchStops(stops, ''), []);
    assert.deepEqual(matchStops(stops, '   '), []);
    assert.deepEqual(matchStops(stops, 'Louvre'), []);
    assert.deepEqual(matchStops([{ name:'' }], 'x'), []);
  });
});
