// utils.js — Shared utility functions

// x/y are compatibility aliases; optimization always uses the full vector.
function searchPoint(position, extra = {}) {
  return { x: position[0], y: position[1], position: [...position], ...extra };
}
function startingVector(field, cfg, index, random) {
  const p = cfg.initialPositions?.[index];
  return Array.from(
    { length: field.dimension || 2 },
    (_, j) =>
      p?.position?.[j] ??
      p?.[j] ??
      (j === 0 ? p?.x : j === 1 ? p?.y : undefined) ??
      random(),
  );
}
function vectorFitness(field, position) {
  return field.isBenchmark
    ? field.fitness(position)
    : field.normalised(...position);
}

/** Clamp v to [lo, hi] */
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Box-Muller transform: standard normal sample */
function gaussRand(random = Math.random) {
  let u, v;
  do {
    u = random();
  } while (u === 0);
  v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Squared Euclidean distance */
function dist2(x1, y1, x2, y2) {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}

/** Deterministic, separate random streams for maps and each algorithm. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
