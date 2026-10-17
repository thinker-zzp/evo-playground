const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const context = vm.createContext({ console });
for (const file of ["utils", "landscape", "benchmarks", "ga", "pso", "de"]) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js", file + ".js"), "utf8"),
    context,
  );
}
const {
  Landscape,
  GeneticAlgorithm,
  ParticleSwarm,
  DifferentialEvolution,
  seededRandom,
} = vm.runInContext(
  "({Landscape, GeneticAlgorithm, ParticleSwarm, DifferentialEvolution, seededRandom})",
  context,
);
const types = [GeneticAlgorithm, ParticleSwarm, DifferentialEvolution];
const starts = Array.from({ length: 36 }, (_, i) => ({
  x: ((i % 6) + 0.5) / 6,
  y: (Math.floor(i / 6) + 0.5) / 6,
}));

test("seed streams repeat exactly and shared starts are copied without mutation", () => {
  for (const Type of types) {
    const field = new Landscape("peaks", 42);
    const a = new Type(field, {
      popSize: 36,
      initialPositions: starts,
      random: seededRandom(13),
    });
    const b = new Type(field, {
      popSize: 36,
      initialPositions: starts,
      random: seededRandom(13),
    });
    assert.equal(
      JSON.stringify(a.population.map(({ x, y }) => ({ x, y }))),
      JSON.stringify(starts),
    );
    assert.notEqual(a.population[0], starts[0]);
    for (let i = 0; i < 40; i++) {
      a.step();
      b.step();
    }
    assert.equal(JSON.stringify(a.population), JSON.stringify(b.population));
    assert.equal(JSON.stringify(a.history), JSON.stringify(b.history));
  }
});

test("all algorithms retain finite, bounded candidates and monotone bests on every terrain", () => {
  for (const preset of ["peaks", "islands", "needle"])
    for (const Type of types)
      for (const popSize of [12, 36, 72]) {
        const field = new Landscape(preset, 43);
        const a = new Type(field, { popSize, random: seededRandom(99) });
        let best = a.best.f;
        for (let i = 1; i <= 120; i++) {
          a.step();
          assert.equal(a.generation, i);
          assert.equal(a.population.length, popSize);
          assert.ok(a.best.f >= best);
          best = a.best.f;
          for (const p of a.population) {
            assert.ok(Number.isFinite(p.f));
            assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
          }
        }
        assert.equal(a.history.length, 121);
      }
});

test("moving the main peak invalidates the sampled optimum and changes the actual objective", () => {
  const field = new Landscape("islands", 42);
  const old = field.optimumPos,
    oldValue = field.evaluate(0.15, 0.88);
  field.movePeak(0.15, 0.88);
  const next = field.optimumPos;
  assert.ok(Math.hypot(next.x - old.x, next.y - old.y) > 0.4);
  assert.ok(field.evaluate(0.15, 0.88) > oldValue);
  assert.ok(Math.abs(field.normalised(next.x, next.y) - 1) < 1e-12);
  const fresh = new GeneticAlgorithm(field, {
    popSize: 36,
    initialPositions: starts,
    random: seededRandom(13),
  });
  assert.equal(fresh.generation, 0);
  for (const p of fresh.population)
    assert.equal(p.f, field.normalised(p.x, p.y));
});

test("terrain generation repeats for a seed and varies for a new seed", () => {
  const a = new Landscape("peaks", 42),
    b = new Landscape("peaks", 42),
    c = new Landscape("peaks", 43);
  assert.equal(JSON.stringify(a._peaks), JSON.stringify(b._peaks));
  assert.notEqual(JSON.stringify(a._peaks), JSON.stringify(c._peaks));
});

test("retina map cache uses physical pixels and invalidates after mountain edits", () => {
  let segments = 0;
  const noop = () => {};
  context.document = {
    createElement: () => ({
      getContext: () =>
        new Proxy(
          {},
          {
            get: (_, key) =>
              key === "createImageData"
                ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
                : key === "lineTo"
                  ? () => segments++
                  : noop,
            set: () => true,
          },
        ),
    }),
  };
  const field = new Landscape("peaks", 42);
  const image = field.getBackground(300, 200, 2);
  assert.equal(image.width, 600);
  assert.equal(image.height, 400);
  assert.ok(segments > 1000);
  assert.equal(field.getBackground(300, 200, 2), image);
  field.movePeak(0.2, 0.2);
  assert.notEqual(field.getBackground(300, 200, 2), image);
});
