# 项目进度记录（PROGRESS）

> 本文件由 ZCode 自动化开发过程维护，记录复现、验证、部署与扩展准备的全部进展。
> 原项目：[darmk/wind-turbine-web3d](https://github.com/darmk/wind-turbine-web3d)（Apache-2.0）
> 本项目路径：`D:\Projects\WindEnergyWeb3D`

---

## 当前状态总览

| 阶段 | 状态 |
|---|---|
| 环境检查与仓库克隆 | ✅ 完成 |
| 依赖安装（npm install） | ✅ 完成 |
| 模型检查（check:model，三档 LOD） | ✅ 全部通过 |
| 生产构建（vue-tsc + vite build） | ✅ 通过 |
| Playwright 自动化测试（Edge 无头） | ✅ 本地 dev 10/10 · 生产 preview 10/10 |
| 依赖安全升级 | ✅ vue 3.5.44 / vite 8.3.5，npm audit 清零 |
| **公网部署（GitHub Pages）** | ✅ **https://decify3.github.io/windpowerweb3d/ 10/10 通过** |
| GitHub 仓库 | ✅ https://github.com/decify3/windpowerweb3d |
| CI/CD 自动部署 | ✅ 推送 main 自动构建发布（Actions） |
| 扩展架构（模型注册表） | ✅ 完成，回归测试 10/10 |
| Blender 4.2 便携版 | ✅ D:\Tools\Blender-4.2，后台建模验证通过 |

## 公网部署（已完成）

- 仓库：`https://github.com/decify3/windpowerweb3d`（Public，Apache-2.0，保留原作者提交历史）
- 线上地址：`https://decify3.github.io/windpowerweb3d/`
- 部署方式：`.github/workflows/deploy-pages.yml`，推送 main 自动构建（VITE_BASE=/<仓库名>/）并发布到 GitHub Pages
- 验证：全部 10 项 Playwright 测试在公网地址通过（54.7s）；实拍截图 `docs/live-deployment.png`（66 FPS / 88 网格 / WebGL 2）
- 使用的本机配置：git 已配置仅针对 github.com 的本地代理 `http://127.0.0.1:7897`（系统代理直连 GitHub 不稳定；`git config --global --unset http.https://github.com/.proxy` 可撤销）
- 完整部署文档（含 Cloudflare Pages / Nginx / 个人网站集成）：`docs/DEPLOYMENT.md`

## 扩展架构（已完成，2026-10-25）

- 新增 `src/data/models/registry.ts`：`ModelDefinition` 统一模型定义（名称/GLB/参数/部件/行为开关/拆解规则）
- 参数化改造（默认 EN182 行为零变化，回归 10/10 通过）：
  - `ModelHierarchy(root, components)`、`ExplodedView(hierarchy, components, rule)`、
    `CameraManager(canvas, model)`、`SceneManager(host, model)`、`AnimationManager(rotor, initialSpeed)`
  - `InfoPanel`/`ComponentTree`/`TreeNode` 改为 props 注入部件数据
  - `TurbineViewer` 新增 `modelId` prop，按注册表加载；`App.vue` 传入模型定义
- 模型选择器：`modelRegistry.length > 1` 时自动出现在右上角（当前单模型隐藏）
- 行为开关：`rotorSpin` / `stagedExplosion` / `sweptDiskFraming` / `stageDisk` / `internalsComponentId`，未来基础/海洋结构模型可关闭风机专属行为
- 接入指南：`docs/EXTENDING.md`（四步接入新模型，无需改渲染代码）

## 已完成工作

### 1. 环境与获取（2026-10-24）
- Node.js v24.11.1、npm 11.6.2、Git 2.52.0 满足项目要求（README 建议 Node 22.12+/24）。
- D 盘存在且空间充足（约 136GB 空闲）；`D:\Projects`、`D:\Tools` 为新建目录，无同名冲突。
- 已克隆原仓库至 `D:\Projects\WindEnergyWeb3D`（46 MB，含 Blender 源场景、Python 建模脚本、三档 Draco GLB、验证报告）。
- `npm install` 成功（69 包），postinstall 已把 Three.js 本地 Draco 解码器复制到 `public/draco/`。
- `npm audit` 报告 5 个高危漏洞，均为开发期问题（SSR XSS 不影响本纯客户端 SPA；vite dev server 相关）；补丁升级另行提交。

### 2. 复现验证（2026-10-24）
- `npm run dev` 正常启动；开发地址 `http://127.0.0.1:5173/windpowerweb3d/`（Vite dev 模式同样按 base 路径服务）。
- 三档 GLB（458/363/237 KB）、Draco 解码器、二维码、背景图均通过 HTTP 200 正常加载。
- `npm run check:model`：三档 LOD 全部通过 —— 24 语义部件、88 网格、9 材质；三角面 88,864 / 58,384 / 26,600 与 README 一致。
- `npm run build`：vue-tsc 类型检查 + Vite 8 生产构建通过（three chunk 653 KB 提示属正常）。
- Playwright（系统 Edge 无头，channel: msedge）：**10/10 通过**，覆盖选择/聚焦/隐藏/隔离、拆解暂停/继续/精确复位、透明/X-Ray/三轴剖切、叶轮启停/倍速、缩放/平移/环绕、PNG 截图下载、LOD 切换、移动端布局、GLB 加载失败重试、射线拾取、reduced-motion、无资源 404、舞台隔离与响应式取景。
- 视觉复核截图（docs/）：desktop.png（84 FPS / 181 draws / 97.5K tris）、xray.png（机舱内部传动链）、exploded.png（完全拆解）、mobile.png（390×844 LOD 2）等均正常。

### 3. 对原项目的修改（修复类）
- `tests/viewer.spec.ts`：原项目最后一次提交加入了 FollowGate（关注引导页），但 Phase 15/16 测试内通过 `browser.newPage()` 新建的移动端页面未注入 localStorage，导致引导页拦截、该测试必失败。已补充与 `beforeEach` 一致的 `addInitScript`。这是测试遗漏修复，不改产品行为。
- 后续安全补丁与架构改动见下方对应小节。

## 已知问题与限制
- ZCode 内嵌浏览器（IAB）在 WebGL 场景初始化时崩溃（标签页消失），属内嵌浏览器环境限制，与项目无关；权威验证使用 Playwright + 系统 Edge 完成。
- Vite 构建提示 three chunk > 500 KB：功能正常，暂不做代码分割改动，保持原项目行为。
- FollowGate（关注公众号引导）为原作者的展示性引导（前端固定二维码，不校验真实关注）。保留其功能与测试；部署时可按 `src/data/followGate.ts` 的 `enabled` 配置关闭（见 docs/DEPLOYMENT.md）。

## 下一步任务
1. 生产构建产物 `npm run preview` 复跑 Playwright（验证构建版本）。
2. 依赖安全补丁升级（vue 3.5.44 / vite 8.3.5）并复跑全部测试。
3. 公网部署（GitHub Pages / Cloudflare Pages），处理 base 路径与 Draco 资源路径。
4. 扩展架构：模型注册表（model registry）与部件数据模块化，保持原功能不变。
5. Blender 4.2 LTS 便携版安装至 `D:\Tools\Blender-4.2`，后台脚本验证。
6. 文档完善：部署指南、模型接入流程、个人网站集成方案。

## Blender 4.2 便携版（已完成，2026-10-25）

- 安装位置：`D:\Tools\Blender-4.2\blender.exe`（4.2.23 LTS 便携版，官方 TUNA 镜像下载，无系统级安装）
- 官方 download.blender.org 在本机被 Cloudflare 拦截，改用清华镜像成功
- 后台建模端到端验证通过（输出到临时目录，未覆盖原模型）：
  `D:\Tools\Blender-4.2\blender.exe --background --factory-startup --python-exit-code 1 --python blender/scripts/build_turbine.py -- --phase 8 --lod 0 --output-dir <临时目录>`
- 结果：BUILD_PASSED，88 独立网格、94444 三角面（实例化前），轮毂高度 130.0 m、
  叶片角度 [0/120/240]°、实测扫掠直径 181.100 m，与参数配置一致；Draco 导出正常
- 临时产物已清理，`public/models/` 原模型未变动

## 需要用户处理的事项

- **无阻塞事项**。部署、验证、文档均已完成。
- 可选项（按需处理）：
  1. ~~FollowGate 引导页~~ → **已按用户要求关闭**（`src/data/followGate.ts` 中 `enabled: false`，2026-10-25）。组件与测试保留，恢复原行为改回 `true` 即可。原作者归属保留于 README 派生声明与 LICENSE。
  2. 如需 Cloudflare Pages（根路径部署形态），按 `docs/DEPLOYMENT.md` 方式二操作，需要你的 Cloudflare 账号授权。
  3. git 的 github.com 代理配置：`git config --global http.https://github.com/.proxy http://127.0.0.1:7897`（跟随系统代理端口变化时需同步修改；撤销命令见上表下方）。
  4. GitHub 仓库当前为 Public（免费 Pages 的要求）；如需私有化，Pages 需升级 GitHub Pro。
  5. 个人网站集成（独立链接 / 子路径 / iframe 三方案）见 `docs/DEPLOYMENT.md`，均无需改动本项目代码。
