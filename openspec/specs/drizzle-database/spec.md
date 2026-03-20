# Drizzle Database

Drizzle ORM 数据库层规范，定义数据库配置、连接管理和 schema 结构。

## ADDED Requirements

### Requirement: 数据库连接管理

系统 SHALL 使用 Drizzle ORM 管理 PostgreSQL 数据库连接，并支持开发环境单例模式。

#### Scenario: 开发环境单例连接
- **WHEN** 在开发环境中多次导入 db 客户端
- **THEN** 系统返回同一个数据库连接实例

#### Scenario: 生产环境独立连接
- **WHEN** 在生产环境中
- **THEN** 每个请求使用独立的数据库连接池

### Requirement: Schema 定义结构

系统 SHALL 在 `server/database/` 目录下组织 schema 定义。

#### Scenario: Schema 文件组织
- **WHEN** 开发者查看数据库结构
- **THEN** 可以在 `server/database/schema.ts` 找到所有表定义
- **AND** 可以在 `server/database/relations.ts` 找到所有关联关系

#### Scenario: Schema 自动导入
- **WHEN** 在 server 代码中需要使用数据库
- **THEN** 可以通过 Nuxt 自动导入直接使用 `db` 实例

### Requirement: PostgreSQL 驱动配置

系统 SHALL 使用 `postgres.js` 作为 Drizzle 的底层驱动。

#### Scenario: 连接字符串配置
- **WHEN** 应用启动时
- **THEN** 系统从 `DATABASE_URL` 环境变量读取数据库连接配置

#### Scenario: 驱动类型支持
- **WHEN** 执行数据库查询时
- **THEN** 系统使用 `drizzle-orm/postgres-js` 驱动

### Requirement: pgvector 扩展支持

系统 SHALL 支持 pgvector 扩展，为向量搜索功能预留能力。

#### Scenario: vector 类型字段定义
- **WHEN** 需要存储向量数据（如 embedding）
- **THEN** 系统支持定义 `vector(N)` 类型的字段，N 为向量维度

#### Scenario: 扩展启用验证
- **WHEN** 应用启动时
- **THEN** 系统可以验证 pgvector 扩展是否已启用

### Requirement: 数据库迁移命令

系统 SHALL 提供数据库 schema 同步命令。

#### Scenario: 推送 schema 到数据库
- **WHEN** 开发者运行 `db:push` 命令
- **THEN** 系统将 schema 定义同步到数据库，创建或更新表结构

#### Scenario: 生成迁移文件（可选）
- **WHEN** 开发者运行 `db:generate` 命令
- **THEN** 系统生成 SQL 迁移文件到 `drizzle/` 目录

#### Scenario: Drizzle Studio 可视化
- **WHEN** 开发者运行 `db:studio` 命令
- **THEN** 系统启动 Drizzle Studio 可视化工具

### Requirement: 类型安全查询

系统 SHALL 提供完整的 TypeScript 类型安全支持。

#### Scenario: 查询结果类型推断
- **WHEN** 执行数据库查询时
- **THEN** TypeScript 自动推断返回值的类型

#### Scenario: 关联查询类型支持
- **WHEN** 使用 relational query API 查询关联数据时
- **THEN** TypeScript 提供完整的关联类型推断
