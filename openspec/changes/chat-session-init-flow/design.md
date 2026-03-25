# 聊天会话初始化流程 - 技术设计

## Context

### 背景
当前系统在 setup.vue 初始化时会预创建一个用户与助理的会话，但用户无法在初始化流程中直接发送消息。用户需要完成初始化后导航到聊天页面才能开始对话。

### 当前状态
- setup.vue 完成初始化后直接跳转到 /feed 页面
- 会话在 `initializeSystem` 函数中预创建
- 消息发送需要用户手动进入聊天页面

### 约束
- 必须兼容现有 AI SDK 流式响应架构
- 不能破坏现有的私聊和群聊支持
- 需要复用现有的数据库表结构
- 前端需要复用现有的 AI SDK useChat 组件

## Goals / Non-Goals

**Goals:**
1. 用户可在 setup 完成时直接发送初始消息给助理
2. 统一消息发送入口，支持用户→用户(AI)→创建 session 的流程
3. 架构可扩展支持三种场景：私聊、AI 对话、群聊
4. 移除 mock 消息，使用真实的 AI 流
5. **新增**: 通过 WebSocket Transport 实现实时通信，统一消息格式

**Non-Goals:**
1. 不修改数据库表结构
2. 不实现完整的群聊功能（仅预留扩展点）
3. 不修改 AI 模型配置流程
4. 不移除现有 HTTP API（保留作为备选方案）

## Decisions

### 决策 1：双通道架构 (HTTP + WebSocket)

**选择**: 保留现有 HTTP API，新增 WebSocket 通道，前端可选择使用

**理由**:
- HTTP API 作为基础，简单可靠，适合初始化场景
- WebSocket 提供实时通信，适合聊天场景
- 渐进式迁移，降低风险
- 前端可以根据场景选择合适的 transport

**Setup 初始化简化**:
- Setup 完成后，后端自动发送默认消息 "你好" 给 AI 助理
- 无需前端传递 initialMessage 参数
- 用户直接跳转到聊天页面看到 AI 响应

**架构图**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         双通道架构                                        │
└─────────────────────────────────────────────────────────────────────────┘

                              前端 (useChat)
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │  HTTP Transport     │       │  WebSocket Transport │
        │  (DefaultChatTransport)│    │  (自定义实现)         │
        └──────────┬──────────┘       └──────────┬──────────┘
                   │                             │
                   ▼                             ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │  /api/chat/session  │       │  /api/ws/chat       │
        │  (现有 API)         │       │  (新增 WebSocket)    │
        └──────────┬──────────┘       └──────────┬──────────┘
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │    统一消息处理      │
                       │  (ChatService)      │
                       └─────────────────────┘
```

### 决策 2：WebSocket Transport 实现

**选择**: 参考 AI SDK 官方讨论，实现自定义 `WebSocketChatTransport`

**理由**:
- AI SDK 5 支持自定义 Transport 接口
- 前端完全复用 useChat，无需修改组件
- 所有消息统一转换为 `UIMessage` 格式
- 单个 WebSocket 连接处理所有会话

**参考**:
- https://ai-sdk.dev/docs/ai-sdk-ui/transport
- https://github.com/vercel/ai/discussions/5607#discussioncomment-14617911

### 决策 3：按需创建会话

**选择**: 移除 setup 中的预创建会话逻辑，改为首次发消息时创建

**理由**:
- 更符合用户心智模型：发消息才有会话
- 减少数据库中的空会话
- 统一所有场景的会话创建逻辑

### 决策 4：消息处理流程

**选择**: 根据接收者类型路由消息处理，所有响应统一转换为 UIMessage 格式

```
消息发送 → 识别接收者类型 → 路由处理 → 转换为 UIMessage
                ↓
    ┌───────────┼───────────┐
    ↓           ↓           ↓
  AI 助理     普通用户      群组
    ↓           ↓           ↓
 触发 AI 流   存储消息    广播给成员
    ↓           ↓           ↓
 toUIMessage  UIMessage    UIMessage
    Stream    (单条)       (广播)
```

## 流程图

### 整体架构流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         整体消息通信架构                                   │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   前端      │
                              │  useChat    │
                              └──────┬──────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │  WebSocketChatTransport │
                        │  (自定义 Transport)     │
                        └────────────┬───────────┘
                                     │
                                     │ WebSocket 连接
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │      后端 WebSocket    │
                        │    /api/ws/chat        │
                        └────────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
        ┌──────────┐          ┌──────────┐          ┌──────────┐
        │ AI 助理   │          │ 普通用户  │          │  群聊    │
        └────┬─────┘          └────┬─────┘          └────┬─────┘
             │                     │                     │
             ▼                     ▼                     ▼
      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
      │ streamText  │      │ 存储消息    │      │ 存储+广播   │
      │ .toUIMessage│      │ 转换为      │      │ 转换为      │
      │ Stream()    │      │ UIMessage   │      │ UIMessage   │
      └─────────────┘      └─────────────┘      └─────────────┘
             │                     │                     │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────┐
                        │  统一 UIMessage 格式    │
                        │  通过 WebSocket 推送    │
                        └────────────────────────┘
```

### WebSocket 消息时序图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WebSocket 消息时序图                                   │
└─────────────────────────────────────────────────────────────────────────┘

【场景 1: 用户 → AI 助理】

    用户 A                      服务端                      AI
       │                          │                         │
       │  ws.send({               │                         │
       │    type: 'send',         │                         │
       │    sessionId: 'xxx',     │                         │
       │    content: '你好'       │                         │
       │  })                      │                         │
       │ ────────────────────────►│                         │
       │                          │                         │
       │                          │── streamText() ────────►│
       │                          │                         │
       │                          │◄── toUIMessageStream() ─│
       │                          │    (流式 chunks)        │
       │                          │                         │
       │◄── ws: {type:'text',     │                         │
       │      content:'你'}       │                         │
       │◄── ws: {type:'text',     │                         │
       │      content:'好'}       │                         │
       │◄── ws: {type:'text',     │                         │
       │      content:'！'}       │                         │
       │◄── ws: {type:'finish'}   │                         │
       │                          │                         │


【场景 2: 用户 → 用户】

    用户 A                      服务端                    用户 B
       │                          │                         │
       │  ws.send({               │                         │
       │    type: 'send',         │                         │
       │    sessionId: 'xxx',     │                         │
       │    content: '你好'       │                         │
       │  })                      │                         │
       │ ────────────────────────►│                         │
       │                          │                         │
       │                          │── 存储消息              │
       │                          │── 转换为 UIMessage      │
       │                          │                         │
       │◄── ws: {                 │                         │
       │      type: 'message',    │  ← 确认已发送           │
       │      message: {...}      │                         │
       │    }                     │                         │
       │                          │                         │
       │                          │── 查找 B 的 WS 连接 ───►│
       │                          │                         │
       │                          │── ws.push({ ──────────►│
       │                          │    type: 'message',     │
       │                          │    from: 'A',           │
       │                          │    message: {...}       │
       │                          │  })                     │
       │                          │                         │


【场景 3: 群聊】

    用户 A                     服务端               用户 B      用户 C
       │                         │                    │           │
       │  ws.send({              │                    │           │
       │    type: 'send',        │                    │           │
       │    sessionId: 'group-1',│                    │           │
       │    content: '大家好'    │                    │           │
       │  })                     │                    │           │
       │ ───────────────────────►│                    │           │
       │                         │                    │           │
       │                         │── 存储消息         │           │
       │                         │── 获取群成员       │           │
       │                         │── 转换为 UIMessage │           │
       │                         │                    │           │
       │◄── ws: {type:'message'} │                    │           │
       │                         │                    │           │
       │                         │── ws.broadcast ───►│           │
       │                         │                    │           │
       │                         │── ws.broadcast ────────────────►│
       │                         │                    │           │
```

### Setup 初始化流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Setup 初始化 + 后端自动触发 AI 流                    │
└─────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────┐
    │   Setup 页面      │
    │  Step 1: 管理员   │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │   Setup 页面      │
    │  Step 2: 助理配置  │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────────────────┐
    │   Setup 页面                   │
    │  Step 3: 模型网关配置          │
    │  [完成设置] 按钮               │
    └─────────┬─────────────────────┘
              │ 点击完成
              ▼
    ┌───────────────────────────────┐
    │ POST /api/system/bootstrap    │
    │ {                             │
    │   admin: {...},               │
    │   assistant: {...},           │
    │   gateway: {...}              │
    │ }                             │
    │ (参数不变)                     │
    └─────────┬─────────────────────┘
              │
              ▼
    ┌───────────────────────────────┐
    │    initializeSystem 函数      │
    │  1. 创建管理员用户             │
    │  2. 创建 AI 助理用户           │
    │  3. 配置 LLM Provider         │
    │  4. 创建会话（用户 + AI 助理）  │
    │  5. 存储 "你好" 消息           │
    │  6. 调用 LLM 生成 AI 响应      │
    │  7. 存储 AI 响应消息           │
    └─────────┬─────────────────────┘
              │
              ▼
    ┌───────────────────────────────┐
    │ 返回: { sessionId }           │
    └─────────┬─────────────────────┘
              │
              ▼
    ┌───────────────────────────────┐
    │ 跳转到 /chat?sessionId=xxx    │
    │ 前端加载历史消息               │
    │ 显示 "你好" + AI 响应          │
    └───────────────────────────────┘
```

### HTTP API 流程 (保留)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POST /api/chat/session 详细流程 (保留)                  │
└─────────────────────────────────────────────────────────────────────────┘

    请求: { targetUserId }
              │
              ▼
    ┌───────────────────────────────┐
    │ 1. 验证用户身份 (session)     │
    └─────────┬─────────────────────┘
              │
              ▼
    ┌───────────────────────────────┐
    │ 2. 检查是否已有会话           │
    └─────────┬─────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
   ┌───────┐    ┌──────────┐
   │ 已有  │    │  新建    │
   │ 会话  │    │  会话    │
   └───┬───┘    └────┬─────┘
       │             │
       └──────┬──────┘
              │
              ▼
    ┌───────────────────────────────┐
    │ 返回会话信息                   │
    │ { session: {...} }            │
    └───────────────────────────────┘

注意: 消息发送通过 WebSocket 进行，HTTP API 仅负责会话创建
```

## WebSocket 消息协议

### 消息类型定义

```typescript
// 客户端 → 服务端
type ClientWSMessage =
  | { type: 'send'; sessionId?: string; targetUserId?: string; content: string }
  // sessionId 有: 发送到现有会话
  // sessionId 无: 创建新会话 (需要 targetUserId)，然后发送消息
  | { type: 'typing'; sessionId: string }
  | { type: 'read'; sessionId: string; messageId: string };

// 服务端 → 客户端
type ServerWSMessage =
  | { type: 'stream-chunk'; chatId: string; chunk: UIMessageChunk }
  | { type: 'message'; chatId: string; message: UIMessage; sessionId?: string }
  // sessionId 在新创建会话时返回
  | { type: 'typing'; chatId: string; userId: string }
  | { type: 'error'; code: string; message: string };

// UIMessage 格式 (AI SDK 标准)
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  parts?: MessagePart[];
}
```

### WebSocket 消息发送流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WebSocket send 消息处理流程                            │
└─────────────────────────────────────────────────────────────────────────┘

    { type: 'send', content, sessionId?, targetUserId? }
                         │
                         ▼
              ┌─────────────────────┐
              │ sessionId 是否存在? │
              └──────────┬──────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
      ┌─────────┐               ┌─────────────┐
      │  存在   │               │   不存在    │
      └────┬────┘               └──────┬──────┘
           │                           │
           │                           ▼
           │                  ┌──────────────────┐
           │                  │ 使用 targetUserId │
           │                  │ 创建新会话        │
           │                  └────────┬─────────┘
           │                           │
           └─────────────┬─────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ 存储用户消息         │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ 获取会话目标用户     │
              └──────────┬──────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │ AI 助理  │  │ 普通用户 │  │  群聊   │
      └────┬────┘  └────┬────┘  └────┬────┘
           │            │            │
           ▼            │            ▼
    ┌─────────────┐     │      ┌───────────┐
    │ 调用 LLM    │     │      │ 广播给    │
    │ 流式生成    │     │      │ 所有成员  │
    └──────┬──────┘     │      └───────────┘
           │            │
           ▼            ▼
    ┌─────────────────────────────┐
    │ 返回 stream-chunk 或 message │
    │ (如果是新会话，附带 sessionId)│
    └─────────────────────────────┘
```

## 代码实现参考

### 后端 WebSocket 处理

```typescript
// server/api/ws/chat.ts
import { convertToModelMessages, streamText, toUIMessageStream } from 'ai';
import { getLLM } from '~/server/utils/llm';

export default defineWebSocketHandler({
  open(peer) {
    const userId = getUserIdFromSession(peer);
    peer.data.userId = userId;
    peer.subscribe(`user:${userId}`);
  },

  async message(peer, message) {
    const data = JSON.parse(message.toString());
    const { type, sessionId, content } = data;

    if (type === 'send') {
      await handleMessageSend(peer, { sessionId, content });
    }
  },

  close(peer) {
    const userId = peer.data.userId;
    peer.unsubscribe(`user:${userId}`);
  },
});

async function handleMessageSend(peer, { sessionId, content }) {
  const senderId = peer.data.userId;

  // 1. 存储用户消息
  const userMessage = await saveMessage({
    sessionId,
    senderId,
    content,
    role: 'user',
  });

  // 2. 发送确认 (UIMessage 格式)
  peer.send(JSON.stringify({
    type: 'message',
    chatId: sessionId,
    message: userMessage,
  }));

  // 3. 获取会话信息判断类型
  const session = await getSessionWithTarget(sessionId, senderId);

  if (session.target.type === 'BOT') {
    // AI 助理 - 流式生成
    await streamAIResponse(peer, sessionId, userMessage);
  } else if (session.type === 'DIRECT') {
    // 普通用户私聊 - 推送给对方
    broadcastToUser(session.target.id, {
      type: 'message',
      chatId: sessionId,
      message: userMessage,
    });
  } else {
    // 群聊 - 广播
    await broadcastToGroup(sessionId, userMessage, senderId);
  }
}

async function streamAIResponse(peer, sessionId, userMessage) {
  const history = await getSessionMessages(sessionId);
  const model = getLLM();

  const result = streamText({
    model,
    messages: convertToModelMessages([
      ...history,
      { role: 'user', content: userMessage.content },
    ]),
  });

  // 流式推送
  for await (const chunk of result.toUIMessageStream()) {
    peer.send(JSON.stringify({
      type: 'stream-chunk',
      chatId: sessionId,
      chunk,
    }));
  }

  // 存储完整响应
  const fullResponse = await result.text;
  await saveMessage({
    sessionId,
    senderId: 'bot-id',
    content: fullResponse,
    role: 'assistant',
  });
}

function broadcastToUser(userId, data) {
  useEvent().context?.ws?.publish(`user:${userId}`, JSON.stringify(data));
}

async function broadcastToGroup(sessionId, message, excludeUserId) {
  const members = await getSessionMembers(sessionId);
  for (const member of members) {
    if (member.id !== excludeUserId) {
      broadcastToUser(member.id, {
        type: 'message',
        chatId: sessionId,
        message,
      });
    }
  }
}
```

### 前端 WebSocket Transport

```typescript
// composables/WebSocketChatTransport.ts
import { type ChatTransport, type UIMessage, type UIMessageChunk } from 'ai';

interface WebSocketChatTransportOptions {
  url: string;
}

export class WebSocketChatTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE> {

  private ws: WebSocket | null = null;
  private pendingStreams = new Map<string, {
    controller: ReadableStreamDefaultController<UIMessageChunk>;
    abortController: AbortController;
  }>();
  private messageCallbacks = new Set<(chatId: string, message: UIMessage) => void>();

  constructor(private options: WebSocketChatTransportOptions) {}

  private async connect(): Promise<WebSocket> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => resolve(this.ws!);
      this.ws.onerror = (err) => reject(err);

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = () => {
        this.ws = null;
        for (const [, stream] of this.pendingStreams) {
          stream.controller.error(new Error('WebSocket closed'));
        }
        this.pendingStreams.clear();
      };
    });
  }

  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    const { type, chatId, chunk, message } = data;

    switch (type) {
      case 'stream-chunk':
        const stream = this.pendingStreams.get(chatId);
        if (stream) {
          stream.controller.enqueue(chunk as UIMessageChunk);
          if (chunk.type === 'finish' || chunk.type === 'error') {
            stream.controller.close();
            this.pendingStreams.delete(chatId);
          }
        }
        break;

      case 'message':
        this.messageCallbacks.forEach(cb => cb(chatId, message));
        break;
    }
  }

  async sendMessages({
    chatId,
    messages,
  }: {
    chatId: string;
    messages: UI_MESSAGE[];
  }): Promise<ReadableStream<UIMessageChunk>> {
    const ws = await this.connect();
    const abortController = new AbortController();

    const stream = new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        this.pendingStreams.set(chatId, { controller, abortController });
      },
      cancel: () => {
        this.pendingStreams.delete(chatId);
        abortController.abort();
      },
    });

    const lastMessage = messages[messages.length - 1];
    ws.send(JSON.stringify({
      type: 'send',
      sessionId: chatId,
      content: lastMessage.content,
    }));

    return stream;
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }

  onIncomingMessage(callback: (chatId: string, message: UIMessage) => void) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
```

### 前端使用

```typescript
// composables/useChatClient.ts
export function useChatClient() {
  const transport = useState('chat-transport', () => {
    return new WebSocketChatTransport({
      url: `${useRuntimeConfig().public.wsUrl}/api/ws/chat`,
    });
  });

  const chat = useChat({
    transport: transport.value,
  });

  // 监听来自其他用户的消息
  onMounted(() => {
    transport.value.onIncomingMessage((chatId, message) => {
      // 处理新消息通知
      showNotification(message);
    });
  });

  return { chat, transport };
}
```

## Risks / Trade-offs

### 风险 1：WebSocket 连接管理复杂度
**风险**: WebSocket 需要处理连接、断线重连、心跳等
**缓解**:
- 实现自动重连机制
- 使用 HTTP API 作为降级方案
- 连接断开时提示用户

### 风险 2：初始化失败导致用户卡住
**风险**: 如果 initialMessage 发送失败，用户可能卡在中间状态
**缓解**:
- Setup 完成后先跳转，再建立 WebSocket 发送消息
- 发送失败时显示错误提示，允许重试

### 风险 3：并发会话创建
**风险**: 用户快速点击可能创建多个重复会话
**缓解**:
- 前端禁用重复提交
- 后端使用数据库唯一约束

### 风险 4：WebSocket 扩展性
**风险**: 多实例部署时 WebSocket 连接需要跨实例通信
**缓解**:
- 使用 Redis Pub/Sub 跨实例广播
- 或使用 Nitro 的内置跨实例通信

## Migration Plan

### 第一阶段：Setup 初始化优化
1. 修改 `POST /api/system/bootstrap` 返回 `{ sessionId, botId }`
2. 移除 `initializeSystem` 中的预创建会话逻辑
3. Setup 完成后跳转到聊天页面

### 第二阶段：WebSocket 基础设施
1. 实现 WebSocket 服务端 `/api/ws/chat`
2. 实现 `WebSocketChatTransport` 类
3. 添加连接管理和心跳机制

### 第三阶段：前端集成
1. 创建 `useChatClient` composable
2. 聊天页面切换到 WebSocket Transport
3. 聊天页面加载时自动发送默认消息 "你好"（首次进入时）

### 第四阶段：功能增强
1. 添加正在输入指示器
2. 添加消息已读状态
3. 优化断线重连体验

### 回滚策略
- 前端可快速切换回 DefaultChatTransport (HTTP)
- WebSocket 服务端可独立禁用
- 数据库无变更，无需数据迁移

## Open Questions

1. **WebSocket 认证方式？**
   - 建议：在 WebSocket 连接时通过 query 参数传递 session token

2. **断线重连策略？**
   - 建议：指数退避重连，最多 5 次

3. **群聊中 AI 响应触发方式？**
   - 建议：通过 @ 提及触发，后续迭代实现
