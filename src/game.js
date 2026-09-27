// ゲーム本体：1コース分の状態、物理、敵・アイテム、ワンダー効果、描画
import { TILE as T, ROWS, SOLID, parseLevel } from './levels.js';
import { getSprites } from './sprites.js';

export const W = 400, H = 240;

const THEMES = {
  grass: { sky: ['#5fb8ff', '#bfe9ff'], hill: '#57b84a', hill2: '#3d8f38', ground: '#b9743a', groundDark: '#8a5228', top: '#5cbf4a', cloud: '#ffffff' },
  sky: { sky: ['#4f9cff', '#dff3ff'], hill: '#cfe8ff', hill2: '#a9d1f7', ground: '#c99a5a', groundDark: '#9a7040', top: '#7bd66b', cloud: '#ffffff' },
  cave: { sky: ['#14142a', '#2a2a4a'], hill: '#2c2c4a', hill2: '#22223a', ground: '#5a4a6a', groundDark: '#3c3048', top: '#8a7aa0', cloud: '#3a3a5a' },
  sunset: { sky: ['#ff7b54', '#ffd27a'], hill: '#c95d8a', hill2: '#7a3b6e', ground: '#a06a3a', groundDark: '#6e4626', top: '#e6b04a', cloud: '#ffe6d5' },
};
const FORM_SIZE = { small: [10, 14], big: [10, 22], trunk: [14, 22], bubble: [10, 22] };
const FORM_NAME = { big: 'おおきくなった！', trunk: 'ゾウに へんしん！', bubble: 'あわの ちから！' };
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Game {
  constructor(ctx, input, audio, opts) {
    this.ctx = ctx; this.input = input; this.audio = audio;
    this.badge = opts.badge ?? 'none';
    this.lives = opts.lives ?? 3;
    this.coins = opts.coins ?? 0;
    this.onEvent = opts.onEvent ?? (() => {});
    this.sp = getSprites();
    this.dark = document.createElement('canvas'); this.dark.width = W; this.dark.height = H;
    this.stars = Array.from({ length: 60 }, (_, i) => ({ x: (i * 97) % W, y: (i * 53) % (H - 60), s: 1 + (i % 3) }));
  }

  load(def) {
    const lv = parseLevel(def);
    this.level = lv; this.theme = THEMES[lv.theme];
    this.tiles = lv.tiles;
    this.time = lv.time; this.frame = 0;
    this.state = 'play'; this.stateT = 0;
    this.camX = 0;
    this.wonder = { active: false, t: 0, done: false };
    this.flowerCoins = [];
    this.bumps = new Map();
    this.enemies = lv.spawns.map(s => this.makeEnemy(s));
    this.items = []; this.bubbles = []; this.particles = []; this.popups = []; this.rain = [];
    this.talked = new Set(); this.talk = null;
    this.pipeCol = {};
    let idx = -1;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < lv.width; x++) if (this.tiles[y][x] === 'T') {
      if (this.tiles[y][x - 1] !== 'T') idx++;
      this.pipeCol[x] = { top: y, idx };
    }
    this.p = { x: lv.start.x * T + 3, y: lv.start.y * T, vx: 0, vy: 0, w: 10, h: 14, dir: 1, ground: false, form: 'small', inv: 0, anim: 0, coyote: 0, jbuf: 0, crouch: false, attack: 0, wall: 0, glide: false, bubbleCd: 0, prevBottom: 0 };
    this.setForm('small');
    this.p.y = (lv.start.y + 1) * T - this.p.h;
    this.goalX = lv.goal.x * T + 7;
    this.introT = 120;
  }

  makeEnemy(s) {
    const e = { kind: s.kind, x: s.x * T + 1, y: s.y * T + 2, w: 14, h: 14, vx: s.kind === 'b' ? -1 : -0.6, vy: 0, dir: -1, dead: 0, t: Math.random() * 100, baseY: s.y * T + 2 };
    if (s.kind === 's') e.vx = -0.8;
    return e;
  }

  // ---------- ユーティリティ ----------
  tile(cx, cy) { return (cy < 0 || cy >= ROWS || cx < 0 || cx >= this.level.width) ? '.' : this.tiles[cy][cx]; }
  pipeExt(idx) { return this.wonderType() === 'pipes' ? Math.round((Math.sin(this.wonder.t / 45 + idx * 1.3) + 1) / 2 * 3) : 0; }
  solid(cx, cy) {
    if (cy >= ROWS || cy < 0) return false;
    if (cx < 0 || cx >= this.level.width) return true;
    const c = this.tiles[cy][cx];
    if (SOLID.has(c)) return true;
    if (c === 'x') return this.wonder.active;
    const pc = this.pipeCol[cx];
    if (pc) { const ext = this.pipeExt(pc.idx); if (cy < pc.top && cy >= pc.top - ext) return true; }
    return false;
  }
  semi(cx, cy) { return this.tile(cx, cy) === '-'; }
  wonderType() { return this.wonder.active ? this.level.wonder.type : null; }
  setForm(f) {
    const p = this.p, bottom = p.y + p.h;
    p.form = f; [p.w, p.h] = FORM_SIZE[f]; p.y = bottom - p.h;
  }
  popup(x, y, text, color = '#fff') { this.popups.push({ x, y, text, life: 50, color }); }
  burst(x, y, n, color, spd = 2, grav = .15) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(spd * .4, spd);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: rnd(20, 45), color, size: rnd(1, 3), grav });
    }
  }
  addCoin(n = 1, x, y) {
    this.coins += n;
    if (this.coins >= 100) { this.coins -= 100; this.lives++; this.audio.sfx('oneup'); this.popup(x ?? this.p.x, (y ?? this.p.y) - 12, '1UP!', '#8f8'); }
  }

  // ---------- 衝突 ----------
  // 位置 a から長さ len が重なるタイル番号の範囲（端がぴったり接している場合は含めない）
  span(a, len) { return [Math.floor(a / T), Math.ceil((a + len) / T) - 1]; }
  collideX(e) {
    const [top, bot] = this.span(e.y, e.h);
    e.hitWall = 0;
    if (e.vx > 0) {
      const cx = Math.floor((e.x + e.w) / T);
      for (let cy = top; cy <= bot; cy++) if (this.solid(cx, cy)) { e.x = cx * T - e.w; e.vx = 0; e.hitWall = 1; return; }
    } else if (e.vx < 0) {
      const cx = Math.floor(e.x / T);
      for (let cy = top; cy <= bot; cy++) if (this.solid(cx, cy)) { e.x = (cx + 1) * T; e.vx = 0; e.hitWall = -1; return; }
    }
  }
  collideY(e, prevBottom, allowSemi = true) {
    const [left, right] = this.span(e.x, e.w);
    e.ground = false;
    if (e.vy >= 0) {
      const cy = Math.floor((e.y + e.h) / T);
      for (let cx = left; cx <= right; cx++) {
        if (this.solid(cx, cy) || (allowSemi && this.semi(cx, cy) && prevBottom <= cy * T && !e.dropThrough)) {
          e.y = cy * T - e.h; e.vy = 0; e.ground = true; return;
        }
      }
    } else {
      const cy = Math.floor(e.y / T);
      let best = -1, bestOv = 0;
      for (let cx = left; cx <= right; cx++) if (this.solid(cx, cy)) {
        const ov = Math.min(e.x + e.w, (cx + 1) * T) - Math.max(e.x, cx * T);
        if (ov > bestOv) { bestOv = ov; best = cx; }
      }
      if (best >= 0) { e.y = (cy + 1) * T; e.vy = 0; e.headBump = { cx: best, cy }; }
    }
  }

  // ---------- ブロック ----------
  bumpBlock(cx, cy, strong) {
    const c = this.tile(cx, cy);
    const key = `${cx},${cy}`;
    if (c === '?' || c === 'P') {
      this.tiles[cy][cx] = 'U'; this.bumps.set(key, 0);
      if (c === '?') { this.addCoin(1, cx * T, cy * T); this.audio.sfx('coin'); this.particles.push({ x: cx * T + 4, y: cy * T - 12, vx: 0, vy: -4, life: 30, coin: true, grav: .22 }); }
      else this.spawnItem(cx, cy);
      this.shakeEnemiesOn(cx, cy);
    } else if (c === '=') {
      if (strong) {
        this.tiles[cy][cx] = '.'; this.audio.sfx('break'); this.addCoin(0);
        for (const [dx, dy] of [[-1, -2], [1, -2], [-1, -1], [1, -1]]) this.particles.push({ x: cx * T + 4 + (dx > 0 ? 8 : 0), y: cy * T + 4, vx: dx * rnd(.8, 1.6), vy: dy * 2.2, life: 60, color: '#c9764a', size: 4, grav: .2 });
        this.shakeEnemiesOn(cx, cy);
      } else { this.bumps.set(key, 0); this.audio.sfx('bump'); this.shakeEnemiesOn(cx, cy); }
    } else if (c === 'U' || c === '#') this.audio.sfx('bump');
  }
  shakeEnemiesOn(cx, cy) {
    for (const e of this.enemies) if (!e.dead && Math.abs(e.x + e.w / 2 - (cx * T + 8)) < 14 && Math.abs(e.y + e.h - cy * T) < 4) this.killEnemy(e, true);
  }
  spawnItem(cx, cy) {
    const kind = this.p.form === 'small' ? 'berry' : this.level.item;
    this.items.push({ kind: kind === 'trunk' ? 'fruit' : kind === 'bubble' ? 'bflower' : 'berry', x: cx * T + 1, y: cy * T, w: 14, h: 14, vx: 0, vy: 0, rise: 24, dir: 1, blockY: cy * T });
    this.audio.sfx('power');
  }

  // ---------- 敵 ----------
  killEnemy(e, fling = false) {
    if (e.dead) return;
    e.dead = fling ? 2 : 1; e.deadT = 0;
    if (fling) { e.vy = -4; e.vx = (e.x > this.p.x ? 1 : -1) * 1.5; }
    this.audio.sfx('stomp');
    this.addCoin(1, e.x, e.y); this.popup(e.x, e.y - 8, '+1');
  }
  hurt() {
    const p = this.p;
    if (p.inv > 0 || this.state !== 'play') return;
    if (p.form === 'small') return this.die();
    this.setForm('small'); p.inv = 100; this.audio.sfx('hurt'); this.burst(p.x + 5, p.y + 7, 8, '#fff', 2, .05);
  }
  die() {
    if (this.state !== 'play') return;
    this.state = 'dead'; this.stateT = 0; this.p.vy = -7; this.p.vx = 0;
    this.audio.stop(); this.audio.sfx('die');
  }

  // ---------- ワンダー ----------
  startWonder() {
    this.wonder = { active: true, t: 0, done: false }; this.audio.sfx('wonder'); this.audio.play('wonder');
    this.burst(this.p.x + 5, this.p.y + 8, 30, '#fff', 3, 0);
    this.onEvent('wonder');
  }
  endWonder() {
    this.wonder = { active: false, t: 0, done: true }; this.audio.sfx('seed'); this.audio.play('level');
    this.burst(this.p.x + 5, this.p.y + 8, 30, '#aef', 3, 0);
    this.popup(this.p.x - 20, this.p.y - 16, 'ワンダーシード GET!', '#cfc');
    this.onEvent('seed');
  }

  // ---------- 更新 ----------
  update() {
    this.frame++; this.stateT++;
    const p = this.p, inp = this.input;
    if (this.introT > 0) this.introT--;
    for (const [k, v] of this.bumps) { if (v > 14) this.bumps.delete(k); else this.bumps.set(k, v + 1); }
    this.updateFx();
    if (this.state === 'dead') {
      p.vy += .35; p.y += p.vy;
      if (this.stateT > 130) this.onEvent('died');
      return;
    }
    if (this.state === 'clear') return this.updateClear();

    // タイマー
    if (this.frame % 60 === 0 && !this.wonder.active) { this.time--; if (this.time <= 0) return this.die(); if (this.time === 50) this.popup(p.x - 10, p.y - 16, 'いそげ!', '#f88'); }
    if (this.wonder.active) this.wonder.t++;
    const wt = this.wonderType();

    // ---- 横移動 ----
    const speedMul = wt === 'wobble' ? 1.3 : 1;
    const maxSpd = (inp.run ? 2.7 : 1.7) * speedMul;
    const acc = p.ground ? .2 : .13;
    p.crouch = p.ground && inp.downKey && p.form !== 'small';
    if (p.crouch) {
      if (p.h !== 14) { const b = p.y + p.h; p.h = 14; p.y = b - 14; }
      p.vx *= .85;
    } else {
      if (p.h !== FORM_SIZE[p.form][1]) { const b = p.y + p.h; p.h = FORM_SIZE[p.form][1]; p.y = b - p.h; }
      if (inp.left && !inp.right) { p.vx = Math.max(p.vx - acc, -maxSpd); p.dir = -1; }
      else if (inp.right && !inp.left) { p.vx = Math.min(p.vx + acc, maxSpd); p.dir = 1; }
      else p.vx *= p.ground ? .78 : .96;
      if (Math.abs(p.vx) > maxSpd) p.vx *= .95;
      if (Math.abs(p.vx) < .05) p.vx = 0;
    }
    p.dropThrough = inp.downKey && p.ground && !inp.jumpHit;

    // ---- ジャンプ ----
    const gravBase = wt === 'lowgrav' ? .16 : .4;
    p.jbuf = inp.jumpHit ? 6 : Math.max(0, p.jbuf - 1);
    p.coyote = p.ground ? 6 : Math.max(0, p.coyote - 1);
    let jumpV = (6.4 + Math.abs(p.vx) * .3) * (this.badge === 'jump' ? 1.18 : 1) * (wt === 'lowgrav' ? .72 : 1);
    if (p.jbuf > 0 && p.coyote > 0 && !p.crouch) {
      p.vy = -jumpV; p.ground = false; p.coyote = 0; p.jbuf = 0; this.audio.sfx('jump');
      this.burst(p.x + p.w / 2, p.y + p.h, 3, '#fff', 1, .05);
    } else if (p.jbuf > 0 && this.badge === 'wall' && !p.ground && p.wall !== 0 && p.vy > 0) {
      p.vy = -jumpV * .95; p.vx = -p.wall * 2.6; p.dir = -p.wall; p.jbuf = 0; this.audio.sfx('jump');
      this.burst(p.x + (p.wall > 0 ? p.w : 0), p.y + p.h / 2, 5, '#fff', 1.5, .05);
    }
    let grav = gravBase;
    if (p.vy < 0 && inp.jump) grav *= .5;
    p.vy += grav;
    p.glide = false;
    if (!p.ground && p.vy > 0) {
      if (this.badge === 'wall' && p.wall !== 0 && ((p.wall > 0 && inp.right) || (p.wall < 0 && inp.left))) p.vy = Math.min(p.vy, 1.2);
      else if (this.badge === 'glide' && inp.jump) { p.vy = Math.min(p.vy, .9); p.glide = true; }
    }
    p.vy = Math.min(p.vy, wt === 'lowgrav' ? 3 : 7);

    // ---- 移動と衝突 ----
    p.prevBottom = p.y + p.h;
    p.x += p.vx; this.collideX(p);
    if (p.hitWall && ((p.hitWall > 0 && inp.right) || (p.hitWall < 0 && inp.left))) p.wall = p.hitWall; else p.wall = 0;
    p.y += p.vy; p.headBump = null; this.collideY(p, p.prevBottom);
    if (p.headBump) { this.bumpBlock(p.headBump.cx, p.headBump.cy, p.form !== 'small'); }
    if (p.x < 0) p.x = 0;
    if (p.y > ROWS * T + 8) return this.die();
    this.unembed(p);

    // ---- アタック（ゾウ）／あわ ----
    if (p.attack > 0) p.attack--;
    if (p.bubbleCd > 0) p.bubbleCd--;
    if (inp.runHit && p.form === 'trunk' && p.attack === 0 && !p.crouch) { p.attack = 14; this.audio.sfx('trunk'); }
    if (p.attack > 6) {
      const hb = { x: p.dir > 0 ? p.x + p.w : p.x - 14, y: p.y + 2, w: 14, h: 14 };
      const cx = Math.floor((hb.x + 7) / T);
      for (let cy = Math.floor(hb.y / T); cy <= Math.floor((hb.y + hb.h - 1) / T); cy++) {
        const c = this.tile(cx, cy);
        if (c === '=' || c === '?' || c === 'P') { this.bumpBlock(cx, cy, true); }
      }
      for (const e of this.enemies) if (!e.dead && overlap(hb, e)) this.killEnemy(e, true);
    }
    if (inp.runHit && p.form === 'bubble' && p.bubbleCd === 0 && !p.crouch) {
      this.bubbles.push({ x: p.x + (p.dir > 0 ? p.w : -12), y: p.y + 4, w: 12, h: 12, vx: p.dir * 1.4, dir: p.dir, life: 110, t: 0 });
      p.bubbleCd = 22; this.audio.sfx('bubble');
    }

    // ---- タイル上のアイテム ----
    const [l, r] = this.span(p.x, p.w), [tp, bt] = this.span(p.y, p.h);
    for (let cy = tp; cy <= bt; cy++) for (let cx = l; cx <= r; cx++) {
      const c = this.tile(cx, cy);
      if (c === 'c') { this.tiles[cy][cx] = '.'; this.addCoin(1, cx * T, cy * T); this.audio.sfx('coin'); this.burst(cx * T + 8, cy * T + 8, 4, '#ffd54f', 1.5, .1); }
      else if (c === 'F') { this.tiles[cy][cx] = '.'; this.flowerCoins.push(cx); this.addCoin(10, cx * T, cy * T); this.audio.sfx('fcoin'); this.popup(cx * T - 8, cy * T - 10, 'フラワーコイン!', '#e9b6ff'); this.burst(cx * T + 8, cy * T + 8, 12, '#ce93d8', 2, .05); }
      else if (c === '*') { this.tiles[cy][cx] = '.'; this.startWonder(); }
      else if (c === '@' && this.wonder.active) { this.tiles[cy][cx] = '.'; this.endWonder(); }
      else if (c === '^' && p.y + p.h > cy * T + 6) this.hurt();
    }

    // ---- 敵 ----
    for (const e of this.enemies) this.updateEnemy(e);
    this.enemies = this.enemies.filter(e => !(e.dead && e.deadT > 40) && e.y < ROWS * T + 40);
    // ---- アイテム ----
    for (const it of this.items) this.updateItem(it);
    this.items = this.items.filter(it => !it.taken && it.y < ROWS * T + 40);
    // ---- あわ ----
    for (const b of this.bubbles) this.updateBubble(b);
    this.bubbles = this.bubbles.filter(b => b.life > 0);
    // ---- コインの雨（ゆらゆらワンダー） ----
    if (wt === 'wobble' && this.frame % 14 === 0) this.rain.push({ x: this.camX + rnd(0, W), y: -16, vy: 0, w: 12, h: 12, life: 400 });
    for (const c of this.rain) {
      c.vy = Math.min(c.vy + .12, 2.5); c.y += c.vy; c.life--;
      const cx = Math.floor((c.x + 6) / T), cy = Math.floor((c.y + 12) / T);
      if (this.solid(cx, cy) || this.semi(cx, cy)) { c.y = cy * T - 12; c.vy = 0; }
      if (overlap(c, p)) { c.life = 0; this.addCoin(1, c.x, c.y); this.audio.sfx('coin'); }
    }
    this.rain = this.rain.filter(c => c.life > 0 && c.y < ROWS * T);
    if (!this.wonder.active) this.rain = [];
    if (p.inv > 0) p.inv--;
    p.anim += Math.abs(p.vx) * .25 + (p.ground ? 0 : 0);

    // ---- おしゃべりフラワー ----
    for (const tk of this.level.talkers) {
      const d = Math.abs(p.x + p.w / 2 - (tk.x * T + 8));
      if (d < 30 && !this.talked.has(tk)) { this.talked.add(tk); this.talk = { tk, life: 210 }; this.audio.sfx('talk'); }
    }
    if (this.talk && --this.talk.life <= 0) this.talk = null;

    // ---- ゴール ----
    if (p.x + p.w > this.goalX - 2 && p.x < this.goalX + 4 && p.y + p.h > 3 * T) {
      this.state = 'clear'; this.stateT = 0; this.clearPhase = 'slide'; p.x = this.goalX - p.w + 1; p.vx = 0; p.vy = 0;
      const bonus = Math.max(1, Math.floor(((this.level.goal.y + 1) * T - (p.y + p.h)) / T)) * 2;
      this.clearBonus = bonus; this.audio.stop(); this.audio.sfx('pole');
      this.popup(p.x - 6, p.y - 12, `+${bonus}`, '#ffd54f');
    }

    // ---- カメラ ----
    const target = p.x + p.w / 2 - W / 2 + p.dir * 24;
    this.camX += (target - this.camX) * .12;
    this.camX = Math.max(0, Math.min(this.level.width * T - W, this.camX));
  }

  unembed(e) {
    for (let k = 0; k < 3 * T; k++) {
      const [l, r] = this.span(e.x, e.w), [tp, bt] = this.span(e.y, e.h);
      let inside = false;
      for (let cy = tp; cy <= bt && !inside; cy++) for (let cx = l; cx <= r; cx++) if (this.solid(cx, cy)) { inside = true; break; }
      if (!inside) return;
      e.y -= 1; e.vy = Math.min(e.vy, 0);
      if (k === 3 * T - 1) this.hurt();
    }
  }

  updateEnemy(e) {
    const p = this.p;
    if (e.dead) { e.deadT++; if (e.dead === 2) { e.vy += .3; e.x += e.vx; e.y += e.vy; } return; }
    if (e.x < this.camX - 120 || e.x > this.camX + W + 120) return; // 画面外は動かない
    e.t++;
    if (e.kind === 'b') {
      e.x += e.vx; this.collideX(e); if (e.hitWall) { e.vx = -e.hitWall * 1; e.dir = -e.hitWall; }
      e.y = e.baseY + Math.sin(e.t / 30) * 20;
      if (Math.abs(e.x - (p.x)) > 260) { e.vx = Math.sign(p.x - e.x) * 1 || e.vx; e.dir = Math.sign(e.vx); }
    } else {
      const prevBottom = e.y + e.h;
      e.vy = Math.min(e.vy + .35, 6);
      e.x += e.vx; this.collideX(e);
      if (e.hitWall) { e.vx = -e.hitWall * Math.abs(e.kind === 's' ? .8 : .6); e.dir = -e.hitWall; }
      e.y += e.vy; this.collideY(e, prevBottom);
      if (e.vx === 0) { e.vx = e.dir * (e.kind === 's' ? .8 : .6); }
    }
    // プレイヤーとの当たり
    if (this.state !== 'play' || !overlap(e, p)) return;
    const stomp = p.vy > 0 && p.prevBottom <= e.y + 6;
    if (stomp && e.kind !== 's') {
      this.killEnemy(e); p.vy = this.input.jump ? -7.5 : -5; p.y = e.y - p.h;
      this.burst(e.x + 7, e.y + 7, 6, '#fff', 1.5, .1);
    } else if (stomp && e.kind === 's' && (p.form === 'trunk')) {
      this.killEnemy(e, true); p.vy = -6;
    } else this.hurt();
  }

  updateItem(it) {
    const p = this.p;
    if (it.rise > 0) { it.rise--; it.y -= 16 / 24; return; }
    if (it.kind !== 'bflower') {
      const prevBottom = it.y + it.h;
      if (it.vx === 0 && it.vy === 0) it.vx = .8;
      it.vy = Math.min(it.vy + .3, 6);
      it.x += it.vx; this.collideX(it); if (it.hitWall) it.vx = -it.hitWall * .8;
      it.y += it.vy; this.collideY(it, prevBottom);
      if (it.vx === 0) it.vx = .8;
    }
    if (overlap(it, p)) {
      it.taken = true; this.audio.sfx('power');
      const form = it.kind === 'berry' ? 'big' : it.kind === 'fruit' ? 'trunk' : 'bubble';
      if (!(form === 'big' && p.form !== 'small')) this.setForm(form);
      this.popup(p.x - 16, p.y - 14, FORM_NAME[form], '#ffe082');
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 12, '#ffe082', 2, 0);
      p.inv = Math.max(p.inv, 20);
    }
  }

  updateBubble(b) {
    const p = this.p;
    b.t++; b.life--;
    b.x += b.vx * (b.t < 30 ? 1 : .4); b.y += Math.sin(b.t / 8) * .6 - .15;
    const cx = Math.floor((b.x + 6) / T), cy = Math.floor((b.y + 6) / T);
    if (this.solid(cx, cy)) { b.life = 0; }
    for (const e of this.enemies) if (!e.dead && overlap(b, e)) { this.killEnemy(e, true); b.life = 0; this.burst(b.x + 6, b.y + 6, 8, '#bff', 1.5, 0); }
    if (b.life > 0 && b.t > 8 && p.vy > 0 && overlap(b, p) && p.prevBottom <= b.y + 6) { b.life = 0; p.vy = -6.5; this.audio.sfx('jump'); }
    if (b.life === 0) { this.audio.sfx('pop'); this.burst(b.x + 6, b.y + 6, 6, '#bff', 1.2, 0); }
  }

  updateFx() {
    for (const pt of this.particles) { pt.vy += pt.grav; pt.x += pt.vx; pt.y += pt.vy; pt.life--; }
    this.particles = this.particles.filter(pt => pt.life > 0);
    for (const pp of this.popups) { pp.y -= .4; pp.life--; }
    this.popups = this.popups.filter(pp => pp.life > 0);
  }

  updateClear() {
    const p = this.p;
    const groundY = (this.level.goal.y + 1) * T;
    if (this.clearPhase === 'slide') {
      p.y = Math.min(p.y + 2, groundY - p.h);
      if (p.y >= groundY - p.h) { this.clearPhase = 'walk'; this.addCoin(this.clearBonus, p.x, p.y); this.audio.play('clear'); }
    } else if (this.clearPhase === 'walk') {
      p.x += 1.1; p.dir = 1; p.anim += .3; p.ground = true;
      this.camX = Math.max(0, Math.min(this.level.width * T - W, this.camX + 1.1));
      if (this.stateT > 200) { this.clearPhase = 'done'; this.onEvent('clear'); }
    }
  }

  // ---------- 描画 ----------
  draw() {
    const ctx = this.ctx, th = this.theme, wt = this.wonderType();
    ctx.imageSmoothingEnabled = false;
    this.drawBackground(ctx, th, wt);
    const cam = Math.floor(this.camX);
    ctx.save(); ctx.translate(-cam, 0);
    this.drawTiles(ctx, cam, wt);
    for (const tk of this.level.talkers) this.drawTalker(ctx, tk);
    for (const it of this.items) this.drawItem(ctx, it);
    for (const c of this.rain) ctx.drawImage(this.sp.coin, 2, 2, 12, 12, c.x, c.y + this.wob(c.x), 12, 12);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    this.drawGoal(ctx);
    this.drawPlayer(ctx);
    for (const b of this.bubbles) this.drawBubble(ctx, b);
    for (const pt of this.particles) {
      const oy = this.wob(pt.x);
      if (pt.coin) ctx.drawImage(this.sp.coin, 4, 2, 8, 12, pt.x, pt.y + oy, 8, 12);
      else { ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y + oy, pt.size, pt.size); }
    }
    ctx.font = 'bold 8px sans-serif';
    for (const pp of this.popups) this.text(ctx, pp.text, pp.x, pp.y, pp.color, 'left');
    if (this.talk) this.drawTalkBubble(ctx, this.talk.tk);
    ctx.restore();
    if (wt === 'dark') this.drawDark(ctx, cam);
    if (wt) this.drawWonderFrame(ctx);
    this.drawHud(ctx);
  }
  wob(x) { return this.wonderType() === 'wobble' ? Math.sin(this.wonder.t / 9 + x / T * .45) * 4 : 0; }
  text(ctx, s, x, y, color = '#fff', align = 'left') {
    ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillStyle = '#1b1b2f'; ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }

  drawBackground(ctx, th, wt) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, wt === 'lowgrav' ? '#0d0d33' : th.sky[0]); g.addColorStop(1, wt === 'lowgrav' ? '#3a3a7a' : th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (wt === 'wobble') { ctx.fillStyle = `hsla(${(this.wonder.t * 2) % 360},80%,60%,.25)`; ctx.fillRect(0, 0, W, H); }
    if (wt === 'lowgrav' || this.level.theme === 'cave') {
      ctx.fillStyle = '#fff';
      for (const s of this.stars) { const tw = (Math.sin(this.frame / 20 + s.x) + 1) / 2; ctx.globalAlpha = .3 + tw * .7; ctx.fillRect((s.x - this.camX * .05 + W * 10) % W, s.y, s.s > 2 ? 2 : 1, s.s > 2 ? 2 : 1); }
      ctx.globalAlpha = 1;
    }
    if (this.level.theme === 'sunset') { ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(320 - this.camX * .02, 60, 26, 0, Math.PI * 2); ctx.fill(); }
    // 雲
    ctx.fillStyle = th.cloud;
    for (let i = 0; i < 7; i++) {
      const x = ((i * 173 + 40) - this.camX * .25) % (W + 120) + (this.level.width * T) % 7; const cx = ((x % (W + 120)) + W + 120) % (W + 120) - 60; const y = 22 + (i * 37) % 70;
      ctx.beginPath(); ctx.arc(cx, y, 10, 0, 7); ctx.arc(cx + 12, y - 5, 12, 0, 7); ctx.arc(cx + 26, y, 10, 0, 7); ctx.fill();
      ctx.fillRect(cx - 6, y, 40, 8);
    }
    // 丘
    for (const [col, par, hh] of [[th.hill2, .4, 70], [th.hill, .6, 45]]) {
      ctx.fillStyle = col;
      for (let i = -1; i < 6; i++) {
        const bx = ((i * 140 - this.camX * par) % 840 + 840) % 840 - 140;
        ctx.beginPath(); ctx.moveTo(bx, H); ctx.quadraticCurveTo(bx + 70, H - hh * 2, bx + 140, H); ctx.fill();
      }
    }
    if (this.level.theme === 'cave') { ctx.fillStyle = '#101020'; for (let i = 0; i < 12; i++) { const bx = ((i * 71 - this.camX * .5) % 500 + 500) % 500 - 50; ctx.beginPath(); ctx.moveTo(bx, 16); ctx.lineTo(bx + 8, 16 + 24 + (i % 3) * 10); ctx.lineTo(bx + 16, 16); ctx.fill(); } }
  }

  drawTiles(ctx, cam, wt) {
    const th = this.theme, sp = this.sp;
    const cx0 = Math.max(0, Math.floor(cam / T) - 1), cx1 = Math.min(this.level.width - 1, Math.floor((cam + W) / T) + 1);
    const wobble = wt === 'wobble';
    for (let cx = cx0; cx <= cx1; cx++) {
      const oy = wobble ? this.wob(cx * T) : 0;
      const pc = this.pipeCol[cx];
      const ext = pc ? this.pipeExt(pc.idx) : 0;
      for (let cy = 0; cy < ROWS; cy++) {
        const c = this.tiles[cy][cx];
        let x = cx * T, y = cy * T + oy;
        const bump = this.bumps.get(`${cx},${cy}`);
        if (bump !== undefined) y -= Math.sin(bump / 14 * Math.PI) * 5;
        switch (c) {
          case '#': {
            ctx.fillStyle = th.ground; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = th.groundDark; ctx.fillRect(x + ((cx * 7 + cy * 3) % 10), y + 6 + (cx * 3 + cy) % 7, 3, 2); ctx.fillRect(x + 12 - (cx * 5) % 8, y + 12, 2, 2);
            if (!SOLID.has(this.tile(cx, cy - 1))) { ctx.fillStyle = th.top; ctx.fillRect(x, y, T, 4); ctx.fillStyle = th.groundDark; ctx.fillRect(x, y + 4, T, 1); }
            if (this.tile(cx - 1, cy) !== '#') { ctx.fillStyle = th.groundDark; ctx.fillRect(x, y, 1, T); }
            if (this.tile(cx + 1, cy) !== '#') { ctx.fillStyle = th.groundDark; ctx.fillRect(x + T - 1, y, 1, T); }
            break;
          }
          case '=': {
            ctx.fillStyle = '#c9764a'; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = '#7a3e22'; ctx.fillRect(x, y + 7, T, 1); ctx.fillRect(x, y + 15, T, 1); ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 7); ctx.fillRect(x + 11, y + 8, 1, 7);
            ctx.fillStyle = '#e59a6e'; ctx.fillRect(x, y, T, 1);
            break;
          }
          case '?': case 'P': {
            ctx.fillStyle = '#f4a300'; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = '#ffd54f'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
            ctx.fillStyle = '#7a3e22'; [[1, 1], [13, 1], [1, 13], [13, 13]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 2, 2));
            ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillStyle = '#7a3e22'; ctx.fillText('?', x + 8, y + 2);
            if ((this.frame >> 3) % 4 === 0) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 3, y + 3, 3, 3); }
            break;
          }
          case 'U': { ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x, y, T, T); ctx.fillStyle = '#5d3a1a'; ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y, 1, T); [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 2, 2)); break; }
          case 'T': case '|': {
            const isTop = c === 'T';
            const leftHalf = this.tile(cx + 1, cy) === c && this.tile(cx - 1, cy) !== c;
            const yy = isTop ? y - ext * T : y;
            if (isTop && ext > 0) this.drawPipeBody(ctx, x, y - ext * T + T, ext * T, leftHalf);
            this.drawPipeBody(ctx, x, yy, T, leftHalf, isTop);
            if (isTop && wt === 'pipes') { // 目
              const ex = leftHalf ? x + 9 : x + 3;
              ctx.fillStyle = '#fff'; ctx.fillRect(ex, yy + 6, 5, 6); ctx.fillStyle = '#1b1b2f'; ctx.fillRect(ex + (leftHalf ? 2 : 1), yy + 8 + Math.round(Math.sin(this.wonder.t / 20) * 1), 2, 3);
            }
            break;
          }
          case '-': { ctx.fillStyle = '#d7a86e'; ctx.fillRect(x, y, T, 5); ctx.fillStyle = '#8d5524'; ctx.fillRect(x, y + 4, T, 1); ctx.fillRect(x + 4, y + 1, 1, 3); ctx.fillRect(x + 11, y + 1, 1, 3); break; }
          case '^': { ctx.fillStyle = '#cfd8dc'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5 + 1, y + T); ctx.lineTo(x + i * 5 + 3, y + 2); ctx.lineTo(x + i * 5 + 5, y + T); ctx.fill(); } ctx.fillStyle = '#607d8b'; ctx.fillRect(x, y + 14, T, 2); break; }
          case 'x': {
            if (!this.wonder.active) break;
            const a = Math.min(1, this.wonder.t / 25);
            ctx.globalAlpha = a; ctx.fillStyle = `hsl(${(this.wonder.t * 3 + cx * 20) % 360},85%,65%)`; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, y, T, 2); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + T - 2, T, 2); ctx.globalAlpha = 1;
            break;
          }
          case 'c': { const f = (this.frame >> 3) % 4; if (f === 2) ctx.drawImage(sp.coinThin, x, y); else ctx.drawImage(sp.coin, x, y); break; }
          case 'F': { const b = Math.sin(this.frame / 12 + cx) * 2; ctx.drawImage(sp.fcoin, x, y + b); if (wt === 'dark') this.glow(ctx, x + 8, y + 8 + b, 14, 'rgba(206,147,216,.4)'); break; }
          case '*': this.drawWonderFlower(ctx, x, y); break;
          case '@': if (this.wonder.active) { const b = Math.sin(this.frame / 10) * 3; this.glow(ctx, x + 8, y + 8 + b, 16, 'rgba(255,255,255,.35)'); ctx.drawImage(sp.seed, x, y + b); } break;
        }
      }
    }
  }
  drawPipeBody(ctx, x, y, h, leftHalf, top = false) {
    ctx.fillStyle = '#2e9e3e'; ctx.fillRect(x, y, T, h);
    ctx.fillStyle = '#8fe08a'; ctx.fillRect(x + (leftHalf ? 2 : 9), y, 3, h);
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(x + (leftHalf ? 0 : T - 1), y, 1, h);
    if (top) { ctx.fillStyle = '#2e9e3e'; ctx.fillRect(x + (leftHalf ? -1 : 0), y, T + 1, 8); ctx.fillStyle = '#1b5e20'; ctx.fillRect(x + (leftHalf ? -1 : 0), y + 7, T + 1, 1); ctx.fillRect(x + (leftHalf ? -1 : T), y, 1, 8); ctx.fillStyle = '#8fe08a'; ctx.fillRect(x + (leftHalf ? 1 : 8), y + 1, 4, 5); }
  }
  glow(ctx, x, y, r, color) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  drawWonderFlower(ctx, x, y) {
    const t = this.frame / 8;
    ctx.fillStyle = '#43a047'; ctx.fillRect(x + 7, y + 8, 2, 8); ctx.fillRect(x + 4, y + 12, 3, 2); ctx.fillRect(x + 9, y + 11, 3, 2);
    for (let i = 0; i < 6; i++) {
      const a = t / 3 + i * Math.PI / 3; ctx.fillStyle = `hsl(${(i * 60 + this.frame * 3) % 360},90%,60%)`;
      ctx.beginPath(); ctx.arc(x + 8 + Math.cos(a) * 4.5, y + 6 + Math.sin(a) * 4.5, 3, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 8, y + 6, 2.5, 0, 7); ctx.fill();
    this.glow(ctx, x + 8, y + 6, 14 + Math.sin(t) * 3, 'rgba(255,255,255,.35)');
  }
  drawTalker(ctx, tk) {
    const x = tk.x * T, y = tk.y * T + this.wob(x);
    ctx.drawImage(this.sp.talker, x, y + (this.talk?.tk === tk ? Math.sin(this.frame / 4) * 1.5 : 0));
  }
  drawTalkBubble(ctx, tk) {
    ctx.font = '9px sans-serif';
    const txt = tk.text; const w = Math.min(ctx.measureText(txt).width + 12, 220);
    let x = tk.x * T + 8 - w / 2; x = Math.max(this.camX + 4, Math.min(this.camX + W - w - 4, x));
    const y = tk.y * T - 26;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1b2f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, 18, 5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tk.x * T + 5, y + 18); ctx.lineTo(tk.x * T + 11, y + 18); ctx.lineTo(tk.x * T + 8, y + 23); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1b2f'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(txt, x + 6, y + 4, w - 12);
  }
  drawItem(ctx, it) {
    const img = it.kind === 'berry' ? this.sp.berry : it.kind === 'fruit' ? this.sp.fruit : this.sp.bflower;
    const y = it.y + this.wob(it.x);
    if (it.rise > 0) { ctx.save(); ctx.beginPath(); ctx.rect(it.x - 2, 0, 20, it.blockY); ctx.clip(); }
    ctx.drawImage(img, it.x - 1, y);
    if (it.rise > 0) ctx.restore();
  }
  drawEnemy(ctx, e) {
    const set = e.kind === 'e' ? this.sp.walker : e.kind === 's' ? this.sp.spiky : this.sp.flyer;
    let img = set[(e.t >> 3) % 2 ? 'b' : 'a'];
    const y = e.y - 2 + this.wob(e.x);
    ctx.save(); ctx.translate(e.x - 1 + 8, y + 8);
    if (e.dead === 1) { img = set.flat ?? img; }
    if (e.dead === 2) ctx.scale(1, -1);
    if (e.dir > 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -8, -8); ctx.restore();
  }
  drawBubble(ctx, b) {
    const x = b.x + 6, y = b.y + 6;
    ctx.strokeStyle = 'rgba(180,240,255,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(180,240,255,.25)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 4, 2, 2);
  }
  drawGoal(ctx) {
    const g = this.level.goal, x = g.x * T + 7, top = 3 * T, bottom = (g.y + 1) * T;
    ctx.fillStyle = '#2e7d32'; ctx.fillRect(x - 5, bottom - 6, 12, 6);
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x, top, 2, bottom - top - 6);
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(x + 1, top - 3, 4, 0, 7); ctx.fill();
    const fy = this.state === 'clear' ? Math.min(bottom - 30, top + 6 + this.stateT * 2) : top + 6;
    ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(x + 2, fy); ctx.lineTo(x + 18, fy + 7); ctx.lineTo(x + 2, fy + 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 8, fy + 7, 2.5, 0, 7); ctx.fill();
  }
  drawPlayer(ctx) {
    const p = this.p;
    if (p.inv > 0 && (p.inv >> 2) % 2 === 0 && this.state === 'play') return;
    const set = this.sp.hero[p.form];
    let frame = 'idle';
    if (this.state === 'dead') frame = 'jump';
    else if (p.crouch && set.crouch) frame = 'crouch';
    else if (p.attack > 0 && set.attack) frame = 'attack';
    else if (!p.ground) frame = 'jump';
    else if (Math.abs(p.vx) > .2) frame = (Math.floor(p.anim) % 2) ? 'walk' : 'idle';
    const img = set[frame];
    const x = Math.round(p.x + p.w / 2 - 8), y = Math.round(p.y + p.h - img.height + (p.crouch ? (img.height - 14 - 8) : 0)) + this.wob(p.x);
    ctx.save(); ctx.translate(x + 8, y);
    if (p.dir < 0) ctx.scale(-1, 1);
    if (this.state === 'dead') ctx.scale(1, -1), ctx.translate(0, -img.height);
    ctx.drawImage(img, -8, 0);
    if (p.glide) { ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.arc(0, -6, 10, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-3, 4); ctx.moveTo(9, -6); ctx.lineTo(3, 4); ctx.stroke(); }
    ctx.restore();
    if (p.wall !== 0 && this.badge === 'wall' && !p.ground) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(p.x + (p.wall > 0 ? p.w : -2), p.y + p.h - 4 + (this.frame % 6), 2, 2); }
  }
  drawDark(ctx, cam) {
    const d = this.dark.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.fillStyle = 'rgba(2,2,12,.94)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.6, `rgba(0,0,0,${a * .8})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
    const p = this.p; hole(p.x + p.w / 2 - cam, p.y + p.h / 2, 58 + Math.sin(this.frame / 10) * 4);
    const cx0 = Math.floor(cam / T), cx1 = cx0 + W / T + 1;
    for (let cy = 0; cy < ROWS; cy++) for (let cx = cx0; cx <= cx1; cx++) { const c = this.tile(cx, cy); if (c === 'c' || c === 'F' || c === '@' || c === '?' || c === 'P') hole(cx * T + 8 - cam, cy * T + 8, c === '@' ? 40 : 18, .8); }
    for (const tk of this.level.talkers) hole(tk.x * T + 8 - cam, tk.y * T + 8, 22, .7);
    hole(this.goalX - cam, 8 * T, 40, .8);
    ctx.drawImage(this.dark, 0, 0);
  }
  drawWonderFrame(ctx) {
    const t = this.wonder.t;
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = `hsla(${(t * 4) % 360},90%,65%,.8)`; ctx.strokeRect(1.5, 1.5, W - 3, H - 3); ctx.restore();
    if (t < 150) {
      const a = t < 20 ? t / 20 : t > 120 ? (150 - t) / 30 : 1;
      ctx.globalAlpha = a; ctx.font = 'bold 20px sans-serif';
      this.text(ctx, this.level.wonder.label, W / 2 + Math.sin(t / 5) * 2, 60, `hsl(${(t * 6) % 360},90%,70%)`, 'center');
      ctx.globalAlpha = 1;
    }
  }
  drawHud(ctx) {
    ctx.font = 'bold 10px sans-serif';
    ctx.drawImage(this.sp.coin, 4, 2, 8, 12, 8, 5, 8, 12); this.text(ctx, `×${String(this.coins).padStart(2, '0')}`, 20, 6);
    this.text(ctx, `♥ ×${this.lives}`, 60, 6, '#ff8a80');
    ctx.drawImage(this.sp.fcoin, 0, 0, 16, 16, 100, 4, 12, 12);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < this.flowerCoins.length ? '#ce93d8' : 'rgba(255,255,255,.35)'; ctx.fillRect(114 + i * 8, 8, 6, 6); }
    this.text(ctx, `TIME ${String(Math.max(0, this.time)).padStart(3, '0')}`, W - 8, 6, this.time <= 50 && (this.frame >> 4) % 2 ? '#ff5252' : '#fff', 'right');
    if (this.wonder.done) this.text(ctx, '❀ シード', W / 2, 6, '#a5d6a7', 'center');
    if (this.introT > 0) {
      ctx.globalAlpha = Math.min(1, this.introT / 30); ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 100, 96, 200, 40);
      this.text(ctx, `WORLD 1-${this.level.id.slice(-1)}`, W / 2, 100, '#ffd54f', 'center'); this.text(ctx, this.level.name, W / 2, 118, '#fff', 'center'); ctx.globalAlpha = 1;
    }
    if (this.state === 'clear' && this.clearPhase !== 'slide') {
      ctx.font = 'bold 18px sans-serif'; this.text(ctx, 'コース クリア！', W / 2, 90, '#ffd54f', 'center');
    }
  }
}
