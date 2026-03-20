# Spec: OAuth Authentication

OAuth 第三方登录支持，允许用户通过外部身份提供商登录。

## ADDED Requirements

### Requirement: OAuth 提供商配置

系统 SHALL 支持通过配置启用 OAuth 提供商。

#### Scenario: 配置 GitHub OAuth
- **WHEN** 在 `nuxt.config.ts` 中配置 GitHub OAuth
  ```typescript
  auth: {
    github: {
      clientId: '...',
      clientSecret: '...'
    }
  }
  ```
- **THEN** 系统启用 GitHub 登录功能

#### Scenario: 配置 Google OAuth
- **WHEN** 在 `nuxt.config.ts` 中配置 Google OAuth
  ```typescript
  auth: {
    google: {
      clientId: '...',
      clientSecret: '...'
    }
  }
  ```
- **THEN** 系统启用 Google 登录功能

### Requirement: OAuth 登录流程

系统 SHALL 提供标准 OAuth 2.0 授权码流程。

#### Scenario: 发起 OAuth 登录
- **WHEN** 用户点击 OAuth 登录按钮
- **THEN** 系统重定向到 OAuth 提供商授权页面

#### Scenario: OAuth 回调处理
- **WHEN** OAuth 提供商回调到系统
- **AND** 授权成功
- **THEN** 系统获取用户信息
- **AND** 创建或更新用户会话
- **AND** 重定向到应用主页

#### Scenario: OAuth 授权失败
- **WHEN** 用户在 OAuth 提供商页面取消授权
- **THEN** 系统重定向到登录页面
- **AND** 显示错误信息

### Requirement: OAuth 用户信息映射

系统 SHALL 将 OAuth 提供商的用户信息映射到系统用户模型。

#### Scenario: 首次 OAuth 登录创建用户
- **WHEN** 用户首次通过 OAuth 登录
- **THEN** 系统创建新的用户记录
- **AND** 从 OAuth 提供商获取的用户信息填充用户资料

#### Scenario: 后续 OAuth 登录更新会话
- **WHEN** 用户再次通过同一 OAuth 提供商登录
- **THEN** 系统更新用户会话
- **AND** 可选更新用户资料

### Requirement: 默认禁用 OAuth

系统 SHALL 默认禁用所有 OAuth 提供商。

#### Scenario: 未配置 OAuth 时隐藏登录选项
- **WHEN** 没有配置任何 OAuth 提供商
- **THEN** 登录页面不显示 OAuth 登录选项

#### Scenario: 配置 OAuth 后显示登录选项
- **WHEN** 配置了至少一个 OAuth 提供商
- **THEN** 登录页面显示对应的 OAuth 登录按钮
