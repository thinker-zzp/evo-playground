// utils.js — Shared utility functions

/** Clamp v to [lo, hi] */
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Box-Muller transform: standard normal sample */
function gaussRand() {
  let u, v;
  do { u = Math.random(); } while (u === 0);
  v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Squared Euclidean distance */
function dist2(x1, y1, x2, y2) {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}
