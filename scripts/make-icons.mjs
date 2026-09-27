// ホーム画面用アイコンをドット絵から生成する: npm run icons（Chromium + Playwright が必要）
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const require = createRequire(process.env.PW_ROOT ?? '/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const port = 8767;
const server = spawn(process.execPath, ['scripts/serve.js', String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/scripts/icon.html`);
  await page.waitForFunction(() => typeof window.renderIcon === 'function');
  const targets = [
    ['icons/icon-192.png', 192, false], ['icons/icon-512.png', 512, false],
    ['icons/maskable-512.png', 512, true], ['icons/apple-touch-icon.png', 180, true], ['icons/favicon-64.png', 64, false],
  ];
  for (const [file, size, maskable] of targets) {
    const dataUrl = await page.evaluate(([s, m]) => window.renderIcon(s, m), [size, maskable]);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('wrote', file);
  }
} finally { await browser.close(); server.kill(); }
