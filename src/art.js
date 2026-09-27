// なめらかなベクター描画（グラデーション・陰影・ハイライト）。座標はすべてゲーム内の論理座標（1タイル=16）
const TAU = Math.PI * 2;

export function ell(ctx, x, y, rx, ry, fill, stroke, lw = .6) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function rr(ctx, x, y, w, h, r, fill, stroke, lw = .6) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function capsule(ctx, x1, y1, x2, y2, r, color) {
  ctx.lineCap = 'round'; ctx.lineWidth = r * 2; ctx.strokeStyle = color;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
// 左上から光が当たる球体風グラデーション
export function orb(ctx, x, y, r, light, base, dark) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.05);
  g.addColorStop(0, light); g.addColorStop(.55, base); g.addColorStop(1, dark);
  return g;
}
export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}
export function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  return g;
}
export function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
export function shadow(ctx, x, y, rx, alpha = .28) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,20,${alpha})`); g.addColorStop(1, 'rgba(0,0,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .35, 0, 0, TAU); ctx.fill();
}
const OUT = 'rgba(20,10,40,.35)';

// ---------- 主人公 ----------
// 原点は足元の中心。右向きで描く。o = { form, pose, phase, t, attack }
export function drawHero(ctx, o) {
  const big = o.form !== 'small', trunk = o.form === 'trunk', bubble = o.form === 'bubble';
  const s = big ? 1 : .7;
  const capC = bubble ? ['#5ee6f5', '#1aa7c0', '#0e7a8c'] : ['#c46be0', '#8e24aa', '#5b1178'];
  const skin = trunk ? ['#e6e9f0', '#b7bfcc', '#7d8797'] : ['#ffe9d2', '#ffcfa3', '#d9955f'];
  const shirt = bubble ? ['#ffffff', '#e8f6ff', '#b9d5e6'] : ['#fff3a3', '#ffd54f', '#e0a000'];
  const blue = ['#63b3ff', '#1e88e5', '#0d47a1'];
  const shoe = trunk ? ['#8d99ab', '#5b6673', '#333b45'] : ['#b06a3a', '#7a4320', '#4a2810'];
  ctx.save(); ctx.scale(s, s);
  const walk = o.pose === 'walk', jump = o.pose === 'jump', crouch = o.pose === 'crouch', attack = o.pose === 'attack';
  const sw = walk ? Math.sin(o.phase) : 0;
  const bob = walk ? Math.abs(Math.cos(o.phase)) * .8 : (o.pose === 'idle' ? Math.sin(o.t / 14) * .3 : 0);
  if (crouch) ctx.scale(1.15, .68);
  else if (jump) ctx.scale(.94, 1.06);
  ctx.translate(0, -bob);
  const legF = jump ? 2.5 : sw * 3, legB = jump ? -2 : -sw * 3;
  const legLiftF = walk ? Math.max(0, Math.sin(o.phase)) * 2 : jump ? 3 : 0, legLiftB = walk ? Math.max(0, -Math.sin(o.phase)) * 2 : jump ? 1 : 0;
  // 後ろの腕
  const armB = jump ? -5 : -sw * 2.5;
  capsule(ctx, -4.5, -13, -5.5 + armB, jump ? -18 : -8.5, 1.5, shirt[1]);
  ell(ctx, -5.5 + armB, jump ? -18.5 : -8, 1.9, 1.9, '#ffffff', OUT, .5);
  // 脚と靴
  for (const [x, lift, front] of [[-2.6 + legB, legLiftB, false], [2.4 + legF, legLiftF, true]]) {
    capsule(ctx, x * .4, -9, x, -3 - lift, 2.2, front ? blue[1] : blue[2]);
    const g = orb(ctx, x + 1, -1.8 - lift, 3.2, shoe[0], shoe[1], shoe[2]);
    ell(ctx, x + 1, -1.8 - lift, 3.4, 2, g, OUT, .5);
  }
  // 胴体（オーバーオール）
  ctx.beginPath(); ctx.roundRect(-5.2, -16, 10.4, 9.5, 3.5);
  ctx.fillStyle = orb(ctx, 0, -12, 8, blue[0], blue[1], blue[2]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .5; ctx.stroke();
  // シャツ（肩と袖）
  ctx.beginPath(); ctx.roundRect(-5.8, -17.5, 11.6, 4.2, 2); ctx.fillStyle = orb(ctx, 0, -16, 7, shirt[0], shirt[1], shirt[2]); ctx.fill();
  ell(ctx, -2, -13.2, .8, .8, '#ffd54f'); ell(ctx, 2, -13.2, .8, .8, '#ffd54f');
  // 前の腕
  const armF = attack ? 6 : jump ? 5 : sw * 2.5;
  capsule(ctx, 4.5, -13, 5.5 + armF, jump ? -18 : attack ? -12 : -8.5, 1.5, shirt[1]);
  ell(ctx, 5.5 + armF, jump ? -18.5 : attack ? -12 : -8, 1.9, 1.9, '#ffffff', OUT, .5);
  // 頭
  const hy = -21.5;
  if (trunk) { ell(ctx, -4.5, hy - 1, 3.6, 4, orb(ctx, -4.5, hy - 1, 4, skin[0], skin[1], skin[2]), OUT, .5); ell(ctx, -4.5, hy - 1, 2, 2.4, '#f2b8c6'); }
  ell(ctx, .5, hy, 6, 5.6, orb(ctx, .5, hy, 6, skin[0], skin[1], skin[2]), OUT, .5);
  // 目
  ell(ctx, 3.2, hy - .3, 1.6, 2.1, '#ffffff', OUT, .4);
  ell(ctx, 3.6, hy - .1, .8, 1.2, '#1b1b2f');
  ell(ctx, 3.9, hy - .7, .3, .35, '#ffffff');
  // 鼻／ゾウのはな
  if (trunk) {
    const tipX = attack ? 15 : 9.5, tipY = attack ? hy + 1 : hy + 8;
    ctx.lineCap = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = skin[1];
    ctx.beginPath(); ctx.moveTo(5.5, hy + 1); ctx.quadraticCurveTo(attack ? 11 : 10, attack ? hy - 1 : hy + 2, tipX, tipY); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = skin[0]; ctx.beginPath(); ctx.moveTo(6, hy); ctx.quadraticCurveTo(attack ? 11 : 9.5, attack ? hy - 2 : hy + 1, tipX - .5, tipY - 1); ctx.stroke();
    ell(ctx, tipX, tipY, 1.7, 1.5, skin[2]);
  } else ell(ctx, 6.6, hy + 1.2, 2, 1.6, orb(ctx, 6.6, hy + 1.2, 2, skin[0], skin[1], skin[2]), OUT, .4);
  // 帽子
  ctx.beginPath(); ctx.arc(.5, hy - 1, 6.6, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = orb(ctx, .5, hy - 4, 7, capC[0], capC[1], capC[2]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .5; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(2.5, hy - 2.6, 8.5, 2.4, 1.2); ctx.fillStyle = capC[1]; ctx.fill(); ctx.stroke();
  ell(ctx, -.5, hy - 4.5, 2.4, 1, 'rgba(255,255,255,.35)');
  ell(ctx, .5, hy - 3, 2.2, 2.2, '#ffffff', OUT, .4); // 帽子のマーク
  ell(ctx, .5, hy - 3, 1, 1, capC[1]);
  if (o.glide) { // パラシュート
    ctx.beginPath(); ctx.arc(0, hy - 14, 11, Math.PI, 0); ctx.closePath(); ctx.fillStyle = orb(ctx, 0, hy - 18, 12, '#ff9e80', '#ff5722', '#bf360c'); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-10, hy - 14); ctx.lineTo(-2, hy - 5); ctx.moveTo(10, hy - 14); ctx.lineTo(2, hy - 5); ctx.stroke();
  }
  ctx.restore();
}

// ---------- 敵 ----------
export function drawWalker(ctx, t, dead) {
  ctx.save();
  if (dead === 1) ctx.scale(1.25, .45);
  const step = Math.sin(t / 5) * 2;
  ell(ctx, -3 + step, -1.5, 3.2, 1.8, orb(ctx, -3, -1.5, 3, '#8d6e63', '#4e342e', '#2b1a14'), OUT, .5);
  ell(ctx, 3 - step, -1.5, 3.2, 1.8, orb(ctx, 3, -1.5, 3, '#8d6e63', '#4e342e', '#2b1a14'), OUT, .5);
  ell(ctx, 0, -8, 7.5, 6.5, orb(ctx, 0, -8, 7.5, '#d7a27a', '#a0522d', '#5d2f14'), OUT, .6);
  ell(ctx, -3.5, -12, 4.5, 2.6, 'rgba(255,255,255,.18)');
  ell(ctx, -2.6, -8, 1.9, 2.4, '#fff', OUT, .4); ell(ctx, 2.6, -8, 1.9, 2.4, '#fff', OUT, .4);
  ell(ctx, -2.2, -7.6, .9, 1.3, '#1b1b2f'); ell(ctx, 3, -7.6, .9, 1.3, '#1b1b2f');
  ctx.strokeStyle = '#2b1a14'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4.5, -11.5); ctx.lineTo(-1.5, -10.5); ctx.moveTo(4.5, -11.5); ctx.lineTo(1.5, -10.5); ctx.stroke();
  ctx.strokeStyle = '#3e1f0e'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-2, -4.2); ctx.quadraticCurveTo(0, -3, 2, -4.2); ctx.stroke();
  ctx.restore();
}
export function drawSpiky(ctx, t, dead) {
  ctx.save();
  if (dead === 1) ctx.scale(1.25, .45);
  const step = Math.sin(t / 5) * 2;
  ell(ctx, -3 + step, -1.5, 3, 1.7, '#4a148c', OUT, .5); ell(ctx, 3 - step, -1.5, 3, 1.7, '#4a148c', OUT, .5);
  for (let i = -2; i <= 2; i++) { // トゲ
    const a = -Math.PI / 2 + i * .5, bx = Math.cos(a) * 6.5, by = -8 + Math.sin(a) * 6;
    ctx.beginPath(); ctx.moveTo(bx - 1.6, by + 1); ctx.lineTo(bx + Math.cos(a) * 4.5, by + Math.sin(a) * 4.5); ctx.lineTo(bx + 1.6, by + 1); ctx.closePath();
    ctx.fillStyle = hgrad(ctx, bx - 2, bx + 2, [[0, '#f5f5f5'], [.5, '#b0bec5'], [1, '#607d8b']]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .5; ctx.stroke();
  }
  ell(ctx, 0, -8, 7.5, 6.5, orb(ctx, 0, -8, 7.5, '#e1bee7', '#8e24aa', '#4a148c'), OUT, .6);
  ell(ctx, -2.6, -8, 1.9, 2.4, '#fff', OUT, .4); ell(ctx, 2.6, -8, 1.9, 2.4, '#fff', OUT, .4);
  ell(ctx, -2.2, -7.6, .9, 1.3, '#1b1b2f'); ell(ctx, 3, -7.6, .9, 1.3, '#1b1b2f');
  ctx.strokeStyle = '#2a0a3a'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-2, -4.2); ctx.lineTo(2, -4.2); ctx.stroke();
  ctx.restore();
}
export function drawFlyer(ctx, t) {
  const flap = Math.sin(t / 3);
  ctx.save();
  for (const sgn of [-1, 1]) {
    ctx.save(); ctx.translate(sgn * 5, -10); ctx.rotate(sgn * (-.6 + flap * .5));
    ell(ctx, sgn * 4.5, 0, 5.5, 2.4, 'rgba(255,255,255,.9)', 'rgba(120,180,220,.6)', .5); ctx.restore();
  }
  ell(ctx, 0, -8, 6.5, 6, orb(ctx, 0, -8, 6.5, '#b2ebf2', '#26c6da', '#00838f'), OUT, .6);
  ell(ctx, -2.3, -8.3, 1.8, 2.2, '#fff', OUT, .4); ell(ctx, 2.3, -8.3, 1.8, 2.2, '#fff', OUT, .4);
  ell(ctx, -1.9, -8, .8, 1.2, '#1b1b2f'); ell(ctx, 2.7, -8, .8, 1.2, '#1b1b2f');
  ctx.beginPath(); ctx.moveTo(4.5, -6); ctx.lineTo(8, -5); ctx.lineTo(4.5, -4); ctx.closePath(); ctx.fillStyle = '#ffb300'; ctx.fill();
  ctx.restore();
}

// ---------- アイテム ----------
export function drawCoin(ctx, x, y, t, r = 5.5) {
  const w = Math.abs(Math.cos(t)) * r + .8;
  ell(ctx, x, y, w, r, orb(ctx, x, y, r, '#fff8c4', '#ffd54f', '#e09a00'), 'rgba(160,100,0,.6)', .6);
  if (w > 2.5) { ell(ctx, x, y, w * .55, r * .6, 'rgba(255,255,255,0)', 'rgba(230,160,0,.8)', .6); ell(ctx, x - w * .3, y - r * .4, w * .2, r * .18, 'rgba(255,255,255,.8)'); }
}
export function drawFlowerCoin(ctx, x, y, t) {
  glow(ctx, x, y, 12, 'rgba(206,147,216,.35)');
  ell(ctx, x, y, 7.5, 7.5, orb(ctx, x, y, 7.5, '#f3e5f5', '#ba68c8', '#6a1b9a'), 'rgba(80,0,120,.6)', .6);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) { const a = t / 20 + i * TAU / 5; ell(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1.9, 1.9, 'rgba(255,255,255,.9)'); }
  ell(ctx, x, y, 1.6, 1.6, '#ffd54f');
}
export function drawBerry(ctx, x, y) {
  ell(ctx, x + 1, y + 1, 6.5, 6, orb(ctx, x, y, 6.5, '#ff8a80', '#e53935', '#8e0000'), OUT, .6);
  ell(ctx, x - 2, y - 2, 2.2, 1.3, 'rgba(255,255,255,.55)');
  ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.moveTo(x + 1, y - 5); ctx.quadraticCurveTo(x + 5, y - 9, x + 6, y - 5); ctx.quadraticCurveTo(x + 3, y - 4, x + 1, y - 5); ctx.fill();
  capsule(ctx, x + 1, y - 5, x + 1.5, y - 8, .6, '#2e7d32');
}
export function drawFruit(ctx, x, y) {
  ell(ctx, x - 5, y - 1, 3.2, 3.6, orb(ctx, x - 5, y - 1, 3.5, '#ffd6e0', '#f48fb1', '#ad1457'), OUT, .5);
  ell(ctx, x + 5, y - 1, 3.2, 3.6, orb(ctx, x + 5, y - 1, 3.5, '#ffd6e0', '#f48fb1', '#ad1457'), OUT, .5);
  ell(ctx, x, y, 6, 6.5, orb(ctx, x, y, 6.5, '#eceff1', '#b0bec5', '#546e7a'), OUT, .6);
  ell(ctx, x - 2, y - 3, 2, 1.2, 'rgba(255,255,255,.6)');
  capsule(ctx, x + 1, y + 3, x + 3, y + 7, 1.3, '#90a4ae');
  capsule(ctx, x, y - 6, x + 1, y - 9, .6, '#2e7d32');
}
export function drawBubbleFlower(ctx, x, y, t) {
  capsule(ctx, x, y + 8, x, y + 1, .9, '#2e7d32');
  ell(ctx, x - 3.5, y + 5.5, 3, 1.4, '#66bb6a'); ell(ctx, x + 3.5, y + 4, 3, 1.4, '#66bb6a');
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t / 40; ell(ctx, x + Math.cos(a) * 4, y - 1 + Math.sin(a) * 4, 2.6, 2.6, orb(ctx, x + Math.cos(a) * 4, y - 1 + Math.sin(a) * 4, 2.6, '#e0f7fa', '#4dd0e1', '#0097a7'), OUT, .4); }
  ell(ctx, x, y - 1, 2.8, 2.8, orb(ctx, x, y - 1, 2.8, '#fff', '#e0f7fa', '#80deea'), OUT, .4);
  ell(ctx, x - .8, y - 1.3, .5, .7, '#1b1b2f'); ell(ctx, x + .8, y - 1.3, .5, .7, '#1b1b2f');
}
export function drawTalker(ctx, x, y, t, talking) {
  const nod = talking ? Math.sin(t / 3) * 1.5 : Math.sin(t / 25) * .6;
  capsule(ctx, x, y + 8, x, y + 1, .9, '#2e7d32');
  ell(ctx, x - 3.5, y + 5.5, 3, 1.4, '#66bb6a'); ell(ctx, x + 3.5, y + 4, 3, 1.4, '#66bb6a');
  ctx.save(); ctx.translate(0, nod);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ell(ctx, x + Math.cos(a) * 5, y - 1 + Math.sin(a) * 5, 2.6, 2.6, orb(ctx, x + Math.cos(a) * 5, y - 1 + Math.sin(a) * 5, 2.6, '#fff9c4', '#ffd54f', '#f9a825'), OUT, .4); }
  ell(ctx, x, y - 1, 4.2, 4.2, orb(ctx, x, y - 1, 4.2, '#fff8e1', '#ffe0b2', '#e0a878'), OUT, .4);
  ell(ctx, x - 1.4, y - 1.8, .9, 1.2, '#fff'); ell(ctx, x + 1.4, y - 1.8, .9, 1.2, '#fff');
  ell(ctx, x - 1.2, y - 1.6, .5, .7, '#1b1b2f'); ell(ctx, x + 1.6, y - 1.6, .5, .7, '#1b1b2f');
  ctx.strokeStyle = '#8d5524'; ctx.lineWidth = .6; ctx.beginPath();
  if (talking) ctx.ellipse(x, y + .9, 1.2, .9 + Math.abs(Math.sin(t / 3)) * .6, 0, 0, TAU); else ctx.arc(x, y + .3, 1.3, .2, Math.PI - .2);
  ctx.stroke(); ctx.restore();
}
export function drawSeed(ctx, x, y, t) {
  glow(ctx, x, y, 18, 'rgba(255,255,255,.4)');
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t / 15) * .15);
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(7, -2, 0, 7); ctx.quadraticCurveTo(-7, -2, 0, -8); ctx.closePath();
  ctx.fillStyle = orb(ctx, 0, 0, 8, '#dcedc8', '#66bb6a', '#1b5e20'); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .6; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) { const a = t / 20 + i * TAU / 3; ell(ctx, x + Math.cos(a) * 11, y + Math.sin(a) * 11, 1, 1, '#fff'); }
}
export function drawWonderFlower(ctx, x, y, t) {
  glow(ctx, x, y - 2, 16 + Math.sin(t / 8) * 3, 'rgba(255,255,255,.4)');
  capsule(ctx, x, y + 8, x, y + 2, .9, '#2e7d32');
  ell(ctx, x - 3.5, y + 5.5, 3, 1.4, '#66bb6a'); ell(ctx, x + 3.5, y + 4, 3, 1.4, '#66bb6a');
  for (let i = 0; i < 6; i++) {
    const a = t / 25 + i * TAU / 6, px = x + Math.cos(a) * 4.5, py = y - 2 + Math.sin(a) * 4.5, h = (i * 60 + t * 3) % 360;
    ell(ctx, px, py, 3, 3, orb(ctx, px, py, 3, `hsl(${h},100%,85%)`, `hsl(${h},90%,60%)`, `hsl(${h},90%,35%)`), OUT, .4);
  }
  ell(ctx, x, y - 2, 3, 3, orb(ctx, x, y - 2, 3, '#fff', '#fff', '#e0e0e0'), OUT, .4);
  ell(ctx, x - 1, y - 2.5, .5, .7, '#1b1b2f'); ell(ctx, x + 1, y - 2.5, .5, .7, '#1b1b2f');
  ctx.strokeStyle = '#1b1b2f'; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(x, y - 1.2, 1.2, .2, Math.PI - .2); ctx.stroke();
}
export function drawBubble(ctx, x, y, r = 6) {
  const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.7, 'rgba(180,240,255,.15)'); g.addColorStop(1, 'rgba(120,220,255,.55)');
  ell(ctx, x, y, r, r, g, 'rgba(200,245,255,.9)', .7);
  ell(ctx, x - r * .35, y - r * .4, r * .25, r * .15, 'rgba(255,255,255,.9)');
}

// ---------- ブロック ----------
export function drawGround(ctx, x, y, T, th, n) { // n = { up, left, right }: 隣が地面かどうか
  ctx.fillStyle = vgrad(ctx, y, y + T, [[0, th.ground], [1, th.groundDark]]); ctx.fillRect(x, y, T, T);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.beginPath(); ctx.arc(x + ((x * 7 + y * 3) % 9) + 3, y + 9 + (x * 3 + y) % 5, 1.4, 0, TAU); ctx.fill();
  if (!n.up) {
    const g = vgrad(ctx, y - 1, y + 6, [[0, th.topLight], [.5, th.top], [1, th.topDark]]);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.roundRect(x - (n.left ? 0 : .5), y - 1.5, T + (n.left ? 0 : .5) + (n.right ? 0 : .5), 6.5, [n.left ? 0 : 3, n.right ? 0 : 3, n.right ? 0 : 3, n.left ? 0 : 3]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + (n.left ? 0 : 2), y - 1, T - (n.left ? 0 : 2) - (n.right ? 0 : 2), 1.2);
  }
  if (!n.left) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + (n.up ? 0 : 4), 1.2, T); }
  if (!n.right) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + T - 1.2, y + (n.up ? 0 : 4), 1.2, T); }
}
export function drawBrick(ctx, x, y, T) {
  rr(ctx, x + .3, y + .3, T - .6, T - .6, 1.5, vgrad(ctx, y, y + T, [[0, '#e0946a'], [1, '#a4532c']]), 'rgba(60,20,0,.5)', .6);
  ctx.fillStyle = 'rgba(60,20,0,.35)';
  ctx.fillRect(x + .5, y + 7.5, T - 1, 1); ctx.fillRect(x + 7.5, y + 1, 1, 6.5); ctx.fillRect(x + 3.5, y + 8.5, 1, 6.5); ctx.fillRect(x + 11.5, y + 8.5, 1, 6.5);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 1, y + 1, T - 2, 1); ctx.fillRect(x + 1, y + 8.5, 6, .8); ctx.fillRect(x + 8.5, y + 1, 6, .8);
}
export function drawQBlock(ctx, x, y, T, t, used) {
  if (used) { rr(ctx, x + .3, y + .3, T - .6, T - .6, 2, vgrad(ctx, y, y + T, [[0, '#a1887f'], [1, '#5d4037']]), 'rgba(40,20,0,.5)', .6); ctx.fillStyle = 'rgba(0,0,0,.2)'; [[3, 3], [11, 3], [3, 11], [11, 11]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 2, 2)); return; }
  rr(ctx, x + .3, y + .3, T - .6, T - .6, 2, vgrad(ctx, y, y + T, [[0, '#ffe082'], [.5, '#ffb300'], [1, '#e08a00']]), 'rgba(120,60,0,.6)', .6);
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + 1.5, y + 1.2, T - 3, 1.2);
  ctx.fillStyle = 'rgba(120,60,0,.55)'; [[2.5, 2.5], [11.5, 2.5], [2.5, 11.5], [11.5, 11.5]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 2, 2));
  ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(120,60,0,.5)'; ctx.fillText('?', x + 8.5, y + 9.2); ctx.fillStyle = '#fff'; ctx.fillText('?', x + 8, y + 8.5);
  const sh = ((t / 2) % 60) - 20; // 光の反射が横切る
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + .3, y + .3, T - .6, T - .6, 2); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x + sh, y); ctx.lineTo(x + sh + 4, y); ctx.lineTo(x + sh - 4, y + T); ctx.lineTo(x + sh - 8, y + T); ctx.fill(); ctx.restore();
}
export function drawPipe(ctx, x, y, w, h, top) { // x,y = 左上、w = 幅、h = 高さ。top なら上部に口をつける
  const body = hgrad(ctx, x, x + w, [[0, '#1b5e20'], [.25, '#66bb6a'], [.45, '#a5d6a7'], [.7, '#43a047'], [1, '#124116']]);
  ctx.fillStyle = body; ctx.fillRect(x + 1.2, y, w - 2.4, h);
  if (top) {
    const rim = hgrad(ctx, x - 1.5, x + w + 1.5, [[0, '#1b5e20'], [.25, '#66bb6a'], [.45, '#b9e4bb'], [.7, '#43a047'], [1, '#124116']]);
    rr(ctx, x - 1.5, y, w + 3, 8.5, 2, rim, 'rgba(0,40,0,.5)', .6);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 1.2, y + 8.5, w - 2.4, 2);
  }
}
export function drawPlank(ctx, x, y, T) {
  rr(ctx, x - .5, y, T + 1, 5.5, 2, vgrad(ctx, y, y + 5.5, [[0, '#e8c28a'], [1, '#a5692e']]), 'rgba(80,40,0,.5)', .5);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 1, y + .8, T - 2, .8);
  ctx.fillStyle = 'rgba(80,40,0,.25)'; ctx.fillRect(x + 3, y + 3, 4, .7); ctx.fillRect(x + 9, y + 2.4, 5, .7);
}
export function drawSpikes(ctx, x, y, T) {
  ctx.fillStyle = vgrad(ctx, y + 12, y + T, [[0, '#78909c'], [1, '#37474f']]); ctx.fillRect(x, y + 12.5, T, 3.5);
  for (let i = 0; i < 3; i++) {
    const bx = x + i * 5.3 + 2.7;
    ctx.beginPath(); ctx.moveTo(bx - 2.6, y + 13); ctx.lineTo(bx, y + 1.5); ctx.lineTo(bx + 2.6, y + 13); ctx.closePath();
    ctx.fillStyle = hgrad(ctx, bx - 2.6, bx + 2.6, [[0, '#eceff1'], [.45, '#b0bec5'], [.55, '#78909c'], [1, '#455a64']]); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .4; ctx.stroke();
  }
}
export function drawWonderTile(ctx, x, y, T, t, cx, alpha) {
  ctx.globalAlpha = alpha;
  const h = (t * 3 + cx * 20) % 360;
  rr(ctx, x + .5, y + .5, T - 1, T - 1, 3, vgrad(ctx, y, y + T, [[0, `hsl(${h},90%,80%)`], [.5, `hsl(${h},85%,62%)`], [1, `hsl(${h},80%,45%)`]]), 'rgba(255,255,255,.7)', .8);
  ell(ctx, x + 5, y + 4, 3.2, 1.5, 'rgba(255,255,255,.55)');
  ctx.globalAlpha = 1;
}
export function drawGoal(ctx, x, top, bottom, flagY) {
  ctx.fillStyle = vgrad(ctx, bottom - 7, bottom, [[0, '#66bb6a'], [1, '#1b5e20']]);
  ctx.beginPath(); ctx.roundRect(x - 7, bottom - 7, 16, 7, [3, 3, 0, 0]); ctx.fill();
  ctx.fillStyle = hgrad(ctx, x - 1.5, x + 3, [[0, '#cfd8dc'], [.4, '#ffffff'], [1, '#78909c']]);
  ctx.beginPath(); ctx.roundRect(x - 1.2, top, 3.4, bottom - top - 7, 1.5); ctx.fill();
  ell(ctx, x + .5, top - 3.5, 4.5, 4.5, orb(ctx, x + .5, top - 3.5, 4.5, '#fff8c4', '#ffd54f', '#e09a00'), 'rgba(120,60,0,.5)', .6);
  ctx.beginPath(); ctx.moveTo(x + 2.2, flagY); ctx.quadraticCurveTo(x + 14, flagY + 2, x + 20, flagY + 7); ctx.quadraticCurveTo(x + 14, flagY + 12, x + 2.2, flagY + 14); ctx.closePath();
  ctx.fillStyle = hgrad(ctx, x, x + 20, [[0, '#ff7961'], [1, '#c62828']]); ctx.fill(); ctx.strokeStyle = 'rgba(80,0,0,.4)'; ctx.lineWidth = .5; ctx.stroke();
  ell(ctx, x + 9, flagY + 7, 3, 3, '#fff'); ell(ctx, x + 9, flagY + 7, 1.4, 1.4, '#ffd54f');
}

// ---------- 背景 ----------
export function drawCloud(ctx, x, y, s, color = '#fff') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -14, 0, 8); g.addColorStop(0, color); g.addColorStop(1, 'rgba(200,220,240,.85)');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.arc(-14, 0, 9, 0, TAU); ctx.arc(-2, -6, 12, 0, TAU); ctx.arc(12, -2, 10, 0, TAU); ctx.arc(20, 3, 7, 0, TAU);
  ctx.rect(-16, 0, 36, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-2, -9, 6, 0, TAU); ctx.fill();
  ctx.restore();
}
export function drawHill(ctx, x, base, w, h, light, dark) {
  const g = ctx.createLinearGradient(0, base - h, 0, base); g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, base);
  ctx.bezierCurveTo(x + w * .2, base - h * 1.15, x + w * .8, base - h * 1.15, x + w, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + w * .12, base - h * .45); ctx.quadraticCurveTo(x + w * .35, base - h * .95, x + w * .55, base - h * .85); ctx.stroke();
}
export function drawBush(ctx, x, y, s, light, dark) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -10, 0, 0); g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-9, -3, 6, 0, TAU); ctx.arc(0, -6, 8, 0, TAU); ctx.arc(9, -3, 6, 0, TAU); ctx.rect(-12, -3, 24, 3); ctx.fill();
  ctx.restore();
}
