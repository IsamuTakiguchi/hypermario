// キーボードとタッチ操作をひとまとめにする
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.anyKey = false;
    const map = { Space: 'KeyZ', ShiftLeft: 'KeyX', ShiftRight: 'KeyX', KeyA: 'ArrowLeft', KeyD: 'ArrowRight', KeyS: 'ArrowDown', KeyW: 'ArrowUp', KeyK: 'KeyZ', KeyJ: 'KeyX' };
    const norm = c => map[c] ?? c;
    window.addEventListener('keydown', e => {
      const c = norm(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.down.has(c)) this.pressed.add(c);
      this.down.add(c); this.anyKey = true;
    });
    window.addEventListener('keyup', e => this.down.delete(norm(e.code)));
    window.addEventListener('blur', () => this.down.clear());

    const touch = document.getElementById('touch');
    if (touch && window.matchMedia('(pointer: coarse)').matches) touch.classList.add('on');
    for (const b of document.querySelectorAll('#touch .btn')) {
      const code = b.dataset.key;
      const on = e => { e.preventDefault(); if (!this.down.has(code)) this.pressed.add(code); this.down.add(code); b.classList.add('down'); this.anyKey = true; };
      const off = e => { e.preventDefault(); this.down.delete(code); b.classList.remove('down'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    }
    // 画面タップで決定（タイトル画面など）
    document.getElementById('game')?.addEventListener('pointerdown', () => { this.pressed.add('Enter'); this.anyKey = true; });
  }
  held(c) { return this.down.has(c); }
  hit(c) { return this.pressed.has(c); }
  get left() { return this.held('ArrowLeft'); }
  get right() { return this.held('ArrowRight'); }
  get up() { return this.held('ArrowUp'); }
  get downKey() { return this.held('ArrowDown'); }
  get jump() { return this.held('KeyZ'); }
  get jumpHit() { return this.hit('KeyZ'); }
  get run() { return this.held('KeyX'); }
  get runHit() { return this.hit('KeyX'); }
  get ok() { return this.hit('KeyZ') || this.hit('Enter'); }
  endFrame() { this.pressed.clear(); }
}
