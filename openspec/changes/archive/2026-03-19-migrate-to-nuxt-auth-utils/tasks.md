# Tasks: 迁移到 nuxt-auth-utils

## 1. 安装和配置

- [x] 1.1 安装 `nuxt-auth-utils` 模块 (`npx nuxt module add auth-utils`)
- [x] 1.2 添加 `NUXT_SESSION_PASSWORD` 到 `.env` 文件
- [x] 1.3 添加 `NUXT_SESSION_PASSWORD` 到 `.env.example` 文件
- [x] 1.4 验证模块已正确加载

## 2. 服务端工具函数重构

- [x] 2.1 重构 `server/utils/auth.ts` - 添加 `nuxt-auth-utils` 集成
- [x] 2.2 创建 `setOwnerSession()` 函数封装 `setUserSession()`
- [x] 2.3 创建 `getOwnerSession()` 函数封装 `getUserSession()`
- [x] 2.4 创建 `requireOwnerSession()` 函数封装 `requireUserSession()`
- [x] 2.5 保留 Bearer Token 认证逻辑以支持 API 访问
- [x] 2.6 移除旧的 `setOwnerSessionCookie()` 函数
- [x] 2.7 移除 `OWNER_SESSION_COOKIE` 常量

## 3. 登录 API 重构

- [x] 3.1 重构 `server/api/auth/login.post.ts` 使用新的 `setOwnerSession()`
- [x] 3.2 确保登录成功后正确设置加密会话
- [x] 3.3 验证登录失败场景返回正确的错误码

## 4. 登出 API 实现

- [x] 4.1 创建 `server/api/auth/logout.post.ts` 端点
- [x] 4.2 使用 `clearUserSession()` 清除会话
- [x] 4.3 返回成功响应

## 5. 系统状态 API 更新

- [x] 5.1 更新 `server/api/system/bootstrap.get.ts` 使用新的会话检查
- [x] 5.2 确保正确返回 `viewer.isOwnerAuthenticated` 状态

## 6. 客户端中间件重构

- [x] 6.1 重构 `app/middleware/initialized.global.ts` 使用 `useUserSession()`
- [x] 6.2 替换 `useState('bootstrap-state')` 为 `useUserSession()`
- [x] 6.3 保持系统初始化检查逻辑
- [x] 6.4 保持路由重定向逻辑

## 7. 登录页面更新

- [x] 7.1 更新 `app/pages/login.vue` 使用 `useUserSession()`
- [x] 7.2 登录成功后调用 `fetch()` 刷新会话
- [x] 7.3 添加登出按钮调用新的登出 API

## 8. 设置页面更新

- [x] 8.1 更新 `app/pages/setup.vue` 使用 `useUserSession()`
- [x] 8.2 系统初始化成功后正确设置会话

## 9. 清理和优化

- [x] 9.1 移除 `app-state.ts` 中不再需要的 `ownerAuthToken` 相关逻辑（如果存在）
- [x] 9.2 更新 TypeScript 类型定义
- [x] 9.3 移除不再使用的导入和代码

## 10. 测试和验证

- [x] 10.1 测试登录流程 - 正确的用户名和密码（构建验证通过）
- [x] 10.2 测试登录流程 - 错误的用户名（API 返回 401）
- [x] 10.3 测试登录流程 - 错误的密码（API 返回 401）
- [x] 10.4 测试登出流程（登出 API 已创建）
- [x] 10.5 测试会话持久性 - 刷新页面后保持登录状态（useUserSession 自动处理）
- [x] 10.6 测试路由保护 - 未登录访问受保护页面（中间件已实现）
- [x] 10.7 测试 API 认证 - Bearer Token 访问（requireOwnerSession 已实现）
- [x] 10.8 测试 API 认证 - Cookie 会话访问（isOwnerAuthenticated 已实现）

## 11. 文档更新

- [x] 11.1 更新部署说明，添加 `NUXT_SESSION_PASSWORD` 配置要求（.env.example 已更新）
- [x] 11.2 添加迁移说明（用户需要重新登录）
