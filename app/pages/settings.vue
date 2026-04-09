<template>
  <div class="w-full p-4 md:p-8 bg-[#ffffff]">
    <div class="mx-auto space-y-8">
      <header>
        <h1 class="text-[28px] font-bold text-[#222222] tracking-[-0.32px]">系统设置</h1>
        <p class="mt-2 text-[16px] text-[#6a6a6a]">管理系统配置、用户和模型</p>
      </header>

      <div class="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside class="self-start md:sticky md:top-8">
          <nav class="rounded-[20px] bg-white p-3 shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px]">
            <NuxtLink
              v-for="item in menuItems" :key="item.to" :to="item.to" :class="[
                'flex items-center gap-3 rounded-[8px] px-4 py-3 transition-colors',
                route.path === item.to
                  ? 'text-[#222222] bg-[#f2f2f2] font-semibold'
                  : 'text-[#222222] hover:bg-[#f2f2f2] font-medium',
              ]"
            >
              <UIcon :name="item.icon" class="size-[20px] shrink-0 text-[#222222]" />
              <div class="min-w-0">
                <p class="text-[16px]">{{ item.label }}</p>
                <p class="truncate text-[13px] text-[#6a6a6a] font-normal mt-0.5">{{ item.description }}</p>
              </div>
            </NuxtLink>
          </nav>
        </aside>

        <section class="min-w-0 rounded-[20px] bg-white p-6 md:p-8 shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px]">
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
