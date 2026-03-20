# Spec: WebAuthn Authentication

WebAuthn/Passkeys 无密码认证支持，允许用户使用生物识别或硬件密钥登录。

## ADDED Requirements

### Requirement: WebAuthn 注册

系统 SHALL 支持用户注册 WebAuthn 凭据。

#### Scenario: 发起 WebAuthn 注册
- **WHEN** 已登录用户请求注册 Passkey
- **THEN** 系统生成 WebAuthn 注册挑战
- **AND** 返回给客户端进行认证器注册

#### Scenario: 完成 WebAuthn 注册
- **WHEN** 用户完成认证器注册流程
- **THEN** 系统存储凭据信息
- **AND** 关联到用户账户

### Requirement: WebAuthn 登录

系统 SHALL 支持用户使用 WebAuthn 凭据登录。

#### Scenario: 发起 WebAuthn 登录
- **WHEN** 用户选择使用 Passkey 登录
- **THEN** 系统生成 WebAuthn 认证挑战
- **AND** 返回给客户端

#### Scenario: 完成 WebAuthn 登录
- **WHEN** 用户使用认证器完成认证
- **THEN** 系统验证凭据
- **AND** 创建用户会话
- **AND** 重定向到应用主页

### Requirement: WebAuthn 兼容性检测

系统 SHALL 检测浏览器对 WebAuthn 的支持。

#### Scenario: 浏览器支持 WebAuthn
- **WHEN** 用户浏览器支持 WebAuthn
- **THEN** 登录页面显示 Passkey 登录选项

#### Scenario: 浏览器不支持 WebAuthn
- **WHEN** 用户浏览器不支持 WebAuthn
- **THEN** 登录页面隐藏 Passkey 登录选项
- **AND** 显示传统登录方式

### Requirement: 多凭据管理

系统 SHALL 支持用户管理多个 WebAuthn 凭据。

#### Scenario: 查看已注册凭据
- **WHEN** 用户访问安全设置页面
- **THEN** 显示所有已注册的 Passkey 列表

#### Scenario: 删除凭据
- **WHEN** 用户删除某个 Passkey
- **THEN** 系统移除该凭据
- **AND** 用户无法再使用该凭据登录

### Requirement: 默认禁用 WebAuthn

系统 SHALL 默认禁用 WebAuthn 功能。

#### Scenario: 未启用时不显示选项
- **WHEN** WebAuthn 功能未启用
- **THEN** 不显示任何 Passkey 相关选项

#### Scenario: 启用后显示选项
- **WHEN** 通过配置启用 WebAuthn
- **THEN** 登录页面显示 Passkey 登录选项
