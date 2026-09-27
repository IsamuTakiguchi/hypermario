// コースデータ（純粋なデータ＋パーサ。ブラウザにも Node のテストにも依存しない）
export const TILE = 16;
export const ROWS = 15;

// タイル記号
//  .  空気            #  地面           =  レンガ（大きい形態で壊せる）
//  ?  コインブロック   P  アイテムブロック U  使用済みブロック
//  T  土管の口        |  土管の胴        -  すりぬけ床
//  ^  トゲ            x  ワンダー中だけ現れる足場
//  c  コイン          F  フラワーコイン（各コース3枚）
//  *  ワンダーフラワー @  ワンダーシード（ワンダー中だけ出現）
//  t  おしゃべりフラワー S  スタート       G  ゴールポール
//  e  歩く敵          s  トゲ敵          b  飛ぶ敵
export const SOLID = new Set(['#', '=', '?', 'P', 'U', 'T', '|']);
export const ALL_CHARS = new Set([...SOLID, '.', '-', '^', 'x', 'c', 'F', '*', '@', 't', 'S', 'G', 'e', 's', 'b']);

class Grid {
  constructor(w) {
    this.w = w;
    this.rows = Array.from({ length: ROWS }, () => Array(w).fill('.'));
  }
  set(x, y, c) {
    if (x < 0 || x >= this.w || y < 0 || y >= ROWS) throw new Error(`範囲外 (${x},${y})`);
    this.rows[y][x] = c;
  }
  put(x, y, str) { for (let i = 0; i < str.length; i++) if (str[i] !== ' ') this.set(x + i, y, str[i]); }
  fill(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  ground(x0, x1, top = 13) { this.fill(x0, top, x1, ROWS - 1, '#'); }
  pipe(x, top, floor = 13) {
    this.put(x, top, 'TT');
    for (let y = top + 1; y < floor; y++) this.put(x, y, '||');
  }
  stairs(x, n, dir = 1, floor = 13) { // 上り(1)/下り(-1)階段
    for (let i = 0; i < n; i++) {
      const h = dir === 1 ? i + 1 : n - i;
      this.fill(x + i, floor - h, x + i, floor - 1, '#');
    }
  }
  coins(x, y, n, step = 1) { for (let i = 0; i < n; i++) this.set(x + i * step, y, 'c'); }
  toRows() { return this.rows.map(r => r.join('')); }
}

function level(meta, build) {
  const g = new Grid(meta.width);
  build(g);
  return { ...meta, rows: g.toRows() };
}

export const LEVELS = [
  level({
    id: 'w1-1', name: 'はじまりの草原', width: 170, time: 400, theme: 'grass', item: 'trunk',
    wonder: { type: 'wobble', label: 'ゆらゆらワンダー！' },
    talks: ['やあ！ぼうけんの はじまりだね', 'あの はなに さわってごらん', 'ワンダーシードを とったね！ すごい！', 'ゴールは もうすぐ！'],
  }, g => {
    g.ground(0, 43); g.ground(47, 76); g.ground(80, 118); g.ground(122, 169);
    g.put(3, 12, 'S'); g.put(9, 12, 't');
    g.put(14, 9, '?'); g.coins(17, 8, 3);
    g.put(22, 9, '?P?'); g.put(28, 12, 'e');
    g.coins(34, 7, 4);
    g.put(37, 12, 'e');
    g.put(50, 9, '=?='); g.put(54, 9, '=====');
    g.put(56, 6, 'F');
    g.pipe(62, 11); g.pipe(68, 10);
    g.put(72, 12, 'e'); g.put(75, 12, 'e');
    g.coins(66, 6, 4);
    g.put(84, 12, '*'); g.put(88, 12, 't'); g.put(92, 12, 's');
    g.put(90, 10, 'xxx'); g.put(94, 8, 'xxx'); g.put(98, 6, 'xxxx'); g.put(103, 5, 'xxxxx');
    g.put(91, 9, 'c'); g.put(95, 7, 'c'); g.put(99, 5, 'cc'); g.put(105, 4, '@');
    g.put(96, 12, 'e'); g.put(108, 12, 'F');
    g.put(112, 12, 't');
    g.put(114, 10, '-------'); g.put(116, 9, 'ccc');
    g.put(124, 8, 'b'); g.put(126, 9, '=P='); g.put(131, 12, 's');
    g.put(126, 5, 'F');
    g.stairs(136, 4, 1); g.stairs(142, 4, -1);
    g.put(150, 12, 'e'); g.put(155, 12, 't');
    g.put(160, 12, 'G');
  }),

  level({
    id: 'w1-2', name: 'そらの浮島', width: 180, time: 400, theme: 'sky', item: 'bubble',
    wonder: { type: 'lowgrav', label: 'ふわふわワンダー！' },
    talks: ['ここは たかいところ！ おちないでね', 'ワンダーちゅうは ジャンプが ふわふわ！', 'あわで てきを つかまえよう'],
  }, g => {
    g.ground(0, 14); g.ground(19, 30); g.ground(36, 44); g.ground(50, 60); g.ground(66, 90); g.ground(96, 110); g.ground(116, 132); g.ground(140, 179);
    g.put(3, 12, 'S'); g.put(8, 12, 't');
    g.put(15, 10, '----'); g.put(16, 8, 'c'); g.put(17, 8, 'c');
    g.put(22, 9, '?P?'); g.put(26, 12, 'e');
    g.put(31, 10, '-----'); g.put(32, 8, 'ccc');
    g.put(38, 8, '===='); g.put(39, 5, 'F');
    g.put(40, 12, 's');
    g.put(45, 10, '-----'); g.put(46, 9, 'ccc');
    g.put(52, 9, '?'); g.put(55, 12, 'e'); g.put(56, 8, 'b');
    g.put(61, 10, '-----'); g.put(62, 9, 'ccc');
    g.put(70, 12, '*'); g.put(74, 12, 't');
    g.put(76, 9, 'xxx'); g.put(80, 6, 'xxx'); g.put(84, 3, 'xxxx'); g.put(85, 2, '@');
    g.put(77, 8, 'c'); g.put(81, 5, 'c'); g.put(78, 12, 'e'); g.put(84, 12, 'e');
    g.put(88, 12, 'F');
    g.put(91, 11, '-----'); g.put(92, 9, 'ccc');
    g.pipe(100, 10); g.put(104, 12, 's'); g.put(106, 8, 'b');
    g.put(111, 10, '-----'); g.put(112, 8, 'ccc');
    g.put(118, 9, '=P='); g.put(119, 6, 'F'); g.put(124, 12, 'e'); g.put(128, 12, 'e');
    g.put(133, 10, '-------'); g.put(135, 8, 'ccc');
    g.put(142, 12, 't'); g.put(146, 8, 'b');
    g.stairs(150, 5, 1); g.stairs(157, 5, -1);
    g.put(166, 12, 'e');
    g.put(172, 12, 'G');
  }),

  level({
    id: 'w1-3', name: 'くらやみ洞窟', width: 176, time: 350, theme: 'cave', item: 'trunk',
    wonder: { type: 'dark', label: 'まっくらワンダー！' },
    talks: ['ほらあなは トゲが おおいから きをつけて', 'くらい…！ コインの ひかりを たよりに すすもう', 'ゾウのはなで レンガを こわせるよ'],
  }, g => {
    g.ground(0, 30); g.ground(34, 60); g.ground(64, 100); g.ground(104, 140); g.ground(144, 175);
    g.fill(0, 0, 175, 0, '#');
    g.put(3, 12, 'S'); g.put(8, 12, 't');
    g.put(12, 12, '^^'); g.put(11, 9, '----');
    g.put(18, 9, '?=?'); g.put(22, 12, 'e'); g.put(26, 12, 's');
    g.put(31, 10, '---'); g.put(32, 9, 'c');
    g.put(36, 9, '====='); g.put(38, 6, 'F'); g.put(41, 12, '^^^'); g.put(40, 9, '=');
    g.put(46, 12, 'e'); g.put(50, 9, '=P='); g.put(54, 12, 's'); g.put(57, 12, '^^');
    g.put(61, 10, '---'); g.put(62, 9, 'c');
    g.put(66, 12, '*'); g.put(70, 12, 't');
    g.coins(72, 10, 6, 2); g.put(76, 12, 'e'); g.put(82, 12, 's');
    g.put(84, 9, 'xxx'); g.put(88, 7, 'xxx'); g.put(92, 5, 'xxxx'); g.put(94, 4, '@');
    g.put(85, 8, 'c'); g.put(89, 6, 'c');
    g.put(97, 12, 'F');
    g.put(101, 10, '---'); g.put(102, 9, 'c');
    g.put(106, 12, 'e'); g.put(110, 12, '^^^'); g.put(109, 9, '-----'); g.put(111, 8, 'c');
    g.pipe(116, 10); g.put(120, 12, 's'); g.put(124, 8, 'b');
    g.put(128, 9, '=?='); g.put(129, 6, 'F'); g.put(133, 12, 'e'); g.put(136, 12, 'e');
    g.put(141, 10, '---'); g.put(142, 9, 'c');
    g.put(146, 12, 't'); g.put(150, 12, '^^'); g.put(149, 9, '----');
    g.stairs(156, 4, 1); g.stairs(162, 4, -1);
    g.put(168, 12, 'G');
  }),

  level({
    id: 'w1-4', name: 'ドキドキ土管パレード', width: 190, time: 400, theme: 'sunset', item: 'bubble',
    wonder: { type: 'pipes', label: 'どかんワンダー！' },
    talks: ['さいごの コースだよ！', 'ワンダーちゅうは どかんが のびちぢみ！ タイミングを みて', 'てっぺんに シードが あるよ', 'ここまで こられたなんて…！ ラストスパート！'],
  }, g => {
    g.ground(0, 40); g.ground(44, 80); g.ground(84, 120); g.ground(124, 189);
    g.put(3, 12, 'S'); g.put(8, 12, 't');
    g.pipe(14, 11); g.put(18, 12, 'e'); g.pipe(22, 10); g.put(26, 12, 'e');
    g.put(30, 9, '?P?'); g.put(31, 6, 'F');
    g.put(36, 12, 's');
    g.put(41, 10, '---'); g.put(42, 9, 'c');
    g.put(48, 12, '*'); g.put(52, 12, 't');
    g.pipe(56, 11); g.pipe(61, 11); g.pipe(66, 11); g.pipe(71, 11);
    g.put(56, 5, 'cc'); g.put(61, 5, 'cc'); g.put(66, 5, 'cc');
    g.put(71, 4, 'xx'); g.put(71, 3, '@');
    g.put(59, 12, 'e'); g.put(64, 12, 's'); g.put(69, 12, 'e');
    g.put(76, 12, 'F');
    g.put(81, 10, '---'); g.put(82, 9, 'c');
    g.put(88, 12, 't'); g.put(92, 8, 'b'); g.put(96, 9, '=?='); g.put(100, 12, 's'); g.put(104, 8, 'b');
    g.put(108, 9, '=P='); g.put(109, 6, 'F'); g.put(112, 12, 'e'); g.put(116, 12, 'e');
    g.put(121, 10, '---'); g.put(122, 9, 'c');
    g.pipe(128, 10); g.put(132, 12, 's'); g.pipe(136, 9); g.put(140, 12, 's'); g.put(142, 8, 'b');
    g.put(148, 12, 't');
    g.stairs(154, 5, 1); g.put(159, 8, '======'); g.coins(159, 6, 6); g.stairs(165, 5, -1);
    g.put(172, 12, 'e'); g.put(175, 12, 'e');
    g.put(182, 12, 'G');
  }),
];

// 文字列の地図から、可変タイル配列と各種エンティティの初期位置を作る
export function parseLevel(def) {
  const width = Math.max(...def.rows.map(r => r.length));
  const tiles = def.rows.map(r => r.padEnd(width, '.').split(''));
  const spawns = [];
  let start = null, goal = null, flower = null, seed = null;
  const talks = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < width; x++) {
      const c = tiles[y][x];
      if (!ALL_CHARS.has(c)) throw new Error(`${def.id}: 不明な記号 '${c}' (${x},${y})`);
      const clear = () => { tiles[y][x] = '.'; };
      switch (c) {
        case 'S': start = { x, y }; clear(); break;
        case 'G': goal = { x, y }; clear(); break;
        case '*': flower = { x, y }; break;
        case '@': seed = { x, y }; break;
        case 't': talks.push({ x, y, text: def.talks[talks.length] ?? '…' }); clear(); break;
        case 'e': case 's': case 'b': spawns.push({ kind: c, x, y }); clear(); break;
      }
    }
  }
  return { ...def, width, tiles, spawns, start, goal, flower, seed, talkers: talks };
}
