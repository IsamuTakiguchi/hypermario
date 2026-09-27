import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITE_DATA } from '../src/sprites.js';

const check = (name, rows) => {
  assert.ok(rows.length > 0, `${name}: 行がある`);
  for (const r of rows) assert.equal(r.length, 16, `${name}: 各行は16px幅 ('${r}')`);
};

for (const [name, v] of Object.entries(SPRITE_DATA)) {
  test(`スプライト ${name} の形が正しい`, () => {
    if (Array.isArray(v)) check(name, v);
    else for (const [frame, rows] of Object.entries(v)) check(`${name}.${frame}`, rows);
  });
}

test('主人公の各形態はフレームごとに高さが揃っている', () => {
  const { HERO_SMALL, HERO_BIG, HERO_TRUNK, HERO_BUBBLE } = SPRITE_DATA;
  for (const rows of Object.values(HERO_SMALL)) assert.equal(rows.length, 16);
  for (const rows of Object.values(HERO_BIG)) assert.equal(rows.length, 24);
  for (const rows of Object.values(HERO_TRUNK)) assert.equal(rows.length, 24);
  for (const rows of Object.values(HERO_BUBBLE)) assert.equal(rows.length, 24);
});
