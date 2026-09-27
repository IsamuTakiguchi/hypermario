// BGM を WAV に書き出して確認する（ローカル専用）: node scripts/render-bgm.mjs [出力先ディレクトリ]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const require = createRequire(process.env.PW_ROOT ?? '/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const outDir = process.argv[2] ?? 'scripts/bgm';
await mkdir(outDir, { recursive: true });
const port = 8771;
const server = spawn(process.execPath, ['scripts/serve.js', String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
try {
  const page = await browser.newPage();
  page.on('pageerror', e => { throw e; });
  await page.goto(`http://localhost:${port}/`);
  const songs = await page.evaluate(async () => {
    const { GameAudio } = await import('./src/audio.js');
    const out = {};
    for (const name of GameAudio.songs) {
      const secs = name === 'clear' ? 5 : 16;
      const buf = await GameAudio.render(name, secs, 22050);
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      let peak = 0, sum = 0, silent = 0;
      const win = 2205; // 0.1 秒ごとの無音チェック
      for (let i = 0; i < L.length; i += win) { let e = 0; for (let j = i; j < Math.min(L.length, i + win); j++) { const v = (L[j] + R[j]) / 2; e += v * v; peak = Math.max(peak, Math.abs(v)); sum += v * v; } if (e / win < 2e-7 && i < L.length - win * 5) silent++; }
      // 16bit PCM WAV に変換
      const n = L.length, data = new DataView(new ArrayBuffer(44 + n * 4));
      const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
      str(0, 'RIFF'); data.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true);
      data.setUint32(24, 22050, true); data.setUint32(28, 22050 * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) { data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
      out[name] = { peak, rms: Math.sqrt(sum / n), silentWindows: silent, seconds: secs, wav: btoa(String.fromCharCode(...new Uint8Array(data.buffer).subarray(0, 0))) , bytes: Array.from(new Uint8Array(data.buffer)) };
    }
    return out;
  });
  for (const [name, r] of Object.entries(songs)) {
    await writeFile(`${outDir}/${name}.wav`, Buffer.from(r.bytes));
    console.log(`${name}: ${r.seconds}s peak=${r.peak.toFixed(2)} rms=${r.rms.toFixed(3)} silent=${r.silentWindows}`);
    if (r.rms < .01) throw new Error(`${name} がほぼ無音`);
    if (r.silentWindows > 8) throw new Error(`${name} に無音区間が多い`);
  }
  console.log('BGM OK');
} finally { await browser.close(); server.kill(); }
