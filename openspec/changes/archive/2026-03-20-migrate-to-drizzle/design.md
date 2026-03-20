# Prisma to Drizzle ORM 迁移 - 技术设计

## Context

### 当前状态
- 使用 Prisma ORM 作为数据库层
- PostgreSQL 17.x (Docker 部署)
- Schema 包含 15+ models，多个 enum 和关联关系
- 已预留 `vector(1536)` 字段用于 embedding（注释状态）

### 约束
- 数据库数据可清空，无需数据迁移
- 需保持现有 API 接口不变
- 需为后续 pgvector 集成做准备

### 相关方
- 开发者：需要适应新的 Drizzle API
- 运维：需要更换 PostgreSQL 镜像

## Goals / Non-Goals

**Goals:**
- 完成从 Prisma 到 Drizzle 的完整迁移
- 保持所有现有功能正常运行
- 建立清晰的 schema 定义结构
- 配置好 pgvector 扩展为后续使用做准备

**Non-Goals:**
- 本阶段不实现向量搜索功能（仅预留字段）
- 不优化现有查询性能
- 不修改 API 接口设计

## Decisions

### 1. Drizzle 驱动选择

**决策**: 使用 `postgres.js` 作为驱动（`drizzle-orm/postgres-js`）

**备选方案**:
- `drizzle-orm/node-postgres` (pg): 更成熟但性能略低
- `drizzle-orm/postgres-js`: 更轻量、更快、支持 edge runtime

**理由**: postgres.js 更轻量，冷启动更快，与项目未来可能的 serverless 部署方向一致。

### 2. Schema 文件组织

**决策**: 采用单文件 schema + 分离的 relations 定义

```
server/database/
├── schema.ts      # 所有表定义
├── relations.ts   # 所有关联关系
└── index.ts       # 导出汇总
```

**备选方案**:
- 按 domain 分文件 (users.ts, posts.ts, etc.)
- 单文件包含所有内容

**理由**: 项目规模中等，单文件便于维护和全局查看。分离 relations 可避免循环依赖。

### 3. 数据库客户端管理

**决策**: 在 `server/utils/db.ts` 中创建单例，利用 Nuxt 自动导入

```typescript
// server/utils/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

const connectionString = process.env.DATABASE_URL!

// 开发环境单例模式
const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined
  db: ReturnType<typeof drizzle> | undefined
}

export const client = globalForDb.client ?? postgres(connectionString)
export const db = globalForDb.db ?? drizzle(client, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client
  globalForDb.db = db
}
```

**理由**: Nuxt 自动导入 `server/utils` 下的模块，符合现有项目模式。

### 4. 迁移策略

**决策**: 使用 `drizzle-kit push` 进行 schema 同步，不使用 migrations 文件

**备选方案**:
- `drizzle-kit generate` + `drizzle-kit migrate`: 生成迁移文件
- `drizzle-kit push`: 直接推送 schema 到数据库

**理由**:
- 当前数据可清空，无历史负担
- 开发阶段 push 更快速迭代
- 后续生产环境可切换到 migrations

### 5. pgvector 字段定义

**决策**: 使用 `customType` 定义 vector 类型

```typescript
// server/database/schema.ts
import { customType } from 'drizzle-orm/pg-core'

const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; notNull: false; default: false }>({
    dataType() {
      return `vector(${dimensions})`
    },
  })(name)

// FeedPost 表
export const feedPosts = pgTable('FeedPost', {
  // ...
  embedding: vector('embedding', 1536),
})
```

**理由**: Drizzle 原生支持 customType，可无缝扩展 pgvector。

## Risks / Trade-offs

### 风险 1: 查询 API 差异导致遗漏
**风险**: Prisma 和 Drizzle 查询 API 差异较大，可能遗漏某些查询的迁移
**缓解**:
- 列出所有使用 prisma 的文件
- 逐个文件检查和迁移
- 运行完整测试覆盖

### 风险 2: 关联查询行为差异
**风险**: Drizzle 的关联查询方式与 Prisma 不同
**缓解**:
- 使用 relational query API 保持类似 Prisma 的体验
- 仔细测试所有关联查询场景

### 风险 3: JSON 字段类型处理
**风险**: Drizzle 对 JSON 字段的类型推断可能与 Prisma 不同
**缓解**:
- 显式定义 JSON 字段的 TypeScript 类型
- 必要时使用 type assertion

### Trade-off: 无迁移历史
**权衡**: 使用 push 而非 migrations
**影响**: 无法追踪历史变更，不适合团队协作的生产环境
**接受理由**: 当前为开发阶段，后续可切换

## Migration Plan

### Phase 1: 基础设施准备
1. 更换 PostgreSQL 镜像为 `pgvector/pgvector:pg17`
2. 启用 pgvector 扩展
3. 安装 Drizzle 依赖

### Phase 2: Schema 转换
1. 创建 `server/database/schema.ts`
2. 创建 `server/database/relations.ts`
3. 创建 `drizzle.config.ts`

### Phase 3: 客户端重构
1. 创建 `server/utils/db.ts`
2. 查找所有 `prisma` 引用
3. 逐个迁移到 `db`

### Phase 4: 清理
1. 移除 Prisma 相关文件和依赖
2. 更新 package.json scripts
3. 测试验证

### 回滚策略
- 保留 `prisma/schema.prisma` 备份
- 记录原始依赖版本
- 如需回滚，恢复备份文件并重装依赖

## Open Questions

1. ~~是否需要保留 migrations 历史?~~ → 决定: 开发阶段不需要
2. ~~vector 字段是否立即启用?~~ → 决定: 仅定义字段，暂不使用
3. 是否需要添加 Drizzle Studio 作为开发工具? (可选)
