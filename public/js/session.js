// Verbindet Spielregeln (game.js) mit Eingabe, Ton und Bildschirm
import { W, H, C, text, rect, panel, drawChar, drawFace, icon, wrap, PCOL } from './gfx.js';
import { BOARDS } from './boards.js';
import { MG } from './minigames/index.js';
import { mgMeta } from './minigames/meta.js';
import { slotInput, anyInput, takeTap, clearTap, SCHEME_HINT, touch } from './input.js';
import * as snd from './audio.js';
import { rnd, clamp } from './util.js';
import { camUpdate, drawBoardScene, menuGeom } from './view.js';
import { runGame, createGame } from './game.js';

export function createSession(G) {
  const S = { G, tasks: [], time: 0, speed: 1 };
  const humans = G.players.filter((p) => p.kind === 'human');
  const inputFor = (pi) => (humans.length === 1 ? anyInput() : slotInput(pi));
  const wait = (fn) => new Promise((resolve) => { S.tasks.push({ fn, resolve }); });
  const sleep = (sec) => { let t = 0; return wait((dt) => { t += dt; if (t >= sec / S.speed) return { v: undefined }; }); };
  const nodeOf = (id) => BOARDS[G.boardId].nodes[id];
  const skipPressed = () => { const a = humans.length ? anyInput() : null; const tap = takeTap(); return (a && a.aP) || !!tap; };

  const env = {
    sleep, sfx: snd.sfx,
    music: (n) => snd.music(n === 'final' ? 'mini' : n),
    focus(target) {
      const cam = G.ui.cam;
      const n = typeof target === 'number' ? nodeOf(target) : target;
      cam.tx = n.x; cam.ty = n.y;
    },
    say(txt, sec = 1.2) {
      G.ui.msg = txt; let t = 0; clearTap();
      return wait((dt) => {
        t += dt;
        if (t >= sec / S.speed || (t > 0.45 && skipPressed())) { G.ui.msg = null; return { v: undefined }; }
      });
    },
    banner(title, sub, sec = 1.2) {
      G.ui.banner = { title, sub, t: 0, dur: sec };
      return wait((dt) => { G.ui.banner.t += dt; if (G.ui.banner.t >= sec / S.speed) { G.ui.banner = null; return { v: undefined }; } });
    },
    menu(pi, title, options, aiFn) {
      const p = G.players[pi];
      const first = Math.max(0, options.findIndex((o) => !o.disabled));
      const m = { pi, title, options, sel: first, cpu: p.kind === 'cpu' };
      G.ui.menu = m; clearTap();
      let t = 0, chosenAt = null;
      return wait((dt) => {
        t += dt;
        if (m.cpu) {
          if (chosenAt === null && t > 0.55 / S.speed) {
            const v = aiFn();
            const k = options.findIndex((o) => o.value === v);
            m.sel = k < 0 ? first : k; chosenAt = t; snd.sfx('tick');
          }
          if (chosenAt !== null && t - chosenAt > 0.65 / S.speed) { G.ui.menu = null; return { v: options[m.sel].value }; }
          return;
        }
        const i = inputFor(pi);
        const step = (d) => {
          let k = m.sel;
          for (let n = 0; n < options.length; n++) { k = (k + d + options.length) % options.length; if (!options[k].disabled) break; }
          if (k !== m.sel) { m.sel = k; snd.sfx('tick'); }
        };
        if (i.uP) step(-1);
        if (i.dP) step(1);
        const tap = takeTap();
        if (tap) {
          const g = menuGeom(m);
          const k = Math.floor((tap.y - (g.y + 20 - 2)) / g.rh);
          if (tap.x >= g.x && tap.x <= g.x + g.w && k >= 0 && k < options.length && !options[k].disabled) {
            if (m.sel === k || true) { m.sel = k; snd.sfx('select'); G.ui.menu = null; return { v: options[k].value }; }
          }
        }
        if (i.aP && !options[m.sel].disabled) { snd.sfx('select'); G.ui.menu = null; return { v: options[m.sel].value }; }
      });
    },
    number(pi, title, min, max, aiFn) {
      const p = G.players[pi], n = { pi, title, val: min, min, max };
      G.ui.number = n; clearTap();
      let t = 0, cpuAt = null;
      return wait((dt) => {
        t += dt;
        if (p.kind === 'cpu') {
          if (cpuAt === null && t > 0.6) { n.val = aiFn(); cpuAt = t; snd.sfx('tick'); }
          if (cpuAt !== null && t - cpuAt > 0.7) { G.ui.number = null; return { v: n.val }; }
          return;
        }
        const i = inputFor(pi);
        if (i.lP && n.val > min) { n.val--; snd.sfx('tick'); }
        if (i.rP && n.val < max) { n.val++; snd.sfx('tick'); }
        if (i.uP) { n.val = Math.min(max, n.val + 5); snd.sfx('tick'); }
        if (i.dP) { n.val = Math.max(min, n.val - 5); snd.sfx('tick'); }
        const tap = takeTap();
        if (tap) { n.val = clamp(Math.round(min + ((tap.x - 150) / 180) * (max - min)), min, max); }
        if (i.aP) { snd.sfx('select'); G.ui.number = null; return { v: n.val }; }
      });
    },
    dice(pi, n, sides) {
      const p = G.players[pi];
      const d = { pi, vals: new Array(n).fill(1), sides, stopped: false, cpu: p.kind === 'cpu' };
      G.ui.dice = d; env.focus(p.node); clearTap();
      let t = 0, tick = 0, stopT = null; const cpuStop = rnd(0.6, 1.5);
      return wait((dt) => {
        t += dt; tick -= dt;
        if (!d.stopped) {
          if (tick <= 0) { tick = 0.055; d.vals = d.vals.map(() => 1 + Math.floor(Math.random() * sides)); snd.sfx('dice'); }
          const stop = d.cpu ? t > cpuStop / S.speed : (inputFor(pi).aP || !!takeTap()) && t > 0.15;
          if (stop || t > 7) { d.stopped = true; d.vals = d.vals.map(() => 1 + Math.floor(Math.random() * sides)); stopT = t; snd.sfx('hit'); }
        } else if (t - stopT > 0.75 / S.speed) { G.ui.dice = null; return { v: d.vals.slice() }; }
      });
    },
    move(p, nodeId, stepsLeft) {
      const to = nodeOf(nodeId), fx = p.x, fy = p.y;
      G.ui.moving = p.i; G.ui.moveK = 0; G.ui.steps = { pi: p.i, n: stepsLeft };
      snd.sfx('step');
      let t = 0; const dur = 0.2 / S.speed;
      return wait((dt) => {
        t += dt; const k = Math.min(1, t / dur);
        p.x = fx + (to.x - fx) * k; p.y = fy + (to.y - fy) * k; G.ui.moveK = k;
        G.ui.cam.tx = p.x; G.ui.cam.ty = p.y;
        if (k >= 1) { p.x = to.x; p.y = to.y; G.ui.moving = null; if (stepsLeft <= 0) G.ui.steps = null; return { v: undefined }; }
      });
    },
    teleport(p, nodeId) {
      const to = nodeOf(nodeId);
      G.ui.tele = { pi: p.i, k: 1 }; snd.sfx('whoosh');
      let t = 0, phase = 0; G.ui.cam.tx = p.x; G.ui.cam.ty = p.y;
      return wait((dt) => {
        t += dt;
        if (phase === 0) { G.ui.tele.k = Math.max(0, 1 - t / 0.35); if (t >= 0.35) { phase = 1; t = 0; p.node = nodeId; p.x = to.x; p.y = to.y; G.ui.cam.tx = to.x; G.ui.cam.ty = to.y; } }
        else { G.ui.tele.k = Math.min(1, t / 0.35); if (t >= 0.35) { G.ui.tele = null; return { v: undefined }; } }
      });
    },
    wheel(title, entries, idx) {
      const tot = entries.reduce((s, e) => s + e.w, 0);
      let before = 0; for (let i = 0; i < idx; i++) before += entries[i].w;
      const mid = ((before + entries[idx].w / 2) / tot) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.6 * (entries[idx].w / tot) * Math.PI * 2;
      const ang0 = 0, target = -Math.PI / 2 - mid + jitter;
      const spin = 6 * Math.PI + ((((target - ang0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
      const w = { title, entries, idx, ang: ang0, done: false };
      G.ui.wheel = w;
      let t = 0, last = -1; const dur = 3.4;
      return wait((dt) => {
        t += dt; const k = Math.min(1, t / (dur / S.speed)), e = 1 - Math.pow(1 - k, 3);
        w.ang = ang0 + spin * e;
        const seg = Math.floor((w.ang * 6) / Math.PI); if (seg !== last) { last = seg; if (k < 1) snd.sfx('tick'); }
        if (k >= 1 && !w.done) { w.done = true; snd.sfx('ok'); t = dur / S.speed; w.hold = 0; }
        if (w.done) { w.hold += dt; if (w.hold > 1.3 / S.speed) { G.ui.wheel = null; return { v: idx }; } }
      });
    },
    timing(pi) {
      const p = G.players[pi];
      const tm = { pi, pos: 0, stopped: false, q: 0 };
      G.ui.timing = tm; clearTap();
      let t = 0, stopT = null; const err = [0.38, 0.22, 0.1][p.level] * Math.random(), want = 0.5 + (Math.random() < 0.5 ? -err : err);
      return wait((dt) => {
        t += dt;
        if (!tm.stopped) {
          const ph = (t * 1.15) % 2; tm.pos = ph < 1 ? ph : 2 - ph;
          const stop = p.kind === 'cpu' ? (t > 0.5 && Math.abs(tm.pos - want) < 0.03) : (inputFor(pi).aP || !!takeTap());
          if (stop || t > 8) { tm.stopped = true; tm.q = 1 - Math.abs(tm.pos - 0.5) / 0.5; stopT = t; snd.sfx(tm.q > 0.7 ? 'ok' : 'hit'); }
        } else if (t - stopT > 1.0) { G.ui.timing = null; return { v: tm.q }; }
      });
    },
    showColors() {
      G.ui.colors = true; snd.sfx('go');
      return sleep(2.4).then(() => { G.ui.colors = null; });
    },
    minigame: (spec) => playMinigame(spec),
    async minigameResult(G2, parts, res, type) {
      const meta = mgMeta(res.id || G.mgLast);
      const reward = { 1: 10, 2: 3, 3: 2, 4: 0 };
      let rows;
      if (type === '4p') {
        rows = res.order.map((sl) => ({ slot: sl, place: res.rank[sl] + '.', coins: reward[res.rank[sl]] || 0, win: res.rank[sl] === 1, note: res.rank[sl] === 1 ? 'Sieger!' : '' }));
      } else {
        const wt = res.winTeam;
        rows = parts.slice().sort((a, b) => (b.team === wt) - (a.team === wt)).map((q) => ({ slot: q.slot, place: q.team === wt ? 'SIEG' : '', coins: q.team === wt ? 10 : 0, win: q.team === wt, note: q.team === wt ? 'Gewonnen!' : 'Verloren' }));
      }
      G.ui.mgres = { title: G.mgLastName || 'Ergebnis', rows };
      snd.music('win'); snd.sfx('win');
      await sleep(3.6);
      G.ui.mgres = null;
      snd.music(BOARDS[G.boardId].music);
    },
  };

  async function playMinigame(spec) {
    const def = MG[spec.id], meta = mgMeta(spec.id);
    const parts = spec.parts.map((q) => ({ ...q, char: G.players[q.slot].char, name: G.players[q.slot].name, hc: G.players[q.slot].hc }));
    G.mgLast = spec.id; G.mgLastName = meta.name;
    const mg = { phase: 'intro', id: spec.id, meta, parts, state: null, t: 0, ready: {}, count: 3 };
    G.ui.mg = mg; snd.music('mini'); clearTap();
    const hp = parts.filter((q) => G.players[q.slot].kind === 'human');
    // Anleitung: alle Menschen bestätigen mit A
    await wait((dt) => {
      mg.t += dt;
      for (const q of hp) {
        const i = hp.length === 1 ? anyInput() : slotInput(q.slot);
        if (i.aP && mg.t > 0.3) mg.ready[q.slot] = true;
      }
      const tap = takeTap(); if (tap && mg.t > 0.3) for (const q of hp) mg.ready[q.slot] = true;
      const allReady = hp.every((q) => mg.ready[q.slot]);
      if (allReady && (hp.length > 0 ? true : mg.t > 3.5) || mg.t > 30) return { v: undefined };
    });
    mg.state = def.init(parts);
    mg.phase = 'count';
    for (const n of [3, 2, 1]) { mg.count = n; snd.sfx('count'); await sleep(0.7); }
    mg.count = 0; snd.sfx('go'); mg.phase = 'play';
    const single = hp.length === 1;
    const cpuIn = new Map();
    await wait((dt) => {
      dt = Math.min(dt, 1 / 30) * 1;
      mg.t += dt;
      const inp = (slot) => {
        const p = G.players[slot];
        if (p.kind === 'human') return single ? anyInput() : slotInput(slot);
        return cpuIn.get(slot) || { x: 0, y: 0, a: false, b: false, aP: false, bP: false };
      };
      for (const q of parts) {
        const p = G.players[q.slot];
        if (p.kind !== 'human') cpuIn.set(q.slot, { x: 0, y: 0, a: false, b: false, aP: false, bP: false, ...def.ai(mg.state, q.slot, p.level, dt) });
      }
      def.update(mg.state, inp, dt);
      if (def.done(mg.state)) return { v: undefined };
    });
    mg.phase = 'end'; snd.sfx('win');
    await sleep(1.5);
    const res = def.result(mg.state, parts);
    res.id = spec.id;
    G.ui.mg = null;
    return res;
  }

  S.turbo = 1; // nur zum Testen: mehrere Schritte pro Bild
  S.tick = (dt) => { for (let k = 0; k < S.turbo; k++) S.step(dt); };
  S.step = (dt) => {
    S.time += dt;
    const list = S.tasks.slice();
    for (const tk of list) {
      const r = tk.fn(dt);
      if (r !== undefined) { S.tasks.splice(S.tasks.indexOf(tk), 1); tk.resolve(r.v); }
    }
    if (G.ui.banner === null && G.ui.moving == null) { /* Kamera folgt Fokus */ }
    camUpdate(G, dt);
  };
  S.draw = (c) => {
    const mg = G.ui.mg;
    if (mg) { drawMinigame(c, G, mg, S.time); return; }
    drawBoardScene(c, G, S.time);
  };
  S.start = () => runGame(G, env);
  S.env = env;
  return S;
}

function drawMinigame(c, G, mg, time) {
  const def = MG[mg.id];
  if (mg.phase === 'intro') {
    rect(c, 0, 0, W, H, '#1a1c2c');
    for (let i = 0; i < 30; i++) rect(c, (i * 37 + time * 20) % W, (i * 53) % H, 2, 2, '#333c57');
    text(c, mg.meta.name, W / 2, 20, { align: 'c', s: 3, color: C.yel });
    const type = mg.meta.type === '4p' ? 'JEDER GEGEN JEDEN' : mg.meta.type === '2v2' ? '2 GEGEN 2' : '1 GEGEN 3';
    text(c, type, W / 2, 50, { align: 'c', color: C.cyan });
    panel(c, 40, 70, 400, 60, { bg: '#262a40', border: C.lgy });
    wrap(mg.meta.hint, 62).forEach((l, k) => text(c, l, W / 2, 80 + k * 11, { align: 'c' }));
    text(c, 'STEUERUNG: ' + mg.meta.ctl, W / 2, 112, { align: 'c', color: C.lim });
    mg.parts.forEach((q, i) => {
      const x = 28 + i * 106, y = 142;
      const p = G.players[q.slot];
      const col = q.team === null || q.team === undefined ? PCOL[q.slot] : q.team === 0 ? C.sky : C.red;
      panel(c, x, y, 98, 90, { bg: '#262a40', border: col, shine: false });
      drawChar(c, p.char, x + 49, y + 52, { s: 2 });
      text(c, p.name.slice(0, 10), x + 49, y + 58, { align: 'c' });
      if (mg.meta.type !== '4p') text(c, mg.meta.type === '1v3' ? (q.team === 0 ? 'ALLEINE' : 'TEAM') : q.team === 0 ? 'TEAM BLAU' : 'TEAM ROT', x + 49, y + 69, { align: 'c', color: col });
      const rd = mg.ready[q.slot] || p.kind === 'cpu';
      text(c, p.kind === 'cpu' ? 'COMPUTER' : rd ? 'BEREIT!' : 'A DRÜCKEN', x + 49, y + 79, { align: 'c', color: rd ? C.lim : C.yel });
    });
    text(c, 'ALLE MENSCHEN: A (ODER TIPPEN)', W / 2, 248, { align: 'c', color: C.lgy });
    return;
  }
  def.render(c, mg.state);
  if (mg.phase === 'count') {
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, H);
    if (mg.count > 0) text(c, mg.count, W / 2, 100, { align: 'c', s: 10, color: C.yel });
  }
  if (mg.phase === 'play' && mg.t < 0.9) text(c, 'LOS!', W / 2, 100, { align: 'c', s: 8, color: C.lim });
  if (mg.phase === 'end') {
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, W, H);
    text(c, 'ENDE!', W / 2, 100, { align: 'c', s: 8, color: C.yel });
  }
}
