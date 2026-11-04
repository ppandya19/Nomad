import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estimateModes, formatLeg, fallbackDriveMin } from '../lib/route.js';

describe('estimateModes', ()=>{
  it('scales transit and walk above drive time', ()=>{
    assert.deepEqual(estimateModes(10), { drive:10, transit:19, walk:40 });
  });
  it('floors every mode at one minute', ()=>{
    const m = estimateModes(0);
    assert.ok(m.drive>=1 && m.transit>=1 && m.walk>=1);
  });
});

describe('formatLeg', ()=>{
  it('shows drive and transit without a tilde when live', ()=>{
    assert.equal(formatLeg({ drive:15, transit:22, walk:45 }, true), '🚗 15 · 🚇 22');
  });
  it('adds walk only under 15 minutes', ()=>{
    assert.equal(formatLeg({ drive:4, transit:9, walk:12 }, true), '🚗 4 · 🚇 9 · 🚶 12');
  });
  it('prefixes estimates with a tilde', ()=>{
    assert.equal(formatLeg({ drive:15, transit:22, walk:45 }, false), '~🚗 15 · 🚇 22');
  });
  it('marks mixed live and estimated modes per mode', ()=>{
    assert.equal(
      formatLeg({ drive:12, transit:25, walk:40 }, { drive:true, transit:false, walk:false }),
      '🚗 12 · ~🚇 25'
    );
    assert.equal(
      formatLeg({ drive:4, transit:9, walk:12 }, { drive:true, transit:true, walk:false }),
      '🚗 4 · 🚇 9 · ~🚶 12'
    );
  });
});

describe('fallbackDriveMin', ()=>{
  const TS = { lat:40.758, lng:-73.9855 }, CHELSEA = { lat:40.7424, lng:-74.0061 };
  const ROME = { lat:41.8902, lng:12.4922 }, FLORENCE = { lat:43.7731, lng:11.256 };
  it('estimates a short city hop in single minutes', ()=>{
    const m = fallbackDriveMin(TS, CHELSEA);
    assert.ok(m>=3 && m<=8, `city hop ${m} min`);
  });
  it('estimates an intercity leg in hours, not minutes', ()=>{
    const m = fallbackDriveMin(ROME, FLORENCE);
    assert.ok(m>=120 && m<=200, `intercity ${m} min`);
  });
  it('floors at three minutes', ()=>{
    assert.equal(fallbackDriveMin(TS, TS), 3);
  });
});
