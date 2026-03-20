## 1. ChatList 顶部搜索区域改造

- [x] 1.1 移除 ChatList.vue 原有的标题区域（"Chat Sessions" 和 "协作会话"）
- [x] 1.2 添加搜索输入框组件（UInput + 搜索图标）
- [x] 1.3 添加新建会话按钮（UButton + plus 图标）在搜索框右侧
- [x] 1.4 实现 searchQuery 响应式变量和 filteredSessions 计算属性
- [x] 1.5 将会话列表渲染改为使用 filteredSessions

## 2. ChatList 会话项交互样式

- [x] 2.1 为会话列表项添加悬停效果（hover:bg-elevated/50）
- [x] 2.2 为选中会话添加高亮样式（bg-elevated ring-1 ring-accented）
- [x] 2.3 优化会话列表项的圆角设计（rounded-lg）

## 3. ChatBox Header 重构

- [x] 3.1 重构 Header 布局为左右分栏（flex justify-between）
- [x] 3.2 左侧显示当前对话标题（保留返回按钮在移动端）
- [x] 3.3 右侧显示操作按钮组（Feed Draft 等按钮）

## 4. 样式细节优化

- [x] 4.1 确认消息气泡样式配置正确（用户/AI 视觉区分）
- [x] 4.2 优化空状态页面的视觉设计
- [x] 4.3 检查响应式布局在移动端和桌面端的表现

## 5. 测试与验证

- [ ] 5.1 验证搜索功能：输入关键词后列表正确过滤
- [ ] 5.2 验证新建按钮：点击后创建新会话并切换
- [ ] 5.3 验证会话项交互：悬停和选中状态正确显示
- [ ] 5.4 验证 Header 布局：标题在左、按钮在右
