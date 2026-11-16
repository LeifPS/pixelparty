// Headless-Test der Minispiele: KI gegen KI
import { MG } from '../public/js/minigames/index.js';
import { MG_META } from '../public/js/minigames/meta.js';
const N = Number(process.argv[2] || 60);
const dt = 1 / 60;
function run(id, levels, parts) {
  const g = MG[id];
  const s = g.init(parts.map((q) => ({ ...q, char: q.slot, name: 'P' + q.slot, hc: 0 })));
  let frames = 0;
  while (!g.done(s) && frames < 60 * 120) {
    const inps = {};
    for (const q of parts) { const lv = levels[q.slot]; inps[q.slot] = g.ai(s, q.slot, lv, dt); }
    g.update(s, (sl) => ({ x: 0, y: 0, a: false, b: false, aP: false, bP: false, ...inps[sl] }), dt);
    frames++;
  }
  return { r: g.result(s, parts), secs: frames * dt, timeout: frames >= 60 * 120 };
}
for (const m of MG_META) {
  const wins = [0, 0, 0, 0], teamWins = [0, 0]; let secs = 0, to = 0;
  for (let k = 0; k < N; k++) {
    let parts, levels;
    if (m.type === '4p') { parts = [0, 1, 2, 3].map((i) => ({ slot: i, team: null })); levels = [0, 1, 2, 2]; }
    else if (m.type === '2v2') { parts = [0, 1, 2, 3].map((i) => ({ slot: i, team: i < 2 ? 0 : 1 })); levels = [1, 1, 1, 1]; }
    else { parts = [0, 1, 2, 3].map((i) => ({ slot: i, team: i === 0 ? 0 : 1 })); levels = [1, 1, 1, 1]; }
    const o = run(m.id, levels, parts);
    secs += o.secs; if (o.timeout) to++;
    if (!o.r.order || o.r.order.length !== 4) throw new Error(m.id + ' order');
    if (m.type === '4p') wins[o.r.order[0]]++; else teamWins[o.r.winTeam]++;
  }
  console.log(m.id.padEnd(10), m.type, 'Ø', (secs / N).toFixed(1) + 's', 'timeouts', to, m.type === '4p' ? 'Siege(L0,L1,L2,L2): ' + wins.join('/') : 'Team0/Team1: ' + teamWins.join('/'));
}
// 1v3 nach Stufen
for (const id of ['cannon', 'chase']) {
  for (const lv of [0, 1, 2]) {
    let solo = 0;
    for (let k = 0; k < N; k++) { const o = run(id, [lv, lv, lv, lv], [0, 1, 2, 3].map((i) => ({ slot: i, team: i === 0 ? 0 : 1 }))); if (o.r.winTeam === 0) solo++; }
    console.log(id, 'Stufe', lv, 'Solo-Siegquote', Math.round((solo / N) * 100) + '%');
  }
}
