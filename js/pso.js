// pso.js — Particle Swarm Optimization

class ParticleSwarm {
  /**
   * @param {Landscape} landscape
   * @param {object} cfg  { popSize, w, c1, c2 }
   */
  constructor(landscape, cfg = {}) {
    this.landscape = landscape;
    this.random = cfg.random ?? Math.random;
    this.initialPositions = cfg.initialPositions;
    this.popSize = cfg.popSize ?? 30;
    this.w = cfg.w ?? 0.729; // inertia weight
    this.c1 = cfg.c1 ?? 1.494; // cognitive coefficient
    this.c2 = cfg.c2 ?? 1.494; // social coefficient
    this.generation = 0;
    this.particles = [];
    this.best = null; // global best {x, y, f}
    this.history = [];
    this._init();
  }

  /** Expose particles as `population` for the renderer */
  get population() {
    return this.particles;
  }

  reset() {
    this.generation = 0;
    this.particles = [];
    this.best = null;
    this.history = [];
    this._init();
  }

  _init() {
    for (let i = 0; i < this.popSize; i++) {
      const x = this.initialPositions?.[i]?.x ?? this.random();
      const y = this.initialPositions?.[i]?.y ?? this.random();
      const vx = (this.random() - 0.5) * 0.06;
      const vy = (this.random() - 0.5) * 0.06;
      const f = this.landscape.normalised(x, y);
      this.particles.push({
        x,
        y,
        vx,
        vy,
        f,
        pbx: x,
        pby: y,
        pbf: f, // personal best
        trail: [{ x, y }],
      });
      if (!this.best || f > this.best.f) this.best = { x, y, f };
    }
    this.history.push(this.best.f);
  }

  step() {
    const VMAX = 0.07;

    for (const p of this.particles) {
      // Independent random factors per dimension (standard PSO)
      const r1x = this.random(),
        r1y = this.random();
      const r2x = this.random(),
        r2y = this.random();

      p.vx =
        this.w * p.vx +
        this.c1 * r1x * (p.pbx - p.x) +
        this.c2 * r2x * (this.best.x - p.x);
      p.vy =
        this.w * p.vy +
        this.c1 * r1y * (p.pby - p.y) +
        this.c2 * r2y * (this.best.y - p.y);

      // Velocity clamping
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > VMAX) {
        p.vx = (p.vx / speed) * VMAX;
        p.vy = (p.vy / speed) * VMAX;
      }

      // Position update with absorbing boundary (damped wall)
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) {
        p.x = 0;
        p.vx *= -0.5;
      }
      if (p.x > 1) {
        p.x = 1;
        p.vx *= -0.5;
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy *= -0.5;
      }
      if (p.y > 1) {
        p.y = 1;
        p.vy *= -0.5;
      }

      p.f = this.landscape.normalised(p.x, p.y);

      // Update personal best
      if (p.f > p.pbf) {
        p.pbx = p.x;
        p.pby = p.y;
        p.pbf = p.f;
      }

      // Update global best
      if (p.f > this.best.f) this.best = { x: p.x, y: p.y, f: p.f };

      // Trail history
      p.trail = [...p.trail, { x: p.x, y: p.y }].slice(-8);
    }

    this.generation++;
    this.history.push(this.best.f);
    if (this.history.length > 500) this.history.shift();
  }
}
