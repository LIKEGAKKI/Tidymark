# Tidymark 文档导航

## 1. 文档概览

当前项目里与产品定义和拆分相关的核心文档有 4 份：

1. [tidymark.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/tidymark.md)  
   主 PRD 文档。定义产品目标、MVP 范围、核心功能、数据方案、风险控制和关键产品决策。

2. [prd_breakdown.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/prd_breakdown.md)  
   PRD 拆分稿。把主 PRD 进一步拆成可执行的功能清单、页面清单和技术实现草案，适合作为设计和开发输入。

3. [task_plan.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/task_plan.md)  
   本轮文档拆分任务的过程计划文件。记录目标、阶段、决策和处理过程，偏工作流记录。

4. [notes.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/notes.md)  
   本轮拆分过程中的研究和归纳笔记。记录从 PRD 中提炼出来的结构化结论，偏中间材料。

## 2. 推荐阅读顺序

如果你是第一次接手这个项目，建议按下面顺序阅读：

1. 先看 [tidymark.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/tidymark.md)  
   先建立产品目标、边界和关键决策的整体认识。

2. 再看 [prd_breakdown.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/prd_breakdown.md)  
   进一步理解这份 PRD 对应的功能拆分、页面结构和技术实现方向。

3. 最后按需查看 [task_plan.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/task_plan.md) 和 [notes.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/notes.md)  
   这两份不是最终产品文档，更适合在需要追溯讨论过程、确认决策来源时查看。

## 3. 每份文档适合回答什么问题

### [tidymark.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/tidymark.md)

适合回答：
- 这个产品要解决什么问题？
- MVP 包含哪些功能，不包含哪些功能？
- AI 分类、AI 搜索、冷门书签分别怎么定义？
- 数据如何导入导出、如何回滚？
- 界面形态为什么是 `popup + side panel + 完整页面 + options page`？

### [prd_breakdown.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/prd_breakdown.md)

适合回答：
- 每项功能的主链路和验收重点是什么？
- 产品需要哪些页面和界面形态？
- 各页面应该承载哪些模块和关键状态？
- MVP 技术上建议怎么拆模块、怎么走数据流？

### [task_plan.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/task_plan.md)

适合回答：
- 这次文档拆分是怎么推进的？
- 当前拆分任务的阶段和目标是什么？
- 过程中做过哪些明确决策？

### [notes.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/notes.md)

适合回答：
- 主 PRD 中哪些信息被提炼成了拆分稿？
- 页面和技术草案的结论是怎么归纳出来的？
- 哪些风险点在拆分时被特别强调？

## 4. 当前已经明确的关键决策

为了方便实现 agent 快速进入状态，这里汇总当前已经定下来的核心约束：

- `popup` 只做入口和状态摘要，不承载复杂编辑操作
- `AI 搜索` 走浏览器 `side panel`
- `分类结果编辑` 和 `冷门书签` 使用完整页面
- `设置`、`导入导出`、`快照管理` 放在 `options page`
- 高风险操作必须有二次确认和快照
- AI 搜索定位为“找书签”，不是通用聊天助手
- 冷门书签基于 `dateAdded` 和 `dateLastUsed`
- 导出为单个 JSON 文件，并带 `schemaVersion`

## 5. 给实现 Agent 的建议用法

如果后续由实现 agent 接手，建议它：

1. 把 [tidymark.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/tidymark.md) 作为产品约束来源  
   这里的定义优先级最高。

2. 把 [prd_breakdown.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/prd_breakdown.md) 作为实现切分参考  
   这里可以直接指导页面拆分、模块划分和开发顺序。

3. 仅在需要追溯背景时再看 [task_plan.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/task_plan.md) 和 [notes.md](/Users/lovegakki/workspace/myself/codespace/web/Tidymark/notes.md)  
   不要把这两份当成最终需求文档。
