# 基于 @nuxt/ui 的 MVP 标准化设计 (MVP Design System)

> 文档状态：已归档的历史设计稿。内容包含早期页面结构、主题和组件约束，不应作为当前 UI 实现依据。当前页面实现请结合 [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md) 和实际 `app/pages/`、`app/components/` 代码阅读。

## 4.1 核心工程与配置策略 (MVP 阶段)

### 业务组件二次封装

必须在 `components/` 目录下独立封装如 `<FeedPostCard>`, `<ChatMessageBubble>` 等组件。

### 严格的图标规范

统一通过 `@nuxt/ui` 提供的 `<UIcon>` 组件进行渲染，严禁硬编码 `<svg>`。

### 拥抱默认组件

优先使用 `<UCard>`, `<UButton>`, `<UInput>` 等，保留默认圆角和阴影以求快速搭建。

### 轻量化主题注入

Tailwind 定义高级的珊瑚红/陶土橘 (HEX: `#E05D44`) 为 `primary` 主题色。

## 4.2 响应式布局与交互组件应用

### 首次启动向导 (Onboarding Setup)

检测 `SystemConfig.isInitialized`，引导创建管理员并绑定默认助理"虾米"（强烈推荐配置 Mac 本地推理引擎 `oMLX`）。

### 动态大盘 (Feed - 瀑布流)

宽屏采用 `md:columns-3 lg:columns-4 xl:columns-5` 瀑布流布局。卡片遵循：置顶媒体 -> 标题 -> 正文 -> 左下头像/右下数据的排版。

### 协作会话 (Chat - 流式与思考 UI)

- **流式打字机效果**：光标保持跳动 (`animate-pulse`)。
- **思考状态面板**：针对推理模型，在气泡内增加极简折叠面板展示思维链 (Chain-of-Thought)。

### 数据管理与导入中心

支持一键解析 Gemini/ChatGPT 导出的 JSON/CSV 格式，自动生成对应的虚拟 AI 用户并将对话映射还原至本地数据库。

---

> **相关文档**：
>
> - [核心架构模式](./ARCHITECTURE.md)
> - [核心数据模型](./DATA_MODELS.md)
> - [服务端引擎](./SERVER_ENGINES.md)
