# 新工程模型接入指南（EXTENDING）

本平台已完成模型注册表（`src/data/models/registry.ts`）改造：三维管理器
（层级/拾取/高亮/透视/剖切/拆解/叶轮/相机）全部通过 `ModelDefinition` 注入数据，
**新增工程模型不需要改动渲染与交互代码**，只需登记数据。

## 架构总览

```text
Blender 参数化建模脚本 ──导出──> public/models/<id>[-lodN].glb
                                        │
blender/config/<id>_config.json ──读取──┤
                                        ▼
src/data/models/<id>.ts（部件定义 ComponentDefinition[]）
                                        │
src/data/models/registry.ts（登记 ModelDefinition 条目）
                                        │
App.vue 模型选择器 ──切换──> TurbineViewer 按 ModelDefinition 加载与交互
```

## 接入一个新模型的步骤

以"单桩基础（monopile）"为例：

### 1. 建模与导出

- 参考 `blender/scripts/build_turbine.py` 的模块化写法，为每个语义部件创建
  独立命名对象（如 `Monopile`、`TransitionPiece`、`BoatLanding`），设置父子层级；
- 复用导出与校验逻辑（对象命名、法线、单位、Y-up、Draco 压缩），生成三档 LOD：
  - `public/models/monopile.glb`（LOD 0）
  - `public/models/monopile-lod1.glb`
  - `public/models/monopile-lod2.glb`
- 三档都必须保留全部语义部件命名（降精度不降部件身份）。

### 2. 参数配置

- 新建 `blender/config/monopile_config.json`（结构参照 `en182_config.json`），
  每个尺寸注明来源（公开资料 / 工程近似），保持"真实数据与演示数据可追溯"的原则；
- 如暂时没有 Blender 参数化链路，也可以直接准备 GLB + 手写配置，
  但 `turbineConfig` 中至少要提供取景与参数卡片使用的数值字段。

### 3. 部件定义

新建 `src/data/models/monopile.ts`，结构完全参照 `src/data/components.ts`：

```ts
import type { ComponentDefinition } from '../components';
export const monopileComponents: ComponentDefinition[] = [
  ['monopile','单桩基础','Monopile foundation','Monopile',undefined,
   'Ø 8.5 m · 钢结构','…描述与数据边界…','ENGINEERING-ESTIMATE',[0,0,0]],
  // ...
].map(...)  // 与 components.ts 的映射写法一致
```

字段说明（详见 `ComponentDefinition`）：

| 字段 | 用途 |
|---|---|
| `id` | 交互主键（选择/隐藏/拆解/聚焦） |
| `objectNames` | GLB 节点名，必须与模型一致，否则加载报错 |
| `parent` | 部件树层级 |
| `explosionOffset` | 拆解位移向量 |
| `source` / `estimated` | 数据边界标注，展示于说明面板 |

### 4. 登记注册表

在 `src/data/models/registry.ts` 追加：

```ts
const monopileModel: ModelDefinition = {
  id: 'monopile',
  name: 'MONOPILE-8.5',
  subtitle: '单桩基础 · 海上风电',
  glbBaseName: 'monopile',
  screenshotBase: 'MONOPILE-8.5',
  revision: '01.00',
  rootComponentId: 'monopile',
  initialRotorSpeed: 0,
  turbineConfig: monopileConfig,   // 若无旋转部件仍需提供参数对象
  components: monopileComponents,
  features: {
    rotorSpin: false,              // 基础结构无叶轮
    stagedExplosion: true,
    sweptDiskFraming: false,       // 无叶轮扫掠盘取景
    stageDisk: true,               // 保留底座舞台
  },
  explosionRule: monopileExplosionRule, // 自定义拆解规则（可省略）
};
export const modelRegistry: ModelDefinition[] = [en182Model, monopileModel];
```

登记后模型选择器自动出现（`modelRegistry.length > 1` 时渲染），
切换、LOD、部件树、拆解、剖切等全部能力对新模型即刻生效。

### 5. 行为开关说明

- `rotorSpin: false` → 不创建叶轮动画管理器；
- `sweptDiskFraming: false` → 相机取景不扩展叶轮扫掠盘；
- `internalsComponentId` 不设置 → 顶部"结构探索"按钮自动禁用；
- `explosionRule(c, level) => 0~1` 控制每个部件在各级拆解中的位移系数，
  未提供时默认全部部件按满位移拆解。

### 6. 测试

```bash
npm run check:model     # GLB 格式与语义部件校验（按需扩展 check-model.ts）
npm run build           # 类型检查 + 构建
npm test                # Playwright 全套交互回归
```

建议为新模型补充专属测试（复制 `tests/viewer.spec.ts` 的模式），
并在 `docs/` 中记录模型事实（面数、来源、近似声明）。

## 数据边界原则（重要）

延续原项目的做法：每个模型的数据必须区分
**公开资料确认（PUBLIC-REFERENCE / OFFICIAL）** 与 **工程近似（ENGINEERING-ESTIMATE）**，
未经验证的模型不得作为实际工程设计、计算或认证依据。
这一原则在部件定义的 `source` 字段中强制标注，并显示在界面上。

## 个人网站集成

见 `docs/DEPLOYMENT.md` 的"个人网站集成方案"：独立链接 / 子路径 / iframe 三种方式均不需要改动本项目代码。
