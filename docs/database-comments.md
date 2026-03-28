# 数据库备注维护

当前 Drizzle 不原生支持表备注和字段备注，因此本仓库使用 JSDoc + 生成脚本的方式维护数据库注释。

## 事实来源

- 结构事实来源：`server/database/schema.ts`
- 备注事实来源：`server/database/schema.ts` 中紧贴 `pgTable` 与字段定义的 JSDoc
- 生成脚本：`scripts/sync-db-comments.mjs`
- 生成结果：`drizzle/manual/comments.sql`

## 工作方式

1. 在 `server/database/schema.ts` 中，为 `pgTable(...)` 变量和字段属性添加 JSDoc。
2. 运行 `pnpm run db:comments` 生成 `COMMENT ON ...` SQL。
3. 运行 `pnpm run db:comments:apply` 或 `pnpm run db:push` 时，将备注同步到 PostgreSQL。

## JSDoc 示例

```ts
/** 系统用户表，承载真人与 Bot 的统一身份。 */
export const users = pgTable("user", {
  /** 展示昵称。 */
  nickname: text("nickname").notNull(),
});
```

## 为什么不用插件

- Drizzle 当前没有稳定的原生 comment API。
- 直接从 schema 的 JSDoc 提取，维护点更集中。
- 不需要 fork Drizzle 或侵入迁移格式。
