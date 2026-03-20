# Spec: User Authentication (Delta)

用户登录/登出流程，迁移到使用 `nuxt-auth-utils` 提供的 API。

## MODIFIED Requirements

### Requirement: 用户登录

系统 SHALL 允许用户通过用户名和密码登录，使用 `nuxt-auth-utils` 管理会话。

#### Scenario: 登录成功
- **WHEN** 用户提交正确的用户名和密码
- **THEN** 系统验证密码哈希
- **AND** 使用 `setUserSession()` 创建加密会话
- **AND** 返回用户信息

#### Scenario: 登录失败 - 错误的用户名
- **WHEN** 用户提交不存在的用户名
- **THEN** 系统返回 401 错误
- **AND** 错误信息为 "Invalid owner username."

#### Scenario: 登录失败 - 错误的密码
- **WHEN** 用户提交正确的用户名但错误的密码
- **THEN** 系统返回 401 错误
- **AND** 错误信息为 "Invalid password."

#### Scenario: 系统未初始化
- **WHEN** 系统尚未初始化
- **AND** 用户尝试登录
- **THEN** 系统返回 409 错误
- **AND** 错误信息为 "System is not initialized yet."

### Requirement: 用户登出

系统 SHALL 允许用户登出，清除会话。

#### Scenario: 登出成功
- **WHEN** 已登录用户调用登出 API
- **THEN** 系统使用 `clearUserSession()` 清除会话
- **AND** 返回成功响应

### Requirement: API 认证保护

系统 SHALL 保护需要认证的 API 端点。

#### Scenario: Cookie 认证访问受保护 API
- **WHEN** 已登录用户通过 Cookie 会话访问受保护 API
- **THEN** 系统通过 `requireUserSession()` 验证
- **AND** 允许访问

#### Scenario: Bearer Token 认证访问受保护 API
- **WHEN** 请求携带有效的 Bearer Token
- **THEN** 系统验证 Token 与用户 `apiSecret` 匹配
- **AND** 允许访问

#### Scenario: 未认证访问受保护 API
- **WHEN** 未认证用户访问受保护 API
- **THEN** 系统返回 401 错误
- **AND** 错误信息为 "Owner session is required."

### Requirement: 客户端路由保护

系统 SHALL 通过中间件保护需要认证的页面路由。

#### Scenario: 未登录访问受保护页面
- **WHEN** 未登录用户访问需要认证的页面
- **THEN** 系统重定向到登录页面

#### Scenario: 已登录访问登录页面
- **WHEN** 已登录用户访问 `/login` 或 `/setup` 页面
- **THEN** 系统重定向到 `/feed` 页面

#### Scenario: 系统未初始化访问
- **WHEN** 系统未初始化
- **AND** 用户访问非 `/setup` 页面
- **THEN** 系统重定向到 `/setup` 页面

### Requirement: 会话状态查询

系统 SHALL 提供查询当前会话状态的 API。

#### Scenario: 查询会话状态（已登录）
- **WHEN** 已登录用户调用 `/api/system/bootstrap`
- **THEN** 返回 `viewer.isOwnerAuthenticated` 为 `true`

#### Scenario: 查询会话状态（未登录）
- **WHEN** 未登录用户调用 `/api/system/bootstrap`
- **THEN** 返回 `viewer.isOwnerAuthenticated` 为 `false`
