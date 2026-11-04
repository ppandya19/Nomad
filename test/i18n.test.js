import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
import { LOCALES, STRINGS, t, daysUnit, dayName, stopsUnit, clipsUnit, postsUnit, footDays, foodCatLabel, mealLabel, paceWord, travelDur, stopOfLine, storedLang, GUIDE_STEP_KEYS, guideSeen, HINT_KEYS, hintDoneViews } from '../lib/i18n.js';
import { categoryFor } from '../lib/score.js';

describe('locales', ()=>{
  it('offers the six test languages', ()=>{
    assert.deepEqual(LOCALES.map(l=>l.code), ['en', 'zh', 'hi', 'es', 'fr', 'it']);
  });
  it('fills every key in every locale', ()=>{
    for(const [key, e] of Object.entries(STRINGS)){
      for(const { code } of LOCALES) assert.ok(e[code], `${key} has ${code}`);
    }
  });
});

describe('t', ()=>{
  it('falls back to English and then the key', ()=>{
    assert.equal(t('xx', 'nav.map'), 'Map');
    assert.equal(t('en', 'nope.missing'), 'nope.missing');
  });
  it('fills slots', ()=>{
    assert.equal(t('zh', 'colln.plan.new', { n: 2 }), '按已存收藏规划 · 新增2个');
  });
});

describe('units', ()=>{
  it('pluralizes days per locale', ()=>{
    assert.equal(daysUnit(1, 'en'), '1 day');
    assert.equal(daysUnit(3, 'en'), '3 days');
    assert.equal(daysUnit(3, 'zh'), '3天');
    assert.equal(daysUnit(2, 'it'), '2 giorni');
  });
  it('names days per locale', ()=>{
    assert.equal(dayName(2, 'en'), 'Day 2');
    assert.equal(dayName(2, 'zh'), '第2天');
    assert.equal(dayName(2, 'es'), 'Día 2');
  });
  it('counts stops, clips, and posts per locale', ()=>{
    assert.equal(stopsUnit(1, 'fr'), '1 arrêt');
    assert.equal(stopsUnit(4, 'it'), '4 tappe');
    assert.equal(clipsUnit(2, 'hi'), '2 क्लिप');
    assert.equal(postsUnit(1, 'es'), '1 publicación');
    assert.equal(postsUnit(5, 'es'), '5 publicaciones');
  });
  it('formats footer days per locale', ()=>{
    assert.equal(footDays(2, 'en'), '2 DAYS');
    assert.equal(footDays(1, 'it'), '1 GIORNO');
  });
  it('labels food categories and meals per locale', ()=>{
    assert.equal(foodCatLabel('lunch', 'zh'), '午餐');
    assert.equal(foodCatLabel('dinner', 'es'), 'Cena');
    assert.equal(t('en', 'food.empty.none', { cat: 'Lunch', city: 'Rome' }), 'No Lunch spots saved for Rome yet');
    assert.equal(foodCatLabel('sushi', 'zh'), 'sushi');
    assert.equal(mealLabel('dinner', 'fr'), 'dîner');
    assert.equal(mealLabel('brunch', 'fr'), 'brunch');
  });
  it('paces days and formats travel time per locale', ()=>{
    assert.equal(paceWord(2, 'en'), 'slow');
    assert.equal(paceWord(6, 'hi'), 'भरा हुआ');
    assert.equal(travelDur(25, 'en'), '25 min');
    assert.equal(travelDur(65, 'en'), '1h 5m');
    assert.equal(travelDur(65, 'zh'), '1小时5分钟');
  });
  it('builds stop counter lines per locale', ()=>{
    assert.equal(stopOfLine(1, 4, 2, 'en'), 'STOP 1 OF 4 · DAY 2');
    assert.equal(stopOfLine(1, 4, 2, 'zh'), '第2天 · 第1/4站');
  });
});

describe('categoryFor', ()=>{
  it('labels categories per locale', ()=>{
    assert.equal(categoryFor('Louvre Museum', 'fr'), 'Musée');
    assert.equal(categoryFor('Central Park'), 'Park');
  });
});

describe('translator shadowing', ()=>{
  it('declares no local t binding where t is imported', ()=>{
    const pats = [
      /\b(const|let|var|function)\s+t\b/,
      /\bfunction\s+\w+\s*\(\s*t\b/,
      /catch\s*\(\s*t\b/,
      /(?:^|[^\w$.])\(\s*t\s*[,)]/m,
      /(?:^|[^\w$.])t\s*=>/m,
    ];
    for(const f of ['app/page.js', 'components/ChatPanel.js', 'components/MapView.js']){
      const src = readFileSync(path.join(ROOT, f), 'utf8');
      assert.match(src, /import\s*{[^}]*\bt\b[^}]*}\s*from\s*['"][^'"]*lib\/i18n/, `${f} imports t`);
      for(const p of pats) assert.doesNotMatch(src, p, `${f} shadows t: ${p}`);
    }
  });
});

describe('guide', ()=>{
  it('resolves every guide step in every locale', ()=>{
    assert.ok(GUIDE_STEP_KEYS.length >= 2);
    for(const [tk, dk] of GUIDE_STEP_KEYS){
      for(const { code } of LOCALES){
        assert.notEqual(t(code, tk), tk);
        assert.notEqual(t(code, dk), dk);
      }
    }
  });
  it('fills the step counter slots', ()=>{
    assert.equal(t('en', 'guide.step', { n: 2, total: 6 }), 'Step 2 of 6');
    assert.equal(t('zh', 'guide.step', { n: 2, total: 6 }), '第2步，共6步');
  });
  it('reads the seen flag', ()=>{
    assert.equal(guideSeen({ getItem: ()=>'1' }), true);
    assert.equal(guideSeen({ getItem: ()=>null }), false);
    assert.equal(guideSeen({ getItem: ()=>{ throw new Error('denied'); } }), false);
    assert.equal(guideSeen(), false);
  });
});

describe('hints', ()=>{
  it('resolves every page hint in every locale', ()=>{
    assert.deepEqual(Object.keys(HINT_KEYS).sort(), ['collection', 'collections', 'day', 'overview', 'stays', 'stop']);
    for(const [view, pairs] of Object.entries(HINT_KEYS)){
      assert.ok(pairs.length >= 2, `${view} has hints`);
      for(const [tk, dk] of pairs){
        for(const { code } of LOCALES){
          assert.notEqual(t(code, tk), tk, `${view}:${tk}`);
          assert.notEqual(t(code, dk), dk, `${view}:${dk}`);
        }
      }
    }
  });
  it('reads dismissed views', ()=>{
    assert.deepEqual(hintDoneViews({ getItem: ()=>JSON.stringify({ day: true }) }), { day: true });
    assert.deepEqual(hintDoneViews({ getItem: ()=>null }), {});
    assert.deepEqual(hintDoneViews({ getItem: ()=>'nope' }), {});
    assert.deepEqual(hintDoneViews({ getItem: ()=>'[]' }), {});
    assert.deepEqual(hintDoneViews({ getItem: ()=>{ throw new Error('denied'); } }), {});
    assert.deepEqual(hintDoneViews(), {});
  });
});

describe('storedLang', ()=>{
  it('restores a valid stored code after mount', ()=>{
    assert.equal(storedLang({ getItem: ()=>'es' }), 'es');
    assert.equal(storedLang({ getItem: ()=>'zh' }), 'zh');
  });
  it('rejects missing, unknown, or unreadable storage', ()=>{
    assert.equal(storedLang({ getItem: ()=>null }), null);
    assert.equal(storedLang({ getItem: ()=>'xx' }), null);
    assert.equal(storedLang({ getItem: ()=>{ throw new Error('denied'); } }), null);
    assert.equal(storedLang(), null);
  });
});
