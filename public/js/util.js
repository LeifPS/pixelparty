// Kleine Hilfsfunktionen
export const rnd = (a, b) => a + Math.random() * (b - a);
export const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function weighted(entries) {
  // entries: [{w:number,...}] -> Index
  const tot = entries.reduce((s, e) => s + (e.w ?? 1), 0);
  let r = Math.random() * tot;
  for (let i = 0; i < entries.length; i++) {
    r -= entries[i].w ?? 1;
    if (r <= 0) return i;
  }
  return entries.length - 1;
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
