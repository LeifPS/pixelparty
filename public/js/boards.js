// Spielbretter als Graph (reine Daten, auch ohne Browser nutzbar)
function samplePoly(pts, n) {
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push([a, b, l]); total += l;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    let d = (k * total) / n;
    for (const [a, b, l] of segs) {
      if (d <= l) { out.push([a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]); break; }
      d -= l;
    }
  }
  return out;
}
const SPECIALS = ['e', 'l', 'i', 'v', 'B', 'l', 'i', 'e', 'v'];
function ringTypes(n, offset = 0) {
  const t = []; let sp = offset;
  for (let i = 0; i < n; i++) {
    if (i % 6 === 3) { t.push(SPECIALS[sp % SPECIALS.length]); sp++; }
    else if (i % 5 === 2) t.push('r');
    else t.push('b');
  }
  return t;
}
function nearest(nodes, x, y, ids) {
  let best = null, bd = 1e9;
  for (const id of ids) { const n = nodes[id]; const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = id; } }
  return best;
}

function buildPirate() {
  const nodes = [];
  const N = 34;
  const pts = samplePoly([[130, 440], [130, 190], [260, 100], [700, 100], [830, 190], [830, 440], [700, 520], [260, 520]], N);
  const types = ringTypes(N, 0);
  pts.forEach((p, i) => nodes.push({ id: i, x: Math.round(p[0]), y: Math.round(p[1]), t: i === 0 ? 'n' : types[i], next: [(i + 1) % N] }));
  const ring = nodes.map((n) => n.id);
  const F = nearest(nodes, 130, 300, ring.slice(1));
  const G = nearest(nodes, 830, 310, ring);
  const sct = ['b', 'b', 'l', 'b', 'i', 'b', 'b', 'b'];
  const sc = [];
  for (let k = 0; k < 8; k++) {
    const id = nodes.length;
    nodes.push({ id, x: 205 + k * 78, y: 310, t: sct[k], next: [] });
    sc.push(id);
  }
  nodes[F].next.push(sc[0]);
  nodes[F].toll = 5;
  nodes[F].tollLabel = 'Dschungel-Abkürzung';
  for (let k = 0; k < 7; k++) nodes[sc[k]].next = [sc[k + 1]];
  nodes[sc[7]].next = [G];
  nodes[5].shop = true; nodes[10].shop = true; nodes[25].shop = true;
  nodes[18].thief = true;
  return {
    id: 'pirate', name: 'Pirateninsel', desc: 'Sand, Palmen und eine Dschungel-Abkürzung mit Wegzoll.',
    w: 960, h: 600, nodes, start: 0, starSpots: [8, 14, 22, 29, sc[3]], music: 'pirate',
    mainForkLabels: { main: 'Strand-Weg', alt: 'Dschungel (5 Münzen)' },
    events: [
      { id: 'cannon', w: 3, text: 'Eine Kanone schießt dich quer über die Insel!' },
      { id: 'treasure', w: 3, text: 'Schatztruhe gefunden: +10 Münzen!' },
      { id: 'shark', w: 3, text: 'Ein Hai schnappt zu: -6 Münzen!' },
      { id: 'swap', w: 2, text: 'Ein Strudel tauscht euch durcheinander!' },
      { id: 'gift', w: 2, text: 'Eine Flaschenpost bringt ein Item!' },
    ],
  };
}

function buildCastle() {
  const nodes = [];
  const N = 18;
  const L = [], R = [];
  const lt = ringTypes(N, 2), rt = ringTypes(N, 5);
  // Mitte = Knoten 0 (gehört zu beiden Ringen)
  nodes.push({ id: 0, x: 480, y: 300, t: 'e', next: [], centerFork: true });
  L.push(0);
  for (let k = 1; k < N; k++) {
    const a = (2 * Math.PI * k) / N;
    const id = nodes.length;
    nodes.push({ id, x: Math.round(290 + 190 * Math.cos(a)), y: Math.round(300 + 230 * Math.sin(a)), t: lt[k], next: [] });
    L.push(id);
  }
  R.push(0);
  for (let k = 1; k < N; k++) {
    const a = Math.PI + (2 * Math.PI * k) / N;
    const id = nodes.length;
    nodes.push({ id, x: Math.round(670 + 190 * Math.cos(a)), y: Math.round(300 + 230 * Math.sin(a)), t: rt[k], next: [] });
    R.push(id);
  }
  for (let k = 1; k < N - 1; k++) { nodes[L[k]].next = [L[k + 1]]; nodes[R[k]].next = [R[k + 1]]; }
  nodes[L[N - 1]].next = [0]; nodes[R[N - 1]].next = [0];
  nodes[0].next = [L[1], R[1]];
  nodes[0].forkLabels = ['Linker Ring', 'Rechter Ring'];
  const start = L[9]; // ganz links
  nodes[start].t = 'n';
  nodes[L[5]].shop = true; nodes[R[13]].shop = true; nodes[R[5]].shop = true;
  nodes[L[13]].thief = true; nodes[R[9]].thief = true;
  // Rechts-Ring Mitte: Spezialfeld statt rot
  return {
    id: 'castle', name: 'Spukschloss', desc: 'Zwei Ringe, eine Kreuzung in der Mitte: wohin geht es als Nächstes?',
    w: 960, h: 600, nodes, start, starSpots: [L[3], L[12], R[3], R[11], R[16]], music: 'castle',
    events: [
      { id: 'trapdoor', w: 3, text: 'Falltür! Du landest wieder am Start.' },
      { id: 'treasure', w: 3, text: 'Ein freundlicher Geist schenkt dir 10 Münzen!' },
      { id: 'shark', w: 3, text: 'Spuk! Ein Gespenst klaut dir 6 Münzen!' },
      { id: 'swap', w: 2, text: 'Geisterzauber: ihr tauscht die Plätze!' },
      { id: 'gift', w: 2, text: 'Eine Spukkiste enthält ein Item!' },
    ],
  };
}
export const BOARDS = { pirate: buildPirate(), castle: buildCastle() };
export const BOARD_IDS = ['pirate', 'castle'];

/** Kürzeste Schrittzahl von a nach b (BFS entlang der Einbahnstraßen) */
export function pathDist(board, a, b) {
  if (a === b) return 0;
  const seen = new Set([a]);
  let frontier = [a], d = 0;
  while (frontier.length) {
    d++;
    const nf = [];
    for (const id of frontier) for (const nx of board.nodes[id].next) {
      if (nx === b) return d;
      if (!seen.has(nx)) { seen.add(nx); nf.push(nx); }
    }
    frontier = nf;
  }
  return 999;
}
