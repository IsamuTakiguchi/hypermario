import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ROWS, ALL_CHARS, parseLevel } from '../src/levels.js';

const count = (rows, ch) => rows.join('').split(ch).length - 1;

test('コースが4つ以上ある', () => {
  assert.ok(LEVELS.length >= 4);
});

for (const def of LEVELS) {
  test(`${def.id} ${def.name}: 地図の形が正しい`, () => {
    assert.equal(def.rows.length, ROWS, '行数は画面の高さと一致');
    for (const r of def.rows) assert.equal(r.length, def.width, '全行が同じ幅');
    for (const ch of def.rows.join('')) assert.ok(ALL_CHARS.has(ch), `不明な記号 ${ch}`);
  });

  test(`${def.id}: 必須オブジェクトが揃っている`, () => {
    assert.equal(count(def.rows, 'S'), 1, 'スタートは1つ');
    assert.equal(count(def.rows, 'G'), 1, 'ゴールは1つ');
    assert.equal(count(def.rows, 'F'), 3, 'フラワーコインは3枚');
    assert.equal(count(def.rows, '*'), 1, 'ワンダーフラワーは1つ');
    assert.equal(count(def.rows, '@'), 1, 'ワンダーシードは1つ');
    assert.equal(count(def.rows, 't'), def.talks.length, 'おしゃべりフラワーと台詞の数が一致');
    assert.ok(count(def.rows, 'P') >= 1, 'アイテムブロックが最低1つ');
    assert.ok(['trunk', 'bubble'].includes(def.item));
  });

  test(`${def.id}: パースできてスタートが地面の上にある`, () => {
    const lv = parseLevel(def);
    assert.ok(lv.start && lv.goal && lv.flower && lv.seed);
    assert.equal(lv.tiles[lv.start.y + 1][lv.start.x], '#', 'スタート直下は地面');
    assert.equal(lv.tiles[lv.goal.y + 1][lv.goal.x], '#', 'ゴール直下は地面');
    assert.equal(lv.tiles[lv.flower.y + 1][lv.flower.x], '#', 'ワンダーフラワー直下は地面');
    assert.ok(lv.start.x < lv.flower.x && lv.flower.x < lv.seed.x && lv.seed.x < lv.goal.x, 'スタート→フラワー→シード→ゴールの順に並ぶ');
    assert.equal(lv.spawns.length, count(def.rows, 'e') + count(def.rows, 's') + count(def.rows, 'b'));
    assert.equal(lv.talkers.length, def.talks.length);
    for (const s of lv.spawns) assert.notEqual(lv.tiles[s.y][s.x], '#', '敵が地面に埋まっていない');
  });

  test(`${def.id}: ワンダーシードは足場の真上にある`, () => {
    const lv = parseLevel(def);
    const below = lv.tiles[lv.seed.y + 1][lv.seed.x];
    assert.ok(below === 'x' || below === '#', `シードの下が足場ではない: '${below}'`);
  });
}
