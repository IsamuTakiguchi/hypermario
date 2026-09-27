// ゲーム本体：1コース分の状態、物理、敵・アイテム、ワンダー効果、描画
import { TILE as T, ROWS, SOLID, parseLevel } from './levels.js';
import * as A from './art.js';

export const W = 400, H = 240;

const THEMES = {
  grass: { sky: ['#3d8ff2', '#8ed0ff', '#dff4ff'], far: ['#9fd0f5', '#79b6e6'], hill: ['#7ad36a', '#3f9a3a'], hill2: ['#a8e69a', '#5cb84c'], bush: ['#8be07a', '#3f9a3a'], ground: '#c98a4d', groundDark: '#8a5228', top: '#7fd65f', topLight: '#b6f29c', topDark: '#3f9a3a', cloud: '#ffffff', sun: '#fff7c2' },
  sky: { sky: ['#2f7fe6', '#7cc4ff', '#eaf7ff'], far: ['#e3f3ff', '#b5dcf8'], hill: ['#dff1ff', '#9fcbef'], hill2: ['#ffffff', '#c9e6fb'], bush: ['#a5e6ff', '#5fb8e8'], ground: '#d1a26a', groundDark: '#9a7040', top: '#8fdc7a', topLight: '#c9f5b5', topDark: '#4aa843', cloud: '#ffffff', sun: '#fff7c2' },
  cave: { sky: ['#0d0d1f', '#1f1f3d', '#2f2a52'], far: ['#2a2a4a', '#1c1c34'], hill: ['#3b3560', '#241f3f'], hill2: ['#4a4472', '#2d2850'], bush: ['#4f4a7a', '#2d2850'], ground: '#6e5c86', groundDark: '#3c3048', top: '#9c8ab8', topLight: '#c6b6e0', topDark: '#5c4c7a', cloud: '#3a3a5a', sun: '#fff7c2' },
  sunset: { sky: ['#ff6f4d', '#ffab5e', '#ffe29a'], far: ['#f0a0b8', '#c86f95'], hill: ['#d97aa6', '#8c3f74'], hill2: ['#f2a0c4', '#b05a8e'], bush: ['#e88fb4', '#8c3f74'], ground: '#b57a45', groundDark: '#6e4626', top: '#f0c05a', topLight: '#ffe6a0', topDark: '#c58a2a', cloud: '#ffe6d5', sun: '#fff3b0' },
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
    this.res = 1; // 実解像度の倍率（main.js が設定）
    this.dark = document.createElement('canvas');
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
    ctx.imageSmoothingEnabled = true;
    ctx.lineJoin = 'round';
    this.drawBackground(ctx, th, wt);
    const cam = this.camX;
    ctx.save(); ctx.translate(-cam, 0);
    this.drawTiles(ctx, cam, wt);
    for (const tk of this.level.talkers) this.drawTalker(ctx, tk);
    this.drawGoal(ctx);
    for (const it of this.items) this.drawItem(ctx, it);
    for (const c of this.rain) A.drawCoin(ctx, c.x + 6, c.y + 6 + this.wob(c.x), this.frame / 6 + c.x, 5);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    this.drawPlayer(ctx);
    for (const b of this.bubbles) A.drawBubble(ctx, b.x + 6, b.y + 6, 6 + Math.sin(b.t / 4) * .4);
    for (const pt of this.particles) {
      const oy = this.wob(pt.x);
      if (pt.coin) A.drawCoin(ctx, pt.x + 4, pt.y + 6 + oy, this.frame / 4, 5);
      else { ctx.globalAlpha = Math.min(1, pt.life / 12); A.ell(ctx, pt.x, pt.y + oy, pt.size * .7, pt.size * .7, pt.color); ctx.globalAlpha = 1; }
    }
    ctx.font = 'bold 8px system-ui, sans-serif';
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
    ctx.fillStyle = 'rgba(20,10,40,.55)'; ctx.fillText(s, x + .8, y + 1);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  // 足元の影：地面（または足場）まで下ろして描く
  groundShadow(ctx, x, bottom, w, alpha = .3) {
    let cy = Math.floor(bottom / T), cx = Math.floor(x / T), found = -1;
    for (let k = 0; k < 8 && cy + k < ROWS; k++) if (this.solid(cx, cy + k) || this.semi(cx, cy + k)) { found = (cy + k) * T; break; }
    if (found < 0) return;
    const dist = Math.max(0, found - bottom), sc = Math.max(.35, 1 - dist / 90);
    A.shadow(ctx, x, found + this.wob(x) + .5, w * sc, alpha * sc);
  }

  drawBackground(ctx, th, wt) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const sky = wt === 'lowgrav' ? ['#0a0a2e', '#28286e', '#5a5aa8'] : th.sky;
    g.addColorStop(0, sky[0]); g.addColorStop(.6, sky[1]); g.addColorStop(1, sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (wt === 'wobble') { ctx.fillStyle = `hsla(${(this.wonder.t * 2) % 360},80%,60%,.22)`; ctx.fillRect(0, 0, W, H); }
    if (wt === 'lowgrav' || this.level.theme === 'cave') {
      for (const s of this.stars) { const tw = (Math.sin(this.frame / 20 + s.x) + 1) / 2; ctx.globalAlpha = .3 + tw * .7; A.ell(ctx, ((s.x - this.camX * .05) % W + W) % W, s.y, s.s * .4, s.s * .4, '#fff'); }
      ctx.globalAlpha = 1;
    }
    if (this.level.theme !== 'cave') { // 太陽
      const sx = 330 - this.camX * .02, sy = this.level.theme === 'sunset' ? 120 : 48;
      A.glow(ctx, sx, sy, this.level.theme === 'sunset' ? 90 : 60, 'rgba(255,240,180,.45)');
      A.ell(ctx, sx, sy, this.level.theme === 'sunset' ? 26 : 16, this.level.theme === 'sunset' ? 26 : 16, th.sun);
    }
    // 遠景の山
    for (let i = -1; i < 5; i++) { const bx = ((i * 220 - this.camX * .15) % 1100 + 1100) % 1100 - 220; A.drawHill(ctx, bx, H - 40, 300, 120, th.far[0], th.far[1]); }
    // 雲
    for (let i = 0; i < 7; i++) {
      const cx = (((i * 173 + 40) - this.camX * .25) % (W + 160) + W + 160) % (W + 160) - 80, y = 26 + (i * 37) % 70;
      A.drawCloud(ctx, cx, y, .7 + (i % 3) * .2, th.cloud);
    }
    // 丘（中景・近景）
    for (let i = -1; i < 6; i++) { const bx = ((i * 180 - this.camX * .4) % 900 + 900) % 900 - 180; A.drawHill(ctx, bx, H - 20, 220, 85, th.hill2[0], th.hill2[1]); }
    for (let i = -1; i < 6; i++) { const bx = ((i * 150 + 60 - this.camX * .6) % 750 + 750) % 750 - 150; A.drawHill(ctx, bx, H - 12, 170, 55, th.hill[0], th.hill[1]); }
    for (let i = 0; i < 8; i++) { const bx = ((i * 97 + 30 - this.camX * .8) % 800 + 800) % 800 - 100; A.drawBush(ctx, bx, H - 24, .9 + (i % 2) * .4, th.bush[0], th.bush[1]); }
    if (this.level.theme === 'cave') { // つらら
      for (let i = 0; i < 12; i++) {
        const bx = ((i * 71 - this.camX * .5) % 500 + 500) % 500 - 50, len = 24 + (i % 3) * 10;
        ctx.fillStyle = A.vgrad(ctx, 16, 16 + len, [[0, '#3a3560'], [1, '#14122a']]);
        ctx.beginPath(); ctx.moveTo(bx, 16); ctx.quadraticCurveTo(bx + 8, 16 + len * .6, bx + 8, 16 + len); ctx.quadraticCurveTo(bx + 8, 16 + len * .6, bx + 16, 16); ctx.fill();
      }
    }
  }

  drawTiles(ctx, cam, wt) {
    const th = this.theme;
    const cx0 = Math.max(0, Math.floor(cam / T) - 1), cx1 = Math.min(this.level.width - 1, Math.floor((cam + W) / T) + 1);
    const wobble = wt === 'wobble';
    for (let cx = cx0; cx <= cx1; cx++) {
      const oy = wobble ? this.wob(cx * T) : 0;
      const pc = this.pipeCol[cx];
      const ext = pc ? this.pipeExt(pc.idx) : 0;
      for (let cy = 0; cy < ROWS; cy++) {
        const c = this.tiles[cy][cx];
        if (c === '.') continue;
        let x = cx * T, y = cy * T + oy;
        const bump = this.bumps.get(`${cx},${cy}`);
        if (bump !== undefined) y -= Math.sin(bump / 14 * Math.PI) * 5;
        switch (c) {
          case '#': A.drawGround(ctx, x, y, T, th, { up: this.tile(cx, cy - 1) === '#', left: this.tile(cx - 1, cy) === '#', right: this.tile(cx + 1, cy) === '#' }); break;
          case '=': A.drawBrick(ctx, x, y, T); break;
          case '?': case 'P': A.drawQBlock(ctx, x, y, T, this.frame + cx * 7, false); break;
          case 'U': A.drawQBlock(ctx, x, y, T, 0, true); break;
          case 'T': {
            if (this.tile(cx - 1, cy) === 'T') break; // 2列ぶんをまとめて描く
            let h = T; while (this.tile(cx, cy + h / T) === '|') h += T;
            A.drawPipe(ctx, x, y - ext * T, T * 2, h + ext * T, true);
            if (wt === 'pipes') { // 目
              const yy = y - ext * T + 4;
              for (const ex of [x + 9, x + 23]) { A.ell(ctx, ex, yy + 6, 2.6, 3.2, '#fff', 'rgba(0,40,0,.5)', .5); A.ell(ctx, ex + .6, yy + 6.5 + Math.sin(this.wonder.t / 20), 1.2, 1.7, '#1b1b2f'); }
            }
            break;
          }
          case '|': break;
          case '-': A.drawPlank(ctx, x, y, T); break;
          case '^': A.drawSpikes(ctx, x, y, T); break;
          case 'x': if (this.wonder.active) A.drawWonderTile(ctx, x, y, T, this.wonder.t, cx, Math.min(1, this.wonder.t / 25)); break;
          case 'c': A.drawCoin(ctx, x + 8, y + 8, this.frame / 9 + cx * .7); if (wt === 'dark') A.glow(ctx, x + 8, y + 8, 10, 'rgba(255,220,120,.35)'); break;
          case 'F': A.drawFlowerCoin(ctx, x + 8, y + 8 + Math.sin(this.frame / 12 + cx) * 2, this.frame); break;
          case '*': A.drawWonderFlower(ctx, x + 8, y + 7, this.frame); break;
          case '@': if (this.wonder.active) A.drawSeed(ctx, x + 8, y + 8 + Math.sin(this.frame / 10) * 3, this.frame); break;
        }
      }
    }
  }
  drawTalker(ctx, tk) { A.drawTalker(ctx, tk.x * T + 8, tk.y * T + 7 + this.wob(tk.x * T), this.frame, this.talk?.tk === tk); }
  drawTalkBubble(ctx, tk) {
    ctx.font = '9px system-ui, sans-serif';
    const txt = tk.text; const w = Math.min(ctx.measureText(txt).width + 14, 230);
    let x = tk.x * T + 8 - w / 2; x = Math.max(this.camX + 4, Math.min(this.camX + W - w - 4, x));
    const y = tk.y * T - 28;
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.roundRect(x + 1, y + 2, w, 19, 7); ctx.fill();
    A.rr(ctx, x, y, w, 19, 7, '#fff', 'rgba(40,20,60,.35)', .8);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(tk.x * T + 4, y + 18.5); ctx.lineTo(tk.x * T + 12, y + 18.5); ctx.lineTo(tk.x * T + 8, y + 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2440'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(txt, x + 7, y + 4.5, w - 14);
  }
  drawItem(ctx, it) {
    const y = it.y + this.wob(it.x);
    if (it.rise > 0) { ctx.save(); ctx.beginPath(); ctx.rect(it.x - 6, 0, 26, it.blockY); ctx.clip(); }
    else this.groundShadow(ctx, it.x + 7, it.y + it.h, 7, .25);
    if (it.kind === 'berry') A.drawBerry(ctx, it.x + 6, y + 7);
    else if (it.kind === 'fruit') A.drawFruit(ctx, it.x + 7, y + 7);
    else A.drawBubbleFlower(ctx, it.x + 7, y + 6, this.frame);
    if (it.rise > 0) ctx.restore();
  }
  drawEnemy(ctx, e) {
    const y = e.y + e.h + this.wob(e.x);
    if (!e.dead && e.kind !== 'b') this.groundShadow(ctx, e.x + 7, e.y + e.h, 8);
    if (e.kind === 'b') this.groundShadow(ctx, e.x + 7, e.y + e.h, 7, .2);
    ctx.save(); ctx.translate(e.x + 7, y);
    if (e.dead === 2) ctx.scale(1, -1), ctx.translate(0, -14);
    if (e.dir > 0) ctx.scale(-1, 1);
    if (e.kind === 'e') A.drawWalker(ctx, e.t, e.dead);
    else if (e.kind === 's') A.drawSpiky(ctx, e.t, e.dead);
    else A.drawFlyer(ctx, e.t);
    ctx.restore();
  }
  drawGoal(ctx) {
    const g = this.level.goal, x = g.x * T + 7, top = 3 * T, bottom = (g.y + 1) * T;
    const fy = this.state === 'clear' ? Math.min(bottom - 30, top + 6 + this.stateT * 2) : top + 6 + Math.sin(this.frame / 30) * 1.5;
    A.drawGoal(ctx, x, top, bottom, fy);
  }
  drawPlayer(ctx) {
    const p = this.p;
    if (p.inv > 0 && (p.inv >> 2) % 2 === 0 && this.state === 'play') return;
    let pose = 'idle';
    if (this.state === 'dead') pose = 'jump';
    else if (p.crouch) pose = 'crouch';
    else if (p.attack > 0 && p.form === 'trunk') pose = 'attack';
    else if (!p.ground) pose = 'jump';
    else if (Math.abs(p.vx) > .2) pose = 'walk';
    if (this.state !== 'dead') this.groundShadow(ctx, p.x + p.w / 2, p.y + p.h, p.form === 'small' ? 6 : 8);
    ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h + this.wob(p.x));
    if (p.dir < 0) ctx.scale(-1, 1);
    if (this.state === 'dead') ctx.rotate(Math.min(Math.PI, this.stateT / 25));
    A.drawHero(ctx, { form: p.form, pose, phase: p.anim * 2.2, t: this.frame, glide: p.glide });
    ctx.restore();
    if (p.wall !== 0 && this.badge === 'wall' && !p.ground) A.ell(ctx, p.x + (p.wall > 0 ? p.w : 0), p.y + p.h - 4 + (this.frame % 6), 1.2, 1.2, 'rgba(255,255,255,.7)');
  }
  drawDark(ctx, cam) {
    const res = this.res;
    if (this.dark.width !== Math.round(W * res)) { this.dark.width = Math.round(W * res); this.dark.height = Math.round(H * res); }
    const d = this.dark.getContext('2d');
    d.setTransform(res, 0, 0, res, 0, 0);
    d.globalCompositeOperation = 'source-over'; d.fillStyle = 'rgba(2,2,14,.94)'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.6, `rgba(0,0,0,${a * .8})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
    const p = this.p; hole(p.x + p.w / 2 - cam, p.y + p.h / 2, 60 + Math.sin(this.frame / 10) * 4);
    const cx0 = Math.floor(cam / T), cx1 = cx0 + W / T + 1;
    for (let cy = 0; cy < ROWS; cy++) for (let cx = cx0; cx <= cx1; cx++) { const c = this.tile(cx, cy); if (c === 'c' || c === 'F' || c === '@' || c === '?' || c === 'P') hole(cx * T + 8 - cam, cy * T + 8, c === '@' ? 40 : 18, .8); }
    for (const tk of this.level.talkers) hole(tk.x * T + 8 - cam, tk.y * T + 8, 22, .7);
    hole(this.goalX - cam, 8 * T, 40, .8);
    ctx.drawImage(this.dark, 0, 0, this.dark.width, this.dark.height, 0, 0, W, H);
  }
  drawWonderFrame(ctx) {
    const t = this.wonder.t;
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = `hsla(${(t * 4) % 360},90%,65%,.8)`; ctx.beginPath(); ctx.roundRect(1.5, 1.5, W - 3, H - 3, 6); ctx.stroke(); ctx.restore();
    if (t < 150) {
      const a = t < 20 ? t / 20 : t > 120 ? (150 - t) / 30 : 1;
      ctx.globalAlpha = a; ctx.font = 'bold 22px system-ui, sans-serif';
      this.text(ctx, this.level.wonder.label, W / 2 + Math.sin(t / 5) * 2, 58, `hsl(${(t * 6) % 360},90%,70%)`, 'center');
      ctx.globalAlpha = 1;
    }
  }
  drawHud(ctx) {
    A.rr(ctx, 4, 3, 140, 16, 8, 'rgba(0,0,0,.35)');
    ctx.font = 'bold 10px system-ui, sans-serif';
    A.drawCoin(ctx, 13, 11, this.frame / 12, 5); this.text(ctx, `×${String(this.coins).padStart(2, '0')}`, 21, 5.5);
    this.text(ctx, `♥ ×${this.lives}`, 54, 5.5, '#ff8a80');
    A.drawFlowerCoin(ctx, 94, 11, this.frame);
    for (let i = 0; i < 3; i++) A.ell(ctx, 108 + i * 9, 11, 3, 3, i < this.flowerCoins.length ? '#ce93d8' : 'rgba(255,255,255,.35)', 'rgba(0,0,0,.3)', .5);
    A.rr(ctx, W - 66, 3, 62, 16, 8, 'rgba(0,0,0,.35)');
    this.text(ctx, `TIME ${String(Math.max(0, this.time)).padStart(3, '0')}`, W - 10, 5.5, this.time <= 50 && (this.frame >> 4) % 2 ? '#ff5252' : '#fff', 'right');
    if (this.wonder.done) { A.rr(ctx, W / 2 - 30, 3, 60, 16, 8, 'rgba(0,0,0,.35)'); A.drawSeed(ctx, W / 2 - 18, 11, this.frame); this.text(ctx, 'シード', W / 2 - 6, 5.5, '#c5e1a5'); }
    if (this.introT > 0) {
      ctx.globalAlpha = Math.min(1, this.introT / 30); ctx.font = 'bold 14px system-ui, sans-serif';
      A.rr(ctx, W / 2 - 100, 96, 200, 42, 10, 'rgba(0,0,0,.5)');
      this.text(ctx, `WORLD 1-${this.level.id.slice(-1)}`, W / 2, 101, '#ffd54f', 'center'); this.text(ctx, this.level.name, W / 2, 119, '#fff', 'center'); ctx.globalAlpha = 1;
    }
    if (this.state === 'clear' && this.clearPhase === 'walk') {
      ctx.font = 'bold 20px system-ui, sans-serif'; this.text(ctx, 'コース クリア！', W / 2, 88, '#ffd54f', 'center');
    }
  }
}
