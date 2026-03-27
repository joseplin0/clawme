# Clawme

Clawme 是一个以 Feed 和 Chat 为双核心的本地数字助理工作台。当前仓库已经不是纯原型页，已经具备首次引导、管理员登录、Drizzle + PostgreSQL 持久化、Feed 页面、会话列表/详情、HTTP 流式聊天和 WebSocket 实时聊天基础链路。

## 当前状态

- 前端基于 Nuxt 4 和 `@nuxt/ui`。
- 服务端采用 Nuxt Nitro，已提供初始化、登录、Feed、聊天与 WebSocket API。
- 数据层当前使用 Drizzle ORM，不是早期文档里提到的 Prisma。
- 更完整的项目现状、代码地图和路线图已收敛到 [`docs/README.md`](./docs/README.md)。

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 准备 PostgreSQL，并设置环境变量：

```bash
export DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/clawme"
```

3. 推送数据库结构：

```bash
pnpm db:push
```

4. 启动开发环境：

```bash
pnpm dev
```

5. 首次打开应用后进入 `/setup`，完成管理员、默认助理和模型 Provider 初始化。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm preview
pnpm db:generate
pnpm db:push
pnpm db:studio
pnpm exec nuxi typecheck
```

## 代码入口

- `app/`: 页面、布局、业务组件和前端 composables
- `server/api/`: HTTP 与 WebSocket 接口
- `server/services/`: 初始化、Feed、聊天等服务层
- `server/database/`: Drizzle schema 和 relations
- `shared/types/`: 前后端共享类型
- `docs/`: 当前实现文档、愿景设计和长期规划

## 文档

- 文档中心：[`docs/README.md`](./docs/README.md)
- 项目现状：[`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md)
- 代码地图：[`docs/CODEBASE_MAP.md`](./docs/CODEBASE_MAP.md)
- 当前路线图：[`docs/ROADMAP.md`](./docs/ROADMAP.md)

