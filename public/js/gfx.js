// Zeichnen: Pixelschrift, Figuren, Icons, Panels
export const W = 480, H = 270;

// Farbpalette (Sweetie-16)
export const C = {
  ink: '#1a1c2c', pur: '#5d275d', red: '#b13e53', ora: '#ef7d57', yel: '#ffcd75',
  lim: '#a7f070', grn: '#38b764', teal: '#257179', navy: '#29366f', blu: '#3b5dc9',
  sky: '#41a6f6', cyan: '#73eff7', wht: '#f4f4f4', lgy: '#94b0c2', gry: '#566c86', dgy: '#333c57',
};

export const canvas = typeof document !== 'undefined' ? document.getElementById('c') : null;
export const ctx = canvas ? canvas.getContext('2d') : null;
if (ctx) ctx.imageSmoothingEnabled = false;

// ---------- Pixelschrift 5x7 ----------
const F = {
  A: [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11], B: [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  C: [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E], D: [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
  E: [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F], F: [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  G: [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F], H: [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  I: [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E], J: [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  K: [0x11,0x12,0x14,0x18,0x14,0x12,0x11], L: [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  M: [0x11,0x1B,0x15,0x15,0x11,0x11,0x11], N: [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  O: [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E], P: [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  Q: [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D], R: [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  S: [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E], T: [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  U: [0x11,0x11,0x11,0x11,0x11,0x11,0x0E], V: [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  W: [0x11,0x11,0x11,0x15,0x15,0x1B,0x11], X: [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  Y: [0x11,0x11,0x0A,0x04,0x04,0x04,0x04], Z: [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E], '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F], '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02], '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E], '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E], '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  ' ': [0,0,0,0,0,0,0], '.': [0,0,0,0,0,0x0C,0x0C], ',': [0,0,0,0,0x0C,0x04,0x08],
  '!': [0x04,0x04,0x04,0x04,0x04,0x00,0x04], '?': [0x0E,0x11,0x01,0x02,0x04,0x00,0x04],
  ':': [0x00,0x0C,0x0C,0x00,0x0C,0x0C,0x00], '-': [0,0,0,0x1F,0,0,0], '+': [0,0x04,0x04,0x1F,0x04,0x04,0],
  '/': [0x01,0x01,0x02,0x04,0x08,0x10,0x10], '%': [0x18,0x19,0x02,0x04,0x08,0x13,0x03],
  '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02], ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
  "'": [0x04,0x04,0x08,0,0,0,0], '"': [0x0A,0x0A,0,0,0,0,0], '=': [0,0,0x1F,0,0x1F,0,0],
  '<': [0x02,0x04,0x08,0x10,0x08,0x04,0x02], '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08],
  '*': [0x00,0x15,0x0E,0x1F,0x0E,0x15,0x00], '×': [0,0,0x11,0x0A,0x04,0x0A,0x11],
  '#': [0x0A,0x0A,0x1F,0x0A,0x1F,0x0A,0x0A], '_': [0,0,0,0,0,0,0x1F],
  'Ä': [0x0A,0x0E,0x11,0x11,0x1F,0x11,0x11], 'Ö': [0x0A,0x0E,0x11,0x11,0x11,0x11,0x0E],
  'Ü': [0x0A,0x11,0x11,0x11,0x11,0x11,0x0E],
  '▲': [0x04,0x0E,0x1F,0,0,0,0], '▼': [0,0,0,0,0x1F,0x0E,0x04],
  '◄': [0x02,0x06,0x0E,0x1E,0x0E,0x06,0x02], '►': [0x08,0x0C,0x0E,0x0F,0x0E,0x0C,0x08],
  '★': [0x04,0x04,0x1F,0x0E,0x0E,0x1B,0x11], '●': [0,0x0E,0x1F,0x1F,0x1F,0x0E,0],
};
const glyphCache = new Map();
function glyph(ch, color) {
  const key = ch + color;
  let g = glyphCache.get(key);
  if (g) return g;
  g = document.createElement('canvas');
  g.width = 5; g.height = 7;
  const gc = g.getContext('2d');
  gc.fillStyle = color;
  const rows = F[ch] || F['?'];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) gc.fillRect(x, y, 1, 1);
  glyphCache.set(key, g);
  return g;
}
export function textWidth(str, s = 1) {
  return Math.max(0, String(str).length * 6 * s - s);
}
/** text(ctx, "Hallo", x, y, {color, s, align:'l|c|r', shadow}) */
export function text(c, str, x, y, o = {}) {
  const s = o.s || 1, color = o.color || C.wht;
  str = String(str).toUpperCase();
  const w = textWidth(str, s);
  if (o.align === 'c') x -= Math.floor(w / 2);
  else if (o.align === 'r') x -= w;
  x = Math.round(x); y = Math.round(y);
  if (o.shadow !== false && o.shadow !== null) {
    const sc = o.shadow || C.ink;
    for (let i = 0; i < str.length; i++) c.drawImage(glyph(str[i], sc), x + i * 6 * s + s, y + s, 5 * s, 7 * s);
  }
  for (let i = 0; i < str.length; i++) c.drawImage(glyph(str[i], color), x + i * 6 * s, y, 5 * s, 7 * s);
  return w;
}
/** einfacher Zeilenumbruch */
export function wrap(str, maxChars) {
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- Primitive ----------
export function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
export function panel(c, x, y, w, h, o = {}) {
  const bg = o.bg || C.dgy, bd = o.border || C.lgy;
  rect(c, x + 1, y, w - 2, h, bd); rect(c, x, y + 1, w, h - 2, bd);
  rect(c, x + 2, y + 1, w - 4, h - 2, bg); rect(c, x + 1, y + 2, w - 2, h - 4, bg);
  if (o.shine !== false) rect(c, x + 3, y + 2, w - 6, 1, 'rgba(255,255,255,.15)');
}
export function circle(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
export function ellipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)) + 0.5);
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// ---------- Kleine Kunst aus Zeichenketten ----------
export function art(rows, map) {
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = rows[y][x];
    if (map[k]) { c.fillStyle = map[k]; c.fillRect(x, y, 1, 1); }
  }
  return cv;
}
let ICONS = null;
function icons() {
  if (ICONS) return ICONS;
  ICONS = {
    star: art([
      '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.yy...yy.',
    ], { y: C.yel }),
    starO: art([
      '....o....', '...oyo...', 'ooooyoooo', 'oyyyyyyyo', '.oyyyyyo.', '.oyyyyyo.', 'oyyoooyyo', 'oyo...oyo', 'oo.....oo',
    ], { y: C.yel, o: '#b45f06' }),
    coin: art([
      '..ooo..', '.oyyyo.', 'oyyhyyo', 'oyyhyyo', 'oyyhyyo', '.oyyyo.', '..ooo..',
    ], { y: C.yel, o: '#b45f06', h: '#fff1b8' }),
    heart: art(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: C.red }),
  };
  return ICONS;
}
export function icon(c, name, x, y, s = 1) {
  const i = icons()[name];
  c.drawImage(i, Math.round(x), Math.round(y), i.width * s, i.height * s);
  return i.width * s;
}

// ---------- Spielfiguren ----------
const BASE = [
  '....oooooo....',
  '..oossssssoo..',
  '.osssssssssso.',
  '.oswksssswkso.',
  '.oswksssswkso.',
  '.osrssssssrso.',
  '..osssmmssso..',
  '...oossssoo...',
  '.....oooo.....',
  '...obbbbbbo...',
  '..obbbbbbbbo..',
  '..oBbbbbbbBo..',
  '...obbbbbbo...',
  '...oBBooBBo...',
];
const FEET = ['...ooo..ooo...', '..ooo....ooo..'];
const OFF = 4; // Platz oben für Hüte
export const CHARS = [
  { name: 'Ritter', s: '#f2c9a0', b: '#3b5dc9', B: '#29366f', ov: [
    [2, 0, 10, 3, '#94b0c2'], [4, -1, 6, 1, 'o'], [2, -1, 2, 1, 'o'], [10, -1, 2, 1, 'o'], [1, 0, 1, 3, 'o'], [12, 0, 1, 3, 'o'],
    [6, -4, 2, 3, '#b13e53'], [6, 3, 2, 3, '#94b0c2'], [3, 2, 8, 1, '#566c86'], [5, 9, 4, 1, '#ffcd75']] },
  { name: 'Robo', s: '#94b0c2', b: '#566c86', B: '#333c57', ov: [
    [3, 3, 3, 2, '#73eff7'], [8, 3, 3, 2, '#73eff7'], [4, 3, 1, 1, '#f4f4f4'], [9, 3, 1, 1, '#f4f4f4'], [5, 6, 4, 1, '#333c57'], [6, -2, 2, 3, '#566c86'],
    [5, -4, 4, 2, '#b13e53'], [6, 10, 2, 1, '#73eff7'], [0, 4, 1, 3, '#566c86'], [13, 4, 1, 3, '#566c86']] },
  { name: 'Katze', s: '#ef7d57', b: '#ffcd75', B: '#ef7d57', ov: [
    [1, -2, 1, 3, 'o'], [2, -3, 2, 1, 'o'], [4, -2, 1, 2, 'o'], [2, -2, 2, 3, '#ef7d57'], [3, -1, 1, 2, '#e8a0a0'],
    [12, -2, 1, 3, 'o'], [10, -3, 2, 1, 'o'], [9, -2, 1, 2, 'o'], [10, -2, 2, 3, '#ef7d57'], [10, -1, 1, 2, '#e8a0a0'],
    [0, 5, 2, 1, '#f4f4f4'], [12, 5, 2, 1, '#f4f4f4'], [6, 5, 2, 1, '#b13e53'], [6, 1, 2, 1, '#b13e53'], [3, 1, 1, 1, '#b13e53'], [10, 1, 1, 1, '#b13e53']] },
  { name: 'Hexe', s: '#a7f070', b: '#5d275d', B: '#1a1c2c', ov: [
    [0, 0, 14, 2, '#1a1c2c'], [2, -1, 10, 1, '#5d275d'], [4, -3, 6, 2, '#5d275d'], [6, -5, 3, 2, '#5d275d'], [8, -6, 2, 1, '#5d275d'],
    [3, -1, 8, 1, '#ffcd75'], [6, 5, 2, 2, '#38b764'], [0, 0, 1, 2, 'o'], [13, 0, 1, 2, 'o']] },
  { name: 'Alien', s: '#38b764', b: '#73eff7', B: '#41a6f6', ov: [
    [3, 3, 3, 3, '#1a1c2c'], [8, 3, 3, 3, '#1a1c2c'], [4, 3, 1, 1, '#f4f4f4'], [9, 3, 1, 1, '#f4f4f4'],
    [4, -3, 1, 3, '#38b764'], [3, -4, 3, 2, '#ffcd75'], [9, -3, 1, 3, '#38b764'], [8, -4, 3, 2, '#ffcd75'], [6, 6, 2, 1, '#1a1c2c']] },
  { name: 'Pirat', s: '#f2c9a0', b: '#b13e53', B: '#f4f4f4', ov: [
    [1, 0, 12, 3, '#1a1c2c'], [2, 0, 10, 3, '#b13e53'], [11, 2, 3, 2, '#b13e53'], [3, 3, 3, 2, '#1a1c2c'], [2, 2, 10, 1, '#1a1c2c'],
    [4, 1, 1, 1, '#f4f4f4'], [7, 1, 1, 1, '#f4f4f4'], [9, 1, 1, 1, '#f4f4f4'], [4, 6, 6, 1, '#5d275d']] },
  { name: 'Frosch', s: '#38b764', b: '#a7f070', B: '#38b764', ov: [
    [2, -2, 4, 1, 'o'], [1, -1, 1, 3, 'o'], [6, -1, 1, 3, 'o'], [2, -1, 4, 3, '#f4f4f4'], [3, 0, 2, 2, '#1a1c2c'],
    [8, -2, 4, 1, 'o'], [7, -1, 1, 3, 'o'], [12, -1, 1, 3, 'o'], [8, -1, 4, 3, '#f4f4f4'], [9, 0, 2, 2, '#1a1c2c'],
    [2, 3, 3, 2, '#38b764'], [9, 3, 3, 2, '#38b764'], [3, 6, 8, 1, '#b13e53']] },
  { name: 'Geist', s: '#f4f4f4', b: '#f4f4f4', B: '#94b0c2', ov: [
    [2, 9, 10, 4, '#f4f4f4'], [2, 12, 10, 3, null], [2, 12, 2, 2, '#f4f4f4'], [6, 12, 2, 2, '#f4f4f4'], [10, 12, 2, 2, '#f4f4f4'],
    [1, 9, 1, 4, 'o'], [12, 9, 1, 4, 'o'], [3, 14, 1, 1, 'o'], [6, 14, 2, 1, 'o'], [10, 14, 1, 1, 'o'], [4, 5, 1, 1, '#41a6f6'], [9, 5, 1, 1, '#41a6f6']] },
];
const charCache = new Map();
function charSprite(id, frame, flip) {
  const key = id + '_' + frame + '_' + flip;
  let cv = charCache.get(key);
  if (cv) return cv;
  const ch = CHARS[id];
  cv = document.createElement('canvas');
  cv.width = 14; cv.height = 14 + OFF + 1;
  const c = cv.getContext('2d');
  if (flip) { c.translate(14, 0); c.scale(-1, 1); }
  const col = { o: C.ink, s: ch.s, b: ch.b, B: ch.B, w: '#f4f4f4', k: C.ink, r: '#e8a0a0', m: '#b13e53' };
  const rows = BASE.concat([FEET[((Math.floor(frame) % 2) + 2) % 2]]);
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < 14; x++) {
    const k = rows[y][x];
    if (k !== '.') { c.fillStyle = col[k]; c.fillRect(x, y + OFF, 1, 1); }
  }
  for (const [x, y, w, h, cc] of ch.ov) {
    if (cc === null) { c.clearRect(x, y + OFF, w, h); continue; }
    c.fillStyle = cc === 'o' ? C.ink : cc;
    c.fillRect(x, y + OFF, w, h);
  }
  charCache.set(key, cv);
  return cv;
}
/** (x,y) = Fußpunkt, mittig. */
export function drawChar(c, id, x, y, o = {}) {
  const s = o.s || 1;
  const sp = charSprite(id, o.frame || 0, o.flip ? 1 : 0);
  if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(Math.round(x - 6 * s), Math.round(y - 1 * s), 12 * s, 2 * s); }
  if (o.alpha !== undefined) c.globalAlpha = o.alpha;
  c.drawImage(sp, Math.round(x - 7 * s), Math.round(y - (sp.height - 1) * s), sp.width * s, sp.height * s);
  c.globalAlpha = 1;
}
/** Kopf-Porträt (für HUD) */
export function drawFace(c, id, x, y, s = 1) {
  const sp = charSprite(id, 0, 0);
  c.drawImage(sp, 0, 0, 14, OFF + 9, Math.round(x), Math.round(y), 14 * s, (OFF + 9) * s);
}

export const PCOL = ['#e8433f', '#41a6f6', '#38b764', '#ffcd75'];
export const PNAME = ['Rot', 'Blau', 'Grün', 'Gelb'];
