// WebAudio で作るオリジナル効果音＆BGM（外部ファイルなし）
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = n => {
  if (n === '-') return 0;
  const m = n.match(/^([A-G]#?)(\d)$/);
  return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] - 4) * 12 - 9) / 12);
};

// BGM（オリジナル曲）。1文字 = 1/8 拍相当のステップ。'-' は休符、'.' は前の音を伸ばす
const SONGS = {
  title: { bpm: 120, tracks: [
    { type: 'square', vol: .08, seq: 'E4 . G4 . A4 . B4 . A4 . G4 . E4 . - . C4 . E4 . G4 . A4 . G4 . E4 . D4 . - . D4 . F4 . A4 . B4 . A4 . F4 . D4 . - . E4 . G4 . B4 . D5 . B4 . G4 . E4 . - .' },
    { type: 'triangle', vol: .10, seq: 'C3 . - . C3 . - . G2 . - . G2 . - . A2 . - . A2 . - . E2 . - . E2 . - . F2 . - . F2 . - . D2 . - . D2 . - . G2 . - . G2 . - . G2 . - . B2 . - .' },
  ] },
  level: { bpm: 150, tracks: [
    { type: 'square', vol: .07, seq: 'E5 E5 - E5 - C5 E5 - G5 - - - G4 - - - C5 - - G4 - - E4 - - A4 - B4 - A#4 A4 - G4 E5 G5 A5 - F5 G5 - E5 - C5 D5 B4 - - C5 - - G4 - - E4 - - A4 - B4 - A#4 A4 - G4 E5 G5 A5 - F5 G5 - E5 - C5 D5 B4 - -' },
    { type: 'triangle', vol: .12, seq: 'C3 - - C3 - - C3 - G3 - - - G2 - - - C3 - - G2 - - E2 - - A2 - B2 - A#2 A2 - G2 - - - - F2 - - E2 - - - D2 - - - C3 - - G2 - - E2 - - A2 - B2 - A#2 A2 - G2 - - - - F2 - - E2 - - - D2 - - -' },
  ] },
  wonder: { bpm: 180, tracks: [
    { type: 'sawtooth', vol: .05, seq: 'C5 E5 G5 C6 B5 G5 E5 B4 D5 F5 A5 D6 C6 A5 F5 C5 E5 G5 B5 E6 D6 B5 G5 D5 F5 A5 C6 F6 E6 C6 A5 E5 C5 E5 G5 C6 B5 G5 E5 B4 D5 F5 A5 D6 C6 A5 F5 C5 G5 B5 D6 G6 F6 D6 B5 F5 C6 - - - C6 - - -' },
    { type: 'triangle', vol: .12, seq: 'C3 - C3 - C3 - C3 - D3 - D3 - D3 - D3 - E3 - E3 - E3 - E3 - F3 - F3 - F3 - F3 - C3 - C3 - C3 - C3 - D3 - D3 - D3 - D3 - G3 - G3 - G3 - G3 - C3 - - - C3 - - -' },
  ] },
  clear: { bpm: 140, once: true, tracks: [
    { type: 'square', vol: .08, seq: 'G4 C5 E5 G5 - E5 G5 - - - - -' },
    { type: 'triangle', vol: .12, seq: 'C3 - - C3 - - C3 - - - - -' },
  ] },
};

export class GameAudio {
  constructor() { this.ctx = null; this.muted = false; this.song = null; this.timer = null; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    return true;
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 1; return this.muted; }
  tone(f, dur, { type = 'square', vol = .12, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || !f) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + .02);
  }
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump': this.tone(300, .18, { slide: 400, vol: .1 }); break;
      case 'coin': this.tone(1320, .08, { vol: .09 }); this.tone(1760, .25, { vol: .09, delay: .08 }); break;
      case 'fcoin': [880, 1108, 1318, 1760].forEach((f, i) => this.tone(f, .2, { vol: .1, delay: i * .07 })); break;
      case 'stomp': this.tone(200, .1, { type: 'triangle', slide: -150, vol: .2 }); break;
      case 'bump': this.tone(120, .08, { type: 'triangle', vol: .2 }); break;
      case 'break': [180, 140, 100].forEach((f, i) => this.tone(f, .1, { type: 'sawtooth', vol: .12, delay: i * .03 })); break;
      case 'power': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .12, { vol: .1, delay: i * .05 })); break;
      case 'hurt': this.tone(400, .3, { type: 'sawtooth', slide: -300, vol: .12 }); break;
      case 'die': [660, 440, 330, 220, 110].forEach((f, i) => this.tone(f, .25, { type: 'triangle', vol: .15, delay: i * .12 })); break;
      case 'wonder': [392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, .3, { type: 'sine', vol: .12, delay: i * .06 })); break;
      case 'seed': [1046, 1318, 1568, 2093, 1568, 2093].forEach((f, i) => this.tone(f, .2, { vol: .1, delay: i * .08 })); break;
      case 'talk': [900, 1200, 1000].forEach((f, i) => this.tone(f, .07, { type: 'sine', vol: .08, delay: i * .06 })); break;
      case 'bubble': this.tone(600, .15, { type: 'sine', slide: 500, vol: .08 }); break;
      case 'pop': this.tone(900, .06, { type: 'sine', slide: -600, vol: .1 }); break;
      case 'trunk': this.tone(150, .2, { type: 'sawtooth', slide: 120, vol: .12 }); break;
      case 'select': this.tone(880, .06, { vol: .08 }); break;
      case 'pole': [523, 587, 659, 698, 784, 880, 988, 1046].forEach((f, i) => this.tone(f, .1, { vol: .08, delay: i * .05 })); break;
      case 'oneup': [659, 784, 1318, 1046, 1568, 2093].forEach((f, i) => this.tone(f, .15, { vol: .1, delay: i * .07 })); break;
    }
  }
  play(name) {
    if (!this.ctx || this.songName === name) return;
    this.stop();
    const song = SONGS[name];
    if (!song) return;
    this.songName = name;
    const tracks = song.tracks.map(t => ({ ...t, notes: t.seq.trim().split(/\s+/) }));
    const len = Math.max(...tracks.map(t => t.notes.length));
    const stepDur = 60 / song.bpm / 2;
    let step = 0, next = this.ctx.currentTime + .05;
    const schedule = () => {
      while (next < this.ctx.currentTime + .25) {
        if (step >= len && song.once) { this.stop(); return; }
        const i = step % len;
        for (const t of tracks) {
          const n = t.notes[i];
          if (!n || n === '-' || n === '.') continue;
          let d = 1;
          while (t.notes[i + d] === '.') d++;
          const f = freq(n);
          const t0 = next;
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = t.type; o.frequency.value = f;
          g.gain.setValueAtTime(t.vol, t0);
          g.gain.setValueAtTime(t.vol, t0 + stepDur * d * .8);
          g.gain.linearRampToValueAtTime(0.0001, t0 + stepDur * d * .95);
          o.connect(g); g.connect(this.master);
          o.start(t0); o.stop(t0 + stepDur * d);
        }
        next += stepDur; step++;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 100);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.songName = null; }
}
