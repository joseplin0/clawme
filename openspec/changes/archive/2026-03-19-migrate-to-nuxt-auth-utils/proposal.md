# Proposal: 迁移到 nuxt-auth-utils

## Why

当前项目使用自建的认证系统，虽然功能基本满足需求，但存在以下问题：

1. **安全性维护成本**：自建系统需要自己负责安全更新和漏洞修复
2. **缺乏 OAuth 支持**：无法集成第三方登录（Google、GitHub 等）
3. **缺乏现代认证方式**：不支持 WebAuthn/Passkeys
4. **会话管理不够健壮**：当前使用简单的 cookie 机制，缺乏加密保护

`nuxt-auth-utils` 是 Nuxt 官方推荐的认证模块，提供加密的 sealed cookies、OAuth 集成、WebAuthn 支持等特性，可以显著提升安全性和可维护性。

## What Changes

### 新增

- 安装并配置 `nuxt-auth-utils` 模块
- 添加 OAuth 提供商支持（可选配置）
- 引入 `useUserSession()` composable 替代现有的 `useState('bootstrap-state')`
- 服务端使用 `setUserSession()` 和 `requireUserSession()` 工具函数

### 修改

- 重构 `/api/auth/login` 使用 `setUserSession()` 设置会话
- 重构 `/api/system/bootstrap` 返回用户会话信息
- 更新 `initialized.global.ts` 中间件使用 `useUserSession()`
- 更新 `/login` 页面使用新的会话管理 API
- 更新 `/setup` 页面使用新的会话管理 API

### 移除

- 移除自建的 cookie 管理代码
- 移除 `useState('bootstrap-state')` 相关代码

## Capabilities

### New Capabilities

- `session-management`: 基于 nuxt-auth-utils 的加密会话管理，支持 sealed cookies
- `oauth-authentication`: OAuth 第三方登录支持（Google、GitHub 等），可按需启用
- `webauthn-authentication`: WebAuthn/Passkeys 无密码认证支持

### Modified Capabilities

- `user-authentication`: 用户登录/登出流程，迁移到使用 nuxt-auth-utils 提供的 API

## Impact

### 受影响的代码

- `nuxt.config.ts` - 添加 auth-utils 模块配置
- `server/api/auth/login.post.ts` - 重构登录逻辑
- `server/api/auth/logout.post.ts` - 重构登出逻辑
- `server/api/system/bootstrap.get.ts` - 更新会话状态返回
- `server/middleware/initialized.global.ts` - 使用新的会话检查方式
- `app/pages/login.vue` - 使用 `useUserSession()`
- `app/pages/setup.vue` - 使用 `useUserSession()`
- `app/middleware/auth.ts` - 使用 `useUserSession()` 保护路由

### 新增依赖

- `nuxt-auth-utils` - Nuxt 官方认证模块
- `zod` - 用于请求体验证（如尚未安装）

### 环境变量

- `NUXT_SESSION_PASSWORD` - 会话加密密钥（至少 32 字符）

### 兼容性

- 现有的 User 模型和数据库结构保持不变
- 现有的 API 端点路径保持不变
- 现有的页面路由保持不变
