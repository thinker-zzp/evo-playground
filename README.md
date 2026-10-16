# Evo Playground

Interactive GA / PSO / DE search on a two-dimensional Gaussian fitness landscape.

[Online demo](https://thinker-zzp.github.io/evo-playground/) · [Personal homepage](https://thinker-zzp.github.io/?lang=zh) · [主页接入说明](docs/homepage-integration.md)

![Evo Playground screenshot](screenshot.png)

## 本地打开

这是纯静态网页，无需安装依赖、无需构建，也不需要 API Key。

- Windows：双击 `01_open_local.bat`，或直接用浏览器打开 `index.html`。
- 开发时可选：在项目目录运行 `python -m http.server 8765 --bind 127.0.0.1`，然后访问 <http://127.0.0.1:8765/>。在终端按 Ctrl+C 停止服务。
- 在线访问：<https://thinker-zzp.github.io/evo-playground/>，无需启动电脑上的任何程序。

点击 **Run** 开始 / 暂停，**Step** 单步运行，**Reset** 重置。快捷键：空格、右方向键、R。

算法参数与速度即时生效；修改种群大小会重置当前搜索。每次重置重新随机初始化。

## GitHub 与发布

- 源码仓库：<https://github.com/thinker-zzp/evo-playground>
- Pages：仓库 **Settings → Pages → Deploy from a branch → main → /(root)**。
- `.nojekyll` 让 GitHub Pages 直接提供静态文件。
- 页面使用相对资源路径，可部署在 `/evo-playground/` 子路径下。

修改代码后，在本项目目录提交并推送：

```powershell
git status
git add index.html style.css js README.md docs
git diff --cached
git commit -m "Describe your change"
git push
```

GitHub Pages 会自动发布 `main` 分支的新提交；构建状态可在仓库 Actions / Settings → Pages 查看。

## 与个人主页联动

保留两个独立仓库：主页在根路径 `/`，演示在 `/evo-playground/`。演示顶部已有“个人主页”返回链接。

主页维护者只需添加一个“在线体验”链接，目标为 `https://thinker-zzp.github.io/evo-playground/`；不需要复制演示代码。具体 HTML 和双语接入示例见 [docs/homepage-integration.md](docs/homepage-integration.md)。本仓库的发布不会修改主页仓库。

## Algorithms

| Algorithm | Implementation |
| --- | --- |
| GA | Tournament selection (k=3), BLX-α crossover (α=0.5), Gaussian mutation (σ=0.08), elitism |
| PSO | Inertia-weighted velocity update, personal/global bests, velocity cap, damped boundary reflection |
| DE | DE/rand/1/bin, three distinct donors, guaranteed mutant dimension, greedy selection |

The landscape sums six Gaussian peaks in `[-5, 5]²`, mapped to `[0, 1]²` internally:

```text
f(x, y) = sum_k h_k * exp(-((x-cx_k)^2 + (y-cy_k)^2) / (2*w_k^2))
```

| Peak centre | Height | Width |
| --- | --- | --- |
| (2.0, 1.0) | 1.00 | 1.20 |
| (-3.0, -2.0) | 0.85 | 1.30 |
| (1.0, -3.0) | 0.72 | 1.00 |
| (-1.5, 3.0) | 0.78 | 1.10 |
| (3.5, -1.5) | 0.65 | 0.90 |
| (-4.0, 1.5) | 0.55 | 0.80 |

Fitness scaling and the reference marker use the min/max of a 200 × 200 grid. Overlapping Gaussians shift the summed maximum away from an individual peak centre; this is a sampled reference, not an exact optimum certificate. Fitness may slightly exceed 1 between grid points. Canvas y increases downward.

This is an educational visualization. Runs use `Math.random()` without fixed seeds, and generations do not imply equal fitness-evaluation budgets across algorithms. The convergence chart retains the most recent 500 records. Use controlled experiments for performance claims.

## Structure

```text
evo-playground/
├── index.html              # Page and controls
├── style.css               # Responsive layout
├── js/
│   ├── app.js              # UI and animation
│   ├── utils.js            # Shared helpers
│   ├── landscape.js        # Landscape and heatmap
│   ├── ga.js               # Genetic algorithm
│   ├── pso.js              # Particle swarm optimization
│   └── de.js               # Differential evolution
├── docs/homepage-integration.md
├── 01_open_local.bat       # Open locally on Windows
├── .nojekyll               # Static GitHub Pages publishing
└── LICENSE                 # MIT
```

No build step or npm packages are required. JavaScript syntax can be checked with Node.js:

```powershell
Get-ChildItem js/*.js | ForEach-Object { node --check $_.FullName }
```

## License

[MIT](LICENSE) © Zhipeng Zhang.
