# Spec: Session Management

基于 `nuxt-auth-utils` 的加密会话管理，使用 sealed cookies 存储会话数据。

## ADDED Requirements

### Requirement: 会话数据加密存储

系统 SHALL 使用加密的 sealed cookies 存储会话数据，防止客户端篡改。

#### Scenario: 会话 cookie 被加密
- **WHEN** 用户登录成功
- **THEN** 系统使用 `NUXT_SESSION_PASSWORD` 加密会话数据
- **AND** cookie 值对客户端不可读

#### Scenario: 篡改的 cookie 被拒绝
- **WHEN** 客户端发送被篡改的会话 cookie
- **THEN** 系统拒绝该会话
- **AND** 返回未认证状态

### Requirement: 服务端会话工具

系统 SHALL 提供以下服务端会话管理工具：

- `setUserSession(event, data)` - 设置用户会话
- `getUserSession(event)` - 获取用户会话
- `requireUserSession(event)` - 要求用户已登录（未登录抛出 401）
- `clearUserSession(event)` - 清除用户会话

#### Scenario: 设置用户会话
- **WHEN** 服务端调用 `setUserSession(event, { user: { id, username, nickname, role } })`
- **THEN** 系统在响应中设置加密的会话 cookie

#### Scenario: 获取用户会话
- **WHEN** 服务端调用 `getUserSession(event)`
- **THEN** 系统返回当前用户的会话数据
- **AND** 如果未登录则返回空对象

#### Scenario: 要求用户会话（已登录）
- **WHEN** 已登录用户访问受保护资源
- **AND** 服务端调用 `requireUserSession(event)`
- **THEN** 返回用户会话数据

#### Scenario: 要求用户会话（未登录）
- **WHEN** 未登录用户访问受保护资源
- **AND** 服务端调用 `requireUserSession(event)`
- **THEN** 抛出 401 Unauthorized 错误

### Requirement: 客户端会话 Composable

系统 SHALL 提供 `useUserSession()` composable 用于客户端会话管理。

#### Scenario: 获取登录状态
- **WHEN** 组件调用 `const { loggedIn } = useUserSession()`
- **THEN** `loggedIn` 是一个响应式布尔值，表示用户是否已登录

#### Scenario: 获取用户信息
- **WHEN** 组件调用 `const { user } = useUserSession()`
- **THEN** `user` 包含当前登录用户的信息（id, username, nickname, role）

#### Scenario: 刷新会话
- **WHEN** 组件调用 `const { fetch } = useUserSession()` 然后 `await fetch()`
- **THEN** 系统从服务端重新获取会话状态

#### Scenario: 清除会话（登出）
- **WHEN** 组件调用 `const { clear } = useUserSession()` 然后 `await clear()`
- **THEN** 系统清除客户端会话状态

### Requirement: 环境变量配置

系统 SHALL 通过 `NUXT_SESSION_PASSWORD` 环境变量配置会话加密密钥。

#### Scenario: 开发模式自动生成密钥
- **WHEN** 在开发模式下运行
- **AND** `NUXT_SESSION_PASSWORD` 未设置
- **THEN** 系统自动生成并设置临时密钥

#### Scenario: 生产环境必须配置密钥
- **WHEN** 在生产环境下运行
- **AND** `NUXT_SESSION_PASSWORD` 未设置或长度不足 32 字符
- **THEN** 系统启动时报错

### Requirement: 会话数据结构

系统 SHALL 支持以下会话数据结构：

```typescript
interface UserSession {
  user: {
    id: string;
    username: string;
    nickname: string;
    role: string;
  };
  secure?: {
    apiSecret: string;
  };
}
```

#### Scenario: 用户数据可访问
- **WHEN** 用户已登录
- **THEN** `user` 字段在客户端和服务端都可访问

#### Scenario: 安全数据仅服务端可访问
- **WHEN** 访问 `secure` 字段
- **THEN** 仅在服务端可访问
- **AND** 客户端访问返回 `undefined`
