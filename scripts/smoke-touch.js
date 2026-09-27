// タッチ操作の動作確認（ローカル専用）: 追従ジョイスティックと「右半分どこでもジャンプ」を検証する
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(process.env.PW_ROOT ?? '/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');

const port = 8770;
const server = spawn(process.execPath, ['scripts/serve.js', String(port)], { stdio: 'inherit' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/?touch=1`);
  await page.waitForFunction(() => window.__hyperwonder?.screen === 'title');
  const on = await page.evaluate(() => document.getElementById('touch').classList.contains('on'));
  if (!on) throw new Error('タッチ操作の UI が表示されていない');
  await page.waitForTimeout(400);
  // 右半分をタップ → 決定（ゲーム開始）
  await page.touchscreen.tap(600, 200);
  await page.waitForFunction(() => window.__hyperwonder?.screen === 'play');
  const st = () => page.evaluate(() => { const g = window.__hyperwonder.game, i = window.__hyperwonder.input; return { x: g.p.x, y: g.p.y, left: i.left, right: i.right, down: i.downKey, jump: i.jump, run: i.run, stick: document.getElementById('stick').classList.contains('on') }; });
  const ptr = (el, type, x, y, id = 1) => page.evaluate(([el, type, x, y, id]) => document.getElementById(el).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })), [el, type, x, y, id]);

  // 左半分の任意の位置に指を置き、右へ 30px ずらす → 右移動（ダッシュなし）
  await ptr('zoneL', 'pointerdown', 120, 300);
  await ptr('zoneL', 'pointermove', 150, 300);
  await page.waitForTimeout(300);
  const s1 = await st();
  if (!(s1.right && !s1.run && s1.stick)) throw new Error(`右移動になっていない ${JSON.stringify(s1)}`);
  // 大きくずらしても（スティックの外まで）追従して反応し、強く倒すとダッシュ
  await ptr('zoneL', 'pointermove', 330, 300);
  await page.waitForTimeout(300);
  const s2 = await st();
  if (!(s2.right && s2.run && s2.x > s1.x + 20)) throw new Error(`追従・ダッシュになっていない ${JSON.stringify(s2)}`);
  // そのまま少し戻すと、追従した中心を基準に左入力になる
  await ptr('zoneL', 'pointermove', 250, 300);
  await page.waitForTimeout(100);
  const s3 = await st();
  if (!(s3.left && !s3.right)) throw new Error(`追従後の左入力になっていない ${JSON.stringify(s3)}`);
  // 下にずらすとしゃがみ入力
  await ptr('zoneL', 'pointermove', 250, 340);
  const s4 = await st();
  if (!s4.down) throw new Error(`下入力になっていない ${JSON.stringify(s4)}`);
  await ptr('zoneL', 'pointerup', 250, 340);
  await page.waitForTimeout(50);
  const s5 = await st();
  if (s5.left || s5.right || s5.down || s5.run || s5.stick) throw new Error(`指を離しても入力が残っている ${JSON.stringify(s5)}`);

  // 右半分の適当な場所（ボタンの外）をタップ → ジャンプ
  const before = await st();
  await page.touchscreen.tap(520, 120);
  await page.waitForTimeout(200);
  const s6 = await st();
  if (!(s6.y < before.y - 5)) throw new Error(`右半分タップでジャンプしない ${JSON.stringify([before, s6])}`);
  await page.waitForTimeout(900);
  // B ボタン → ダッシュ入力（KeyX）
  await ptr('bB', 'pointerdown', 700, 300, 7);
  const s7 = await st();
  if (!s7.run) throw new Error(`B ボタンが効かない ${JSON.stringify(s7)}`);
  await ptr('bB', 'pointerup', 700, 300, 7);
  const s8 = await st();
  if (s8.run) throw new Error('B ボタンを離しても入力が残っている');
  await page.screenshot({ path: 'scripts/shot-touch.png' });
  if (errors.length) throw new Error('ブラウザエラー:\n' + errors.join('\n'));
  console.log('TOUCH SMOKE OK');
} catch (e) {
  if (errors.length) console.error('ブラウザエラー:\n' + errors.join('\n'));
  throw e;
} finally { await browser.close(); server.kill(); }
