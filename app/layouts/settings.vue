<template>
  <div class="min-h-screen bg-default text-default">
    <div class="flex min-h-screen flex-col lg:flex-row">
      <aside
        class="shrink-0 border-b border-default/50 bg-elevated/30 lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:border-b-0 lg:border-r">
        <div class="flex h-16 items-center gap-3 border-b border-default/50 px-4">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            class="shrink-0 rounded-xl"
            to="/chat"
          />

          <img
            src="/logo.png"
            alt="Clawme"
            class="size-9 shrink-0 rounded-xl object-cover"
          >
        </div>

        <div class="p-3">
          <UNavigationMenu
orientation="vertical" :items="navigationItems" highlight class="w-full" :ui="{
            root: 'w-full',
            viewport: 'hidden',
            list: 'flex w-full flex-col gap-1',
            item: 'w-full',
            link: 'w-full rounded-2xl px-3 py-3 transition-colors',
            linkLeadingIcon: 'size-5 shrink-0',
            linkLabel: 'w-full text-sm font-semibold',
            linkTrailing: 'hidden',
          }" />
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <UHeader class="sticky top-0 z-20 border-b border-default/50 bg-default/85 backdrop-blur-xl">
          <template #title>
            <UBreadcrumb
:items="breadcrumbItems" :ui="{
              link: 'text-sm',
              linkLabel: 'text-sm font-medium',
            }" />
          </template>
        </UHeader>

        <main class="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SettingsMenuItem {
  label: string;
  description: string;
  to: string;
  icon: string;
}

const route = useRoute();

const defaultMenuItem: SettingsMenuItem = {
  label: "通用设置",
  description: "基础配置与系统选项",
  to: "/settings/general",
  icon: "i-lucide-settings",
};

const menuItems: SettingsMenuItem[] = [
  defaultMenuItem,
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

const navigationItems = computed(() =>
  menuItems.map(({ label, to, icon }) => ({
    label,
    to,
    icon,
  })),
);

const activeMenuItem = computed<SettingsMenuItem>(() => {
  return menuItems.find((item) => route.path === item.to) ?? defaultMenuItem;
});

const breadcrumbItems = computed(() => [
  {
    label: "系统设置",
    icon: "i-lucide-settings-2",
    to: "/settings/general",
  },
  {
    label: activeMenuItem.value.label,
  },
]);
</script>
