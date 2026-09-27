// 起動・画面遷移・セーブ・メインループ
import { LEVELS } from './levels.js';
import { Game, W, H } from './game.js';
import { Input } from './input.js';
import { GameAudio } from './audio.js';
import { getSprites } from './sprites.js';

const SAVE_KEY = 'hyperwonder.save.v1';
const BADGES = [
  { id: 'none', name: 'バッジなし', desc: 'きほんの うごき' },
  { id: 'glide', name: 'パラシュートぼうし', desc: 'ジャンプ おしっぱなしで ゆっくり おりる' },
  { id: 'wall', name: 'かべのぼり', desc: 'かべに はりついて かべジャンプ！' },
  { id: 'jump', name: 'ハイジャンプ', desc: 'ジャンプが たかくなる' },
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input();
const audio = new GameAudio();
const sp = getSprites();

let save = { unlocked: 1, seeds: {}, fcoins: {}, badge: 'none', cleared: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') save = { ...save, ...s }; } catch { /* セーブなし */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* 保存できなくても続行 */ } };

let screen = 'title'; // title | play | clear | gameover | ending
let screenT = 0;
let game = null;
let sel = { badge: Math.max(0, BADGES.findIndex(b => b.id === save.badge)), level: 0 };
let run = { lives: 3, coins: 0 };
let levelIndex = 0;

function resize() {
  const s = Math.max(1, Math.min(window.innerWidth / W, (window.innerHeight - 8) / H));
  const scale = s >= 2 ? Math.floor(s) : s; // 大きい画面では整数倍でくっきり
  canvas.style.width = `${W * scale}px`; canvas.style.height = `${H * scale}px`;
}
window.addEventListener('resize', resize); resize();

function startLevel(i) {
  levelIndex = i;
  game = new Game(ctx, input, audio, { badge: BADGES[sel.badge].id, lives: run.lives, coins: run.coins, onEvent });
  game.load(LEVELS[i]);
  screen = 'play'; screenT = 0;
  audio.play('level');
}
function onEvent(ev) {
  if (ev === 'died') {
    run.lives = game.lives - 1; run.coins = game.coins;
    if (run.lives < 0) { screen = 'gameover'; screenT = 0; audio.stop(); }
    else startLevel(levelIndex);
  } else if (ev === 'seed') {
    save.seeds[LEVELS[levelIndex].id] = true; persist();
  } else if (ev === 'clear') {
    run.lives = game.lives; run.coins = game.coins;
    const id = LEVELS[levelIndex].id;
    save.cleared[id] = true;
    const fc = new Set([...(save.fcoins[id] ?? []), ...game.flowerCoins]); save.fcoins[id] = [...fc];
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIndex + 2));
    persist();
    screen = levelIndex + 1 >= LEVELS.length ? 'ending' : 'clear'; screenT = 0;
    if (screen === 'ending') audio.play('title');
  }
}

const text = (s, x, y, color = '#fff', align = 'center', font = 'bold 10px sans-serif') => {
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#1b1b2f'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = color; ctx.fillText(s, x, y);
};
function drawSky(top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function drawTitle() {
  drawSky('#3f8fff', '#bfe9ff');
  ctx.fillStyle = '#57b84a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * 110 - 40, H); ctx.quadraticCurveTo(i * 110 + 20, H - 90, i * 110 + 80, H); ctx.fill(); }
  ctx.fillStyle = '#3d8f38'; ctx.fillRect(0, H - 24, W, 24); ctx.fillStyle = '#5cbf4a'; ctx.fillRect(0, H - 24, W, 4);
  const title = 'HYPER WONDER';
  ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  let x = W / 2 - ctx.measureText(title).width / 2;
  for (let i = 0; i < title.length; i++) {
    const ch = title[i], w = ctx.measureText(ch).width, y = 30 + Math.sin(screenT / 12 + i * .5) * 4;
    ctx.textAlign = 'left'; ctx.fillStyle = '#1b1b2f'; ctx.fillText(ch, x + 2, y + 2);
    ctx.fillStyle = `hsl(${(i * 30 + screenT * 2) % 360},90%,60%)`; ctx.fillText(ch, x, y); x += w;
  }
  text('ワンダーフラワーで コースが 大へんしん！', W / 2, 68, '#fff', 'center', 'bold 11px sans-serif');
  // 主人公
  const hero = sp.hero.big[(screenT >> 4) % 2 ? 'walk' : 'idle'];
  ctx.drawImage(hero, W / 2 - 8, H - 24 - 24);
  ctx.drawImage(sp.walker[(screenT >> 3) % 2 ? 'a' : 'b'], W / 2 + 60, H - 24 - 14);
  ctx.drawImage(sp.talker, W / 2 - 80, H - 24 - 16);
  // バッジ
  const b = BADGES[sel.badge];
  text('◀ バッジ ▶', W / 2, 92, '#ffd54f');
  text(b.name, W / 2, 106, '#fff', 'center', 'bold 12px sans-serif');
  text(b.desc, W / 2, 122, '#e0f7fa', 'center', '9px sans-serif');
  // コース
  const lv = LEVELS[sel.level];
  const seeds = LEVELS.filter(l => save.seeds[l.id]).length;
  text(`▲ コース ▼   WORLD 1-${sel.level + 1}  ${lv.name}`, W / 2, 142, '#fff');
  const fc = (save.fcoins[lv.id] ?? []).length;
  text(`フラワーコイン ${fc}/3   ワンダーシード ${save.seeds[lv.id] ? '✔' : '－'}   （合計シード ${seeds}/${LEVELS.length}）`, W / 2, 156, '#e1bee7', 'center', '9px sans-serif');
  if ((screenT >> 5) % 2 === 0) text('Z キー / タップ で スタート', W / 2, 180, '#fff', 'center', 'bold 12px sans-serif');
  text('M: ミュート', W - 6, H - 14, 'rgba(255,255,255,.7)', 'right', '8px sans-serif');
  text('オリジナルの ドット絵と 音楽で つくった ファンメイドの アクションゲームです', 6, H - 14, 'rgba(255,255,255,.7)', 'left', '8px sans-serif');
}
function drawOverlayScreen(title, lines, color) {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
  text(title, W / 2, 70, color, 'center', 'bold 22px sans-serif');
  lines.forEach((l, i) => text(l, W / 2, 110 + i * 16, '#fff', 'center', 'bold 11px sans-serif'));
  if ((screenT >> 5) % 2 === 0) text('Z キー / タップ で つぎへ', W / 2, 190, '#ffd54f', 'center', 'bold 11px sans-serif');
}

function update() {
  screenT++;
  if (input.anyKey) { audio.ensure(); if (screen === 'title' && !audio.songName) audio.play('title'); }
  if (input.hit('KeyM')) audio.toggleMute();
  switch (screen) {
    case 'title':
      if (input.hit('ArrowLeft')) { sel.badge = (sel.badge + BADGES.length - 1) % BADGES.length; audio.sfx('select'); }
      if (input.hit('ArrowRight')) { sel.badge = (sel.badge + 1) % BADGES.length; audio.sfx('select'); }
      if (input.hit('ArrowUp')) { sel.level = (sel.level + save.unlocked - 1) % save.unlocked; audio.sfx('select'); }
      if (input.hit('ArrowDown')) { sel.level = (sel.level + 1) % save.unlocked; audio.sfx('select'); }
      if (input.ok && screenT > 10) { save.badge = BADGES[sel.badge].id; persist(); run = { lives: 3, coins: 0 }; startLevel(sel.level); }
      break;
    case 'play': game.update(); break;
    case 'clear':
      if (input.ok && screenT > 30) startLevel(levelIndex + 1);
      break;
    case 'gameover': case 'ending':
      if (input.ok && screenT > 40) { screen = 'title'; screenT = 0; sel.level = 0; audio.play('title'); }
      break;
  }
  input.endFrame();
}
function draw() {
  switch (screen) {
    case 'title': drawTitle(); break;
    case 'play': game.draw(); break;
    case 'clear': {
      game.draw();
      const lv = LEVELS[levelIndex];
      drawOverlayScreen('コース クリア！', [`${lv.name}`, `フラワーコイン ${game.flowerCoins.length}/3   ワンダーシード ${game.wonder.done ? 'GET!' : 'まだ'}`, `コイン ${game.coins}   のこりライフ ${game.lives}`], '#ffd54f');
      break;
    }
    case 'gameover': game.draw(); drawOverlayScreen('GAME OVER', ['また ちょうせん してね！'], '#ff8a80'); break;
    case 'ending': {
      game.draw();
      const seeds = LEVELS.filter(l => save.seeds[l.id]).length;
      drawOverlayScreen('ぜんコース クリア！', ['おめでとう！ きみは ワンダーマスター！', `あつめた ワンダーシード ${seeds}/${LEVELS.length}`, seeds < LEVELS.length ? 'ぜんぶ あつめると もっと すごい！' : 'ぜんぶの シードを あつめたね！ パーフェクト！'], '#a5d6a7');
      break;
    }
  }
}

let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function loop(now) {
  acc += Math.min(now - last, 100); last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__hyperwonder = { get screen() { return screen; }, get game() { return game; }, startLevel, LEVELS };
