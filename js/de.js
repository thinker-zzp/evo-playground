// de.js — Differential Evolution (DE/rand/1/bin)

class DifferentialEvolution {
  /**
   * @param {Landscape} landscape
   * @param {object} cfg  { popSize, F, CR }
   */
  constructor(landscape, cfg = {}) {
    this.landscape  = landscape;
    this.popSize    = cfg.popSize ?? 30;
    this.F          = cfg.F  ?? 0.80;  // scale factor
    this.CR         = cfg.CR ?? 0.90;  // crossover probability
    this.generation = 0;
    this.population = [];
    this.best       = null;
    this.history    = [];
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
      const f = this.landscape.normalised(x, y);
      this.population.push({ x, y, f, trail: [{ x, y }] });
    }
    this._updateBest();
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

  /** Pick a random index different from all excluded indices */
  _pick(excludes, max) {
    let r;
    do { r = Math.floor(Math.random() * max); } while (excludes.includes(r));
    return r;
  }

  step() {
    const N    = this.population.length;
    const next = [];

    for (let i = 0; i < N; i++) {
      const xi = this.population[i];

      // Select 3 mutually distinct indices a, b, c ≠ i  (DE/rand/1)
      const a = this._pick([i],       N);
      const b = this._pick([i, a],    N);
      const c = this._pick([i, a, b], N);

      const xa = this.population[a];
      const xb = this.population[b];
      const xc = this.population[c];

      // Mutation: mutant vector v = x_a + F*(x_b - x_c)
      const mx = clamp(xa.x + this.F * (xb.x - xc.x), 0, 1);
      const my = clamp(xa.y + this.F * (xb.y - xc.y), 0, 1);

      // Binomial crossover — at least one dimension comes from mutant (jRand)
      const jRand = Math.random() < 0.5 ? 'x' : 'y';
      const tx = (Math.random() < this.CR || jRand === 'x') ? mx : xi.x;
      const ty = (Math.random() < this.CR || jRand === 'y') ? my : xi.y;

      const tf = this.landscape.normalised(tx, ty);

      // Greedy selection: keep trial if it's at least as good
      if (tf >= xi.f) {
        next.push({
          x: tx, y: ty, f: tf,
          trail: [...xi.trail, { x: tx, y: ty }].slice(-7),
        });
      } else {
        next.push({ ...xi, trail: [...xi.trail] });
      }
    }

    this.population = next;
    this.generation++;
    this._updateBest();
  }
}
