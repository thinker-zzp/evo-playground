// Full-dimensional PSO, independent random coefficients per coordinate.
class ParticleSwarm {
  constructor(landscape, cfg = {}) {
    this.landscape = landscape;
    this.cfg = cfg;
    this.random = cfg.random ?? Math.random;
    this.popSize = cfg.popSize ?? 30;
    this.w = cfg.w ?? 0.729;
    this.c1 = cfg.c1 ?? 1.494;
    this.c2 = cfg.c2 ?? 1.494;
    this.reset();
  }
  get population() {
    return this.particles;
  }
  reset() {
    this.generation = 0;
    this.best = null;
    this.history = [];
    this.particles = Array.from({ length: this.popSize }, (_, i) => {
      const position = startingVector(this.landscape, this.cfg, i, this.random);
      const velocity = position.map(() => (this.random() - 0.5) * 0.06);
      const f = vectorFitness(this.landscape, position);
      const p = searchPoint(position, {
        velocity,
        pb: [...position],
        pbf: f,
        f,
        trail: [searchPoint(position)],
      });
      if (!this.best || f > this.best.f)
        this.best = searchPoint(position, { f });
      return p;
    });
    this.history.push(this.best.f);
  }
  step() {
    for (const p of this.particles) {
      p.velocity = p.position.map(
        (v, j) =>
          this.w * p.velocity[j] +
          this.c1 * this.random() * (p.pb[j] - v) +
          this.c2 * this.random() * (this.best.position[j] - v),
      );
      // Per-coordinate clamp retains the same exploration scale as D grows.
      const position = p.position.map((v, j) => {
        p.velocity[j] = clamp(p.velocity[j], -0.07, 0.07);
        const next = v + p.velocity[j];
        if (next < 0 || next > 1) p.velocity[j] *= -0.5;
        return clamp(next, 0, 1);
      });
      Object.assign(p, searchPoint(position));
      p.f = vectorFitness(this.landscape, position);
      if (p.f > p.pbf) {
        p.pb = [...position];
        p.pbf = p.f;
      }
      if (p.f > this.best.f) this.best = searchPoint(position, { f: p.f });
      p.trail = [...p.trail, searchPoint(position)].slice(-8);
    }
    this.generation++;
    this.history.push(this.best.f);
    if (this.history.length > 500) this.history.shift();
  }
}
