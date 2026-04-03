<template>
  <div class="w-full p-4 md:p-8">
    <div class="mx-auto space-y-6">
      <header>
        <h1 class="text-3xl font-semibold text-highlighted">系统设置</h1>
        <p class="mt-1 text-sm text-muted">管理系统配置、用户和模型</p>
      </header>

      <div class="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside class="self-start md:sticky md:top-8">
          <nav class="rounded-2xl border border-default/50 bg-default/70 p-2 backdrop-blur-sm">
            <NuxtLink
v-for="item in menuItems" :key="item.to" :to="item.to" :class="[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
              route.path === item.to
                ? 'text-black'
                : 'text-muted hover:bg-elevated hover:text-default',
            ]">
              <UIcon :name="item.icon" class="size-4 shrink-0" />
              <div class="min-w-0">
                <p class="font-medium">{{ item.label }}</p>
                <p class="truncate text-xs text-muted">{{ item.description }}</p>
              </div>
            </NuxtLink>
          </nav>
        </aside>

        <section class="min-w-0 rounded-2xl border border-default/50 bg-default/70 p-4 md:p-6">
          <NuxtPage />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

if (route.path === "/settings") {
  await navigateTo("/settings/general", { replace: true });
}

const menuItems = [
  {
    label: "通用设置",
    description: "基础配置与系统选项",
    to: "/settings/general",
    icon: "i-lucide-settings",
  },
  {
    label: "用户管理",
    description: "查看并编辑系统用户",
    to: "/settings/users",
    icon: "i-lucide-users",
  },
  {
    label: "模型管理",
    description: "维护 LLM 提供商配置",
    to: "/settings/models",
    icon: "i-lucide-cpu",
  },
];
</script>
