<script setup lang="ts">
const route = useRoute();

const { data: page } = await useAsyncData(`page:${route.path}`, () =>
  queryCollection("docs").path(route.path).first(),
);

const { data: surroundings } = await useAsyncData(`surround:${route.path}`, () =>
  queryCollectionItemSurroundings("docs", route.path, {
    fields: ["description"],
  }),
);

const previousLink = computed(() => surroundings.value?.[0] || null);
const nextLink = computed(() => surroundings.value?.[1] || null);
const tocLinks = computed(() => page.value?.body?.toc?.links || []);

useSeoMeta({
  title: () => (page.value?.title ? `${page.value.title} · Clawme Docs` : "Clawme Docs"),
  description: () => page.value?.description || "Clawme 文档页面",
});
</script>

<template>
  <div v-if="page" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
    <section class="min-w-0 space-y-6">
      <article class="docs-card rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div class="mb-8 space-y-4 border-b border-default/70 pb-8">
          <UBadge color="primary" variant="subtle" label="Markdown" />
          <div>
            <h1 class="text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">
              {{ page.title }}
            </h1>
            <p v-if="page.description" class="mt-4 max-w-3xl text-base leading-8 text-toned">
              {{ page.description }}
            </p>
          </div>
        </div>

        <ContentRenderer :value="page" prose class="docs-prose" />
      </article>

      <DocsPrevNextNav :previous="previousLink" :next="nextLink" />
    </section>

    <aside v-if="tocLinks.length" class="xl:sticky xl:top-24 xl:h-fit">
      <div class="docs-card rounded-3xl p-4">
        <div class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          本页目录
        </div>
        <DocsTocLinks :links="tocLinks" />
      </div>
    </aside>
  </div>

  <div v-else class="docs-card rounded-[2rem] p-10">
    <UBadge color="warning" variant="subtle" label="404" />
    <h1 class="mt-4 text-3xl font-semibold text-highlighted">文档不存在</h1>
    <p class="mt-3 max-w-2xl text-base leading-8 text-toned">
      当前路径没有匹配到内容页面。这通常意味着路径仍使用仓库文件链接格式，或该文档尚未映射到网站路由。
    </p>
    <div class="mt-6">
      <UButton to="/" icon="i-lucide-arrow-left" label="返回首页" />
    </div>
  </div>
</template>
