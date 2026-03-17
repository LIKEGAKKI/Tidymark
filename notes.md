# Notes: Tidymark PRD Breakdown

## Sources

### Source 1: Existing PRD
- Path: `/Users/lovegakki/workspace/myself/codespace/web/Tidymark/tidymark.md`
- Key points:
  - MVP 包含 AI 智能分类、AI 语义搜索、冷门书签识别、本地数据保存/导入/导出/回滚。
  - AI 分类作用范围由用户选择，AI 生成后直接进入同一编辑页。
  - 冷门书签识别基于 `dateAdded` 与 `dateLastUsed`，不依赖 `history`。
  - 导出为单个 JSON 文件，带 `schemaVersion`，包含 `settings`、`snapshots`、`bookmarksTree`、`metadata`。
  - 高风险操作包括 AI 重组、导入恢复、批量删除，要求二次确认与回滚。

## Synthesized Findings

### Deliverable Structure
- 需要把 PRD 进一步落到“能做什么”“有哪些页面”“怎么实现”三个层次。
- 页面清单应覆盖入口、空状态、异常状态和高风险确认。
- 技术草案应按 Chrome Extension MVP 架构拆成 UI、浏览器 API、AI 网关、数据存储、回滚机制。

### Feature Boundaries
- AI 分类的主链路是：选择范围 -> 调用 AI -> 进入编辑页 -> 应用变更 -> 生成快照。
- AI 搜索的主链路是：输入自然语言 -> 本地粗筛 -> AI 排序/解释 -> 打开或定位书签。
- 冷门书签的主链路是：按规则列出 -> 筛选排序 -> 删除或打开。

### Risks To Reflect In Breakdown
- 书签重组、导入恢复和批量删除都需要统一的风险控制与回滚策略。
- AI 配置和数据出站说明必须出现在设置或首次使用流程中。
- 分阶段 AI 分类需要在技术草案中写清“先分类骨架后分批归类”。

### Deliverable Produced
- `prd_breakdown.md` 已生成，包含功能清单、页面清单和技术实现草案。
- 页面层覆盖首页、范围选择、分类编辑、搜索、冷门书签、设置、导入导出与通用确认弹层。
- 技术草案覆盖扩展架构、Chrome API、数据模型、AI 分类/搜索、冷门书签计算、导入导出与回滚流程。
