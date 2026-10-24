/**
 * 模型注册表（Model Registry）
 *
 * 未来接入新的工程模型（单桩基础、吸力筒、升压站等）时：
 * 1. 用 Blender 脚本导出 GLB（含语义部件命名），放入 public/models/<id>[-lodN].glb；
 * 2. 为新模型建立部件数据文件（ComponentDefinition[]，结构同 src/data/components.ts）；
 * 3. 在本文件登记一个 ModelDefinition，并通过 App.vue 的模型选择器切换。
 *
 * 三维管理器（层级、高亮、剖切、拆解等）通过本定义注入数据，不直接 import
 * 具体模型的数据模块，因此新增模型无需改动渲染与交互代码。
 */
import en182Config from '../../../blender/config/en182_config.json';
import {components as en182Components, type ComponentDefinition} from '../components';

export interface ModelFeatures {
  /** 是否存在可旋转的叶轮部件（风机类模型） */
  rotorSpin: boolean;
  /** 拆解是否采用"整机/一级/二级/完全"四档语义规则 */
  stagedExplosion: boolean;
  /** 相机取景是否扩展到叶轮扫掠盘（需要 rotorComponentId 与转子直径） */
  sweptDiskFraming: boolean;
  /** 是否渲染底座雷达舞台 */
  stageDisk: boolean;
}

export interface ModelDefinition {
  /** 注册表唯一 id，同时用于切换与诊断 */
  id: string;
  /** 界面展示名（原 TEST-182 位置） */
  name: string;
  /** 副标题（参数卡片下方） */
  subtitle: string;
  /** GLB 基名：实际文件为 public/models/<glbBaseName>[-lodN].glb */
  glbBaseName: string;
  /** 截图下载文件名前缀 */
  screenshotBase: string;
  /** 版本号显示于状态栏 */
  revision: string;
  /** 根部件 id（"整机"节点），选择与复位回到该节点 */
  rootComponentId: string;
  /** 可旋转叶轮的部件 id；无叶轮模型留空 */
  rotorComponentId?: string;
  /** 初始叶轮演示倍率 */
  initialRotorSpeed: number;
  /** 模型物理参数（原 en182_config.json），供取景与参数卡片使用 */
  turbineConfig: typeof en182Config;
  /** 语义部件定义（部件树、拾取、拆解位移、聚焦偏移） */
  components: ComponentDefinition[];
  /** 行为开关：未来基础/海洋结构模型可关闭风机专属行为 */
  features: ModelFeatures;
  /**
   * 分层拆解规则：返回 0~1 的位移系数。默认提供 EN182 的四档规则，
   * 新模型可提供自己的规则函数或使用 features.stagedExplosion=false 走通用位移。
   */
  explosionRule?: (component: ComponentDefinition, level: number) => number;
}

/** EN182 5 MW 风机的四档拆解规则（自原 ExplodedView 逻辑迁移，行为不变） */
function en182ExplosionRule(c: ComponentDefinition, level: number): number {
  if (c.id === 'rotor') return level >= 1 ? 1 : 0;
  if (c.parent === 'nacelle') return level >= 2 ? (level === 3 ? 1 : .65) : 0;
  if (c.parent === 'rotor' || c.parent === 'gearbox') return level === 3 ? 1 : 0;
  return 0;
}

const en182Model: ModelDefinition = {
  id: 'en182-5mw',
  name: 'TEST-182',
  subtitle: '陆上风力发电机 · 数字样机',
  glbBaseName: 'en182-5mw',
  screenshotBase: 'TEST-182',
  revision: '01.00',
  rootComponentId: 'turbine',
  rotorComponentId: 'rotor',
  initialRotorSpeed: 2,
  turbineConfig: en182Config,
  components: en182Components,
  features: {rotorSpin: true, stagedExplosion: true, sweptDiskFraming: true, stageDisk: true},
  explosionRule: en182ExplosionRule,
};

/** 注册表：新增工程模型时在此数组追加条目即可出现在模型选择器中 */
export const modelRegistry: ModelDefinition[] = [en182Model];

export const defaultModelId = en182Model.id;

export function getModelDefinition(id: string): ModelDefinition {
  const model = modelRegistry.find(m => m.id === id);
  if (!model) throw new Error(`注册表中不存在模型：${id}`);
  return model;
}

/** 由模型定义构建部件 id → 部件定义 的映射（替代对 components.ts 的直接依赖） */
export function componentMapOf(model: ModelDefinition): Map<string, ComponentDefinition> {
  return new Map(model.components.map(c => [c.id, c]));
}

export type {ComponentDefinition};
