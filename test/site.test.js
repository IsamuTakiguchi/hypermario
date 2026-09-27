import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// PNG ヘッダから幅・高さを読む
const pngSize = file => { const b = readFileSync(file); assert.equal(b.toString('ascii', 1, 4), 'PNG', `${file} は PNG`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('マニフェストが正しく、参照するアイコンが実在してサイズが一致する', () => {
  const m = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some(i => i.purpose === 'maskable'), 'maskable アイコンがある');
  for (const icon of m.icons) {
    assert.ok(existsSync(icon.src), `${icon.src} が存在する`);
    const [w, h] = pngSize(icon.src);
    assert.equal(`${w}x${h}`, icon.sizes, `${icon.src} のサイズ`);
  }
});

test('index.html がマニフェストと iOS 用アイコンを参照している', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"[^>]*href="\.\/icons\/apple-touch-icon\.png"/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="theme-color"/);
  assert.deepEqual(pngSize('icons/apple-touch-icon.png'), [180, 180]);
});

test('デプロイ用ワークフローがアイコンとマニフェストを配信物に含める', () => {
  const yml = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(yml, /cp -r .*manifest\.webmanifest .*icons .*dist\//);
});
