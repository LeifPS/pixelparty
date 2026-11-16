// Hintergründe der Spielbretter (einmal in ein Bild gemalt)
import { C, rect, ellipse, circle } from './gfx.js';
import { mulberry32 } from './util.js';

function path(c, board, col, edge) {
  const draw = (w, color) => {
    for (const n of board.nodes) for (const id of n.next) {
      const m = board.nodes[id];
      const len = Math.hypot(m.x - n.x, m.y - n.y), steps = Math.ceil(len);
      for (let k = 0; k <= steps; k++) {
        const x = n.x + ((m.x - n.x) * k) / steps, y = n.y + ((m.y - n.y) * k) / steps;
        rect(c, x - w / 2, y - w / 2, w, w, color);
      }
    }
  };
  draw(9, edge); draw(5, col);
}
function nearPath(board, x, y, r) {
  for (const n of board.nodes) {
    if (Math.hypot(n.x - x, n.y - y) < r) return true;
    for (const id of n.next) {
      const m = board.nodes[id];
      const dx = m.x - n.x, dy = m.y - n.y, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - n.x) * dx + (y - n.y) * dy) / l2));
      if (Math.hypot(n.x + dx * t - x, n.y + dy * t - y) < r) return true;
    }
  }
  return false;
}
function palm(c, x, y) {
  rect(c, x - 1, y - 14, 3, 15, '#8a4b20'); rect(c, x, y - 12, 1, 12, '#a8642c');
  const leaf = [[-10, -14, 9, 3], [2, -14, 9, 3], [-7, -19, 6, 3], [1, -19, 6, 3], [-3, -21, 6, 3], [-9, -11, 7, 2], [3, -11, 7, 2]];
  for (const [dx, dy, w, h] of leaf) { rect(c, x + dx, y + dy, w, h, '#1f7a4a'); rect(c, x + dx, y + dy, w, 1, '#38b764'); }
  rect(c, x - 2, y - 14, 5, 3, '#6b3a16');
}
function pine(c, x, y, big = 1) {
  rect(c, x - 1, y - 2, 3, 5, '#3a2415');
  for (let i = 0; i < 3; i++) {
    const w = (14 - i * 3) * big, yy = y - 4 - i * 6 * big;
    rect(c, x - w / 2, yy, w, 6 * big, i % 2 ? '#1d5a3a' : '#16482e'); rect(c, x - w / 2, yy, w, 1, '#2b7a4d');
  }
}
function rock(c, x, y, s = 1) { ellipse(c, x, y, 9 * s, 5 * s, '#566c86'); ellipse(c, x - 1, y - 1, 7 * s, 3 * s, '#94b0c2'); }
function tomb(c, x, y) {
  rect(c, x - 5, y - 10, 10, 11, '#94b0c2'); rect(c, x - 4, y - 12, 8, 2, '#94b0c2'); rect(c, x - 3, y - 7, 6, 1, '#566c86'); rect(c, x - 1, y - 9, 2, 5, '#566c86');
  rect(c, x - 5, y, 10, 2, '#333c57');
}
function deadTree(c, x, y) {
  rect(c, x - 2, y - 16, 4, 17, '#2a1c14'); rect(c, x - 8, y - 14, 7, 2, '#2a1c14'); rect(c, x + 1, y - 10, 8, 2, '#2a1c14'); rect(c, x - 6, y - 19, 2, 6, '#2a1c14'); rect(c, x + 6, y - 14, 2, 5, '#2a1c14');
}
function pumpkin(c, x, y) { ellipse(c, x, y, 5, 4, '#ef7d57'); rect(c, x - 1, y - 6, 2, 3, '#38b764'); rect(c, x - 3, y - 1, 1, 2, '#1a1c2c'); rect(c, x + 2, y - 1, 1, 2, '#1a1c2c'); }

export function makeBackground(board) {
  const cv = document.createElement('canvas');
  cv.width = board.w; cv.height = board.h;
  const c = cv.getContext('2d');
  const rng = mulberry32(board.id === 'pirate' ? 7 : 13);
  const R = (a, b) => a + rng() * (b - a);
  if (board.id === 'pirate') {
    rect(c, 0, 0, board.w, board.h, '#3b5dc9');
    for (let y = 0; y < board.h; y += 10) for (let x = (y / 10) % 2 ? 10 : 0; x < board.w; x += 20) rect(c, x + R(-2, 2), y, 8, 2, '#41a6f6');
    ellipse(c, 480, 310, 458, 294, '#73eff7'); ellipse(c, 480, 310, 452, 288, '#f4f4f4'); ellipse(c, 480, 310, 444, 280, '#d9a74e'); ellipse(c, 480, 310, 438, 274, '#ffcd75');
    for (let i = 0; i < 700; i++) { const a = R(0, 6.28), r = R(0.55, 0.98); rect(c, 480 + Math.cos(a) * 436 * r, 310 + Math.sin(a) * 270 * r, 2, 1, i % 3 ? '#f2c26a' : '#e8b860'); }
    ellipse(c, 480, 310, 360, 200, '#2f9f58'); ellipse(c, 480, 310, 350, 192, '#38b764');
    for (let i = 0; i < 900; i++) { const a = R(0, 6.28), r = Math.sqrt(R(0, 1)); const x = 480 + Math.cos(a) * 340 * r, y = 310 + Math.sin(a) * 184 * r; rect(c, x, y, 1, 3, i % 2 ? '#2f9f58' : '#a7f070'); }
    ellipse(c, 480, 312, 300, 52, '#1f7a4a'); ellipse(c, 480, 310, 290, 46, '#257179');
    for (let i = 0; i < 300; i++) { rect(c, R(200, 760), R(268, 352), 2, 2, i % 2 ? '#1f7a4a' : '#2f9f58'); }
    path(c, board, '#c2874a', '#5a2f12');
    for (const n of board.nodes) for (const id of n.next) {
      const m = board.nodes[id]; const l = Math.hypot(m.x - n.x, m.y - n.y);
      for (let k = 4; k < l - 4; k += 7) rect(c, n.x + ((m.x - n.x) * k) / l - 0.5, n.y + ((m.y - n.y) * k) / l - 0.5, 1, 1, '#e9b87a');
    }
    // Deko
    let tries = 0, pal = 0;
    while (pal < 46 && tries++ < 800) {
      const a = R(0, 6.28), r = Math.sqrt(R(0.2, 1)), x = 480 + Math.cos(a) * 410 * r, y = 310 + Math.sin(a) * 255 * r;
      if (nearPath(board, x, y, 24)) continue;
      palm(c, Math.round(x), Math.round(y)); pal++;
    }
    for (let i = 0; i < 8; i++) { const a = R(0, 6.28); rock(c, 480 + Math.cos(a) * 480, 310 + Math.sin(a) * 322, R(0.8, 1.4)); }
    // Schiffswrack oben links im Wasser
    rect(c, 40, 48, 80, 20, '#5a2f12'); rect(c, 46, 66, 68, 6, '#3a2415'); rect(c, 78, 4, 4, 48, '#3a2415'); rect(c, 82, 8, 22, 18, '#f4f4f4'); rect(c, 82, 8, 22, 2, '#94b0c2');
    rect(c, 36, 40, 10, 12, '#5a2f12'); rect(c, 44, 52, 6, 4, '#3a2415');
    // Schatztruhe
    rect(c, 456, 410, 28, 16, '#8a4b20'); rect(c, 456, 410, 28, 6, '#a8642c'); rect(c, 456, 418, 28, 2, '#ffcd75'); rect(c, 468, 416, 4, 6, '#ffcd75');
  } else {
    rect(c, 0, 0, board.w, board.h, '#1d3a2b');
    for (let i = 0; i < 2600; i++) rect(c, R(0, board.w), R(0, board.h), 1, 3, i % 3 ? '#16281f' : '#2c5a3b');
    ellipse(c, 290, 300, 235, 275, '#233f2f'); ellipse(c, 670, 300, 235, 275, '#233f2f');
    for (let i = 0; i < 700; i++) { rect(c, R(60, 900), R(40, 560), 2, 1, '#2f5b42'); }
    // Burg im linken Ring
    const bx = 290, by = 300;
    rect(c, bx - 74, by - 40, 148, 90, '#333c57'); rect(c, bx - 74, by - 40, 148, 8, '#566c86'); rect(c, bx - 74, by + 44, 148, 6, '#1a1c2c');
    for (let i = 0; i < 9; i++) rect(c, bx - 74 + i * 18, by - 48, 10, 8, '#566c86');
    for (const tx of [bx - 92, bx + 70]) {
      rect(c, tx, by - 70, 22, 120, '#566c86'); rect(c, tx, by - 70, 22, 6, '#94b0c2');
      for (let k = 0; k < 4; k++) rect(c, tx + 3, by - 60 + k * 18, 3, 5, '#ffcd75');
      rect(c, tx - 3, by - 84, 28, 16, '#5d275d'); rect(c, tx + 2, by - 94, 18, 10, '#5d275d'); rect(c, tx + 8, by - 102, 6, 8, '#5d275d');
    }
    rect(c, bx - 14, by + 6, 28, 44, '#1a1c2c'); rect(c, bx - 11, by + 3, 22, 4, '#1a1c2c'); rect(c, bx - 14, by + 6, 28, 2, '#ef7d57');
    for (const [wx, wy] of [[-50, -20], [-20, -20], [20, -20], [50, -20], [-50, 10], [50, 10]]) { rect(c, bx + wx - 4, by + wy - 6, 8, 12, '#1a1c2c'); rect(c, bx + wx - 3, by + wy - 5, 6, 10, '#ffcd75'); rect(c, bx + wx - 3, by + wy - 5, 6, 3, '#ef7d57'); }
    // Friedhof im rechten Ring
    const gx = 670, gy = 300;
    for (let i = 0; i < 9; i++) tomb(c, gx - 80 + (i % 3) * 70 + R(-6, 6), gy - 60 + Math.floor(i / 3) * 56 + R(-4, 4));
    deadTree(c, gx - 120, gy - 30); deadTree(c, gx + 112, gy + 40); deadTree(c, gx + 20, gy - 100);
    for (let i = 0; i < 5; i++) pumpkin(c, gx - 90 + i * 45 + R(-8, 8), gy + 95 + R(-8, 8));
    path(c, board, '#94b0c2', '#1a1c2c');
    for (const n of board.nodes) for (const id of n.next) {
      const m = board.nodes[id]; const l = Math.hypot(m.x - n.x, m.y - n.y);
      for (let k = 5; k < l - 4; k += 8) rect(c, n.x + ((m.x - n.x) * k) / l - 0.5, n.y + ((m.y - n.y) * k) / l - 0.5, 2, 1, '#566c86');
    }
    let tries = 0, cnt = 0;
    while (cnt < 70 && tries++ < 1200) {
      const x = R(20, 940), y = R(20, 580);
      if (nearPath(board, x, y, 26)) continue;
      if (Math.abs(x - 290) < 130 && Math.abs(y - 300) < 100) continue;
      if (Math.abs(x - 670) < 130 && Math.abs(y - 300) < 120) continue;
      pine(c, Math.round(x), Math.round(y), R(0.9, 1.4)); cnt++;
    }
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(200,220,255,.07)'; c.beginPath(); c.ellipse(R(80, 880), R(80, 540), R(70, 130), R(14, 26), 0, 0, 7); c.fill(); }
    circle(c, 880, 60, 24, '#f4f4f4'); circle(c, 872, 54, 5, '#d0d8e0'); circle(c, 888, 68, 3, '#d0d8e0'); circle(c, 884, 50, 2, '#d0d8e0');
  }
  return cv;
}
