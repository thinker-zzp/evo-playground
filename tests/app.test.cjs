const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function app() {
  const nodes = new Map(),
    events = {};
  const values = {
    "r-pop": "36",
    "r-speed": "8",
    "r-mut": "0.12",
    "r-w": "0.729",
    "r-F": "0.8",
  };
  const noop = () => {};
  const ctx = new Proxy({}, { get: () => noop, set: () => true });
  function node(id, dataset = {}) {
    const classes = new Set();
    return {
      id,
      dataset,
      value: values[id],
      checked: true,
      events: {},
      style: {},
      attributes: {},
      lastChild: { textContent: "" },
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      },
      addEventListener(event, callback) {
        this.events[event] = callback;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      getBoundingClientRect: () => ({
        width: 600,
        height: 400,
        left: 0,
        top: 0,
      }),
      getContext: () => ctx,
      replaceChildren: noop,
    };
  }
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, node(id));
    return nodes.get(id);
  };
  const votes = ["ga", "pso", "de"].flatMap((key) => [
    node("vote-" + key, { vote: key }),
    node("mini-" + key, { vote: key }),
  ]);
  votes
    .filter((n) => n.id.startsWith("mini"))
    .forEach((n) => n.classList.add("mini-vote"));
  const cards = ["ga", "pso", "de"].map((key) =>
    node("card-" + key, { team: key }),
  );
  const terrains = ["peaks", "islands", "needle"].map((key) =>
    node("terrain-" + key, { terrain: key }),
  );
  const focuses = ["all", "ga", "pso", "de"].map((key) =>
    node("focus-" + key, { focus: key }),
  );
  const groups = {
    "[data-vote]": votes,
    "[data-team]": cards,
    "[data-terrain]": terrains,
    "[data-focus]": focuses,
  };
  const document = {
    getElementById: get,
    querySelectorAll: (selector) => groups[selector] || [],
    querySelector: (selector) =>
      cards.find((n) => selector.includes('"' + n.dataset.team + '"')),
    createTextNode: (text) => ({ text }),
    createElement: () => node("created"),
    addEventListener: (event, callback) => (events[event] = callback),
  };
  const context = vm.createContext({
    console,
    document,
    window: { addEventListener: noop },
    matchMedia: () => ({ matches: true }),
    performance: { now: () => 1000 },
    devicePixelRatio: 2,
    ResizeObserver: class {
      observe() {}
    },
    requestAnimationFrame: noop,
  });
  for (const file of [
    "utils",
    "landscape",
    "benchmarks",
    "ga",
    "pso",
    "de",
    "app",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "../js", file + ".js"), "utf8"),
      context,
    );
  return {
    run: (code) => vm.runInContext(code, context),
    get,
    votes,
    cards,
    events,
  };
}

test("a complete expedition ends at 120 generations and the same seed replays its result", () => {
  const a = app();
  assert.equal(a.run("generation"), 0);
  assert.equal(
    a.run("JSON.stringify(teams[0].algo.population.map(({x,y})=>({x,y})))"),
    a.run("JSON.stringify(teams[1].algo.population.map(({x,y})=>({x,y})))"),
  );
  a.votes.find((n) => n.id === "vote-pso").events.click();
  a.get("btn-run").events.click();
  assert.equal(a.run("running"), true);
  a.run("for(let i=0;i<130;i++) advance(1000+i*100);");
  assert.equal(a.run("generation"), 120);
  assert.equal(a.run("running"), false);
  assert.ok(a.votes.every((n) => n.disabled));
  const result = a.run(
    "JSON.stringify(teams.map(t=>({best:t.algo.best,reached:t.reached})))",
  );
  a.get("btn-reset").events.click();
  assert.equal(a.run("generation"), 0);
  assert.equal(a.run("vote"), null);
  assert.ok(a.votes.every((n) => !n.disabled));
  a.run("for(let i=0;i<120;i++) advance(1000+i*100);");
  assert.equal(
    a.run(
      "JSON.stringify(teams.map(t=>({best:t.algo.best,reached:t.reached})))",
    ),
    result,
  );
});

test("teams arriving in the same generation share the win", () => {
  const a = app();
  a.run(
    "chooseTerrain('peaks');teams.forEach(t=>{t.algo.step=()=>{t.algo.best.f=1;t.algo.history.push(1);};});advance();",
  );
  assert.equal(a.run('winners.join(",")'), "ga,pso,de");
  assert.ok(a.cards.every((n) => n.classList.contains("winner")));
});

test("live parameters apply and population changes clear stale race state", () => {
  const a = app();
  for (const [id, team, property, value] of [
    ["mut", "ga", "mutRate", 0.4],
    ["w", "pso", "w", 0.6],
    ["F", "de", "F", 1.2],
  ]) {
    a.get("r-" + id).value = String(value);
    a.get("r-" + id).events.input();
    assert.equal(
      a.run(`teams.find(t=>t.key==='${team}').algo.${property}`),
      value,
    );
  }
  a.get("btn-step").events.click();
  a.get("r-pop").value = "24";
  a.get("r-pop").events.input();
  assert.equal(a.run("generation"), 0);
  assert.equal(a.run("running"), false);
  assert.equal(
    a.run("teams.every(t=>t.algo.population.length===24&&t.reached===null)"),
    true,
  );
});

test("R resets even when a game button is focused", () => {
  const a = app();
  a.get("btn-step").events.click();
  assert.equal(a.run("generation"), 1);
  a.events.keydown({
    code: "KeyR",
    target: { matches: (selector) => selector.split(",").includes("button") },
  });
  assert.equal(a.run("generation"), 0);
});

test("benchmark success uses objective gap rather than an attractive map color", () => {
  const a = app();
  a.run(
    "teams.forEach(t=>{t.algo.step=()=>{t.algo.best={x:.5,y:.5,f:1};};});advance();",
  );
  assert.equal(a.run("winners.length"), 0);
  a.run(
    "teams.forEach(t=>{t.algo.step=()=>{const p=field.optimumPos;t.algo.best={...p,f:field.normalised(p.x,p.y)};};});advance();",
  );
  assert.equal(a.run("winners.length"), 3);
});

test("benchmark selection locks editing and switching to free terrain restores it", () => {
  const a = app();
  assert.equal(a.get("btn-move").disabled, true);
  a.run("setMoving(true)");
  assert.equal(a.run("moving"), false);
  a.run("chooseTerrain('peaks')");
  assert.equal(a.get("btn-move").disabled, false);
  a.run("setMoving(true)");
  assert.equal(a.run("moving"), true);
  a.run("chooseTerrain('sop9')");
  assert.equal(a.run("moving"), false);
});
