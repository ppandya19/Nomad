import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyCollectionSelection, dropDeselected, dedupeTrip, picksNotElsewhere, stripCollection, snakeDeal, resizeDays, moveStop, clusterByCity, spreadAcrossDays, mergeSpread, notInStops, fillPicks } from '../lib/plan.js';

const posts = [
  { place:'Times Square', lat:40.758, lng:-73.9855 },
  { place:'Chelsea Market', lat:40.7424, lng:-74.0061 },
  { place:'The High Line', lat:40.7479, lng:-74.0049 },
];
const names = (day)=>day.map(s=>s.name);

describe('applyCollectionSelection', ()=>{
  it('adds checked posts to an empty day', ()=>{
    assert.deepEqual(names(applyCollectionSelection([], 'nyc', posts, [0,1])), ['Times Square','Chelsea Market']);
  });
  it('drops unchecked collection stops already in the day', ()=>{
    const day = applyCollectionSelection([], 'nyc', posts, [0,1,2]);
    assert.deepEqual(names(applyCollectionSelection(day, 'nyc', posts, [0,1])), ['Times Square','Chelsea Market']);
  });
  it('keeps hand-added stops while syncing', ()=>{
    const day = [{ place_id:'search-1', name:'Joe Pizza', address:'x', lat:0, lng:0 }];
    assert.deepEqual(names(applyCollectionSelection(day, 'nyc', posts, [2])), ['Joe Pizza','The High Line']);
  });
  it('re-planning the same selection adds no duplicates', ()=>{
    const once = applyCollectionSelection([], 'nyc', posts, [0,1]);
    assert.deepEqual(names(applyCollectionSelection(once, 'nyc', posts, [0,1])), ['Times Square','Chelsea Market']);
  });
});

describe('dedupeTrip', ()=>{
  it('keeps the first occurrence of a repeated place across days', ()=>{
    const days = dedupeTrip([
      [{ place_id:'saved-nyc-0', name:'Times Square' }, { place_id:'x', name:'Chelsea Market' }],
      [{ place_id:'saved-nyc-0', name:'Times Square' }, { place_id:'y', name:'The High Line' }],
    ]);
    assert.deepEqual(days.map(names), [['Times Square','Chelsea Market'], ['The High Line']]);
  });
  it('compares names case-insensitively', ()=>{
    const days = dedupeTrip([[{ name:'Times Square' }],[{ name:'times square' }]]);
    assert.deepEqual(days.map(names), [['Times Square'], []]);
  });
});

describe('picksNotElsewhere', ()=>{
  it('skips posts already planned in another day', ()=>{
    const days = [[{ name:'Chelsea Market' }], []];
    assert.deepEqual(picksNotElsewhere(posts, [0,1,2], days, 1), [0,2]);
  });
});

describe('stripCollection', ()=>{
  it('removes only that collection stops, keeping hand-added and other collections', ()=>{
    const days = stripCollection([
      [{ place_id:'saved-nyc-0', name:'Times Square' }, { place_id:'search-1', name:'Joe Pizza' }],
      [{ place_id:'saved-chi-0', name:'Cloud Gate' }],
    ], 'nyc');
    assert.deepEqual(days.map(names), [['Joe Pizza'], ['Cloud Gate']]);
  });
});

describe('snakeDeal', ()=>{
  it('deals 15 ranks evenly across 3 days', ()=>{
    assert.deepEqual(snakeDeal(15, 3).map(d=>d.length), [5,5,5]);
  });
  it('snakes the second round in reverse', ()=>{
    assert.deepEqual(snakeDeal(4, 3), [[0],[1],[2,3]]);
  });
  it('handles a single day', ()=>{
    assert.deepEqual(snakeDeal(3, 1), [[0,1,2]]);
  });
});

describe('resizeDays', ()=>{
  it('grows with empty days', ()=>{
    assert.deepEqual(resizeDays([[{ name:'A' }]], 3).map(names), [['A'],[],[]]);
  });
  it('merges removed days into the last kept day', ()=>{
    assert.deepEqual(resizeDays([[{ name:'A' }],[{ name:'B' }],[{ name:'C' }]], 2).map(names), [['A'],['B','C']]);
  });
  it('dedupes repeats when merging', ()=>{
    assert.deepEqual(resizeDays([[{ name:'Times Square' }],[{ name:'Chelsea Market' }],[{ name:'times square' }]], 2).map(names), [['Times Square'],['Chelsea Market']]);
  });
});

describe('moveStop', ()=>{
  it('moves a stop to another day', ()=>{
    assert.deepEqual(moveStop([[{ name:'A' },{ name:'B' }],[{ name:'C' }]], 0, 1, 1).map(names), [['A'],['C','B']]);
  });
  it('drops the source copy when the target already has it', ()=>{
    assert.deepEqual(moveStop([[{ name:'A' }],[{ name:'a' }]], 0, 0, 1).map(names), [[],['a']]);
  });
  it('leaves days unchanged for invalid moves', ()=>{
    const days = [[{ name:'A' }]];
    assert.equal(moveStop(days, 0, 0, 0), days);
    assert.equal(moveStop(days, 0, 5, 1), days);
  });
});

describe('dropDeselected', ()=>{
  it('removes unchecked collection stops across every day', ()=>{
    const days = dropDeselected([
      [{ place_id:'saved-nyc-0', name:'Times Square' }],
      [{ place_id:'saved-nyc-2', name:'The High Line' }, { place_id:'search-1', name:'Joe Pizza' }],
    ], 'nyc', posts, [0]);
    assert.deepEqual(days.map(names), [['Times Square'], ['Joe Pizza']]);
  });
});

const ROME = [
  { name:'Colosseum', lat:41.8902, lng:12.4922 },
  { name:'Trevi Fountain', lat:41.9009, lng:12.4833 },
  { name:'Pantheon', lat:41.8986, lng:12.4769 },
];
const FLORENCE = [
  { name:'Florence Cathedral', lat:43.7731, lng:11.256 },
  { name:'Ponte Vecchio', lat:43.7679, lng:11.2531 },
];
const VENICE = [
  { name:"Doge's Palace", lat:45.434, lng:12.3407 },
  { name:'Rialto Bridge', lat:45.438, lng:12.3353 },
];

describe('clusterByCity', ()=>{
  it('groups far-apart stops by city, keeping input order', ()=>{
    const mixed = [ROME[0], FLORENCE[0], ROME[1], VENICE[0], ROME[2], VENICE[1]];
    assert.deepEqual(clusterByCity(mixed).map(names), [
      ['Colosseum','Trevi Fountain','Pantheon'],
      ['Florence Cathedral'],
      ["Doge's Palace",'Rialto Bridge'],
    ]);
  });
  it('keeps a single city in one group', ()=>{
    assert.equal(clusterByCity(ROME).length, 1);
  });
  it('isolates stops without coordinates', ()=>{
    assert.deepEqual(clusterByCity([{ name:'X' }, ROME[0]]).map(names), [['X'],['Colosseum']]);
  });
});

describe('spreadAcrossDays', ()=>{
  it('deals one city per day when cities outnumber days', ()=>{
    const days = spreadAcrossDays([...ROME, ...FLORENCE, ...VENICE], 3);
    assert.deepEqual(days.map(names), [
      ['Colosseum','Trevi Fountain','Pantheon'],
      ['Florence Cathedral','Ponte Vecchio'],
      ["Doge's Palace",'Rialto Bridge'],
    ]);
  });
  it('splits a single city evenly', ()=>{
    const six = Array.from({ length:6 }, (_,i)=>({ name:`S${i}`, lat:40.75, lng:-73.98 }));
    assert.deepEqual(spreadAcrossDays(six, 3).map(d=>d.length), [2,2,2]);
  });
  it('gives extra days to the biggest city, capped at its stop count', ()=>{
    const stops = [
      { name:'A0', lat:40.75, lng:-73.98 }, { name:'A1', lat:40.751, lng:-73.981 },
      { name:'A2', lat:40.752, lng:-73.982 }, { name:'A3', lat:40.753, lng:-73.983 },
      { name:'B0', lat:41.88, lng:12.49 },
    ];
    assert.deepEqual(spreadAcrossDays(stops, 4).map(names), [['A0'],['A1'],['A2','A3'],['B0']]);
  });
  it('mixes cities only when they outnumber days', ()=>{
    const days = spreadAcrossDays([...ROME.slice(0,1), ...FLORENCE.slice(0,1), ...VENICE.slice(0,1), { name:'Milan Duomo', lat:45.464, lng:9.19 }], 3);
    assert.deepEqual(days.map(names), [['Colosseum'],['Florence Cathedral'],["Doge's Palace",'Milan Duomo']]);
  });
  it('dedupes repeats and never loses stops', ()=>{
    const days = spreadAcrossDays([ROME[0], { ...ROME[0], name:'colosseum' }, FLORENCE[0]], 2);
    assert.deepEqual(days.map(names), [['Colosseum'],['Florence Cathedral']]);
  });
  it('returns empty days when there are no stops', ()=>{
    assert.deepEqual(spreadAcrossDays([], 3), [[],[],[]]);
  });
});

describe('mergeSpread', ()=>{
  it('appends spread stops without moving existing ones', ()=>{
    const days = mergeSpread(
      [[{ name:'Joe Pizza' }],[{ name:'Cloud Gate' }]],
      [[{ name:'A' },{ name:'Joe Pizza' }],[{ name:'Cloud Gate' },{ name:'B' }]]
    );
    assert.deepEqual(days.map(names), [['Joe Pizza','A'],['Cloud Gate','B']]);
  });
  it('skips spread stops already planned in another day', ()=>{
    const days = mergeSpread([[{ name:'A' }],[]], [[],[{ name:'a' },{ name:'B' }]]);
    assert.deepEqual(days.map(names), [['A'],['B']]);
  });
});

describe('notInStops', ()=>{
  const menu = [{ name:'Los Tacos No.1' }, { name:'Joe Pizza' }, { name:'L Artusi' }];
  it('drops items already in stops, case-insensitively', ()=>{
    assert.deepEqual(names(notInStops(menu, [{ name:' joe pizza ' }, { name:'Other' }])), ['Los Tacos No.1','L Artusi']);
  });
  it('keeps order and returns everything when stops are empty', ()=>{
    assert.deepEqual(names(notInStops(menu, [])), ['Los Tacos No.1','Joe Pizza','L Artusi']);
  });
  it('returns empty when every item is in stops', ()=>{
    assert.deepEqual(notInStops(menu, menu.map(m=>({ name:m.name }))), []);
  });
});

describe('fillPicks', ()=>{
  it('tops up short ranked lists with live extras', ()=>{
    assert.deepEqual(names(fillPicks([{ name:'A' }], [{ name:'B' }, { name:'C' }], [], 3)), ['A','B','C']);
  });
  it('excludes in-stops items and dedupes extras against ranked', ()=>{
    assert.deepEqual(names(fillPicks([{ name:'A' }, { name:'B' }], [{ name:'a' }, { name:'C' }], [{ name:'B' }], 3)), ['A','C']);
  });
  it('caps the total at n', ()=>{
    assert.deepEqual(names(fillPicks([{ name:'A' }, { name:'B' }, { name:'C' }], [{ name:'D' }], [], 2)), ['A','B']);
  });
  it('handles empty inputs', ()=>{
    assert.deepEqual(fillPicks([], [], [], 3), []);
  });
});

