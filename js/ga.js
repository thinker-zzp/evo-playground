// ga.js — Real-valued Genetic Algorithm

class GeneticAlgorithm {
  /**
   * @param {Landscape} landscape
   * @param {object} cfg  { popSize, mutRate, crossRate }
   */
  constructor(landscape, cfg = {}) {
    this.landscape  = landscape;
    this.popSize    = cfg.popSize   ?? 30;
    this.mutRate    = cfg.mutRate   ?? 0.10;
    this.crossRate  = cfg.crossRate ?? 0.80;
    this.generation = 0;
    this.population = [];
    this.best       = null;
    this.history    = []; // best normalised fitness per generation
    this._init();
  }

  reset() {
    this.generation = 0;
    this.population = [];
    this.best       = null;
    this.history    = [];
    this._init();
  }

  _init() {
    for (let i = 0; i < this.popSize; i++) {
      const x = Math.random(), y = Math.random();
      this.population.push(this._makeInd(x, y));
    }
    this._updateBest();
  }

  _makeInd(x, y) {
    return {
      x, y,
      f:     this.landscape.normalised(x, y),
      trail: [{ x, y }],
    };
  }

  _updateBest() {
    for (const ind of this.population) {
      if (!this.best || ind.f > this.best.f) {
        this.best = { x: ind.x, y: ind.y, f: ind.f };
      }
    }
    this.history.push(this.best.f);
    if (this.history.length > 500) this.history.shift();
  }

  /** Tournament selection (k = 3) */
  _tournament() {
    let winner = null;
    for (let i = 0; i < 3; i++) {
      const c = this.population[Math.floor(Math.random() * this.population.length)];
      if (!winner || c.f > winner.f) winner = c;
    }
    return winner;
  }

  /** BLX-α crossover (α = 0.5) */
  _blx(a, b) {
    const alpha = 0.5;
    const blx1d = (av, bv) => {
      const lo = Math.min(av, bv), hi = Math.max(av, bv), d = hi - lo;
      return clamp(lo - alpha * d + Math.random() * d * (1 + 2 * alpha), 0, 1);
    };
    return { x: blx1d(a.x, b.x), y: blx1d(a.y, b.y) };
  }

  step() {
    const next = [];

    // Elitism: carry the best individual unchanged
    const eliteOrig = this.population.find(
      p => p.x === this.best.x && p.y === this.best.y
    );
    next.push({
      x: this.best.x, y: this.best.y, f: this.best.f,
      trail: eliteOrig ? [...eliteOrig.trail] : [{ x: this.best.x, y: this.best.y }],
    });

    while (next.length < this.popSize) {
      const p1 = this._tournament();
      const p2 = this._tournament();

      // Crossover
      let cx, cy;
      if (Math.random() < this.crossRate) {
        const c = this._blx(p1, p2);
        cx = c.x; cy = c.y;
      } else {
        cx = p1.x; cy = p1.y;
      }

      // Gaussian mutation (independent per dimension)
      if (Math.random() < this.mutRate) cx = clamp(cx + gaussRand() * 0.08, 0, 1);
      if (Math.random() < this.mutRate) cy = clamp(cy + gaussRand() * 0.08, 0, 1);

      const child = this._makeInd(cx, cy);

      // Trail: extend from the closer parent
      const src = dist2(cx, cy, p1.x, p1.y) < dist2(cx, cy, p2.x, p2.y) ? p1 : p2;
      child.trail = [...src.trail, { x: cx, y: cy }].slice(-7);

      next.push(child);
    }

    this.population = next;
    this.generation++;
    this._updateBest();
  }
}
