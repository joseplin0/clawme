# ADR-0002: 以 Drizzle 作为当前数据库实现事实来源

- Status: Accepted
- Date: 2026-03-27

## Context

早期设计文档中多次以 Prisma 作为数据库方案描述，但当前仓库实际代码已经基于 Drizzle ORM、`drizzle-kit` 和 `server/database/schema.ts` 组织。

如果继续让设计文档默认代表当前事实，会造成实现理解错误，特别是对 AI 工具和新协作者。

## Decision

在当前阶段，明确以 Drizzle 作为数据库实现的事实来源：

- 代码事实来源：`server/database/schema.ts`
- migration 事实来源：`drizzle/`
- 文档中的 Prisma 相关内容仅视为历史规划或长期替代方案讨论，不代表当前实现

## Consequences

- 当前实现描述更准确。
- 后续数据库相关修改应优先更新 Drizzle schema 和现状文档。
- 如果未来真的切回 Prisma，需要新增新的 ADR，而不是沿用旧设计稿描述。

## Alternatives Considered

### 继续保留 Prisma 作为默认文档叙述

这会持续制造事实漂移，不可接受。

### 立即重写所有设计稿，彻底删除 Prisma 表述

会抹掉历史设计语境，且改动范围过大。当前先通过现状文档和 ADR 明确边界，更稳妥。

