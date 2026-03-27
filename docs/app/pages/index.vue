<script setup lang="ts">
interface NavItem {
  title?: string;
  path?: string;
  children?: NavItem[];
}

const { data: navigation } = await useAsyncData("docs-home-navigation", () =>
  queryCollectionNavigation("docs"),
);

const { data: pages } = await useAsyncData("docs-home-pages", () =>
  queryCollection("docs").all(),
);

const quickStartTitles = ["项目现状", "代码地图", "当前路线图", "WebSocket Chat 当前方案"];

function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
}

const flatNavigation = computed(() => flatten((navigation.value as NavItem[]) || []));

const quickStarts = computed(() =>
  quickStartTitles
    .map((title) => flatNavigation.value.find((item) => item.title === title))
    .filter((item): item is NavItem => Boolean(item?.path)),
);

const sectionCards = computed(() =>
  ((navigation.value as NavItem[]) || [])
    .filter((item) => item.children?.length)
    .map((item) => ({
      title: item.title || "未命名分组",
      count: item.children?.length || 0,
      path: item.path || item.children?.[0]?.path || "/",
      summary:
        {
          adr: "记录关键架构决策和取舍，适合追踪高成本技术选择。",
          design: "保留长期愿景和未落地设计，阅读时需与当前实现区分。",
          reference: "外部背景资料与协议参考，不作为当前实现事实来源。",
          ops: "部署、运行、排障类文档入口，适合后续补齐 Runbook。",
        }[item.title?.toLowerCase() || ""] || "按主题归档的文档分组。",
    })),
);

const stats = computed(() => {
  const total = pages.value?.length || 0;
  const adrCount = pages.value?.filter((page) => page.path?.startsWith("/adr/")).length || 0;
  const designCount =
    pages.value?.filter((page) => page.path?.startsWith("/design/")).length || 0;

  return { total, adrCount, designCount };
});

useSeoMeta({
  title: "Clawme Docs",
  description: "Clawme 项目的独立文档网站，基于 Nuxt Content 构建。",
});
</script>

<template>
  <div class="space-y-6">
    <section class="docs-card overflow-hidden rounded-[2rem] p-6 sm:p-8">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div>
          <UBadge color="primary" variant="subtle" label="方案 1: docs 目录直接作为 app" />
          <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">
            把仓库文档直接发布成一个可独立部署的网站
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-8 text-toned sm:text-lg">
            当前站点读取本目录现有 Markdown，不复制、不迁移到第二套内容目录。适合先快速落地，再逐步整理 URL 和内容元数据。
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div class="rounded-2xl bg-primary/8 p-4 ring-1 ring-primary/15">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">总文档</div>
            <div class="mt-2 text-3xl font-semibold text-highlighted">{{ stats.total }}</div>
          </div>
          <div class="rounded-2xl bg-default p-4 ring-1 ring-default/80">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">ADR</div>
            <div class="mt-2 text-3xl font-semibold text-highlighted">{{ stats.adrCount }}</div>
          </div>
          <div class="rounded-2xl bg-default p-4 ring-1 ring-default/80">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">设计稿</div>
            <div class="mt-2 text-3xl font-semibold text-highlighted">{{ stats.designCount }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-4">
      <NuxtLink
        v-for="item in quickStarts"
        :key="item.path"
        :to="item.path!"
        class="docs-card rounded-2xl p-5 transition hover:-translate-y-0.5"
      >
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">优先阅读</div>
        <div class="mt-3 text-lg font-semibold text-highlighted">{{ item.title }}</div>
        <p class="mt-2 text-sm text-toned">从核心现状、代码地图和阶段计划开始建立上下文。</p>
      </NuxtLink>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <NuxtLink
        v-for="section in sectionCards"
        :key="section.title"
        :to="section.path"
        class="docs-card rounded-3xl p-6 transition hover:-translate-y-0.5"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {{ section.title }}
            </div>
            <p class="mt-3 text-sm leading-7 text-toned">
              {{ section.summary }}
            </p>
          </div>
          <div class="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted">
            {{ section.count }} 篇
          </div>
        </div>
      </NuxtLink>
    </section>
  </div>
</template>
