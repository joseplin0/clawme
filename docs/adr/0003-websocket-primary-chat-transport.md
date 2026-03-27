# ADR-0003: WebSocket 作为主聊天传输层，HTTP 流式接口保留

- Status: Accepted
- Date: 2026-03-27

## Context

项目早期规划强调 SSE/HTTP 流式聊天，但当前实现已经存在：

- 基于 AI SDK `ChatTransport` 的 WebSocket 传输层
- 输入态、已读、会话确认等实时能力
- 仍保留的 HTTP 流式聊天接口

需要明确哪条链路是主链路，避免后续重复建设。

## Decision

将 WebSocket 视为当前主聊天传输层：

- 聊天页实时交互优先走 `WS /api/ws/chat`
- assistant 生成统一收敛到 `server/ecosystem/core/AssistantInstant.ts`
- `POST /api/chat/session/[id]` 作为保留接口继续存在，用于兼容、调试或非 WebSocket 场景

## Consequences

- 实时交互能力集中在一条主链路上，输入态和会话创建确认更自然。
- HTTP 接口仍可作为补充能力，不需要被立即删除。
- 未来若继续演进聊天系统，应优先围绕 WebSocket 主链路扩展，而不是重新把 HTTP 流式接口当主入口。

## Alternatives Considered

### 继续以 HTTP/SSE 作为主链路

难以自然承载输入态、已读和统一实时事件，不适合作为当前交互主入口。

### 只保留 WebSocket，删除 HTTP 接口

结构更纯粹，但会降低兼容性与调试便利性，当前没必要立即收紧。

