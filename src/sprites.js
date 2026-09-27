// オリジナルのドット絵。文字列で定義してオフスクリーン canvas に焼く
const PAL = {
  k: '#1b1b2f', w: '#ffffff', r: '#e53935', R: '#9c1a16', o: '#ff9800', y: '#ffd54f', Y: '#f4a300',
  g: '#43a047', G: '#1b5e20', b: '#1e88e5', B: '#0d47a1', s: '#ffcc99', n: '#8d5524', N: '#5d3a1a',
  p: '#8e24aa', P: '#ce93d8', c: '#4dd0e1', C: '#0097a7', e: '#b0bec5', E: '#607d8b', t: '#d7a86e',
  m: '#ff4081', l: '#aed581', d: '#7a7a8c', D: '#4a4a5c', i: '#ffe0b2',
};

const HEAD_S = [ // 主人公の頭（小）
  '.....ppppp......',
  '....pppppppp....',
  '...pppppppppp...',
  '....ssssssss....',
  '...sskssksss....',
  '...ssssssssss...',
  '....ssssssss....',
];
const HERO_SMALL = {
  idle: [...HEAD_S,
    '....yyyyyyyy....',
    '...yybbbbbbyy...',
    '...y.bbbbbb.y...',
    '...s.bbbbbb.s...',
    '.....bbbbbb.....',
    '.....bb..bb.....',
    '....nnn..nnn....',
    '...nnnn..nnnn...',
    '................'],
  walk: [...HEAD_S,
    '....yyyyyyyy....',
    '...yybbbbbbyy...',
    '...y.bbbbbb.y...',
    '...s.bbbbbb.s...',
    '.....bbbbbb.....',
    '....bb....bb....',
    '...nnn....nnn...',
    '..nnnn....nnnn..',
    '................'],
  jump: [...HEAD_S,
    '..s.yyyyyyyy.s..',
    '..yyybbbbbbyyy..',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '....bb....bb....',
    '...nnn....nnn...',
    '...nnn....nnn...',
    '................'],
};
const BODY_B = [
  '....yyyyyyyy....',
  '...yyyyyyyyyy...',
  '...yybbbbbbyy...',
  '...yybbbbbbyy...',
  '...y.bbbbbb.y...',
  '...s.bbbbbb.s...',
  '.....bbbbbb.....',
  '.....bbbbbb.....',
];
const HERO_BIG = {
  idle: [...HEAD_S, ...BODY_B,
    '.....bbbbbb.....',
    '.....bb..bb.....',
    '.....bb..bb.....',
    '....nnn..nnn....',
    '...nnnn..nnnn...',
    '................',
    '................',
    '................',
    '................'],
  walk: [...HEAD_S, ...BODY_B,
    '....bbb..bbb....',
    '....bb....bb....',
    '...bb......bb...',
    '..nnn......nnn..',
    '.nnnn......nnnn.',
    '................',
    '................',
    '................',
    '................'],
  jump: [...HEAD_S,
    '..s.yyyyyyyy.s..',
    '..yyyyyyyyyyyy..',
    '..yyybbbbbbyyy..',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '....bb....bb....',
    '....bb....bb....',
    '...nnn....nnn...',
    '...nnn....nnn...',
    '................',
    '................',
    '................',
    '................'],
  crouch: [...HEAD_S,
    '....yyyyyyyy....',
    '...yybbbbbbyy...',
    '...s.bbbbbb.s...',
    '.....bbbbbb.....',
    '....bbb..bbb....',
    '...nnnn..nnnn...',
    '...nnnn..nnnn...',
    '................',
    '................', '................', '................', '................', '................', '................', '................', '................', '................'],
};
// ゾウ形態（はなで攻撃）
const HEAD_T = [
  '....pppppp......',
  '...pppppppp.....',
  '..eepppppppee...',
  '.eeeddddddeeee..',
  '.eeddkddkddeee..',
  '..edddddddddd...',
  '...ddddddddd....',
  '.....dddddd.....',
];
const HERO_TRUNK = {
  idle: [...HEAD_T,
    '....yyyyyyyyyd..',
    '...yyyyyyyyyy.d.',
    '...yybbbbbbyy.d.',
    '...yybbbbbbyy...',
    '...y.bbbbbb.y...',
    '...d.bbbbbb.d...',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bb..bb.....',
    '.....bb..bb.....',
    '....ddd..ddd....',
    '...dddd..dddd...',
    '................', '................', '................'],
  walk: [...HEAD_T,
    '....yyyyyyyyyd..',
    '...yyyyyyyyyy.d.',
    '...yybbbbbbyy.d.',
    '...yybbbbbbyy...',
    '...y.bbbbbb.y...',
    '...d.bbbbbb.d...',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '....bbb..bbb....',
    '....bb....bb....',
    '...bb......bb...',
    '..ddd......ddd..',
    '.dddd......dddd.',
    '................', '................', '................'],
  jump: [...HEAD_T,
    '....yyyyyyyyyddd',
    '..d.yyyyyyyyyy..',
    '..yyybbbbbbyyy..',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '....bb....bb....',
    '....bb....bb....',
    '...ddd....ddd...',
    '...ddd....ddd...',
    '................', '................', '................'],
  attack: [...HEAD_T,
    '....yyyyyyyyyy..',
    '...yyyyyyyyyyddd',
    '...yybbbbbbyy.dd',
    '...yybbbbbbyy...',
    '...y.bbbbbb.....',
    '...d.bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bbbbbb.....',
    '.....bb..bb.....',
    '.....bb..bb.....',
    '....ddd..ddd....',
    '...dddd..dddd...',
    '................', '................', '................'],
  crouch: HERO_BIG.crouch,
};
// あわ形態＝大きい形態の色違い（帽子・服が水色）
const recolor = (frames, map) => Object.fromEntries(Object.entries(frames).map(([k, rows]) => [k, rows.map(r => r.replace(/./g, ch => map[ch] ?? ch))]));
const HERO_BUBBLE = recolor(HERO_BIG, { p: 'c', y: 'w', b: 'C' });

const WALKER = {
  a: ['................', '......kkkk......', '....kknnnnkk....', '...knnnnnnnnk...', '..knnwknnwknnk..', '..knnkknnkknnk..', '..knnnnnnnnnnk..', '..knnnkkkknnnk..', '...knnnnnnnnk...', '....kknnnnkk....', '.....kkkkkk.....', '....kNNkkNNk....', '...kNNNkkNNNk...', '...kNNNkkNNNk...', '....kkk..kkk....', '................'],
  b: ['................', '......kkkk......', '....kknnnnkk....', '...knnnnnnnnk...', '..knnwknnwknnk..', '..knnkknnkknnk..', '..knnnnnnnnnnk..', '..knnnkkkknnnk..', '...knnnnnnnnk...', '....kknnnnkk....', '.....kkkkkk.....', '.....kNNNNk.....', '....kNNNNNNk....', '...kNNNNNNNNk...', '...kkkkkkkkkk...', '................'],
  flat: ['................', '................', '................', '................', '................', '................', '................', '................', '................', '....kkkkkkkk....', '..kknnnnnnnnkk..', '.knnwknnnnwknnk.', '.knnkknnnnkknnk.', '..kknnnnnnnnkk..', '....kkkkkkkk....', '................'],
};
const SPIKY = {
  a: ['....e..ee..e....', '...ee.eeee.ee...', '..kkekkeekkekk..', '..kPPPPPPPPPPk..', '.kPPwkPPPPwkPPk.', '.kPPkkPPPPkkPPk.', '.kPPPPPPPPPPPPk.', '.kPPPkkkkkkPPPk.', '..kPPPPPPPPPPk..', '...kkPPPPPPkk...', '.....kkkkkk.....', '....kppkkppk....', '...kpppkkpppk...', '...kpppkkpppk...', '....kkk..kkk....', '................'],
  b: ['....e..ee..e....', '...ee.eeee.ee...', '..kkekkeekkekk..', '..kPPPPPPPPPPk..', '.kPPwkPPPPwkPPk.', '.kPPkkPPPPkkPPk.', '.kPPPPPPPPPPPPk.', '.kPPPkkkkkkPPPk.', '..kPPPPPPPPPPk..', '...kkPPPPPPkk...', '.....kkkkkk.....', '.....kppppk.....', '....kppppppk....', '...kppppppppk...', '...kkkkkkkkkk...', '................'],
};
const FLYER = {
  a: ['................', '.ww..........ww.', 'wwww........wwww', '.wwwwkkkkkkwwww.', '..wkkccccccckkw.', '...kccwkccwkcck.', '...kcckkcckkcck.', '...kcccccccccck.', '...kccckkkkcck..', '....kcccccccck..', '.....kkcccckk...', '.......kkkk.....', '................', '................', '................', '................'],
  b: ['................', '................', '................', '....kkkkkkkk....', '...kkccccccckk..', 'ww.kccwkccwkcc.w', 'wwwkcckkcckkccww', '.wwkcccccccccckw', '...kccckkkkcck..', '....kcccccccck..', '.....kkcccckk...', '.......kkkk.....', '................', '................', '................', '................'],
};
const COIN = [
  '.....kkkkkk.....', '....kyyyyyyk....', '...kyyYYYYyyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyYyyyyYyk...', '...kyyYYYYyyk...', '....kyyyyyyk....', '.....kkkkkk.....', '................', '................',
];
const COIN_THIN = COIN.map(r => r.slice(4, 12).replace(/[yY]/g, 'Y').padStart(12, '.').padEnd(16, '.'));
const FCOIN = [
  '.....kkkkkk.....', '...kkPPPPPPkk...', '..kPPPPwwPPPPk..', '.kPPPPwPPwPPPPk.', '.kPPPwPPPPwPPPk.', 'kPPPPwPPPPwPPPPk', 'kPPPPPwPPwPPPPPk', 'kPPPPPPwwPPPPPPk', 'kPPPPPPwwPPPPPPk', 'kPPPPPwPPwPPPPPk', '.kPPPwPPPPwPPPk.', '.kPPPPwPPwPPPPk.', '..kPPPPwwPPPPk..', '...kkPPPPPPkk...', '.....kkkkkk.....', '................',
];
const BERRY = [
  '................', '.......gg.......', '......gGg.......', '.....kkgkk......', '...kkrrrrrkk....', '..krrrwwrrrrk...', '.krrrrwrrrrrrk..', '.krrrrrrrrrrrk..', '.krrrrrrrrrrrk..', '.kRrrrrrrrrrRk..', '.kRRrrrrrrrRRk..', '..kRRRrrrRRRk...', '...kkRRRRRkk....', '.....kkkkk......', '................', '................',
];
const FRUIT = [ // ゾウのフルーツ（灰色の実にピンクの耳）
  '................', '.......gg.......', '......gg........', '...kkkkkkkkk....', '..kmmkeeeekmmk..', '.kmmmkeeeekmmmk.', '.kmmkeeeeeekmmk.', '..kkeekeekeekk..', '...keeeeeeeek...', '...keeeeeeeek...', '...keedddddek...', '....kkddddkk....', '......kddk......', '.......kk.......', '................', '................',
];
const BFLOWER = [ // あわのはな
  '................', '.....kkkkkk.....', '....kcwccwck....', '...kccccccccck..', '..kccwkccccwcck.', '..kcccccccccck..', '...kcccccccck...', '....kkccckkk....', '......kgk.......', '....l.kgk.l.....', '....lkkgkkl.....', '.....lkgkl......', '......kgk.......', '......kgk.......', '................', '................',
];
const TALKER = [ // おしゃべりフラワー
  '................', '....yyy..yyy....', '...yyyyyyyyyy...', '..yykkkkkkkkyy..', '..ykiiiiiiiiky..', '.yykiwkiiwkiiyy.', '.yykikkiikkiiyy.', '..ykiiiiiiiiky..', '..ykiikkkkiiky..', '...ykkiiiikky...', '....yyykkyyy....', '......kgk.......', '...l..kgk..l....', '...lkkkgkkkl....', '....lkkgkkl.....', '......kgk.......',
];
const SEED = [
  '................', '......kkkk......', '.....kwwwwk.....', '....kwllllwk....', '...kwlllllllk...', '...kllgggglkk...', '..klggGGGGggk...', '..klgGGGGGGgk...', '..klgGGGGGGgk...', '..kklggGGgglk...', '...kklggggkk....', '....kkllkk......', '.....kkkk.......', '................', '................', '................',
];

function bake(rows) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = PAL[rows[y][x]];
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}
const bakeAll = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, bake(v)]));

// テスト用に生データも公開
export const SPRITE_DATA = { HERO_SMALL, HERO_BIG, HERO_TRUNK, HERO_BUBBLE, WALKER, SPIKY, FLYER, COIN, COIN_THIN, FCOIN, BERRY, FRUIT, BFLOWER, TALKER, SEED };

let cache = null;
export function getSprites() {
  if (cache) return cache;
  cache = {
    hero: { small: bakeAll(HERO_SMALL), big: bakeAll(HERO_BIG), trunk: bakeAll(HERO_TRUNK), bubble: bakeAll(HERO_BUBBLE) },
    walker: bakeAll(WALKER), spiky: bakeAll(SPIKY), flyer: bakeAll(FLYER),
    coin: bake(COIN), coinThin: bake(COIN_THIN), fcoin: bake(FCOIN),
    berry: bake(BERRY), fruit: bake(FRUIT), bflower: bake(BFLOWER), talker: bake(TALKER), seed: bake(SEED),
  };
  return cache;
}
