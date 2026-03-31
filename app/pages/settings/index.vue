<template>
  <div class="h-full w-full overflow-y-auto p-4 md:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 class="text-3xl font-semibold text-highlighted">系统设置</h1>
        <p class="mt-1 text-sm text-muted">管理系统配置、用户和模型</p>
      </header>

      <UTabs :items="tabs" class="w-full">
        <template #general="{ item }">
          <GeneralTab />
        </template>
        <template #users="{ item }">
          <UsersTab />
        </template>
        <template #models="{ item }">
          <ModelsTab />
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const tabs: TabsItem[] = [
  {
    label: "通用设置",
    icon: "i-lucide-settings",
    slot: "general" as const,
  },
  {
    label: "用户管理",
    icon: "i-lucide-users",
    slot: "users" as const,
  },
  {
    label: "模型管理",
    icon: "i-lucide-cpu",
    slot: "models" as const,
  },
];
</script>
