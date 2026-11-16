// Pixel Party: Szenen (Titel, Einrichtung, Spiel, Ergebnis) und Hauptschleife
import { canvas, ctx as c, W, H, C, text, textWidth, wrap, rect, panel, drawChar, drawFace, icon, CHARS, PCOL } from './gfx.js';
import { initInput, updateInput, anyInput, slotInput, takeTap, clearTap, setTouchSlot, SCHEME_HINT, touch } from './input.js';
import { initAudio, sfx, music, musicRestart, isMuted, setMuted, getVolume, setVolume } from './audio.js';
import { BOARDS, BOARD_IDS } from './boards.js';
import { MG_META } from './minigames/meta.js';
import { createGame, computeRanks } from './game.js';
import { createSession } from './session.js';
import { makeBackground } from './boardart.js';

initInput(canvas);
let audioReady = false;
const unlock = () => { if (!audioReady) { initAudio(); audioReady = true; musicRestart(); } };
addEventListener('pointerdown', unlock); addEventListener('keydown', unlock); addEventListener('touchstart', unlock);

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const k = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = Math.floor(W * k) + 'px'; canvas.style.height = Math.floor(H * k) + 'px';
}
addEventListener('resize', fit); fit();

const TYPES = ['Mensch', 'CPU leicht', 'CPU mittel', 'CPU schwer'];
const setup = {
  board: 0, turns: 10, row: 0, col: 0,
  slots: [0, 1, 2, 3].map((i) => ({ type: i === 0 ? 0 : 2, char: i, hc: 0 })),
};
let scene = 'title', sel = 0, session = null, paused = false, pauseSel = 0, resultG = null, helpPage = 0, pracSel = 0, pracBusy = false;
let time = 0, hits = [];
const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
function tapHit(tap) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (tap.x >= h.x && tap.x < h.x + h.w && tap.y >= h.y && tap.y < h.y + h.h) { h.fn(); return true; } } return false; }

function bgStars(t) {
  rect(c, 0, 0, W, H, '#1a1c2c');
  for (let i = 0; i < 46; i++) { const x = (i * 97 + t * (6 + (i % 5) * 3)) % W, y = (i * 53 + 11) % H; rect(c, x, y, 2, 2, i % 3 ? '#333c57' : '#5d275d'); }
}
function menuList(items, selIdx, x, y, w = 180, rh = 18) {
  items.forEach((it, k) => {
    const yy = y + k * rh, on = k === selIdx;
    panel(c, x, yy, w, rh - 3, { bg: on ? '#3b5dc9' : '#262a40', border: on ? C.yel : C.gry, shine: on });
    text(c, it.label, x + w / 2, yy + 5, { align: 'c', color: on ? C.wht : C.lgy });
    hit(x, yy, w, rh - 3, () => { selIdx = k; it.sel(k); });
  });
}

// ---------- Titel ----------
function titleItems() {
  return [
    { label: 'Partie starten', go: () => { scene = 'setup'; setup.row = 5; } },
    { label: 'Minispiele üben', go: () => { scene = 'practice'; } },
    { label: 'Anleitung', go: () => { scene = 'help'; helpPage = 0; } },
    { label: 'Ton: ' + (isMuted() ? 'aus' : 'an'), go: () => { setMuted(!isMuted()); } },
  ];
}
function drawTitle() {
  bgStars(time);
  const word = ['P', 'I', 'X', 'E', 'L', ' ', 'P', 'A', 'R', 'T', 'Y'];
  const cols = [C.red, C.ora, C.yel, C.lim, C.sky, C.wht, C.cyan, C.lim, C.yel, C.ora, C.red];
  let x = W / 2 - (word.length * 6 * 5) / 2;
  word.forEach((ch, i) => { text(c, ch, x + i * 30, 30 + Math.round(Math.sin(time * 3 + i * 0.6) * 4), { s: 5, color: cols[i], shadow: C.pur }); });
  CHARS.forEach((_, i) => { drawChar(c, i, 40 + i * 57, 112 + Math.round(Math.abs(Math.sin(time * 4 + i)) * -8), { s: 2, frame: Math.floor(time * 6 + i) % 2 }); });
  const items = titleItems();
  menuList(items.map((it, k) => ({ ...it, sel: (kk) => { sel = kk; items[kk].go(); sfx('select'); } })), sel, W / 2 - 90, 132);
  text(c, 'JEDER GEGEN JEDEN. BIS ZU 4 SPIELER. DER COMPUTER SPIELT MIT.', W / 2, 252, { align: 'c', color: C.lgy, shadow: null });
  const a = anyInput();
  if (a.uP) { sel = (sel + 3) % 4; sfx('tick'); }
  if (a.dP) { sel = (sel + 1) % 4; sfx('tick'); }
  if (a.aP) { sfx('select'); items[sel].go(); }
}

// ---------- Einrichtung ----------
function takenChars(except) { return setup.slots.filter((_, i) => i !== except).map((s) => s.char); }
function cycle(row, col, dir) {
  if (row === 0) { setup.board = (setup.board + dir + BOARD_IDS.length) % BOARD_IDS.length; return; }
  if (row === 1) { const v = [5, 10, 15, 20]; setup.turns = v[(v.indexOf(setup.turns) + dir + v.length) % v.length]; return; }
  const s = setup.slots[col];
  if (row === 2) s.type = (s.type + dir + 4) % 4;
  if (row === 3) { const tk = takenChars(col); let ch = s.char; do { ch = (ch + dir + 8) % 8; } while (tk.includes(ch)); s.char = ch; }
  if (row === 4) s.hc = (s.hc + dir + 4) % 4;
}
function startGame() {
  const humans = setup.slots.filter((s) => s.type === 0).length;
  const players = setup.slots.map((s, i) => ({ name: s.type === 0 ? 'Spieler ' + (i + 1) : CHARS[s.char].name, char: s.char, kind: s.type === 0 ? 'human' : 'cpu', level: s.type === 0 ? 1 : s.type - 1, hc: s.hc }));
  if (players.every((p) => p.kind === 'cpu')) { /* Zuschauermodus erlaubt */ }
  const firstHuman = players.findIndex((p) => p.kind === 'human');
  setTouchSlot(firstHuman >= 0 ? firstHuman : 0);
  const G = createGame({ board: BOARD_IDS[setup.board], turns: setup.turns, players });
  computeRanks(G);
  session = createSession(G);
  scene = 'game'; paused = false;
  music(BOARDS[G.boardId].music);
  session.start().then(() => { resultG = G; scene = 'results'; session = null; }).catch((e) => { console.error(e); });
}
function drawSetup() {
  bgStars(time);
  text(c, 'NEUE PARTIE', W / 2, 8, { align: 'c', s: 2, color: C.yel });
  // Brett + Runden
  const rowsY = [30, 52];
  const b = BOARDS[BOARD_IDS[setup.board]];
  [['BRETT', b.name], ['RUNDEN', setup.turns]].forEach(([l, v], r) => {
    const on = setup.row === r;
    panel(c, 90, rowsY[r], 300, 18, { bg: on ? '#3b5dc9' : '#262a40', border: on ? C.yel : C.gry, shine: false });
    text(c, l, 100, rowsY[r] + 6, { color: C.lgy });
    text(c, '◄  ' + v + '  ►', 300, rowsY[r] + 6, { align: 'c', color: C.wht });
    hit(90, rowsY[r], 150, 18, () => { setup.row = r; cycle(r, 0, -1); sfx('tick'); });
    hit(240, rowsY[r], 150, 18, () => { setup.row = r; cycle(r, 0, 1); sfx('tick'); });
  });
  text(c, b.desc, W / 2, 74, { align: 'c', color: C.lgy, shadow: null });
  // Spielerkarten
  for (let i = 0; i < 4; i++) {
    const s = setup.slots[i], x = 6 + i * 118, y = 88, w = 114;
    panel(c, x, y, w, 128, { bg: '#1a1c2c', border: PCOL[i], shine: false });
    text(c, 'SPIELER ' + (i + 1), x + w / 2, y + 5, { align: 'c', color: PCOL[i] });
    const cellOn = (r) => setup.row === r && setup.col === i;
    const cell = (r, yy, label) => {
      rect(c, x + 5, yy, w - 10, 14, cellOn(r) ? '#3b5dc9' : '#262a40');
      if (cellOn(r)) rect(c, x + 5, yy, w - 10, 1, C.yel);
      text(c, label, x + w / 2, yy + 4, { align: 'c', color: cellOn(r) ? C.wht : C.lgy });
      hit(x + 5, yy, w - 10, 14, () => { setup.row = r; setup.col = i; cycle(r, i, 1); sfx('tick'); });
    };
    cell(2, y + 17, TYPES[s.type]);
    drawChar(c, s.char, x + w / 2, y + 77, { s: 2, frame: Math.floor(time * 4) % 2 });
    cell(3, y + 82, CHARS[s.char].name);
    cell(4, y + 99, 'VORTEIL ' + (s.hc ? '+' + s.hc : 'AUS'));
    text(c, s.type === 0 ? SCHEME_HINT[i].split(' ')[0] : 'COMPUTER', x + w / 2, y + 117, { align: 'c', color: C.gry, shadow: null });
  }
  const on = setup.row === 5;
  panel(c, 150, 226, 180, 22, { bg: on ? '#2f9f58' : '#257179', border: on ? C.yel : C.lgy });
  text(c, 'LOS GEHT\'S!', W / 2, 233, { align: 'c', s: 1, color: C.wht });
  hit(150, 226, 180, 22, () => { sfx('ok'); startGame(); });
  text(c, 'PFEILE ODER TIPPEN. A = ÄNDERN, B = ZURÜCK. VORTEIL = KLEINER BONUS IN MINISPIELEN', W / 2, 254, { align: 'c', color: C.lgy, shadow: null });
  text(c, 'ESC = ZURÜCK', 6, 262, { color: C.gry, shadow: null });
  const a = anyInput();
  if (a.bP && setup.row !== 5) { cycle(setup.row, setup.col, -1); sfx('tick'); }
  if (a.uP) { setup.row = (setup.row + 5) % 6; sfx('tick'); }
  if (a.dP) { setup.row = (setup.row + 1) % 6; sfx('tick'); }
  if (a.lP) { if (setup.row <= 1) cycle(setup.row, 0, -1); else if (setup.row <= 4) setup.col = (setup.col + 3) % 4; sfx('tick'); }
  if (a.rP) { if (setup.row <= 1) cycle(setup.row, 0, 1); else if (setup.row <= 4) setup.col = (setup.col + 1) % 4; sfx('tick'); }
  if (a.aP) { if (setup.row === 5) { sfx('ok'); startGame(); } else { cycle(setup.row, setup.col, 1); sfx('tick'); } }
}

// ---------- Minispiele üben ----------
function drawPractice() {
  bgStars(time);
  text(c, 'MINISPIELE', W / 2, 8, { align: 'c', s: 2, color: C.yel });
  text(c, 'MIT DEN SPIELERN AUS DER EINRICHTUNG (STANDARD: DU GEGEN 3 COMPUTER)', W / 2, 26, { align: 'c', color: C.lgy, shadow: null });
  MG_META.forEach((m, k) => {
    const col = k % 2, row = Math.floor(k / 2), x = 14 + col * 232, y = 40 + row * 31;
    const on = k === pracSel;
    panel(c, x, y, 226, 28, { bg: on ? '#3b5dc9' : '#262a40', border: on ? C.yel : C.gry, shine: false });
    text(c, m.name, x + 6, y + 5, { color: on ? C.wht : C.lgy });
    text(c, m.type === '4p' ? 'ALLE GEGEN ALLE' : m.type === '2v2' ? '2 GEGEN 2' : '1 GEGEN 3', x + 6, y + 16, { color: C.gry, shadow: null });
    hit(x, y, 226, 28, () => { pracSel = k; startPractice(m.id); });
  });
  text(c, 'ESC = ZURÜCK', 6, 262, { color: C.gry, shadow: null });
  const a = anyInput();
  if (a.uP) { pracSel = (pracSel + 10) % 12; sfx('tick'); } if (a.dP) { pracSel = (pracSel + 2) % 12; sfx('tick'); }
  if (a.lP || a.rP) { pracSel = pracSel ^ 1; sfx('tick'); }
  if (a.aP) startPractice(MG_META[pracSel].id);
}
function startPractice(id) {
  if (pracBusy) return;
  pracBusy = true; sfx('select');
  const players = setup.slots.map((s, i) => ({ name: s.type === 0 ? 'Spieler ' + (i + 1) : CHARS[s.char].name, char: s.char, kind: s.type === 0 ? 'human' : 'cpu', level: s.type === 0 ? 1 : s.type - 1, hc: s.hc }));
  if (!players.some((p) => p.kind === 'human')) players[0].kind = 'human';
  setTouchSlot(players.findIndex((p) => p.kind === 'human'));
  const G = createGame({ board: 'pirate', turns: 10, players });
  const S = createSession(G);
  const meta = MG_META.find((m) => m.id === id);
  const parts = players.map((p, i) => ({ slot: i, team: meta.type === '4p' ? null : meta.type === '2v2' ? (i < 2 ? 0 : 1) : (i === 0 ? 0 : 1) }));
  session = S; scene = 'practiceplay';
  S.env.minigame({ id, parts }).then(async (res) => {
    await S.env.minigameResult(G, parts, res, meta.type);
    session = null; scene = 'practice'; pracBusy = false; music('title');
  });
}

// ---------- Anleitung ----------
const HELP = [
  ['SO FUNKTIONIERT PARTY', ['Ziel: Nach der letzten Runde die meisten Sterne haben. Ein Stern kostet 20 Münzen und wird beim Sternhändler gekauft. Der zieht nach jedem Kauf weiter.', 'Jede Runde: alle würfeln und laufen (Würfel 1 bis 10). Danach gibt es ein Minispiel.', 'Blaue Felder: +3 Münzen. Rote Felder: -3 Münzen. Grüne Felder lösen etwas Besonderes aus.']],
  ['DIE FELDER', ['? Ereignis. Stern-Feld: Glücksrad. X: Pech-Feld vom Dunkelkönig. I: Item per Geschicklichkeit. !: VS-Feld, alle zahlen in den Topf.', 'Läden verkaufen Items. Der Klau-Geist klaut Münzen oder (50 Münzen) einen Stern. Abkürzungen kosten teils Wegzoll.', 'Minispiel-Art: Die Farbe deines Feldes entscheidet über die Teams. Alle gleich: jeder gegen jeden. 2 zu 2: Teams. 3 zu 1: einer gegen drei.']],
  ['ITEMS UND FINALE', ['Doppel- und Dreifachwürfel, Wunschwürfel, Schneckenwürfel, Taschendieb, Geisterglocke, Sternportal und Tauschkiste. Ein Item pro Zug, Beutel für 3.', 'Letzte 5 Runden: Der Letzte bekommt ein Geschenk, Felder zählen doppelt, und wer auf einem besetzten Feld landet, muss ein Duell spielen.', 'Am Ende gibt es 3 geheime Bonus-Sterne.']],
  ['STEUERUNG', ['Spieler 1: WASD + Q (oder Leertaste). Spieler 2: Pfeile + Enter.', 'Spieler 3: IJKL + U. Spieler 4: Ziffernblock 8456 + 0 oder TFGH + R.', 'Gamepads werden erkannt. Auf Handy und Tablet: Stick und A-Knopf, Menüs auch per Antippen. Spielt nur ein Mensch, gehen alle Tasten.']],
];
function drawHelp() {
  bgStars(time);
  const [t, lines] = HELP[helpPage];
  text(c, t, W / 2, 10, { align: 'c', s: 2, color: C.yel });
  panel(c, 24, 36, 432, 196, { bg: '#1a1c2c', border: C.lgy });
  let y = 46;
  for (const l of lines) { for (const w of wrap(l, 68)) { text(c, w, 34, y, {}); y += 11; } y += 9; }
  text(c, 'SEITE ' + (helpPage + 1) + ' VON ' + HELP.length + '   ◄ ► BLÄTTERN, A = ZURÜCK', W / 2, 246, { align: 'c', color: C.lgy, shadow: null });
  hit(0, 0, W / 3, H, () => { helpPage = (helpPage + HELP.length - 1) % HELP.length; });
  hit((W * 2) / 3, 0, W / 3, H, () => { helpPage = (helpPage + 1) % HELP.length; });
  hit(W / 3, 0, W / 3, H, () => { scene = 'title'; });
  const a = anyInput();
  if (a.lP) { helpPage = (helpPage + HELP.length - 1) % HELP.length; sfx('tick'); }
  if (a.rP) { helpPage = (helpPage + 1) % HELP.length; sfx('tick'); }
  if (a.aP || a.bP) { scene = 'title'; sfx('back'); }
}

// ---------- Ergebnis ----------
function drawResults() {
  const G = resultG;
  bgStars(time);
  const order = G.result.order;
  text(c, G.players[G.result.winner].name + ' IST DER SUPERSTAR!', W / 2, 12, { align: 'c', s: 2, color: C.yel });
  for (let i = 0; i < 24; i++) { const x = (i * 83 + time * 30) % W, y = (time * 50 + i * 41) % H; rect(c, x, y, 3, 3, [C.yel, C.sky, C.red, C.lim][i % 4]); }
  order.forEach((pi, k) => {
    const p = G.players[pi], x = 40 + k * 100, base = 220, h = [125, 100, 80, 62][k];
    rect(c, x, base - h, 84, h, PCOL[pi]); rect(c, x, base - h, 84, 3, 'rgba(255,255,255,.5)');
    text(c, (k + 1) + '.', x + 42, base - h + 8, { align: 'c', s: 2, color: C.ink, shadow: null });
    drawChar(c, p.char, x + 42, base - h - 4 - (k === 0 ? Math.abs(Math.sin(time * 5)) * 8 : 0), { s: 2, frame: Math.floor(time * 6) % 2 });
    icon(c, 'starO', x + 12, base - 26, 1); text(c, p.stars, x + 25, base - 25, { color: C.ink, shadow: null });
    icon(c, 'coin', x + 46, base - 26, 1); text(c, p.coins, x + 56, base - 25, { color: C.ink, shadow: null });
    text(c, p.name.slice(0, 10), x + 42, base + 6, { align: 'c' });
  });
  text(c, 'A = ZUM TITEL', W / 2, 250, { align: 'c', color: C.lgy, shadow: null });
  hit(0, 0, W, H, () => { scene = 'title'; music('title'); });
  if (anyInput().aP) { scene = 'title'; music('title'); sfx('select'); }
}

// ---------- Pause ----------
function drawPause() {
  c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, W, H);
  panel(c, 150, 60, 180, 130, { bg: '#1a1c2c', border: C.yel });
  text(c, 'PAUSE', W / 2, 68, { align: 'c', s: 2, color: C.yel });
  const items = [
    { label: 'Weiter', go: () => { paused = false; } },
    { label: 'Ton: ' + (isMuted() ? 'aus' : 'an'), go: () => setMuted(!isMuted()) },
    { label: 'Lauter', go: () => setVolume(getVolume() + 0.1) },
    { label: 'Leiser', go: () => setVolume(getVolume() - 0.1) },
    { label: 'Spiel beenden', go: () => { paused = false; session = null; scene = 'title'; music('title'); } },
  ];
  items.forEach((it, k) => {
    const y = 92 + k * 18, on = k === pauseSel;
    rect(c, 160, y, 160, 15, on ? '#3b5dc9' : '#262a40');
    text(c, it.label, W / 2, y + 4, { align: 'c', color: on ? C.wht : C.lgy });
    hit(160, y, 160, 15, () => { pauseSel = k; it.go(); });
  });
  const a = anyInput();
  if (a.uP) pauseSel = (pauseSel + 4) % 5; if (a.dP) pauseSel = (pauseSel + 1) % 5;
  if (a.aP) items[pauseSel].go();
}
addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (scene === 'game' || scene === 'practiceplay') { paused = !paused; pauseSel = 0; sfx('select'); }
  else if (scene === 'setup' || scene === 'practice' || scene === 'help') { scene = 'title'; sfx('back'); }
});

// ---------- Hauptschleife ----------
let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; time += dt;
  updateInput(); hits = [];
  c.imageSmoothingEnabled = false;
  if (scene === 'title') drawTitle();
  else if (scene === 'setup') drawSetup();
  else if (scene === 'practice') drawPractice();
  else if (scene === 'help') drawHelp();
  else if (scene === 'results') drawResults();
  else if ((scene === 'game' || scene === 'practiceplay') && session) {
    if (!paused) session.tick(dt);
    session.draw(c);
    if (paused) drawPause();
  }
  const tap = takeTap();
  if (tap) tapHit(tap);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__pp = { get scene() { return scene; }, get session() { return session; }, setup, startGame, startPractice, set speed(v) { if (session) session.turbo = v; } };
