# Tidymark Agent Teams 方案

## Context

Tidymark 是一个 Chrome 书签管理扩展（AI 分类 / AI 搜索 / 冷门书签识别），目前 PRD 和拆分稿已完成，即将进入开发阶段。需要设计一个 Agent Teams 来协作完成 MVP 开发。

核心思路：按技术架构分层划分职责，而非按功能划分——因为功能之间共享大量基础设施（快照、存储、AI 网关、确认弹层），按功能切会导致冗余和接口不一致。

---

## 角色定义（7 个 Agent）

### Agent 0: Orchestrator（协调者）

- 管理开发流程的阶段推进和 Agent 调度
- 确认前置交付物就绪后才启动下一阶段
- Agent 之间接口分歧时做仲裁
- 维护全局类型定义一致性
- 每个阶段结束时做集成验收
- 约束来源：`tidymark.md`（最高优先级）、`prd_breakdown.md`、`CLAUDE.md`

### Agent 1: Scaffold（脚手架）

- 搭建 Chrome 扩展项目骨架（manifest.json、目录结构、构建配置）
- 配置 TypeScript + ESM + Vite 构建环境
- 建立 `scripts/` 下的 build/dev/clean 脚本
- 配置 Logger → `logs/`
- 定义全局共享的 TypeScript 类型（`src/types/`）
- 交付物：可加载的空壳扩展 + 类型定义 + 构建脚本

### Agent 2: Storage（存储层）

- 实现本地存储层（`chrome.storage.local`）
- 快照管理（创建/恢复/删除/上限 10 份淘汰）
- 导入导出序列化（JSON + schemaVersion 校验）
- 书签树读写封装（对 `chrome.bookmarks` API 的封装）
- 高风险写操作的事务性保证（先快照再写入）
- 交付物：`src/storage/` + `src/bookmarks/` 模块

### Agent 3: AI Gateway（AI 网关）

- OpenAI 兼容格式的 API 调用层
- 分类 prompt 构建（先骨架后分批）
- 搜索 prompt 构建（候选集 + 查询 → 排序 + 理由）
- 请求/响应标准化、错误处理、超时控制
- 本地粗筛工具函数
- 交付物：`src/ai/` 模块

### Agent 4: Background Coordinator（后台编排）

- background service worker 中的业务编排
- AI 分类完整流程：读书签 → 调 AI → 用户确认 → 快照 → 写书签
- AI 搜索完整流程：读书签 → 本地粗筛 → 调 AI → 返回排序
- 冷门书签计算逻辑
- 批量删除/导入恢复/回滚的流程编排
- 统一消息通信协议（UI ↔ background）
- 交付物：`src/background/` + `src/shared/messages.ts`

### Agent 5: UI Components（UI 组件）

- 实现全部 8 个页面的 UI
  - 第一批（简单）：P1 Popup、P5 冷门书签、P6 设置、P7 导入导出
  - 第二批（复杂）：P2 范围选择、P3 分类编辑（拖拽）、P4 AI 搜索侧边栏、P8 确认弹层
- UI 与 background 的消息通信对接
- 页面状态管理（加载/成功/失败/空状态）
- 交付物：`src/popup/`、`src/sidepanel/`、`src/options/`、`src/pages/`、`src/shared/components/`

### Agent 6: Integration & QA（集成与质量）

- 端到端集成测试
- 高风险场景回归验证（AI 中断不部分写入、快照失败阻止写入）
- PRD 验收重点逐项验收
- 代码质量审查（300 行限制、8 文件限制、无循环依赖、无冗余）
- 交付物：测试用例 + 验收报告 + 代码质量报告

---

## 协作流程与阶段划分

```
阶段 1 → [Agent 1: Scaffold]
              │
              ▼ 骨架 + 类型 + 脚本
阶段 2 → [Agent 2: Storage]
              │
              ├──（settings 接口就绪后可并行）──→ 阶段 3 → [Agent 3: AI Gateway]
              │                                              │
              ▼                                              ▼
阶段 4 → [Agent 4: Background Coordinator] ←── 依赖 Agent 2 + 3
              │
              ▼ 消息协议
阶段 5 → [Agent 5: UI Components]（分两批）
              │
              ▼
阶段 6 → [Agent 6: Integration & QA]

Orchestrator 全程监督，每阶段验收后推进下一阶段
```

---

## Agent 间交接物

| 交接 | 交付方 | 接收方 | 交接物 |
|------|--------|--------|--------|
| 骨架 → 存储/AI | Agent 1 | Agent 2, 3 | `src/types/index.ts` 全局类型 |
| 存储 → AI | Agent 2 | Agent 3 | `src/storage/settings.ts` 接口 |
| 存储 + AI → 后台 | Agent 2, 3 | Agent 4 | 存储层 + AI 层全部导出接口 |
| 后台 → UI | Agent 4 | Agent 5 | `src/shared/messages.ts` 消息协议 |
| 全部 → QA | Agent 1-5 | Agent 6 | 完整 `src/` 目录 |

---

## 关键约束来源

- `tidymark.md`：产品约束，最高优先级
- `prd_breakdown.md`：功能清单、页面清单、技术草案
- `CLAUDE.md`：ESM、TypeScript、300 行限制、scripts/ 脚本、logs/ 日志等硬性约束

---

## 验证方式

1. 每阶段由 Orchestrator 验收交付物
2. Agent 6 做端到端集成测试和 PRD 验收重点逐项检查
3. 代码质量审查确保符合 CLAUDE.md 硬性指标

---

## 交付形式

将此方案写入 `docs/agent_teams.md` 作为正式文档，后续开发按此方案执行。