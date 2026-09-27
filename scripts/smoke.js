// ブラウザでの動作確認（ローカル専用）: Chromium を起動して、移動→ワンダー→ゴールまで実際に操作する
// 使い方: node scripts/smoke.js  （グローバルの playwright と /opt/pw-browsers/chromium を使う）
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(process.env.PW_ROOT ?? '/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');

const port = 8765;
const server = spawn(process.execPath, ['scripts/serve.js', String(port)], { stdio: 'inherit' });
await new Promise(r => setTimeout(r, 600));
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 480 } });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__hyperwonder?.screen === 'title');
  await page.waitForTimeout(400); // タイトルの誤操作防止ガードが解けるのを待つ
  await page.keyboard.press('KeyZ');
  await page.waitForFunction(() => window.__hyperwonder?.screen === 'play');
  const state = () => page.evaluate(() => { const g = window.__hyperwonder.game; return { x: g.p.x, y: g.p.y, form: g.p.form, coins: g.coins, wonder: g.wonder.active, done: g.wonder.done, state: g.state, screen: window.__hyperwonder.screen, lives: g.lives }; });
  const s0 = await state();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  const s1 = await state();
  if (!(s1.x > s0.x + 20)) throw new Error(`右に進めない: ${JSON.stringify([s0, s1])}`);
  await page.keyboard.press('KeyZ'); await page.waitForTimeout(150);
  const s2 = await state();
  if (!(s2.y < s1.y)) throw new Error('ジャンプしない');
  await page.screenshot({ path: 'scripts/shot-play.png' });

  // ワンダーフラワーの手前にテレポートして触れる → シードまで歩く
  await page.evaluate(() => { const g = window.__hyperwonder.game; g.p.x = g.level.flower.x * 16 - 40; g.p.y = g.level.flower.y * 16; g.p.inv = 60; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  const s3 = await state();
  if (!s3.wonder) throw new Error(`ワンダーが始まらない ${JSON.stringify(s3)}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scripts/shot-wonder.png' });
  await page.evaluate(() => { const g = window.__hyperwonder.game; g.p.x = g.level.seed.x * 16 - 2; g.p.y = g.level.seed.y * 16 - 6; g.p.vy = 0; });
  await page.waitForTimeout(300);
  const s4 = await state();
  if (!s4.done || s4.wonder) throw new Error(`シードが取れない ${JSON.stringify(s4)}`);

  // ゴール
  await page.evaluate(() => { const g = window.__hyperwonder.game; g.p.x = g.level.goal.x * 16 - 40; g.p.y = g.level.goal.y * 16; g.p.inv = 60; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');
  const s5 = await state();
  if (s5.state !== 'clear') throw new Error(`ゴールできない ${JSON.stringify(s5)}`);
  await page.waitForFunction(() => window.__hyperwonder.screen === 'clear', null, { timeout: 8000 });
  await page.screenshot({ path: 'scripts/shot-clear.png' });

  // 全コースをロードして描画できること
  for (let i = 0; i < 4; i++) {
    await page.evaluate(i => window.__hyperwonder.startLevel(i), i);
    await page.evaluate(() => { const g = window.__hyperwonder.game; g.p.x = g.level.flower.x * 16 + 4; });
    await page.waitForTimeout(400);
    const s = await state();
    if (!s.wonder) throw new Error(`コース${i + 1}: ワンダーが始まらない ${JSON.stringify(s)}`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `scripts/shot-level${i + 1}.png` });
  }
  if (errors.length) throw new Error('ブラウザエラー:\n' + errors.join('\n'));
  console.log('SMOKE OK', JSON.stringify({ s0, s1, s2, s3, s4, s5 }));
} catch (e) {
  if (errors.length) console.error('ブラウザエラー:\n' + errors.join('\n'));
  throw e;
} finally {
  await browser.close(); server.kill();
}
