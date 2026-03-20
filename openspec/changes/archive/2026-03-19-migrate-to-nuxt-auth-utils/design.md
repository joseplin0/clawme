# Design: 迁移到 nuxt-auth-utils

## Context

### 当前认证架构

项目当前使用自建的认证系统，主要特点：

1. **会话管理**：通过 HTTP-only cookie (`clawme_owner_token`) 存储认证令牌
2. **令牌生成**：使用 `randomBytes(24).toString("hex")` 生成 API 密钥
3. **密码存储**：使用 SHA256 哈希存储密码
4. **认证检查**：支持 Bearer Token 和 Cookie 两种方式
5. **状态管理**：客户端使用 `useState('bootstrap-state')` 维护认证状态

### 涉及文件

| 文件 | 作用 |
|------|------|
| `server/utils/auth.ts` | 认证工具函数（isOwnerAuthenticated, requireOwnerSession, setOwnerSessionCookie） |
| `server/api/auth/login.post.ts` | 登录 API |
| `server/api/system/bootstrap.get.ts` | 系统状态 API，返回认证信息 |
| `server/utils/app-state.ts` | 应用状态管理，包含 hashPassword |
| `app/middleware/initialized.global.ts` | 全局路由中间件，检查认证状态 |

### 约束

- 保持现有的 API 端点路径不变
- 保持现有的页面路由不变
- User 模型和数据库结构不变
- 系统仍是单用户（主理人）模式

## Goals / Non-Goals

**Goals:**

1. 使用 `nuxt-auth-utils` 替代自建的会话管理
2. 使用加密的 sealed cookies 存储会话数据
3. 保持现有的登录流程和用户体验
4. 为未来的 OAuth 集成预留扩展点

**Non-Goals:**

1. 不在此次迁移中实现 OAuth 登录（仅预留配置）
2. 不实现 WebAuthn/Passkeys（仅预留扩展点）
3. 不改变现有的密码哈希方式（保持 SHA256 兼容）
4. 不修改 User 模型结构

## Decisions

### 1. 会话数据结构

**决策**：使用 `nuxt-auth-utils` 的 `setUserSession()` 存储最小化的用户信息

**会话数据**：
```typescript
{
  user: {
    id: string,        // 用户 ID
    username: string,  // 用户名
    nickname: string,  // 昵称
    role: string       // 角色（OWNER）
  },
  secure: {
    apiSecret: string  // API 密钥，用于 API 认证
  }
}
```

**理由**：
- 保持与现有 `apiSecret` 的兼容性
- 最小化会话数据，减少 cookie 大小
- `secure` 字段仅在服务端可访问

**替代方案**：
- ❌ 在会话中存储完整的用户信息：cookie 过大，增加网络开销
- ❌ 完全依赖数据库查询：每次请求都需要查询数据库

### 2. 密码验证策略

**决策**：保持现有的 SHA256 密码哈希，不使用 bcrypt

**理由**：
- 避免强制用户重置密码
- 保持数据库中现有 `passwordHash` 字段的兼容性
- SHA256 对于单用户系统足够安全

**替代方案**：
- ❌ 迁移到 bcrypt：需要用户重置密码，影响用户体验
- ❌ 迁移到 argon2：同上，且增加依赖

### 3. API 认证兼容性

**决策**：保持 Bearer Token 认证支持，与 Cookie 会话并行

**实现方式**：
- Cookie 认证：使用 `nuxt-auth-utils` 的 `getUserSession()`
- Bearer Token 认证：继续从 `authorization` header 提取并验证 `apiSecret`

**理由**：
- API 访问需要 Bearer Token
- 浏览器访问使用 Cookie 会话
- 两种方式都验证同一个 `apiSecret`

### 4. 中间件重构策略

**决策**：使用 `useUserSession()` 替代 `useState('bootstrap-state')`

**变更**：
```typescript
// Before
const bootstrap = useState<PublicStateResponse | null>('bootstrap-state', () => null);

// After
const { loggedIn, user } = useUserSession();
```

**理由**：
- `nuxt-auth-utils` 提供的类型安全的 composable
- 自动处理会话刷新
- 与服务端会话同步

### 5. OAuth 配置预留

**决策**：添加 OAuth 配置但默认禁用

**配置结构**（nuxt.config.ts）：
```typescript
auth: {
  // OAuth providers 可按需启用
  // github: { clientId: '...', clientSecret: '...' },
  // google: { clientId: '...', clientSecret: '...' },
}
```

**理由**：
- 为未来扩展预留
- 不影响当前的密码登录流程

## Risks / Trade-offs

### 风险 1：现有会话失效

**风险**：迁移后，已登录用户的 cookie 将失效

**缓解措施**：
- 迁移是向后不兼容的，用户需要重新登录
- 在部署说明中明确指出这一点
- 选择低流量时段部署

### 风险 2：环境变量配置

**风险**：`NUXT_SESSION_PASSWORD` 未正确配置导致会话无法加密

**缓解措施**：
- 在 `.env.example` 中添加示例
- 开发模式下自动生成
- 部署检查清单中包含此项

### 风险 3：Cookie 大小限制

**风险**：会话数据过大导致 cookie 超出浏览器限制（4KB）

**缓解措施**：
- 保持会话数据最小化
- 仅存储必要的用户信息
- 定期审查会话数据大小

## Migration Plan

### Phase 1：安装和配置

1. 安装 `nuxt-auth-utils` 模块
2. 配置 `NUXT_SESSION_PASSWORD` 环境变量
3. 更新 `nuxt.config.ts` 添加模块

### Phase 2：服务端迁移

1. 重构 `server/utils/auth.ts`：
   - 使用 `setUserSession()` 替代 `setOwnerSessionCookie()`
   - 使用 `getUserSession()` / `requireUserSession()` 替代 `isOwnerAuthenticated()`
   - 保留 Bearer Token 认证逻辑

2. 重构 `server/api/auth/login.post.ts`：
   - 使用 `setUserSession()` 设置会话

3. 更新 `server/api/system/bootstrap.get.ts`：
   - 使用 `getUserSession()` 检查认证状态

### Phase 3：客户端迁移

1. 重构 `app/middleware/initialized.global.ts`：
   - 使用 `useUserSession()` 替代 `useState('bootstrap-state')`

2. 添加 `app/middleware/auth.ts`（可选）：
   - 使用 `defineNuxtRouteMiddleware()` 保护特定路由

### Phase 4：清理

1. 移除不再需要的代码：
   - `setOwnerSessionCookie()` 函数
   - `OWNER_SESSION_COOKIE` 常量
   - 相关的 cookie 管理代码

2. 更新文档和部署说明

### Rollback Strategy

如果迁移后出现问题：

1. 回滚代码到迁移前的 commit
2. 用户需要重新登录（cookie 已失效）
3. 数据库无变化，无需回滚数据

## Open Questions

1. **是否需要添加登出 API？**
   - 当前没有明确的 `/api/auth/logout` 端点
   - `nuxt-auth-utils` 提供 `clearUserSession()` 可以轻松实现
   - **建议**：添加 `/api/auth/logout.post.ts`

2. **会话过期时间如何设置？**
   - 默认情况下 `nuxt-auth-utils` 会话在浏览器关闭后失效
   - 可以通过配置设置更长的过期时间
   - **建议**：使用默认配置，后续按需调整
