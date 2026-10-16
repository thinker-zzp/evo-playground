# Evo Playground · 算法翻山记

一场小小的算法远征：押一支队伍，看 GA、PSO 和 DE 在同一片山谷里寻找最高峰。

[在线体验](https://thinker-zzp.github.io/evo-playground/) · [源码](https://github.com/thinker-zzp/evo-playground) · [个人主页](https://thinker-zzp.github.io/?lang=zh) · [主页接入说明](docs/homepage-integration.md)

![算法翻山记](screenshot.png)

## 怎么玩

1. 出发前押 GA、PSO 或 DE。三队从相同的候选位置出发。
2. 点击 **出发探索**，看三种搜索策略寻找山顶；也可以暂停、单步前进。
3. 率先达到网格参考高度 **99.5%** 的队伍获胜。同一代达到目标算并列；其余队伍继续探索，整局在 120 代结束。
4. 试试 **群峰之间 / 孤岛远征 / 针尖山谷**；点击 **随机新地图** 会切换到下一个地图种子。
5. 开启 **搬动主峰**，再点击地图，主峰就会搬家，三队重新出发。

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

地形是在 `[0,1]²` 上叠加的 Gaussian peaks。三种地图使用不同的峰位置和宽度；同一种地图的不同种子会改变峰的位置和宽度。以 **240 × 240 网格**的最小 / 最大值缩放高度，旗帜标记采样得到的最大值。峰中心与叠加地形的最大值不一定重合；网格之间的实际高度可能略大于 100%，界面显示上限为 100%。

每队有独立的带种子随机流；起始候选位置相同，且排除参考高度大于 78% 的起点，让寻找峰顶成为本局过程的一部分。PSO 另外初始化速度。**重来**会保留当前地图（包括手动搬峰位置）与种子，使用界面上当前参数重新初始化三队；在参数不变时可以复现本局。搬峰会重新计算地形参考与所有候选适应度，清除旧的历史最优、曲线和赛果。

这是按代推进的交互式教育演示。不同算法每代的函数评估次数不同，单局结果不用于判断算法的普遍优劣。比赛中的参数调整也会影响结果。

## 检查

安装 Node.js 后，无需 npm install，直接运行：

```powershell
node --test tests/*.test.cjs
Get-ChildItem js/*.js | ForEach-Object { node --check $_.FullName }
```

测试覆盖同起点与种子复现、三种地形下的候选边界与最优历史、搬峰、物理像素缓存，以及整局结束、并列获胜、参数更新和重开状态。

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
js/landscape.js            地图预设、目标函数、高清底图与等高线
js/ga.js / pso.js / de.js   三种搜索算法
js/utils.js                随机流与数学工具
tests/                     Node 内置测试，无第三方依赖
docs/homepage-integration.md
01_open_local.bat / favicon.svg / screenshot.png
```

## License

[MIT](LICENSE) © Zhipeng Zhang.
