# 代码地图

这份文档面向两类读者：

- 新加入项目的协作者
- 需要快速建立上下文的 coding AI 工具

## 顶层目录职责

- `app/`: 页面、布局、组件、前端 composables
- `server/api/`: HTTP 与 WebSocket 接口适配层
- `server/services/`: 业务服务层
- `server/ecosystem/`: assistant 生成入口和后续生态扩展位
- `server/database/`: Drizzle schema 与 relations
- `server/utils/`: 数据库、鉴权、LLM Provider 等基础工具
- `shared/types/`: 前后端共享类型契约
- `drizzle/`: 数据库 migration 产物
- `docs/`: 现状文档、设计草案和外部参考

## 前端入口

### 页面

- `app/pages/setup.vue`: 首次初始化向导
- `app/pages/login.vue`: 管理员登录
- `app/pages/feed.vue`: Feed 列表与无限滚动
- `app/pages/chat.vue`: 会话列表 + 聊天面板容器
- `app/pages/settings.vue`: 系统管理和状态展示

### 布局与中间件

- `app/layouts/default.vue`: 应用主布局和底部导航
- `app/layouts/auth.vue`: 登录与初始化页布局
- `app/middleware/initialized.global.ts`: 初始化/登录态路由守卫

### 聊天相关组件

- `app/components/chat/List.vue`: 会话列表
- `app/components/chat/Box.vue`: 会话详情、消息渲染、AI SDK Chat 接入
- `app/components/chat/Composer.vue`: 输入框、mention 和发送控制
- `app/composables/WebSocketChatTransport.ts`: AI SDK `ChatTransport` 的 WebSocket 适配层
- `app/composables/useChatClient.ts`: WebSocket 客户端封装

## 服务端入口

### 初始化与认证

- `server/api/system/status.get.ts`: 仅返回系统是否已初始化
- `server/api/system/bootstrap.get.ts`: 返回公共系统状态
- `server/api/system/bootstrap.post.ts`: 首次初始化
- `server/api/auth/login.post.ts`: 管理员登录
- `server/api/auth/logout.post.ts`: 管理员登出
- `server/middleware/auth.ts`: `/api/*` 统一 Owner 鉴权入口与公开路径白名单
- `server/utils/auth.ts`: session / JWT / apiSecret 统一认证边界
- `server/utils/jwt.ts`: Owner JWT 签发与校验

### Feed

- `server/api/feed/posts.get.ts`: Feed 分页接口
- `server/services/feed.service.ts`: Feed 数据读取与映射

### Chat

- `server/api/chat/session.get.ts`: 会话列表
- `server/api/chat/session/index.post.ts`: 新建会话
- `server/api/chat/session/[id].get.ts`: 会话详情
- `server/api/chat/session/[id].post.ts`: HTTP 流式聊天
- `server/api/ws/chat.ts`: WebSocket 聊天协议入口
- `server/services/chat.service.ts`: 消息与会话读写基础能力
- `server/services/chat-command.service.ts`: 发送消息前的会话校验与准备
- `server/ecosystem/core/AssistantInstant.ts`: assistant 流式生成统一入口

## 数据与类型

- `server/database/schema.ts`: 当前数据库表定义的单一事实来源
- `server/database/relations.ts`: Drizzle relations
- `server/utils/db.ts`: PostgreSQL 连接与 Drizzle 初始化
- `shared/types/clawme.ts`: 主要业务共享类型
- `shared/types/chat-ws.ts`: WebSocket 协议类型

## 关键请求链路

### 首次引导链路

`app/middleware/initialized.global.ts`
-> `GET /api/system/status`
-> `app/pages/setup.vue`
-> `POST /api/system/bootstrap`
-> `server/services/system.service.ts`

### 登录链路

`app/pages/login.vue`
-> `POST /api/auth/login`
-> `server/utils/auth.ts`
-> `server/utils/jwt.ts`

### Feed 链路

`app/pages/feed.vue`
-> `GET /api/feed/posts`
-> `server/services/feed.service.ts`

### 聊天链路

`app/pages/chat.vue`
-> `app/components/chat/Box.vue`
-> `GET /api/chat/session/:id`
-> `app/composables/WebSocketChatTransport.ts`
-> `WS /api/ws/chat`
-> `server/services/chat-command.service.ts`
-> `server/ecosystem/core/AssistantInstant.ts`

### HTTP 流式聊天链路

`POST /api/chat/session/:id`
-> `server/ecosystem/core/AssistantInstant.ts`

## 建议阅读顺序

1. `docs/content/PROJECT_STATUS.md`
2. `shared/types/clawme.ts`
3. `server/database/schema.ts`
4. `server/services/system.service.ts`
5. `server/services/chat-command.service.ts`
6. `server/ecosystem/core/AssistantInstant.ts`
7. `app/components/chat/Box.vue`
8. `docs/content/WEBSOCKET_CHAT.md`

## 不应作为当前事实来源的文件

- `server/api/agent.post.ts`: 早期实验路由
- 多数愿景类文档：只描述目标方向，不描述当前实现
