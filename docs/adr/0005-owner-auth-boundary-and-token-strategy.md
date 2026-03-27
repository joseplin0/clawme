# ADR-0005: 统一 Owner 鉴权边界，并引入 JWT 作为非 Cookie 客户端凭证

- Status: Accepted
- Date: 2026-03-27

## Context

当前系统已经同时存在多种 Owner 访问场景：

- 浏览器管理端依赖登录 session
- WebSocket 聊天连接需要在 upgrade 阶段识别当前 Owner
- 非 Cookie 客户端需要一种可编程的 Bearer 凭证
- 历史上已经存在基于 `apiSecret` 的 Bearer 访问方式

如果不明确这些能力的边界，后续很容易在接口层重复实现鉴权逻辑，或让协作者误以为不同入口使用不同身份模型。

## Decision

统一 Owner 鉴权边界，所有 Owner 入口使用同一套身份解析规则：

- 浏览器场景优先使用 session
- 非 Cookie 客户端优先使用 JWT Bearer Token
- 保留 `apiSecret` Bearer 作为兼容兜底能力

解析顺序固定为：

- session
- JWT Bearer Token
- `apiSecret` Bearer

同时约束以下行为：

- `POST /api/auth/login` 在建立 session 后，可在 `JWT_SECRET` 已配置时返回 JWT，供非 Cookie 客户端使用
- WebSocket upgrade 与 HTTP API 复用同一套 Owner 身份解析逻辑
- `/api/*` 默认视为受保护接口，公开接口通过白名单显式放行
- `JWT_SECRET` 未配置时，系统退化为仅支持 session 和 `apiSecret` Bearer

## Consequences

- Owner 鉴权入口被统一到一条清晰链路上，HTTP 和 WebSocket 不再各自维护一套规则。
- 浏览器端和程序化客户端都有明确的首选认证方式，降低接入歧义。
- `apiSecret` 仍然可用，兼容现有 Bearer 调用方，但长期需要警惕其作为永久凭证带来的管理成本。
- 新增公开 API 时，必须显式维护白名单，否则默认受保护。
- JWT 是否启用由 `JWT_SECRET` 控制，部署环境需要清楚这一开关的含义。

## Alternatives Considered

### 只保留 session

浏览器场景简单，但不适合 WebSocket upgrade 和非 Cookie 客户端，不满足程序化访问需求。

### 只保留 `apiSecret` Bearer

实现最直接，但把长期静态密钥当成统一客户端凭证，扩展性和安全边界都较弱。

### 立即完全切换到 JWT，移除 `apiSecret`

模型更统一，但会直接破坏已有 Bearer 调用方；当前保留兼容层更稳妥。
