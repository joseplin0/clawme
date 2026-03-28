# AI SDK 和 WebSocket

这份文档是外部参考入口，不代表当前项目的最终实现方案。

## 参考来源

- CSDN: <https://blog.csdn.net/gitblog_00229/article/details/150966681>
- AI SDK 5.0 Chat Transport 架构:
  <https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0>

## 用途说明

- 作为 AI SDK `ChatTransport` 与 WebSocket 通信模式的外部背景资料。
- 用于帮助理解传输层抽象、流式分块、重连与错误恢复的设计思路。
- 不作为当前仓库 `app/composables/WebSocketChatTransport.ts` 与 `server/api/ws/chat.ts` 的实现依据。

## 当前项目文档

请改看当前方案文档：

- [WEBSOCKET_CHAT.md](../WEBSOCKET_CHAT.md)
