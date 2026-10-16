// A small search expedition. All teams receive the same initial positions.
const $ = (id) => document.getElementById(id);
const META = {
  ga: { name: "GA", color: "#d77843", title: "重组派", Type: GeneticAlgorithm },
  pso: { name: "PSO", color: "#258775", title: "追风派", Type: ParticleSwarm },
  de: {
    name: "DE",
    color: "#7b72b2",
    title: "借力派",
    Type: DifferentialEvolution,
  },
};
const TERRAIN_NAMES = {
  peaks: "群峰之间",
  islands: "孤岛远征",
  needle: "针尖山谷",
};
const LIMIT = 120,
  TARGET = 0.995;
const canvas = $("canvas"),
  ctx = canvas.getContext("2d");
const chart = $("chart"),
  chartCtx = chart.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let seed = 42,
  preset = "peaks",
  field = new Landscape(preset, seed),
  teams = [];
let running = false,
  generation = 0,
  focus = "all",
  vote = null,
  winners = [],
  moving = false;
let lastStep = 0,
  lastDraw = 0,
  stepTime = 0,
  width = 0,
  height = 0,
  dpr = 1,
  chartWidth = 0,
  chartHeight = 0,
  chartDpr = 1;
let celebrationTime = -10000,
  hover = null;
let dirty = true;

function announce(title, copy, icon = "✧") {
  $("dispatch-title").textContent = title;
  $("dispatch-copy").textContent = copy;
  $("dispatch-icon").textContent = icon;
}
function setRunning(value) {
  running = value;
  lastStep = performance.now();
  $("play-symbol").textContent = running ? "Ⅱ" : "▶";
  $("play-label").textContent = running
    ? "歇一小会"
    : generation >= LIMIT
      ? "再探一局"
      : generation
        ? "继续探索"
        : "出发探索";
  $("btn-run").classList.toggle("is-running", running);
  $("status").classList.toggle("running", running);
  $("status").lastChild.textContent = running
    ? "正在探索"
    : generation >= LIMIT
      ? "本局结束"
      : generation
        ? "暂时歇脚"
        : "整装待发";
  dirty = true;
}
function initialPositions() {
  const random = seededRandom(seed ^ 0xa1b2c3d4),
    points = [];
  const count = +$("r-pop").value;
  for (let i = 0; i < count; i++) {
    let point;
    // Begin below the goal, so finding the summit is part of the expedition.
    do {
      point = { x: 0.04 + random() * 0.92, y: 0.06 + random() * 0.88 };
    } while (field.normalised(point.x, point.y) > 0.78);
    points.push(point);
  }
  return points;
}
function resetRace() {
  setRunning(false);
  generation = 0;
  winners = [];
  vote = null;
  stepTime = 0;
  celebrationTime = -10000;
  const starts = initialPositions();
  teams = Object.entries(META).map(([key, meta], i) => {
    const algo = new meta.Type(field, {
      popSize: starts.length,
      initialPositions: starts,
      random: seededRandom(seed ^ (0x9e3779b9 * (i + 1))),
      mutRate: +$("r-mut").value,
      w: +$("r-w").value,
      F: +$("r-F").value,
    });
    return {
      key,
      ...meta,
      algo,
      previous: algo.population.map((p) => ({ x: p.x, y: p.y })),
      reached: null,
    };
  });
  $("seed-label").textContent = `SEED ${String(seed).padStart(4, "0")}`;
  $("map-name").textContent = TERRAIN_NAMES[preset];
  $("map-hint").textContent = "每一小点，都是一个正在寻找答案的可能。";
  $("vote-copy").textContent =
    "开始前押一队。率先找到 99.5% 高度的队伍，拿下这一局。";
  $("dispatch").classList.remove("celebrate");
  announce("山谷准备好了。", "你负责好奇，它们负责找路。");
  document.querySelectorAll("[data-vote]").forEach((button) => {
    button.disabled = false;
    button.textContent = button.classList.contains("mini-vote")
      ? META[button.dataset.vote].name
      : "押它";
    button.setAttribute("aria-pressed", "false");
  });
  document
    .querySelectorAll("[data-team]")
    .forEach((card) => card.classList.remove("chosen", "winner"));
  updateStats();
  setRunning(false);
  dirty = true;
}
function chooseTerrain(next, shuffle = false) {
  preset = next;
  if (shuffle) seed = (seed + 1) >>> 0;
  field = new Landscape(preset, seed);
  document.querySelectorAll("[data-terrain]").forEach((button) => {
    const chosen = button.dataset.terrain === preset;
    button.classList.toggle("selected", chosen);
    button.setAttribute("aria-pressed", String(chosen));
  });
  resetRace();
}
function updateStats() {
  $("s-gen").textContent = String(generation).padStart(3, "0");
  for (const team of teams) {
    const score = Math.min(100, team.algo.best.f * 100);
    $("score-" + team.key).replaceChildren(
      document.createTextNode(score.toFixed(1)),
      Object.assign(document.createElement("small"), { textContent: "%" }),
    );
    $("bar-" + team.key).style.width = score + "%";
    $("tag-" + team.key).textContent =
      team.reached !== null
        ? `第 ${team.reached} 代 · 已登顶`
        : META[team.key].title;
  }
  drawChart();
}
function advance(now = performance.now()) {
  if (generation >= LIMIT) return;
  for (const team of teams) {
    team.previous = team.algo.population.map((p) => ({ x: p.x, y: p.y }));
    team.algo.step();
  }
  generation++;
  stepTime = now;
  const arrived = teams.filter(
    (team) => team.reached === null && team.algo.best.f >= TARGET,
  );
  arrived.forEach((team) => (team.reached = generation));
  if (!winners.length && arrived.length) {
    // At this display resolution, reaching the goal in the same generation is a tie.
    winners = arrived.map((team) => team.key);
    celebrationTime = now;
    const names = winners.map((key) => META[key].name).join(" & ");
    const result = vote
      ? winners.includes(vote)
        ? "你押中了！"
        : "这次，山谷给了另一个答案。"
      : "小点们找到了自己的高光时刻。";
    announce(`${names} 率先登顶！`, `第 ${generation} 代 · ${result}`, "⚑");
    $("dispatch").classList.add("celebrate");
    winners.forEach((key) =>
      document.querySelector(`[data-team="${key}"]`).classList.add("winner"),
    );
    $("map-hint").textContent = `${names} 已抵达峰顶附近，其他队伍还在寻找。`;
  }
  if (generation === 1) {
    document
      .querySelectorAll("[data-vote]")
      .forEach((button) => (button.disabled = true));
    $("vote-copy").textContent = vote
      ? `你选了 ${META[vote].name}。一起看看，它会走出怎样一条路。`
      : "这一局已经出发。下一局，记得先押一队。";
    if (!winners.length)
      announce("探索，正在发生。", "每一次尝试，都在改变下一步的方向。", "↗");
  }
  if (generation >= LIMIT) {
    setRunning(false);
    if (!winners.length)
      announce(
        "这座山，还留着一点悬念。",
        "120 代暂未抵达目标。换个世界，或者调调参数再试。",
        "∿",
      );
    else $("map-hint").textContent = "这趟远征告一段落。换一张地图，再来一局？";
  }
  updateStats();
  dirty = true;
}
function resize() {
  const r = canvas.getBoundingClientRect(),
    ratio = Math.min(devicePixelRatio || 1, 3);
  const w = Math.round(r.width),
    h = Math.round(r.height);
  if (w > 0 && h > 0 && (w !== width || h !== height || dpr !== ratio)) {
    width = w;
    height = h;
    dpr = ratio;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    field._background = null;
    dirty = true;
  }
  const c = chart.getBoundingClientRect();
  if (
    c.width > 0 &&
    (Math.round(c.width) !== chartWidth ||
      Math.round(c.height) !== chartHeight ||
      chartDpr !== ratio)
  ) {
    chartWidth = Math.round(c.width);
    chartHeight = Math.round(c.height);
    chartDpr = ratio;
    chart.width = Math.round(chartWidth * ratio);
    chart.height = Math.round(chartHeight * ratio);
    chartCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawChart();
  }
}
function drawChart() {
  const w = chartWidth,
    h = chartHeight;
  if (!w || !h) return;
  chartCtx.clearRect(0, 0, w, h);
  const left = 24,
    right = w - 4,
    top = 5,
    bottom = h - 6;
  chartCtx.font = "8px Consolas, monospace";
  chartCtx.textAlign = "left";
  for (const value of [0, 0.5, 1]) {
    const y = bottom - value * (bottom - top);
    chartCtx.beginPath();
    chartCtx.moveTo(left, y);
    chartCtx.lineTo(right, y);
    chartCtx.strokeStyle = "#d7dfcf";
    chartCtx.lineWidth = 0.6;
    chartCtx.setLineDash([2, 4]);
    chartCtx.stroke();
    chartCtx.setLineDash([]);
    chartCtx.fillStyle = "#96a18b";
    chartCtx.fillText(
      value === 1 ? "100" : value === 0.5 ? "50" : "0",
      0,
      y + 3,
    );
  }
  const max = Math.max(30, generation);
  for (const team of teams) {
    chartCtx.beginPath();
    chartCtx.strokeStyle = team.color;
    chartCtx.lineWidth = 1.7;
    chartCtx.lineJoin = "round";
    team.algo.history.forEach((v, i) => {
      const x = left + (i / max) * (right - left),
        y = bottom - clamp(v, 0, 1) * (bottom - top);
      if (!i) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();
    const x = left + (generation / max) * (right - left),
      y = bottom - clamp(team.algo.best.f, 0, 1) * (bottom - top);
    chartCtx.beginPath();
    chartCtx.arc(x, y, 2.2, 0, Math.PI * 2);
    chartCtx.fillStyle = team.color;
    chartCtx.fill();
  }
}
function paint(now) {
  if (!width || !height) return;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(field.getBackground(width, height, dpr), 0, 0, width, height);
  const duration = 1000 / +$("r-speed").value;
  const alpha = reducedMotion.matches
    ? 1
    : clamp((now - stepTime) / Math.min(180, duration * 0.85), 0, 1);
  const eased = 1 - (1 - alpha) ** 3;
  const showTrails = $("opt-trails").checked;
  const sorted = [...teams].sort(
    (a, b) => (a.key === focus ? 1 : 0) - (b.key === focus ? 1 : 0),
  );
  for (const team of sorted) {
    ctx.save();
    const visible = focus === "all" || focus === team.key;
    ctx.globalAlpha = visible ? 1 : 0.1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (showTrails) {
      ctx.strokeStyle = team.color;
      ctx.lineWidth = 0.9;
      for (const p of team.algo.population) {
        if (p.trail.length < 2) continue;
        ctx.globalAlpha = visible ? 0.19 : 0.025;
        ctx.beginPath();
        p.trail.forEach((pos, i) =>
          i
            ? ctx.lineTo(pos.x * width, pos.y * height)
            : ctx.moveTo(pos.x * width, pos.y * height),
        );
        ctx.stroke();
      }
    }
    ctx.globalAlpha = visible ? 0.88 : 0.11;
    team.algo.population.forEach((p, i) => {
      const old = team.previous[i] || p;
      // Interpolation is a visual transition, not an extra algorithm update.
      const x = (old.x + (p.x - old.x) * eased) * width,
        y = (old.y + (p.y - old.y) * eased) * height;
      const jitter =
        generation === 0 ? (Object.keys(META).indexOf(team.key) - 1) * 2 : 0;
      ctx.beginPath();
      if (team.key === "de") {
        ctx.moveTo(x + jitter, y - 4);
        ctx.lineTo(x + 4 + jitter, y);
        ctx.lineTo(x + jitter, y + 4);
        ctx.lineTo(x - 4 + jitter, y);
        ctx.closePath();
      } else
        ctx.arc(x + jitter, y, team.key === "ga" ? 3.5 : 3.7, 0, Math.PI * 2);
      ctx.fillStyle = team.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffed";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (team.key === "pso" && visible && generation > 0) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - p.vx * width * 0.4, y - p.vy * height * 0.4);
        ctx.strokeStyle = team.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });
    // Ring each team's best point; compact labels are kept apart near the summit.
    if (visible && generation > 0) {
      const bx = team.algo.best.x * width,
        by = team.algo.best.y * height;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
      ctx.strokeStyle = team.color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      const index = Object.keys(META).indexOf(team.key),
        dy = (index - 1) * 22;
      const labelX = clamp(bx + 23, 5, width - 38),
        labelY = clamp(by + dy - 6, 8, height - 36);
      ctx.beginPath();
      ctx.moveTo(bx + 5, by);
      ctx.lineTo(labelX, labelY + 7);
      ctx.strokeStyle = team.color + "80";
      ctx.lineWidth = 0.65;
      ctx.stroke();
      ctx.fillStyle = "#fffef5e8";
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, 29, 15, 4);
      ctx.fill();
      ctx.fillStyle = team.color;
      ctx.font = "bold 8px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(team.name, labelX + 14.5, labelY + 10.5);
    }
    ctx.restore();
  }
  // A small flag and softly breathing survey ring mark the sampled summit.
  const optimum = field.optimumPos,
    ox = optimum.x * width,
    oy = optimum.y * height;
  const pulse = reducedMotion.matches ? 0 : (Math.sin(now * 0.002) + 1) / 2;
  ctx.strokeStyle = "#55734880";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(ox, oy, 12 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ox, oy - 2);
  ctx.lineTo(ox, oy - 23);
  ctx.strokeStyle = "#516d42";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + 1, oy - 23);
  ctx.lineTo(ox + 14, oy - 19);
  ctx.lineTo(ox + 1, oy - 14);
  ctx.closePath();
  ctx.fillStyle = "#547b45";
  ctx.fill();
  if (generation === 0 || moving) {
    ctx.font = '9px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = "#587444";
    ctx.textAlign = "center";
    ctx.fillText("山顶在这里", ox, oy - 33);
  }
  if (hover && moving) {
    ctx.strokeStyle = "#395b4670";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(hover.x * width, hover.y * height, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const elapsed = now - celebrationTime;
  if (elapsed < 1700 && !reducedMotion.matches) {
    const t = elapsed / 1700;
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.39996,
        rad = 20 + t * (70 + (i % 4) * 12),
        x = ox + Math.cos(angle) * rad,
        y = oy + Math.sin(angle) * rad + t * t * 40;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = [...winners.map((k) => META[k].color), "#e8c46e"][
        i % (winners.length + 1)
      ];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + t * 3);
      ctx.fillRect(-2, -1, 4, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
function tick(now) {
  const interval = 1000 / +$("r-speed").value;
  if (running && now - lastStep >= interval) {
    // Never run a background-tab catch-up burst.
    lastStep = now;
    advance(now);
  }
  if (
    dirty ||
    (!reducedMotion.matches && now - lastDraw > (running ? 16 : 60))
  ) {
    paint(now);
    lastDraw = now;
    dirty = false;
  }
  requestAnimationFrame(tick);
}
$("btn-run").addEventListener("click", () => {
  if (generation >= LIMIT) chooseTerrain(preset, true);
  setRunning(!running);
});
$("btn-step").addEventListener("click", () => {
  setRunning(false);
  advance();
  setRunning(false);
});
$("btn-reset").addEventListener("click", resetRace);
$("btn-shuffle").addEventListener("click", () => chooseTerrain(preset, true));
document
  .querySelectorAll("[data-terrain]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      chooseTerrain(button.dataset.terrain),
    ),
  );
document.querySelectorAll("[data-focus]").forEach((button) =>
  button.addEventListener("click", () => {
    focus = button.dataset.focus;
    document.querySelectorAll("[data-focus]").forEach((el) => {
      const selected = el.dataset.focus === focus;
      el.classList.toggle("active", selected);
      el.setAttribute("aria-pressed", String(selected));
    });
    dirty = true;
  }),
);
document.querySelectorAll("[data-vote]").forEach((button) =>
  button.addEventListener("click", () => {
    if (generation) return;
    vote = button.dataset.vote;
    document.querySelectorAll("[data-vote]").forEach((el) => {
      const chosen = el.dataset.vote === vote;
      el.textContent = el.classList.contains("mini-vote")
        ? META[el.dataset.vote].name + (chosen ? " ✓" : "")
        : chosen
          ? "已选 ✓"
          : "押它";
      el.setAttribute("aria-pressed", String(chosen));
    });
    document
      .querySelectorAll("[data-team]")
      .forEach((card) =>
        card.classList.toggle("chosen", card.dataset.team === vote),
      );
    announce(
      `你选了 ${META[vote].name}。`,
      "那就出发吧，看看直觉会把你带到哪里。",
      META[vote].name === "GA" ? "✳" : META[vote].name === "PSO" ? "↗" : "◇",
    );
  }),
);
$("r-speed").addEventListener("input", () => {
  $("v-speed").textContent = $("r-speed").value;
  dirty = true;
});
$("r-pop").addEventListener("input", () => {
  $("v-pop").textContent = $("r-pop").value;
  resetRace();
});
for (const [id, key, property] of [
  ["mut", "ga", "mutRate"],
  ["w", "pso", "w"],
  ["F", "de", "F"],
]) {
  $("r-" + id).addEventListener("input", () => {
    $("v-" + id).textContent = (+$("r-" + id).value).toFixed(2);
    teams.find((t) => t.key === key).algo[property] = +$("r-" + id).value;
  });
}
$("opt-trails").addEventListener("change", () => {
  dirty = true;
});
function setMoving(value) {
  moving = value;
  $("btn-move").setAttribute("aria-pressed", String(moving));
  $("move-notice").hidden = !moving;
  dirty = true;
}
$("btn-move").addEventListener("click", () => setMoving(!moving));
function localPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
    y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
  };
}
canvas.addEventListener("pointermove", (event) => {
  hover = localPoint(event);
  const tooltip = $("map-tooltip"),
    x = hover.x * width,
    y = hover.y * height;
  tooltip.textContent = `此处高度 ${(clamp(field.normalised(hover.x, hover.y), 0, 1) * 100).toFixed(1)}%`;
  tooltip.style.left = clamp(x + 14, 8, width - 120) + "px";
  tooltip.style.top = clamp(y + 14, 8, height - 62) + "px";
  tooltip.hidden = moving;
  dirty = true;
});
canvas.addEventListener("pointerleave", () => {
  hover = null;
  $("map-tooltip").hidden = true;
  dirty = true;
});
canvas.addEventListener("pointerdown", (event) => {
  if (!moving || event.button > 0) return;
  const point = localPoint(event);
  field.movePeak(point.x, point.y);
  resetRace();
  setMoving(false);
  $("map-tooltip").hidden = true;
  announce("主峰搬家了。", "同样三支队伍，这次会走出不同的路吗？", "⚑");
});
document.addEventListener("keydown", (event) => {
  if (
    event.target.matches("input,textarea,select") ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (event.code === "Space" && !event.target.matches("button,a,summary")) {
    event.preventDefault();
    $("btn-run").click();
  }
  if (event.code === "ArrowRight") {
    event.preventDefault();
    $("btn-step").click();
  }
  if (event.code === "KeyR") resetRace();
  if (event.code === "Escape") setMoving(false);
});
document.addEventListener("visibilitychange", () => {
  lastStep = performance.now();
});
new ResizeObserver(resize).observe($("canvas-wrap"));
new ResizeObserver(resize).observe(chart);
window.addEventListener("resize", resize);
resetRace();
resize();
requestAnimationFrame(tick);
