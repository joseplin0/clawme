<template>
  <aside
    class="hidden w-14 shrink-0 border-r border-default/50 bg-default md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:self-start"
  >
    <!-- Logo -->
    <div class="flex items-center justify-center h-14 shrink-0">
      <NuxtLink to="/" class="group">
        <div
          class="size-8 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm tracking-tight shadow-lg shadow-primary/30 transition-all duration-200 group-hover:shadow-primary/50 group-hover:scale-110"
        >
          C
        </div>
      </NuxtLink>
    </div>

    <!-- 分割线 -->
    <div class="h-px mx-3 bg-default/50" />

    <!-- 导航图标 -->
    <nav class="flex flex-col items-center gap-1 px-2 py-3 flex-1">
      <component
        :is="link.to ? NuxtLink : 'button'"
        v-for="(link, index) in links"
        :key="link.to || index"
        :to="link.to"
        :prefetch="true"
        :title="link.label"
        :class="[
          'relative flex items-center justify-center size-10 rounded-xl cursor-pointer transition-all duration-200',
          isActiveLink(link)
            ? 'text-primary'
            : 'text-muted hover:text-default hover:bg-elevated',
        ]"
        @click="link.onClick?.($event)"
      >
        <!-- 未读提示点 -->
        <span
          v-if="link.badge"
          class="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-default"
        />
        <UIcon
          :name="isActiveLink(link) ? (link.activeIcon || link.icon) : link.icon"
          class="text-xl"
        />
      </component>
    </nav>

    <!-- 底部：用户头像 -->
    <div class="flex items-center justify-center p-3 shrink-0">
      <UserAvatar
        :user-id="sessionUserId"
        size="sm"
        refresh-on-mount
        :ui="{ root: 'ring-2 ring-transparent hover:ring-primary transition-all duration-200' }"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
interface MenuItem {
  label: string;
  to?: string;
  icon: string;
  activeIcon?: string;
  badge?: boolean | string | number;
  onClick?: (e: MouseEvent) => void;
}

defineProps<{
  links: MenuItem[];
}>();

const route = useRoute();
const { user } = useUserSession();
const NuxtLink = resolveComponent("NuxtLink");
const sessionUserId = computed(() => user.value?.id ?? null);

function isActiveLink(link: MenuItem) {
  if (!link.to) {
    return false;
  }

  return route.path === link.to || (link.to !== "/" && route.path.startsWith(`${link.to}/`));
}
</script>
