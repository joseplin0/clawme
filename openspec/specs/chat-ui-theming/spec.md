# chat-ui-theming Specification

## Purpose
TBD - created by archiving change improve-chat-ui-styles. Update Purpose after archive.
## Requirements
### Requirement: 会话列表顶部搜索框

系统 SHALL 在左侧会话列表顶部显示搜索/输入框，支持快速筛选会话。

#### Scenario: 用户输入搜索关键词

- **WHEN** 用户在搜索框中输入文字
- **THEN** 系统实时筛选并显示标题或内容匹配的会话列表

#### Scenario: 搜索框为空时显示全部会话

- **WHEN** 搜索框内容为空
- **THEN** 系统显示所有会话

### Requirement: 新建会话按钮

系统 SHALL 在左侧会话列表顶部搜索框旁显示新建按钮（+），用于创建新会话。

#### Scenario: 点击新建按钮

- **WHEN** 用户点击新建按钮
- **THEN** 系统创建新会话并自动切换到该会话

### Requirement: 会话列表项交互样式

系统 SHALL 为会话列表项提供悬停效果和选中状态样式。

#### Scenario: 鼠标悬停会话项

- **WHEN** 用户鼠标悬停在会话项上
- **THEN** 该会话项显示悬停背景效果

#### Scenario: 选中会话高亮

- **WHEN** 用户选中某个会话
- **THEN** 该会话项显示选中高亮边框或背景，与其他会话形成视觉区分

### Requirement: 消息区 Header 布局

系统 SHALL 在右侧消息区顶部 Header 采用左右布局：左侧显示对话标题，右侧显示操作按钮组。

#### Scenario: 显示当前对话标题

- **WHEN** 用户进入某个会话
- **THEN** Header 左侧显示该会话的标题

#### Scenario: 操作按钮组在右侧

- **WHEN** Header 区域渲染
- **THEN** 操作按钮（如 Feed Draft、设置等）显示在 Header 右侧

### Requirement: 消息气泡视觉区分

系统 SHALL 为用户消息和 AI 消息提供不同的视觉样式，便于区分。

#### Scenario: 用户消息样式

- **WHEN** 显示用户发送的消息
- **THEN** 消息气泡靠右显示，使用用户配色方案

#### Scenario: AI 消息样式

- **WHEN** 显示 AI 回复的消息
- **THEN** 消息气泡靠左显示，使用 AI 配色方案

### Requirement: 空状态页面

系统 SHALL 在未选择会话时显示美观的空状态页面。

#### Scenario: 未选择会话

- **WHEN** 用户未选择任何会话
- **THEN** 右侧消息区显示引导提示，建议用户选择或创建会话

### Requirement: 响应式布局适配

系统 SHALL 确保聊天界面在移动端和桌面端均有良好的显示效果。

#### Scenario: 移动端布局

- **WHEN** 屏幕宽度小于 md 断点
- **THEN** 左侧会话列表和右侧消息区采用滑动切换模式

#### Scenario: 桌面端布局

- **WHEN** 屏幕宽度大于等于 md 断点
- **THEN** 左侧会话列表和右侧消息区并排显示

