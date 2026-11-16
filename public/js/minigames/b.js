import { C, W, H, text, rect, panel, drawChar, PCOL, NOINP, makePlayers, ranking, moveBound, sgn, drawScoreBar, drawTimer, bgFill, tag } from './common.js';
import { rnd, pick, clamp } from '../util.js';

// ---------------- Eisplatte ----------------
const COLS = 12, ROWS = 6, TW = 32, TH = 28, OX = 48, OY = 72;
const tileAt = (x, y) => [Math.floor((x - OX) / TW), Math.floor((y - 6 - OY) / TH)];
export const icefloorG = {
  init(parts) {
    const tiles = [];
    for (let i = 0; i < COLS * ROWS; i++) tiles.push({ st: 0, tm: 0 });
    const pl = makePlayers(parts, (q, i) => ({ x: OX + (2 + i * 2.6) * TW, y: OY + 3.5 * TH, alive: true, out: 0, fall: 0, dir: 0, moving: false }));
    return { t: 0, tiles, pl, nxt: 1.2, over: 0 };
  },
  update(s, inp, dt) {
    s.t += dt; s.nxt -= dt;
    if (s.nxt <= 0) {
      s.nxt = Math.max(0.28, 1.0 - s.t * 0.018);
      const alive = s.pl.filter((p) => p.alive);
      let idx = -1;
      if (alive.length && Math.random() < 0.55) {
        const p = pick(alive); const [cx, cy] = tileAt(p.x, p.y);
        if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && s.tiles[cy * COLS + cx].st === 0) idx = cy * COLS + cx;
      }
      if (idx < 0) { const free = s.tiles.map((t, i) => (t.st === 0 ? i : -1)).filter((i) => i >= 0); if (free.length) idx = pick(free); }
      if (idx >= 0) { s.tiles[idx].st = 1; s.tiles[idx].tm = 1.0; }
    }
    for (const t of s.tiles) if (t.st === 1) { t.tm -= dt; if (t.tm <= 0) t.st = 2; }
    for (const p of s.pl) {
      if (!p.alive) { p.fall += dt; continue; }
      moveBound(p, inp(p.slot), 74 * p.m, dt, OX + 4, OX + COLS * TW - 4, OY + 10, OY + ROWS * TH + 4);
      const [cx, cy] = tileAt(p.x, p.y);
      const t = s.tiles[clamp(cy, 0, ROWS - 1) * COLS + clamp(cx, 0, COLS - 1)];
      if (t.st === 2) { p.alive = false; p.out = s.t; }
    }
    if (s.pl.filter((p) => p.alive).length <= 1) s.over += dt;
  },
  done: (s) => s.over > 0.8 || s.t > 70,
  result: (s) => ranking(s.pl, (p) => (p.alive ? 1000 : Math.round(p.out * 100))),
  ai(s, slot, level) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    if (!p.alive) return out;
    const [cx, cy] = tileAt(p.x, p.y);
    const here = s.tiles[clamp(cy, 0, ROWS - 1) * COLS + clamp(cx, 0, COLS - 1)];
    s.aiW = s.aiW || {};
    if (here.st === 1 || (here.st === 0 && s.aiW[slot])) {
      if (here.st === 1) { s.aiW[slot] = (s.aiW[slot] || 0) + 1; }
      const delay = [30, 12, 2][level];
      if (here.st === 1 && s.aiW[slot] > delay) {
        let best = null, bd = 1e9;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (s.tiles[y * COLS + x].st !== 0) continue;
          const tx = OX + x * TW + TW / 2, ty = OY + y * TH + TH / 2 + 6;
          const d = Math.hypot(tx - p.x, ty - p.y);
          if (d < bd && d > 4) { bd = d; best = [tx, ty]; }
        }
        if (best) { out.x = sgn(best[0] - p.x, 3); out.y = sgn(best[1] - p.y, 3); }
        s.aiW[slot] = delay + 1;
      }
    }
    if (here.st === 0) s.aiW[slot] = 0;
    if (here.st === 2) { out.x = Math.random() < 0.5 ? 1 : -1; }
    return out;
  },
  render(c, s) {
    rect(c, 0, 0, W, H, '#0e2a4a');
    for (let y = 0; y < H; y += 8) rect(c, 0, y, W, 1, y % 16 ? '#123a63' : '#0e2a4a');
    text(c, 'EISPLATTE', W / 2, 10, { align: 'c', s: 2 });
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const t = s.tiles[y * COLS + x];
      if (t.st === 2) continue;
      const px = OX + x * TW, py = OY + y * TH;
      const shake = t.st === 1 ? Math.round(Math.sin(s.t * 60) * 1) : 0;
      rect(c, px + shake, py, TW - 1, TH - 1, t.st === 1 ? '#d7e8f5' : '#bfe3f7');
      rect(c, px + shake, py, TW - 1, 2, '#ffffff');
      rect(c, px + shake, py + TH - 4, TW - 1, 3, '#73b5dd');
      if (t.st === 1) { c.fillStyle = C.ink; c.fillRect(px + 8, py + 6, 1, 8); c.fillRect(px + 9, py + 13, 8, 1); c.fillRect(px + 17, py + 13, 1, 8); c.fillRect(px + 14, py + 6, 6, 1); }
    }
    const list = s.pl.slice().sort((a, b) => a.y - b.y);
    for (const p of list) {
      if (p.alive) { drawChar(c, p.char, p.x, p.y, { flip: p.dir === 1, frame: p.moving ? Math.floor(s.t * 8) : 0 }); tag(c, p, p.x, p.y + 2); }
      else if (p.fall < 1.2) drawChar(c, p.char, p.x, p.y + p.fall * 80, { alpha: Math.max(0, 1 - p.fall), s: Math.max(0.2, 1 - p.fall * 0.5), flip: p.dir === 1 });
    }
    s.pl.forEach((p, i) => { const x = 10 + i * 118; rect(c, x, 252, 8, 8, PCOL[p.slot]); text(c, p.alive ? 'DABEI' : 'RAUS', x + 12, 253, { color: p.alive ? C.lim : C.red }); });
  },
};

// ---------------- Fass-Ausweichen ----------------
export const barrelsG = {
  init(parts) {
    return { t: 0, nxt: 0.6, barrels: [], over: 0,
      pl: makePlayers(parts, (q, i) => ({ x: 120 + i * 80, y: 170, alive: true, out: 0, dir: 0, moving: false })) };
  },
  update(s, inp, dt) {
    s.t += dt; s.nxt -= dt;
    if (s.nxt <= 0) {
      s.nxt = Math.max(0.15, 0.7 - s.t * 0.017);
      const fromL = Math.random() < 0.5, lane = Math.floor(rnd(0, 8));
      const sp = rnd(95, 150) * (1 + s.t * 0.012);
      s.barrels.push({ x: fromL ? -12 : W + 12, y: 94 + lane * 21, vx: fromL ? sp : -sp, rot: 0 });
    }
    for (const b of s.barrels) { b.x += b.vx * dt; b.rot += dt * 8; }
    s.barrels = s.barrels.filter((b) => b.x > -30 && b.x < W + 30);
    for (const p of s.pl) {
      if (!p.alive) continue;
      moveBound(p, inp(p.slot), 76 * p.m, dt, 16, W - 16, 88, 254);
      for (const b of s.barrels) if (Math.abs(b.x - p.x) < 13 && Math.abs(b.y - (p.y - 6)) < 11) { p.alive = false; p.out = s.t; p.vx = Math.sign(b.vx) * 90; break; }
    }
    for (const p of s.pl) if (!p.alive && p.vx) p.x += p.vx * dt * 0.5;
    if (s.pl.filter((p) => p.alive).length <= 1) s.over += dt;
  },
  done: (s) => s.over > 0.8 || s.t > 40,
  result: (s) => ranking(s.pl, (p) => (p.alive ? 1000 : Math.round(p.out * 100))),
  ai(s, slot, level) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    if (!p.alive) return out;
    if (level === 0 && Math.random() < 0.35) return { ...out, y: Math.random() < 0.5 ? 1 : -1 };
    const look = [0.25, 0.4, 0.55][level];
    const cands = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [1, 1], [-1, -1], [-1, 1], [1, -1]];
    let best = [0, 0], bs = 1e9;
    for (const [dx, dy] of cands) {
      const l = Math.hypot(dx, dy) || 1;
      let danger = 0;
      for (let k = 1; k <= 3; k++) {
        const t = (look * k) / 3;
        const px = clamp(p.x + (dx / l) * 76 * p.m * t, 16, W - 16), py = clamp(p.y + (dy / l) * 76 * p.m * t, 88, 254);
        for (const b of s.barrels) { if (Math.abs(b.x + b.vx * t - px) < 24 && Math.abs(b.y - (py - 6)) < 16) danger += 10 - k; }
      }
      danger += (dx || dy ? 0.3 : 0) + Math.abs(p.x - W / 2) * 0.0005 * Math.abs(dx);
      if (danger < bs) { bs = danger; best = [dx, dy]; }
    }
    out.x = best[0]; out.y = best[1];
    return out;
  },
  render(c, s) {
    bgFill(c, '#c9a227', '#bf9a22', 14, 0, 44, W, H - 44);
    for (let k = 0; k < 8; k++) rect(c, 0, 90 + k * 21 + 8, W, 1, '#a07d1c');
    text(c, 'FASS-AUSWEICHEN', W / 2, 10, { align: 'c', s: 2 });
    drawTimer(c, 40 - s.t);
    const list = s.pl.slice().sort((a, b) => a.y - b.y);
    for (const p of list) {
      if (p.alive) { drawChar(c, p.char, p.x, p.y, { flip: p.dir === 1, frame: p.moving ? Math.floor(s.t * 8) : 0 }); tag(c, p, p.x, p.y + 2); }
      else drawChar(c, p.char, p.x, p.y + 6, { alpha: 0.45, flip: true });
    }
    for (const b of s.barrels) {
      rect(c, b.x - 9, b.y - 8, 18, 16, '#8a4b20'); rect(c, b.x - 9, b.y - 6, 18, 2, '#5a2f12'); rect(c, b.x - 9, b.y + 3, 18, 2, '#5a2f12');
      rect(c, b.x - 9, b.y - 8, 18, 2, '#b8723a');
      const k = Math.round(Math.sin(b.rot) * 4); rect(c, b.x - 1 + k, b.y - 2, 3, 3, '#d8a35a');
    }
    s.pl.forEach((p, i) => { const x = 10 + i * 118; rect(c, x, 252, 8, 8, PCOL[p.slot]); text(c, p.alive ? 'DABEI' : 'RAUS', x + 12, 253, { color: p.alive ? C.lim : C.red }); });
  },
};

// ---------------- Tauziehen (2 gegen 2) ----------------
export const tugG = {
  init(parts) { return { t: 0, dur: 20, pos: 0, pl: makePlayers(parts, () => ({ n: 0, bump: 0 })) }; },
  update(s, inp, dt) {
    s.t += dt;
    for (const p of s.pl) {
      p.bump = Math.max(0, p.bump - dt);
      if (inp(p.slot).aP) { s.pos += (p.team === 0 ? -1 : 1) * 0.0125 * p.m; p.bump = 0.12; p.n++; }
    }
    s.pos *= 0.9995;
  },
  done: (s) => Math.abs(s.pos) >= 1 || s.t >= s.dur,
  result(s) {
    const w = s.pos < 0 ? 0 : s.pos > 0 ? 1 : Math.random() < 0.5 ? 0 : 1;
    const r = ranking(s.pl, (p) => (p.team === w ? 10 : 0) + p.n * 0.001);
    return { ...r, winTeam: w };
  },
  ai(s, slot, level) {
    const out = NOINP();
    if (Math.random() < [6.5, 8, 9.5][level] / 60 * (0.6 + Math.random() * 0.8)) out.aP = true;
    return out;
  },
  render(c, s) {
    rect(c, 0, 0, W, H, '#9bd36a'); rect(c, 0, 150, W, 120, '#7fbf55');
    text(c, 'TAUZIEHEN', W / 2, 10, { align: 'c', s: 2 });
    drawTimer(c, s.dur - s.t);
    rect(c, 226, 120, 28, 150, '#3a2a18'); rect(c, 230, 120, 20, 150, '#2a1c0e'); // Grube
    const mid = W / 2 + s.pos * 150;
    rect(c, 70, 176, 340, 4, '#d8a35a'); rect(c, 70, 180, 340, 2, '#8a4b20');
    rect(c, mid - 3, 168, 6, 20, C.red); rect(c, mid - 8, 168, 16, 6, C.red);
    panel(c, 12, 8, 70, 16, { bg: C.ink, border: C.sky, shine: false }); text(c, 'TEAM 1', 47, 13, { align: 'c' });
    panel(c, W - 82, 8, 70, 16, { bg: C.ink, border: C.red, shine: false }); text(c, 'TEAM 2', W - 47, 13, { align: 'c' });
    for (const t of [0, 1]) {
      const team = s.pl.filter((p) => p.team === t);
      team.forEach((p, k) => {
        const x = t === 0 ? 100 + k * 44 - s.pos * 20 : 380 - k * 44 - s.pos * 20;
        drawChar(c, p.char, x, 220 - (p.bump > 0 ? 3 : 0), { s: 2, flip: t === 1 });
        rect(c, x - 5, 224, 10, 3, PCOL[p.slot]);
      });
    }
  },
};

// ---------------- Luft-Hockey (2 gegen 2) ----------------
const AX0 = 40, AX1 = 440, AY0 = 68, AY1 = 252, GY0 = 126, GY1 = 194, PR = 10, BR = 6;
export const hockeyG = {
  init(parts) {
    const cnt = [0, 0];
    const pl = makePlayers(parts, (q) => {
      const k = cnt[q.team]++;
      return { x: q.team === 0 ? 90 + k * 40 : 390 - k * 40, y: k === 0 ? 124 : 196, vx: 0, vy: 0, k, dir: q.team };
    });
    return { t: 0, dur: 60, score: [0, 0], puck: { x: 240, y: 160, vx: 0, vy: 0 }, pl, pause: 0.6, last: null, flash: 0 };
  },
  update(s, inp, dt) {
    s.t += dt; s.pause -= dt; s.flash = Math.max(0, s.flash - dt);
    for (const p of s.pl) {
      const i = inp(p.slot); const ox = p.x, oy = p.y;
      let dx = i.x, dy = i.y; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      const sp = 112 * p.m;
      p.x += dx * sp * dt; p.y += dy * sp * dt;
      const x0 = p.team === 0 ? AX0 + PR : 240 + PR, x1 = p.team === 0 ? 240 - PR : AX1 - PR;
      p.x = clamp(p.x, x0, x1); p.y = clamp(p.y, AY0 + PR, AY1 - PR);
      p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
    }
    const q = s.puck;
    if (s.pause > 0) return;
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.vx *= 0.995; q.vy *= 0.995;
    // Paddel-Stöße
    for (const p of s.pl) {
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), md = PR + BR;
      if (d < md && d > 0) {
        const nx = dx / d, ny = dy / d;
        q.x = p.x + nx * md; q.y = p.y + ny * md;
        const rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (rv < 0) { q.vx -= 1.9 * rv * nx; q.vy -= 1.9 * rv * ny; }
        q.vx += nx * 45; q.vy += ny * 45; s.last = p.team;
        const sp = Math.hypot(q.vx, q.vy); if (sp > 300) { q.vx *= 300 / sp; q.vy *= 300 / sp; }
      }
    }
    // Wände und Tore
    const inGoalY = q.y > GY0 + 2 && q.y < GY1 - 2;
    if (q.y < AY0 + BR) { q.y = AY0 + BR; q.vy = Math.abs(q.vy); }
    if (q.y > AY1 - BR) { q.y = AY1 - BR; q.vy = -Math.abs(q.vy); }
    if (q.x < AX0 + BR && !inGoalY) { q.x = AX0 + BR; q.vx = Math.abs(q.vx); }
    if (q.x > AX1 - BR && !inGoalY) { q.x = AX1 - BR; q.vx = -Math.abs(q.vx); }
    if (q.x < AX0 - 6) goal(s, 1);
    else if (q.x > AX1 + 6) goal(s, 0);
    if (Math.hypot(q.vx, q.vy) < 8 && s.pause <= 0 && Math.random() < 0.02) { q.vx += (Math.random() - 0.5) * 60; q.vy += (Math.random() - 0.5) * 60; }
  },
  done: (s) => s.score[0] >= 3 || s.score[1] >= 3 || (s.t >= s.dur && s.score[0] !== s.score[1]) || s.t >= s.dur + 20,
  result(s) {
    const w = s.score[0] === s.score[1] ? (Math.random() < 0.5 ? 0 : 1) : s.score[0] > s.score[1] ? 0 : 1;
    return { ...ranking(s.pl, (p) => (p.team === w ? 10 : 0)), winTeam: w };
  },
  ai(s, slot, level) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    const q = s.puck;
    const mate = s.pl.find((o) => o.team === p.team && o !== p);
    const dm = mate ? Math.hypot(q.x - mate.x, q.y - mate.y) : 1e9, dp = Math.hypot(q.x - p.x, q.y - p.y);
    const attacker = !mate || dp <= dm;
    const goalX = p.team === 0 ? AX1 : AX0, ownX = p.team === 0 ? AX0 : AX1;
    let tx, ty;
    const ownHalf = p.team === 0 ? q.x < 240 : q.x > 240;
    if (attacker && ownHalf) {
      const ax = goalX - q.x, ay = 160 - q.y, al = Math.hypot(ax, ay) || 1;
      tx = q.x - (ax / al) * 14; ty = q.y - (ay / al) * 14;
      if ((p.team === 0 && p.x > q.x) || (p.team === 1 && p.x < q.x)) { tx = q.x + (p.team === 0 ? -22 : 22); ty = q.y + (p.y > q.y ? 20 : -20); }
    } else if (attacker) { tx = p.team === 0 ? 200 : 280; ty = q.y; }
    else { tx = ownX + (p.team === 0 ? 46 : -46); ty = clamp(q.y, GY0 + 8, GY1 - 8); }
    const speedF = [0.55, 0.8, 1][level];
    out.x = sgn(tx - p.x, 3) * speedF; out.y = sgn(ty - p.y, 3) * speedF;
    return out;
  },
  render(c, s) {
    rect(c, 0, 0, W, H, '#1a1c2c');
    text(c, 'LUFT-HOCKEY', W / 2, 8, { align: 'c', s: 2 });
    drawTimer(c, Math.max(0, s.dur - s.t));
    rect(c, AX0, AY0, AX1 - AX0, AY1 - AY0, '#d7efff');
    for (let x = AX0; x < AX1; x += 20) rect(c, x, AY0, 10, AY1 - AY0, '#cbe7fa');
    rect(c, 238, AY0, 4, AY1 - AY0, '#73b5dd');
    c.strokeStyle = '#73b5dd'; c.lineWidth = 3; c.beginPath(); c.arc(240, 160, 26, 0, 7); c.stroke();
    rect(c, AX0 - 8, GY0, 8, GY1 - GY0, C.sky); rect(c, AX1, GY0, 8, GY1 - GY0, C.red);
    rect(c, AX0 - 2, AY0 - 3, AX1 - AX0 + 4, 3, C.gry); rect(c, AX0 - 2, AY1, AX1 - AX0 + 4, 3, C.gry);
    rect(c, AX0 - 3, AY0 - 3, 3, GY0 - AY0 + 3, C.gry); rect(c, AX0 - 3, GY1, 3, AY1 - GY1 + 3, C.gry);
    rect(c, AX1, AY0 - 3, 3, GY0 - AY0 + 3, C.gry); rect(c, AX1, GY1, 3, AY1 - GY1 + 3, C.gry);
    text(c, s.score[0] + ' : ' + s.score[1], W / 2, 28, { align: 'c', s: 2, color: C.yel });
    for (const p of s.pl) {
      c.fillStyle = PCOL[p.slot]; c.beginPath(); c.arc(Math.round(p.x), Math.round(p.y), PR, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(Math.round(p.x) - 2, Math.round(p.y) - 3, 4, 0, 7); c.fill();
      drawChar(c, p.char, p.x, p.y + 6, { shadow: false, flip: p.team === 1 });
    }
    c.fillStyle = C.ink; c.beginPath(); c.arc(Math.round(s.puck.x), Math.round(s.puck.y), BR, 0, 7); c.fill();
    c.fillStyle = C.yel; c.beginPath(); c.arc(Math.round(s.puck.x) - 1, Math.round(s.puck.y) - 1, 2, 0, 7); c.fill();
    if (s.flash > 0) text(c, 'TOR!', W / 2, 150, { align: 'c', s: 4, color: C.yel });
  },
};
function goal(s, team) {
  s.score[team]++; s.flash = 1.2; s.pause = 1.2;
  s.puck = { x: 240, y: 160, vx: 0, vy: 0 };
  for (const p of s.pl) { p.x = p.team === 0 ? 90 + p.k * 40 : 390 - p.k * 40; p.y = p.k === 0 ? 124 : 196; }
}
