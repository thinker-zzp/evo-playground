# 主页接入 Evo Playground

在线演示：<https://thinker-zzp.github.io/evo-playground/>

源码：<https://github.com/thinker-zzp/evo-playground>

主页项目由另一个 agent 维护。这里仅提供接入建议，未修改或推送主页仓库。

## 推荐：普通链接

主页和演示分别维护、分别发布，共用 `thinker-zzp.github.io` 域名。主页根路径不变，演示位于 `/evo-playground/`。在主页“研究与探索”区或导航中添加链接即可：

```html
<a href="https://thinker-zzp.github.io/evo-playground/">Evo Playground · 在线体验 ↗</a>
<a href="https://github.com/thinker-zzp/evo-playground"
   target="_blank" rel="noopener noreferrer">源码 ↗</a>
```

演示顶部的“个人主页”链接已返回 `https://thinker-zzp.github.io/?lang=zh`。主页更新不会覆盖演示，演示更新也不会覆盖主页。

## 现有主页的双语接入示例

以下示例适用于读取时使用 `data-i18n` + `window.HOMEPAGE_EN` 的主页。若另一个 agent 正在改结构，以它的最新实现为准。

可在项目区加入：

```html
<article class="project-entry">
  <h3>Evo Playground</h3>
  <p data-i18n="evoDescription">交互式进化算法演示：观察 GA、PSO 和 DE 在多峰搜索空间中的搜索过程。</p>
  <a href="https://thinker-zzp.github.io/evo-playground/"
     data-i18n="evoDemo">在线体验 ↗</a>
  <a href="https://github.com/thinker-zzp/evo-playground"
     target="_blank" rel="noopener noreferrer"
     data-i18n="evoSource">源码 ↗</a>
</article>
```

在主页 `content.js` 的 `window.HOMEPAGE_EN` 对象中补齐：

```js
evoDescription: 'An interactive visualization of GA, PSO and DE searching a multimodal landscape.',
evoDemo: 'Try the demo ↗',
evoSource: 'Source code ↗',
```

样式沿用主页现有项目条目即可。演示当前界面为英文；返回主页链接明确选择中文，不代表演示已支持 `?lang=zh`。

## 可选：iframe 嵌入

若希望不离开主页即可体验，可嵌入演示：

```html
<iframe
  src="https://thinker-zzp.github.io/evo-playground/"
  title="Evo Playground"
  width="100%"
  height="760"
  loading="lazy"
  style="border: 1px solid #ddd9d0; border-radius: 6px;">
</iframe>
```

目前读取到的主页 CSP 设置了 `default-src 'self'`，两页在同一个 origin，因此该同源 iframe 可被允许。若以后更换域名或调整 CSP，请同步检查 `frame-src`；内联 style 也可移入主页样式表。窄屏时 iframe 会出现内部滚动，普通链接更适合主页和手机端。

只为接入此演示，无需更改主页 Pages 发布分支，也无需创建后端服务。
