// WebAudio で合成する BGM と効果音（外部ファイルなし・すべてオリジナル曲）
// ビッグバンド／ラテン風: ブラス・エレピ・ベース・ドラム・リバーブをその場で合成し、コード進行から伴奏を生成する
const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const nm = n => { const m = n.match(/^([A-G][#b]?)(-?\d)$/); return NOTE_IDX[m[1]] + (parseInt(m[2]) + 1) * 12; };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const QUAL = { '^7': [0, 4, 7, 11], '^9': [0, 4, 7, 11, 14], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14], 7: [0, 4, 7, 10], 9: [0, 4, 7, 10, 14], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], '7b9': [0, 4, 7, 10, 13], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '': [0, 4, 7], m: [0, 3, 7] };
const parseChord = name => { const m = name.match(/^([A-G][#b]?)(.*)$/); return { root: NOTE_IDX[m[1]], iv: QUAL[m[2]] ?? QUAL[''] }; };

// 1小節 = 16分音符 16 ステップ。'.' は前の音を伸ばす、'-' は休符
const SONGS = {
  level: { bpm: 128, swing: .3, style: 'swing', lead: 'brass',
    chords: ['F^7', 'F^7', 'Gm7', 'C7', 'Am7', 'D7', 'Gm7', 'C7', 'Bb^7', 'Bbm6', 'F^7', 'D7', 'Gm7', 'C7', 'F^7', 'C7'],
    melody: [
      'A4 . . C5 . . F5 . - . E5 . C5 . A4 .', 'G4 . A4 . C5 . . . - . . . D5 . E5 .',
      'F5 . . D5 . . Bb4 . - . D5 . F5 . G5 .', 'E5 . . . - . G5 . E5 . D5 . C5 . Bb4 .',
      'A4 . . C5 . . E5 . - . G5 . E5 . C5 .', 'F#4 . . A4 . . C5 . - . D5 . C5 . A4 .',
      'G4 . Bb4 . D5 . . . F5 . D5 . Bb4 . G4 .', 'A4 . . . Bb4 . . . B4 . . . C5 . . .',
      'D5 . . F5 . . A5 . - . G5 . F5 . D5 .', 'Db5 . . F5 . . G5 . - . F5 . Db5 . Bb4 .',
      'C5 . . E5 . . A5 . - . G5 . E5 . C5 .', 'A4 . C5 . F#5 . . . - . A5 . F#5 . D5 .',
      'G5 . . . - . F5 . D5 . . . Bb4 . . .', 'C5 . D5 . E5 . G5 . - . Bb5 . G5 . E5 .',
      'F5 . . . - . A5 . C6 . . . - . . .', '- . . . E5 . D5 . C5 . Bb4 . G4 . E4 .'] },
  wonder: { bpm: 152, swing: .08, style: 'latin', lead: 'synth',
    chords: ['Am7', 'Dm7', 'E7', 'Am7', 'F^7', 'G7', 'C^7', 'E7'],
    melody: [
      'E5 . - . A5 . - . C6 . B5 . A5 . - .', 'F5 . - . A5 . - . D6 . C6 . A5 . - .',
      'G#5 . B5 . D6 . - . E6 . D6 . B5 . G#5 .', 'A5 . . . - . C6 . B5 . A5 . E5 . - .',
      'C5 . E5 . A5 . - . C6 . A5 . E5 . - .', 'B4 . D5 . G5 . - . B5 . G5 . F5 . D5 .',
      'E5 . G5 . B5 . - . C6 . B5 . G5 . E5 .', 'G#5 . . . B5 . . . D6 . . . E6 . . .'] },
  title: { bpm: 112, swing: .33, style: 'swing', lead: 'epiano',
    chords: ['C^7', 'Em7', 'F^7', 'G7', 'Am7', 'D7', 'Dm7', 'G7'],
    melody: [
      'E4 . G4 . B4 . . . C5 . B4 . G4 . E4 .', '- . . . D5 . . . E5 . D5 . B4 . G4 .',
      'A4 . . C5 . . E5 . - . F5 . E5 . C5 .', 'D5 . . . B4 . . . G4 . . . - . . .',
      'C5 . . E5 . . G5 . - . A5 . G5 . E5 .', 'F#5 . . . D5 . . . A4 . . . C5 . . .',
      'D5 . F5 . A5 . . . G5 . F5 . D5 . C5 .', 'B4 . . . D5 . . . G5 . . . - . . .'] },
  clear: { bpm: 140, swing: 0, style: 'fanfare', lead: 'brass', once: true,
    chords: ['F', 'Bb', 'C7', 'F'],
    melody: ['C5 . C5 . C5 . F5 . - . - . - . A5 .', 'Bb5 . . . - . A5 . G5 . F5 . D5 . - .', 'E5 . . . G5 . . . Bb5 . . . C6 . . .', 'F6 . . . . . . . - . . . - . . .'] },
};

// 伴奏パターン（ステップ番号）
const STYLES = {
  swing: { comp: [2, 7, 10], compDur: 1.6, bass: b => [[0, 'root'], [4, 'fifth'], [6, 'ghost'], [8, 'third'], [12, 'approach']], kick: b => (b % 2 ? [0, 8, 10] : [0, 8]), snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], openHat: [14], stab: b => (b % 4 === 3 ? [12] : []) },
  latin: { comp: [0, 3, 6, 8, 11, 14], compDur: 1.2, bass: b => [[0, 'root'], [6, 'fifthLow'], [10, 'root'], [14, 'fifthLow']], kick: () => [0, 6, 8, 14], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], openHat: [14], stab: b => (b % 2 ? [8] : []) },
  fanfare: { comp: [0, 8], compDur: 3, bass: () => [[0, 'root'], [8, 'root']], kick: () => [0, 8], snare: [4, 12], hat: [0, 4, 8, 12], openHat: [0], stab: () => [0] },
};

export class GameAudio {
  constructor() { this.ctx = null; this.muted = false; this.songName = null; this.timer = null; }
  ensure(injected = null) {
    if (this.ctx) { if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC && !injected) return false;
    const c = this.ctx = injected ?? new AC();
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : .85; this.master.connect(c.destination);
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -18; this.comp.knee.value = 6; this.comp.ratio.value = 12; this.comp.attack.value = .002; this.comp.release.value = .12; this.comp.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = .55; this.music.connect(this.comp);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.comp);
    // リバーブ（ノイズから作るインパルス応答）
    const len = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    this.verbGain = c.createGain(); this.verbGain.gain.value = .22; this.verb.connect(this.verbGain); this.verbGain.connect(this.comp);
    const nlen = c.sampleRate; this.noise = c.createBuffer(1, nlen, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : .85; return this.muted; }

  // ---------- 楽器 ----------
  osc(type, f, detune = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; return o; }
  env(t, a, peak, d, sus, rel, end) { // ADSR
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001, sus), t + a + d);
    g.gain.setValueAtTime(Math.max(.0001, sus), Math.max(t + a + d, end)); g.gain.exponentialRampToValueAtTime(.0001, Math.max(t + a + d, end) + rel);
    return g;
  }
  out(node, wet = .5) { node.connect(this.music); const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(this.verb); }
  brass(t, midi, dur, vel, short = false) {
    const f = hz(midi), o1 = this.osc('sawtooth', f, 6), o2 = this.osc('sawtooth', f, -6), o3 = this.osc('square', f / 2);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2800 + midi * 10, t + .05); lp.frequency.exponentialRampToValueAtTime(1100, t + Math.max(.2, dur));
    const g = this.env(t, .025, vel, .12, vel * .7, .09, t + dur);
    const sub = this.ctx.createGain(); sub.gain.value = .35; o3.connect(sub); sub.connect(lp);
    const lfo = this.osc('sine', 5.5), lg = this.ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(short ? 0 : f * .012, t + .25);
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(lp); o2.connect(lp); lp.connect(g); this.out(g, .45);
    for (const o of [o1, o2, o3, lfo]) { o.start(t); o.stop(t + dur + .3); }
  }
  synth(t, midi, dur, vel) { // ワンダー用のきらびやかなリード
    const f = hz(midi), o1 = this.osc('square', f), o2 = this.osc('sawtooth', f, 8), o3 = this.osc('triangle', f * 2);
    o1.frequency.setValueAtTime(f * .96, t); o1.frequency.exponentialRampToValueAtTime(f, t + .04);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(4200, t + .06); lp.frequency.exponentialRampToValueAtTime(1500, t + Math.max(.25, dur));
    const g = this.env(t, .01, vel * .8, .1, vel * .55, .08, t + dur);
    const hi = this.ctx.createGain(); hi.gain.value = .25; o3.connect(hi); hi.connect(lp);
    const lfo = this.osc('sine', 6.5), lg = this.ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .01, t + .2);
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(lp); o2.connect(lp); lp.connect(g); this.out(g, .5);
    for (const o of [o1, o2, o3, lfo]) { o.start(t); o.stop(t + dur + .3); }
  }
  epiano(t, midi, dur, vel) {
    const f = hz(midi), g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vel, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(dur, .4) * 1.4);
    for (const [mul, v, dec] of [[1, 1, 1], [2, .28, .6], [7, .12, .12], [.5, .2, 1]]) {
      const o = this.osc('sine', f * mul), og = this.ctx.createGain();
      og.gain.setValueAtTime(v, t); og.gain.exponentialRampToValueAtTime(.001, t + Math.max(.05, dec * Math.max(dur, .4) * 1.4));
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur * 1.5 + .5);
    }
    this.out(g, .6);
  }
  bass(t, midi, dur, vel) {
    const f = hz(midi), o1 = this.osc('triangle', f), o2 = this.osc('sawtooth', f), o3 = this.osc('sine', f / 2);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + .18); lp.Q.value = 2;
    const g = this.env(t, .005, vel, .12, vel * .5, .06, t + dur);
    const sg = this.ctx.createGain(); sg.gain.value = .4; o2.connect(sg); sg.connect(lp);
    const sub = this.ctx.createGain(); sub.gain.value = .5; o3.connect(sub); sub.connect(g);
    o1.connect(lp); lp.connect(g); this.out(g, .1);
    for (const o of [o1, o2, o3]) { o.start(t); o.stop(t + dur + .2); }
  }
  kick(t, vel = .9) {
    const o = this.osc('sine', 160), g = this.ctx.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(42, t + .11);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + .28);
    const click = this.noiseSrc(); const cg = this.ctx.createGain(); cg.gain.setValueAtTime(vel * .3, t); cg.gain.exponentialRampToValueAtTime(.0001, t + .02);
    click.connect(cg); cg.connect(this.music); click.start(t); click.stop(t + .03);
    o.connect(g); g.connect(this.music); o.start(t); o.stop(t + .3);
  }
  snare(t, vel = .5, rim = false) {
    const n = this.noiseSrc(), bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rim ? 3200 : 1900; bp.Q.value = rim ? 4 : .9;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + (rim ? .08 : .18));
    n.connect(bp); bp.connect(g); this.out(g, .6); n.start(t); n.stop(t + .2);
    if (!rim) { const o = this.osc('triangle', 210), og = this.ctx.createGain(); og.gain.setValueAtTime(vel * .7, t); og.gain.exponentialRampToValueAtTime(.0001, t + .1); o.frequency.exponentialRampToValueAtTime(150, t + .08); o.connect(og); og.connect(this.music); o.start(t); o.stop(t + .12); }
  }
  hat(t, vel = .22, open = false) {
    const n = this.noiseSrc(), hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + (open ? .3 : .045));
    n.connect(hp); hp.connect(g); g.connect(this.music); n.start(t); n.stop(t + .32);
  }
  noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }
  lead(kind, t, midi, dur, vel) { if (kind === 'brass') this.brass(t, midi, dur, vel); else if (kind === 'synth') this.synth(t, midi, dur, vel); else this.epiano(t, midi, dur, vel); }

  // ---------- 効果音 ----------
  tone(f, dur, { type = 'square', vol = .12, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || !f) return;
    const t0 = this.ctx.currentTime + delay, o = this.osc(type, f), g = this.ctx.createGain();
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(this.sfxBus); const s = this.ctx.createGain(); s.gain.value = .3; g.connect(s); s.connect(this.verb);
    o.start(t0); o.stop(t0 + dur + .02);
  }
  sfx(name) {
    if (!this.ctx) return;
    const arp = (fs, dur, gap, opt) => fs.forEach((f, i) => this.tone(f, dur, { ...opt, delay: i * gap }));
    switch (name) {
      case 'jump': this.tone(320, .16, { type: 'triangle', slide: 480, vol: .16 }); this.tone(640, .1, { type: 'sine', slide: 500, vol: .06 }); break;
      case 'coin': this.tone(1568, .07, { type: 'sine', vol: .14 }); this.tone(2093, .3, { type: 'sine', vol: .14, delay: .07 }); this.tone(4186, .25, { type: 'sine', vol: .03, delay: .07 }); break;
      case 'fcoin': arp([1047, 1319, 1568, 2093, 2637], .3, .07, { type: 'sine', vol: .13 }); break;
      case 'stomp': this.tone(220, .1, { type: 'triangle', slide: -160, vol: .25 }); this.tone(90, .12, { type: 'sine', slide: -50, vol: .3 }); break;
      case 'bump': this.tone(140, .08, { type: 'triangle', vol: .25 }); this.tone(70, .1, { type: 'sine', vol: .2 }); break;
      case 'break': arp([200, 150, 110], .12, .03, { type: 'sawtooth', vol: .1 }); this.tone(60, .15, { type: 'sine', vol: .25 }); break;
      case 'power': arp([523, 659, 784, 1047, 1319, 1568], .16, .05, { type: 'triangle', vol: .14 }); break;
      case 'hurt': this.tone(420, .3, { type: 'sawtooth', slide: -320, vol: .1 }); this.tone(210, .3, { type: 'triangle', slide: -150, vol: .15 }); break;
      case 'die': arp([660, 494, 392, 294, 220, 147], .28, .13, { type: 'triangle', vol: .18 }); break;
      case 'wonder': arp([392, 523, 659, 784, 1047, 1319, 1568, 2093, 2637], .4, .06, { type: 'sine', vol: .14 }); arp([196, 262, 330, 392, 523], .5, .1, { type: 'triangle', vol: .08 }); break;
      case 'seed': arp([1047, 1319, 1568, 2093, 1568, 2093, 2637], .25, .08, { type: 'triangle', vol: .12 }); break;
      case 'talk': arp([880, 1175, 988], .07, .06, { type: 'sine', vol: .1 }); break;
      case 'bubble': this.tone(600, .18, { type: 'sine', slide: 600, vol: .1 }); break;
      case 'pop': this.tone(1000, .06, { type: 'sine', slide: -700, vol: .12 }); break;
      case 'trunk': this.tone(160, .22, { type: 'sawtooth', slide: 140, vol: .12 }); this.tone(80, .2, { type: 'sine', slide: 60, vol: .2 }); break;
      case 'select': this.tone(1047, .06, { type: 'sine', vol: .12 }); break;
      case 'pole': arp([523, 587, 659, 698, 784, 880, 988, 1047], .12, .05, { type: 'triangle', vol: .12 }); break;
      case 'oneup': arp([659, 784, 1319, 1047, 1568, 2093], .16, .07, { type: 'triangle', vol: .14 }); break;
    }
  }

  // ---------- BGM ----------
  play(name) {
    if (!this.ctx || this.songName === name) return;
    this.stop();
    const song = SONGS[name]; if (!song) return;
    this.songName = name;
    const st = STYLES[song.style], bars = song.chords.length, len = bars * 16;
    const events = Array.from({ length: len }, () => []);
    const at = (step, fn) => events[((step % len) + len) % len].push(fn);
    const chords = song.chords.map(parseChord);
    // メロディ
    song.melody.forEach((bar, b) => {
      const toks = bar.trim().split(/\s+/);
      toks.forEach((tok, i) => {
        if (tok === '-' || tok === '.') return;
        let d = 1; while (toks[i + d] === '.') d++;
        const midi = nm(tok);
        at(b * 16 + i, (t, sd) => this.lead(song.lead, t, midi, sd * d * .9, song.lead === 'epiano' ? .22 : .14));
      });
    });
    chords.forEach((ch, b) => {
      const next = chords[(b + 1) % bars];
      // コード伴奏（エレピ）: 3度・5度・7度＋ルートを 60〜76 の範囲に
      const voicing = ch.iv.slice(1).map(i => 60 + ((ch.root + i) % 12)).concat([72 + ((ch.root) % 12) - (ch.root > 6 ? 12 : 0)]).map(n => n < 62 ? n + 12 : n);
      for (const s of st.comp) at(b * 16 + s, (t, sd) => voicing.forEach((n, k) => this.epiano(t + k * .004, n, sd * st.compDur, .09)));
      for (const s of st.stab(b)) at(b * 16 + s, (t, sd) => voicing.forEach(n => this.brass(t, n, sd * 1.4, .05, true)));
      // ベース
      const root = 36 + ch.root, fifth = root + 7, third = root + ch.iv[1];
      const approach = 36 + next.root - 1;
      for (const [s, kind] of st.bass(b)) {
        const n = kind === 'root' ? root : kind === 'fifth' ? fifth : kind === 'fifthLow' ? fifth - 12 : kind === 'third' ? third : kind === 'approach' ? approach : root;
        at(b * 16 + s, (t, sd) => this.bass(t, n, sd * (kind === 'ghost' ? 1 : 2.5), kind === 'ghost' ? .18 : .42));
      }
      // ドラム
      for (const s of st.kick(b)) at(b * 16 + s, t => this.kick(t, s === 0 ? .9 : .7));
      for (const s of st.snare) at(b * 16 + s, t => this.snare(t, song.style === 'latin' ? .35 : .45, song.style === 'latin'));
      for (const s of st.hat) at(b * 16 + s, t => this.hat(t, s % 4 === 0 ? .22 : .12));
      for (const s of st.openHat) if (b % 2 === 1 || song.style === 'fanfare') at(b * 16 + s, t => this.hat(t, .18, true));
    });
    const stepDur = 60 / song.bpm / 4;
    this.seq = { events, len, stepDur, swing: song.swing, once: !!song.once, cursor: 0, t0: this.ctx.currentTime + .08 };
    this.pump(this.ctx.currentTime + .35);
    this.timer = setInterval(() => this.pump(this.ctx.currentTime + .35), 80);
  }
  // until（秒）までのイベントを鳴らす
  pump(until) {
    const q = this.seq; if (!q) return;
    while (true) {
      const t = q.t0 + q.cursor * q.stepDur + (q.cursor % 2 ? q.swing * q.stepDur : 0);
      if (t > until) return;
      if (q.once && q.cursor >= q.len) { this.stop(); return; }
      for (const fn of q.events[q.cursor % q.len]) fn(t, q.stepDur);
      q.cursor++;
    }
  }
  // テスト・試聴用: 曲を OfflineAudioContext で seconds 秒ぶんレンダリングして AudioBuffer を返す
  static async render(name, seconds, sampleRate = 44100) {
    const off = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
    const a = new GameAudio(); a.ensure(off); a.play(name); a.pump(seconds + 1); if (a.timer) clearInterval(a.timer);
    return off.startRendering();
  }
  static get songs() { return Object.keys(SONGS); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.songName = null; this.seq = null; }
}
