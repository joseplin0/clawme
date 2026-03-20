# Prisma to Drizzle ORM 迁移

## Why

当前项目使用 Prisma ORM，但后续需要接入 pgvector 进行向量搜索（AI embedding 场景）。Drizzle ORM 对 pgvector 有更成熟的原生支持，且具有更小的 bundle size、更快的冷启动性能，更适合 serverless/edge 部署场景。现在数据库数据可以清空，是迁移的最佳时机。

## What Changes

- **BREAKING** 移除 Prisma ORM 相关依赖和配置（`@prisma/client`、`prisma`、`schema.prisma`）
- 新增 Drizzle ORM 依赖（`drizzle-orm`、`drizzle-kit`、`postgres`）
- 新增 `drizzle.config.ts` 配置文件
- 将 `prisma/schema.prisma` 转换为 `server/database/schema.ts`（TypeScript 原生 schema 定义）
- 重构所有使用 Prisma Client 的代码，改用 Drizzle ORM 查询 API
- 更新 `package.json` 中的数据库相关脚本命令
- 新增 `server/utils/db.ts` 用于 Drizzle 客户端单例
- 为后续 pgvector 支持预留 `vector` 类型字段

## Capabilities

### New Capabilities

- `drizzle-database`: Drizzle ORM 数据库层配置、连接管理、schema 定义

### Modified Capabilities

- `user-authentication`: 用户认证相关数据库操作从 Prisma 迁移到 Drizzle（无需求变更，仅实现层变更）
- `session-management`: 会话管理相关数据库操作从 Prisma 迁移到 Drizzle（无需求变更，仅实现层变更）
- `oauth-authentication`: OAuth 认证相关数据库操作从 Prisma 迁移到 Drizzle（无需求变更，仅实现层变更）
- `webauthn-authentication`: WebAuthn 认证相关数据库操作从 Prisma 迁移到 Drizzle（无需求变更，仅实现层变更）

## Impact

### 依赖变更
- 移除: `@prisma/client`、`prisma`
- 新增: `drizzle-orm`、`drizzle-kit`、`postgres`

### 代码变更
- `prisma/schema.prisma` → `server/database/schema.ts`
- `server/utils/db.ts` - 数据库客户端初始化逻辑
- 所有 `server/api/**/*.ts` 中的数据库查询
- `package.json` scripts 中的 `db:*` 命令

### 数据库
- PostgreSQL 镜像从 `postgres:17` 切换到 `pgvector/pgvector:pg17`
- 需要执行 `CREATE EXTENSION IF NOT EXISTS vector;` 启用扩展
