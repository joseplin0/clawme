## Context

当前聊天界面由两个主要组件构成：
- `ChatList.vue`：左侧会话列表，目前顶部显示标题区域
- `ChatBox.vue`：右侧消息区，包含 header、消息列表、输入框

现有布局偏向传统应用风格，需要改造为现代聊天软件的交互模式。

**技术栈约束**：
- 使用 Nuxt UI v4 组件库
- Tailwind CSS 进行样式编写
- Vue 3 Composition API
- 现有的响应式滑动切换逻辑保留

## Goals / Non-Goals

**Goals:**
- 将 ChatList 顶部改造为搜索框 + 新建按钮布局
- 重构 ChatBox Header 为左右分栏布局（标题左、按钮右）
- 添加会话列表项的交互状态样式
- 保持现有响应式布局逻辑不变

**Non-Goals:**
- 不新增后端 API（搜索功能为前端过滤）
- 不修改消息数据结构或存储逻辑
- 不引入新的第三方 UI 库

## Decisions

### 1. ChatList 顶部布局方案

**决定**：使用 `UInput` + `UButton` 组合替换原有标题区域

**理由**：
- 与 Nuxt UI 组件风格一致
- 搜索框使用 `UInput` 的 `icon` 属性添加搜索图标
- 新建按钮使用 `UButton` 的 `icon` 属性，尺寸与输入框匹配

**布局结构**：
```
┌─────────────────────────┐
│ [🔍 搜索框...]    [+]  │
├─────────────────────────┤
│  会话列表项...          │
└─────────────────────────┘
```

### 2. 搜索实现方案

**决定**：使用 `computed` 进行前端实时过滤

**理由**：
- 会话数据量较小，前端过滤性能足够
- 无需新增 API 端点
- 实时响应，用户体验好

**实现**：
```ts
const searchQuery = ref('')
const filteredSessions = computed(() => {
  if (!searchQuery.value) return sessions.value
  const query = searchQuery.value.toLowerCase()
  return sessions.value.filter(s =>
    s.title.toLowerCase().includes(query)
  )
})
```

### 3. ChatBox Header 布局方案

**决定**：使用 `flex justify-between` 布局

**理由**：
- 简单直接，符合左右分栏需求
- 与现有 Nuxt UI 组件配合良好

**布局结构**：
```
┌─────────────────────────────────────────┐
│ [←] 会话标题              [按钮组]      │
└─────────────────────────────────────────┘
```

### 4. 会话列表项样式方案

**决定**：使用 Tailwind 的 `group` 和状态类实现交互效果

**样式规范**：
- 默认：`rounded-lg p-3`
- 悬停：`hover:bg-elevated/50`
- 选中：`bg-elevated ring-1 ring-accented`

### 5. 消息气泡样式

**决定**：保持现有 `UChatMessages` 组件配置，通过 `userMessageProps` 和 `assistantMessageProps` 控制样式

**当前配置已满足需求**：
- 用户消息：`side: "right"`, `variant: "soft"`
- AI 消息：`side: "left"`, `variant: "naked"`

## Risks / Trade-offs

**[风险] 搜索功能无后端支持**
→ 当前会话数量有限，前端过滤可接受。未来如会话量增大，可扩展为后端搜索。

**[风险] 新建会话 API 尚未实现**
→ 需确认 `/api/chat/session` POST 端点是否可用，否则新建按钮暂时只显示 UI 不执行操作。

**[权衡] 不引入虚拟列表**
→ 当前会话数量较少，无需虚拟滚动优化。
