# Evo Playground · 算法翻山记

一场小小的算法远征：押一支队伍，看 GA、PSO 和 DE 在同一片山谷里寻找最高峰。

[在线体验](https://thinker-zzp.github.io/evo-playground/) · [源码](https://github.com/thinker-zzp/evo-playground) · [个人主页](https://thinker-zzp.github.io/?lang=zh) · [主页接入说明](docs/homepage-integration.md)

![算法翻山记](screenshot.png)

## 怎么玩

1. 出发前押 GA、PSO 或 DE。三队从相同的候选位置出发。
2. 点击 **出发探索**，看三种搜索策略寻找山顶；也可以暂停、单步前进。
3. SOP 已有参考最优的模式下，完整向量的实际目标误差 **Δf ≤ 0.001** 才算解出；自由高斯地形仍用参考高度 99.5%。同一代达到目标算并列；其余队伍继续探索，整局在 100 代结束。
4. 默认 **SOP F8 · Schwefel**，还可选择 **F9 · Rastrigin / F5 · Rosenbrock / F10 · Ackley**。SOP 的“换搜索种子”只改变初始种群与搜索随机性。自由地形仍保留。
5. 选择 **D=2 / 3 / 10**；高维地图可换轴、切片，右侧查看完整向量。F5 高维仅比较 f，不判定解出。
6. 在自由高斯地形中可以开启 **搬动主峰** 后点击地图；SOP 公式与边界固定，不提供搬峰。

高维小点是投影，背景是固定其他坐标的切片；投影重合不代表解相同。背景颜色按当前切片缩放，不能跨切片比较。选择某队最佳快照后，点击“更新切片”才重新取值。

地图下方的队伍按钮可聚焦某一队，足迹可以开关。右侧“想动动参数？”里可以调整种群、GA 突变概率、PSO 惯性和 DE 差分幅度。参数即时生效；改变种群数量会重开本局。

快捷键：空格开始 / 暂停，右方向键单步，R 重来，Esc 退出搬峰模式。操作滑块时保留其原生键盘行为。

## 本地打开

纯 HTML / CSS / JavaScript，没有运行时依赖，不需要构建、服务器或 API Key。

- Windows：双击 `01_open_local.bat`，或者直接用浏览器打开 `index.html`。
- 可选本地开发服务：

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

然后访问 <http://127.0.0.1:8765/>，Ctrl+C 停止服务。

## 绘制方式

- 地形颜色由采样场双线性插值生成，等高线通过 marching triangles 插值绘制。
- 地图和趋势图的画布按 `devicePixelRatio` 分配物理像素（最高 3 倍），取消像素化缩放。
- 地形底图缓存，粒子与轨迹单独绘制；代际位置过渡只影响画面，不增加算法更新。
- 支持桌面、平板、手机布局，并尊重 `prefers-reduced-motion`。
- 字体、插图与地图均不依赖外部 CDN。

## 算法与演示协议

| 队伍 | 搜索方式                                                             |
| ---- | -------------------------------------------------------------------- |
| GA   | Tournament (k=3)、BLX-α (α=0.5)、独立维度高斯突变 (σ=0.08)、精英保留 |
| PSO  | 惯性权重、个人 / 全局最优引导、速度限制、边界阻尼反射                |
| DE   | DE/rand/1/bin、三个互异供体、至少一个突变维度、贪心选择              |

SOP 使用原 NeuroEA 代码的目标公式、平移和边界，支持 **D=2 / 3 / 10，默认 D=10**。三种算法均搜索完整 D 维向量。地图叠加二维切片与候选解投影，可任选横纵坐标；平行坐标图展示完整最佳解。换视角不重置搜索，切换维度会重开。F8/F9/F10 及二维 F5 显示真实误差 Δf；F5 高维的约束最优值未核定，显示原始 f，仅比较目标值、不判解出。详见 [函数、参考最优与难度检查](docs/benchmarks.md)。

三个自由地形叠加 Gaussian peaks，以 400 × 400 网格和局部细化寻找参考峰顶。网格只为自由地形提供参考，SOP 胜负直接按目标误差判断。

所有模式均在整个可行域均匀采样初始候选位置，每队共用同一初始种群，算法有独立的带种子随机流。重来保留函数与种子，按当前参数重新初始化；参数不变时复现同一局。SOP 的 seed 不会修改函数定义。

这是按代推进的交互式教育演示。不同算法每代的函数评估次数不同，单局结果不用于判断算法的普遍优劣。比赛中的参数调整也会影响结果。

## 检查

安装 Node.js 后，无需 npm install，直接运行：

```powershell
node --test tests/*.test.cjs
# 可选：复查20个种子的SOP难度（输出JSON）
node scripts/check-difficulty.cjs
# 可选 D=3
node scripts/check-difficulty.cjs 3
Get-ChildItem js/*.js | ForEach-Object { node --check $_.FullName }
```

测试覆盖同起点与种子复现、三种地形下的候选边界与最优历史、搬峰、物理像素缓存、原 Python D=3/10 数值、全部高维坐标参与优化、投影与切片不干扰搜索，以及整局结束、并列获胜、参数更新和重开状态。

## 发布与主页联动

GitHub Pages 发布源为 **main / 根目录**，`.nojekyll` 提供直接静态发布。修改后提交并推送即可自动更新：

```powershell
git status
git add index.html style.css js tests README.md docs screenshot.png favicon.svg
git diff --cached
git commit -m "Describe your change"
git push
```

主页与演示分别维护：主页位于 `/`，演示位于 `/evo-playground/`。本项目不修改主页仓库；演示顶部已有返回主页的链接。主页维护者可按 [接入说明](docs/homepage-integration.md) 添加入口。

## 项目结构

```text
index.html / style.css     页面与响应式布局
js/app.js                  赛局、交互、粒子绘制、趋势图
js/landscape.js            自由地形、高清底图与等高线
js/benchmarks.js           SOP F5/F8/F9/F10 全维目标、切片与可行参考
js/ga.js / pso.js / de.js   三种搜索算法
js/utils.js                随机流与数学工具
tests/                     Node 内置测试，无第三方依赖
docs/homepage-integration.md
01_open_local.bat / favicon.svg / screenshot.png
```

## License

[MIT](LICENSE) © Zhipeng Zhang.
