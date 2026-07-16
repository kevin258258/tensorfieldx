# TensorFieldX 前端重构设计

- 日期：2026-07-16
- 状态：方向已与用户对齐（视觉语言、转场分层、内容架构、配色），进入实施
- 视觉方向稿存档：`.superpowers/brainstorm/930747-1784223783/content/`（方向板 v2、转场分层、书架版面、配色 v3）

## 1. 背景与目标

现状诊断（代码级）：

- `BaseLayout.astro` 单文件 924 行；每个页面全局装载 GSAP + ScrollTrigger、自定义光标 canvas（常驻 rAF）、3 个环境光球动画、3D tilt 监听；首页另叠一层 O(n²) 粒子网络 canvas
- 视觉语言互相打架：纸纹（学术温暖）vs 发光光球（科技感）vs 玻璃卡片；字号体系零碎（10/11/12/13px 混用）
- 交互装饰性大于功能性：自定义光标、粒子、tilt 炫技但不服务内容
- 内容组织对读者不友好：系列只有一行可折叠标题——无描述、无时长、无状态、无阅读顺序引导；系列导航藏在文章底部；右侧一整列空白
- 更新流程：frontmatter 手填、系列信息分散在每篇笔记里

目标（按用户确认排序）：

1. 统一且**大胆**的平面设计语言（现代平面 / MG 动效风格，无日文、无传统文化符号）
2. **三层转场系统**作为全站记忆点（核心：中心复杂几何徽章 + 反色闪切）
3. **系列为一等公民**的内容架构（书架 → 系列页 → 阅读页系列栏）
4. 阅读体验精修（安静、高可读）
5. 性能大幅瘦身 + 低门槛更新流程

## 2. 设计决策总表

| 决策点 | 结论 |
|---|---|
| 配色 | 冷白底 + 墨蓝 + 电蓝 + 淡紫/深紫，**无第三色**（品红/荧光绿/青候选均被否决） |
| 纸纹/暖色系/日文/竖排/印章 | 全部移除 |
| 深色模式 | v1 移除（toggle 一并去掉）；后续如需要，单独设计暗色配色再加回 |
| 转场 | 三层：L0 连续阅读 / L1 进入内容 / L2 跨板块完整演出 |
| 已读进度（localStorage） | v1 不做；章节进度 = 已发布章节比例（装饰性） |
| 「狂放」的范围 | 索引页 / 板块头 / 转场；**文章正文页内部保持安静** |
| 知识图谱视图 | 移除（书架替代其导航价值）；React 孤岛随之全部拆除 |
| 自定义光标 / 光球 / 粒子 / 3D tilt | 全部删除 |

## 3. 视觉系统

### 3.1 配色（唯一来源 `src/styles/tokens.css`，Tailwind 读取 CSS 变量）

```
--c-base:   #ECEDF5   /* 冷白，页面底 */
--c-surface:#FAFBFE   /* 冰面，卡片 */
--c-ink:    #1E2A5E   /* 墨蓝，正文/标题 */
--c-blue:   #2B5BDC   /* 电蓝，链接/强调 */
--c-lav:    #C9C1F0   /* 淡紫，图形/辅助 */
--c-violet: #8B7FE0   /* 深紫，点缀 */
```

- 正文文字 = 墨蓝 85% 浓度；链接 = 电蓝 + 淡紫下划线
- 反色对：**冷白 ↔ 墨蓝**（不是纯黑白），淡紫/深紫在两态中都出现做锚点
- 进度条渐变：淡紫 → 深紫（不用第三色）

### 3.2 字体

- Display：Playfair Display（保留）——子集化自托管 woff2，preload
- 正文西文：Source Serif 4（自托管子集）；中文回退系统宋体（不打包中文字体）
- UI / 标签 / 技术标注：system-ui sans
- 代码：JetBrains Mono（自托管子集）
- 删除移动端强制回退 Georgia 的 hack（`@media (max-width:767px)` 字体覆盖块）

### 3.3 母题（平面设计语汇）

- **几何徽章**：规线十字 / 取景框角 / 刻度环 / 虚线环 / 点阵道 / 3 段异速反向旋转弧 / 中心形变体（丸→缺→方）。7 层起步，参数化
- 巨型描边背景字（如书架页 "NOTES"）、超大出血序号（01/02/03）
- 不对称网格、粗渐变进度条、引线标注（mono 小标签 + 引出线）
- hover 整卡反色（冰面 ↔ 墨蓝互换，与转场同一语言）
- 细规线、`+` 注册标记、斜切分节线

## 4. 转场系统（核心）

### 4.1 三层定义

| 层 | 触发 | 时长 | 动作 |
|---|---|---|---|
| L0 连续阅读 | 系列内翻页、上下篇、浏览器前进/后退 | 250–350ms | 正文横移 16px + 交叉淡入（下一篇向左，上一篇/后退镜像向右）；系列栏当前标记「走一格」。无徽章 |
| L1 进入内容 | 列表/书架 → 文章详情 | ~400ms | 共享元素形变（被点标题「飞」到文章页标题位，View Transitions 共享元素）；可选：卡片迷你徽章原地转 90°。无反色 |
| L2 跨板块翻篇 | 一级导航互跳、首页进出板块 | ~900ms | 完整演出：取景框收拢 → 徽章缩放进入 → 弧段异速反向旋转（带残影）→ **反色闪切**（60–100ms 硬切）→ 新页落定、徽章缩为页面标记 |

### 4.2 判定机制

- 链接在**渲染期**标注 `data-transition="series | enter | section"`；转场引擎照章执行，不做 URL 启发式猜测
- 缺省规则：无标注链接按「是否跨一级路径」归 L0/L2

### 4.3 徽章与演出细节

- 徽章 = 参数化 SVG 组件 `<Emblem variant="about | notes | blog | projects" />`：层数、各弧半径/弧长/转速/转向、中心形变序列均为参数；每个一级板块一个变体
- 节奏：进入 250ms 急出、旋转 400ms 线性、反色 60–100ms 硬切、落定 300ms 缓出
- 反色帧（约 150ms）可出现小标签/半调短条掠过（glitch 文字可选点缀），不进任何阅读面
- 实现：全屏 fixed SVG overlay，挂 Astro View Transitions 生命周期（`astro:before-preparation` / `astro:after-swap`），动画用 WAAPI / CSS；**无 canvas、无逐帧 JS、无新依赖**
- 降级：`prefers-reduced-motion` 或低端设备 → 0.25s 淡入；快速连点 → 中断重入不排队

## 5. 信息架构（IA）

### 5.1 数据模型

- 新增 `src/content/series/` 集合，每个系列一个文件：`{ title, description, status: ongoing|complete, prerequisites?, order, featured?, related? }`——改系列信息只动一个文件
- notes frontmatter：`series` 字段从自由字符串改为系列 slug；新增可选 `summary`（一句话，用于章节列表）；`seriesOrder` 保留
- 阅读时长（沿用现状：正文长度 ÷1000 向上取整）、章节数、系列更新日期全部自动聚合，无需手填

### 5.2 页面

- `/notes` → **书架**：不对称网格系列卡（序号出血、描述、章节进度条、连载状态徽章、hover 整卡反色）+ 单篇区；筛选仅「全部 / 连载中 / 已完结」；巨型描边 "NOTES" 背景字
- `/notes/series/[slug]` → **系列页**（新）：系列描述、前置要求、章节列表（序号 + 标题 + summary + 时长）、「从第 1 章开始」、相关系列
- `/notes/[slug]` 阅读页 → 左 TOC / **右系列栏**（进度 4/10 + 迷你章节目录 + Up next 卡），均 sticky；移动端系列栏折叠回文章底部的系列盒（现状保留）
- `/` 首页 → 大号徽章 hero（与转场同语言）+ featured 系列精选 + 最近更新
- `/blog` → 编辑式大字排版散文列表；`/tags` 轻改版适配新视觉；`/about` `/cv` `/projects` 适配新视觉

## 6. 阅读体验

- 正文：max-width ≈68ch、行高 1.85–1.9、墨蓝 85%
- TOC scrollspy 保留，当前项 = 深紫小三角；阅读进度条保留（改细规线风格）
- 代码块：保留复制按钮，新增语言标签；行号不做（YAGNI）
- 图片点击放大：原生 `<dialog>` 轻量实现，无依赖
- KaTeX 自托管（`npm i katex`，去掉 jsdelivr CDN）
- Sidenote / Giscus / Search（⌘K）/ LinkPreview 保留并适配新配色
- 移动端：字体不再强制回退；触控目标 ≥44px 沿用

## 7. 删除清单

自定义光标 canvas、环境光球（GSAP）、首页粒子 canvas、3D tilt、`paper-texture.webp`、`hero.webp`、Google Fonts 外链、KaTeX CDN、知识图谱视图（`KnowledgeGraph.tsx`、`NotesExplorer.tsx`）、React 孤岛（`@astrojs/react`、`react`、`react-dom`、`framer-motion`、`lucide-react`、`react-force-graph-2d`——若 grep 确认仅被图谱使用）、GSAP（转场改用 WAAPI 后移除）

## 8. 性能

- `BaseLayout.astro` 拆分：`src/components/chrome/`（Nav / Footer / 各按钮）+ 页面脚本模块化到 `src/scripts/`，按页加载
- 转场引擎独立 chunk，全站一份；阅读页脚本仅在阅读页
- 字体子集化自托管 woff2 + preload
- 目标：首页 JS ≤ 60KB gzip；Lighthouse 桌面性能 ≥ 95

## 9. 发布流程

- `pnpm new`：交互式脚手架（选 note/blog → 选/建系列 → 自动生成 slug/日期/seriesOrder/frontmatter → 写入 `src/content/` 对应集合）
- 部署沿用现状：git push → Vercel 自动构建
- `publish-to-tensorfieldx` 技能文档同步更新（系列集合、summary 字段）

## 10. 阶段划分

1. **P1 地基**：tokens.css + Tailwind 重配 + BaseLayout 拆分 + 全站配色切换 + 删除旧特效/依赖 + 字体自托管
2. **P2 转场引擎**：Emblem 组件 + 三层转场 + 降级/中断
3. **P3 IA**：series 集合 + 书架 + 系列页 + 阅读页系列栏 + 首页 + blog/tags 适配
4. **P4 阅读体验**：prose 精修、代码块语言标签、图片放大、KaTeX 自托管
5. **P5 发布流程 + 性能验证**：`pnpm new`、技能文档同步、Lighthouse 走查

## 11. 验证

每阶段：`pnpm build` 通过 + dev 走查（三层转场各自触发正确、降级生效、移动端、删除项无残留、配色无旧值残留）。

## 12. 待定项（用户可随时拍板，不阻塞 v1）

- 深色模式是否加回（需单独设计暗色配色）
- 已读进度圆点（localStorage）
- L2 徽章各板块变体的精确形变序列（实现时按「复杂度旋钮」调参：层数 / 异速比 / 弧长 / 节奏）
