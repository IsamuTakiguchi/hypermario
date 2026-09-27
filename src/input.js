// キーボードとタッチ操作をひとまとめにする
// タッチ: 画面左半分は「触れた位置に出るジョイスティック」（指がずれても中心が追従）、右半分はどこをタップしてもジャンプ
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.anyKey = false;
    this.stickRun = false; // ジョイスティックを強く倒したときの自動ダッシュ
    this.touch = false;
    const map = { Space: 'KeyZ', ShiftLeft: 'KeyX', ShiftRight: 'KeyX', KeyA: 'ArrowLeft', KeyD: 'ArrowRight', KeyS: 'ArrowDown', KeyW: 'ArrowUp', KeyK: 'KeyZ', KeyJ: 'KeyX' };
    const norm = c => map[c] ?? c;
    window.addEventListener('keydown', e => {
      const c = norm(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      this.press(c);
    });
    window.addEventListener('keyup', e => this.release(norm(e.code)));
    window.addEventListener('blur', () => { this.down.clear(); this.stickRun = false; });

    const coarse = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || new URLSearchParams(location.search).has('touch');
    if (coarse && document.getElementById('touch')) this.setupTouch();
    else document.getElementById('game')?.addEventListener('pointerdown', () => { this.pressed.add('Enter'); this.anyKey = true; });
  }
  press(c) { if (!this.down.has(c)) this.pressed.add(c); this.down.add(c); this.anyKey = true; }
  release(c) { this.down.delete(c); }

  setupTouch() {
    this.touch = true;
    const touch = document.getElementById('touch');
    touch.classList.add('on');
    const zoneL = document.getElementById('zoneL'), zoneR = document.getElementById('zoneR');
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    const bA = document.getElementById('bA'), bB = document.getElementById('bB');
    const hint = document.getElementById('touchHint');
    const hideHint = () => hint?.classList.add('off');
    setTimeout(hideHint, 6000);
    const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch { /* 合成イベントなど */ } };

    // ---- ジョイスティック（左半分） ----
    const DEAD = 12, RADIUS = 44, RUN_AT = 34;
    let sid = null, ox = 0, oy = 0;
    const setDir = (dx, dy) => {
      const l = dx < -DEAD, r = dx > DEAD, d = dy > 26, u = dy < -26 && Math.abs(dy) > Math.abs(dx);
      l ? this.press('ArrowLeft') : this.release('ArrowLeft');
      r ? this.press('ArrowRight') : this.release('ArrowRight');
      d ? this.press('ArrowDown') : this.release('ArrowDown');
      u ? this.press('ArrowUp') : this.release('ArrowUp');
      this.stickRun = Math.abs(dx) > RUN_AT;
    };
    const clearDir = () => { for (const c of ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp']) this.release(c); this.stickRun = false; };
    const showStick = (x, y) => { stick.style.left = `${x}px`; stick.style.top = `${y}px`; stick.classList.add('on'); knob.style.transform = 'translate(0,0)'; };
    zoneL.addEventListener('pointerdown', e => {
      e.preventDefault(); if (sid !== null) return;
      sid = e.pointerId; ox = e.clientX; oy = e.clientY; capture(zoneL, e);
      showStick(ox, oy); this.anyKey = true; hideHint();
    });
    zoneL.addEventListener('pointermove', e => {
      if (e.pointerId !== sid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) { // 指がはみ出したら中心を指の方へ引きずる（Roblox 風の追従スティック）
        const k = (dist - RADIUS) / dist; ox += dx * k; oy += dy * k; dx = e.clientX - ox; dy = e.clientY - oy;
        stick.style.left = `${ox}px`; stick.style.top = `${oy}px`;
      }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      setDir(dx, dy);
    });
    const endStick = e => { if (e.pointerId !== sid) return; sid = null; clearDir(); stick.classList.remove('on'); };
    zoneL.addEventListener('pointerup', endStick); zoneL.addEventListener('pointercancel', endStick); zoneL.addEventListener('lostpointercapture', endStick);

    // ---- ジャンプ（右半分のどこでも） ----
    const jumpIds = new Set();
    zoneR.addEventListener('pointerdown', e => {
      if (e.target === bB) return;
      e.preventDefault(); capture(zoneR, e); jumpIds.add(e.pointerId);
      this.press('KeyZ'); bA.classList.add('down'); hideHint();
    });
    const endJump = e => { if (!jumpIds.delete(e.pointerId)) return; if (jumpIds.size === 0) { this.release('KeyZ'); bA.classList.remove('down'); } };
    zoneR.addEventListener('pointerup', endJump); zoneR.addEventListener('pointercancel', endJump); zoneR.addEventListener('lostpointercapture', endJump);

    // ---- B ボタン（ダッシュ・アタック） ----
    let bid = null;
    bB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); bid = e.pointerId; capture(bB, e); this.press('KeyX'); bB.classList.add('down'); hideHint(); });
    const endB = e => { if (e.pointerId !== bid) return; bid = null; this.release('KeyX'); bB.classList.remove('down'); };
    bB.addEventListener('pointerup', endB); bB.addEventListener('pointercancel', endB); bB.addEventListener('lostpointercapture', endB);
  }

  held(c) { return this.down.has(c); }
  hit(c) { return this.pressed.has(c); }
  get left() { return this.held('ArrowLeft'); }
  get right() { return this.held('ArrowRight'); }
  get up() { return this.held('ArrowUp'); }
  get downKey() { return this.held('ArrowDown'); }
  get jump() { return this.held('KeyZ'); }
  get jumpHit() { return this.hit('KeyZ'); }
  get run() { return this.held('KeyX') || this.stickRun; }
  get runHit() { return this.hit('KeyX'); }
  get ok() { return this.hit('KeyZ') || this.hit('Enter'); }
  endFrame() { this.pressed.clear(); }
}
