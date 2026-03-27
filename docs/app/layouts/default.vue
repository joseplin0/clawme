<script setup lang="ts">
const route = useRoute();
const navFilter = ref("");

const { data: navigation } = await useAsyncData("docs-navigation", () =>
  queryCollectionNavigation("docs"),
);
</script>

<template>
  <div class="docs-shell min-h-screen">
    <header class="sticky top-0 z-30 border-b border-default/50 bg-default/85 backdrop-blur-xl">
      <div class="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
          <div class="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <UIcon name="i-lucide-book-text" class="size-5" />
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Clawme Docs
            </div>
            <div class="truncate text-lg font-semibold text-highlighted">工程文档网站</div>
          </div>
        </NuxtLink>

        <div class="hidden items-center gap-3 md:flex">
          <UBadge color="neutral" variant="soft" label="Nuxt Content" />
          <UBadge color="primary" variant="subtle" label="独立部署" />
        </div>
      </div>
    </header>

    <div class="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8">
      <aside class="space-y-4 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <div class="docs-card rounded-3xl p-4">
          <div class="mb-3">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">导航</div>
            <p class="mt-1 text-sm text-toned">按目录和标题快速定位文档。</p>
          </div>

          <UInput
            v-model="navFilter"
            icon="i-lucide-search"
            size="lg"
            placeholder="筛选文档标题或路径"
          />

          <USeparator class="my-4" />

          <DocsSidebarTree
            :items="navigation || []"
            :current-path="route.path"
            :filter="navFilter"
          />
        </div>
      </aside>

      <main class="min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
