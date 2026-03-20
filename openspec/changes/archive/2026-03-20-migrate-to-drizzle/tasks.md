# Prisma to Drizzle ORM 迁移 - 任务清单

## 1. 基础设施准备

- [x] 1.2 启动新容器并启用 pgvector 扩展 (`CREATE EXTENSION IF NOT EXISTS vector;`)
- [x] 1.3 安装 Drizzle 依赖: `drizzle-orm`、`drizzle-kit`、`postgres`
- [x] 1.4 创建 `drizzle.config.ts` 配置文件

## 2. Schema 转换

- [x] 2.1 创建 `server/database/schema.ts` - 定义所有表结构
- [x] 2.2 定义所有 enum 类型 (UserType, TriggerType, AttachmentType, SessionType, ParticipantRole, MessageRole, MessageStatus)
- [x] 2.3 定义 vector 自定义类型 (用于 pgvector)
- [x] 2.4 创建 `server/database/relations.ts` - 定义所有表关联关系
- [x] 2.5 创建 `server/database/index.ts` - 导出汇总

## 3. 数据库客户端重构

- [x] 3.1 重写 `server/utils/db.ts` - 使用 Drizzle 客户端
- [x] 3.2 实现 dev 环境单例模式

## 4. API 迁移

- [x] 4.1 迁移 `server/utils/app-state.ts`
- [x] 4.2 迁移 `server/utils/auth.ts`
- [x] 4.3 迁移 `server/api/auth/login.post.ts`
- [x] 4.4 迁移 `server/api/system/bootstrap.post.ts`
- [x] 4.5 迁移 `server/api/chat/session/index.post.ts`
- [x] 4.6 迁移 `server/api/chat/session/[id].post.ts`
- [x] 4.7 迁移 `server/api/chat/session/[id].get.ts`

## 5. 清理与配置

- [x] 5.1 更新 `package.json` scripts (db:generate, db:push, db:studio)
- [x] 5.2 移除 Prisma 依赖 (`@prisma/client`, `prisma`)
- [x] 5.3 删除 `prisma/` 目录
- [x] 5.4 运行 `pnpm db:push` 同步 schema 到数据库

## 6. 验证

- [x] 6.1 验证系统初始化流程
- [x] 6.2 验证用户登录功能
- [x] 6.3 验证聊天会话功能
- [x] 6.4 验证数据库连接正常
