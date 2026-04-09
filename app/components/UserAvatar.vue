<template>
  <span
    class="relative inline-flex"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
  >
    <component
      :is="linkComponent"
      v-bind="linkProps"
      class="inline-flex rounded-full"
      :class="interactive ? 'cursor-pointer' : undefined"
    >
      <UAvatar
        :src="resolvedUser?.avatar ?? undefined"
        :alt="avatarAlt"
        :text="avatarText"
        :size="size"
        :ui="ui"
        :class="avatarClass"
        :style="avatarStyle"
      />
    </component>

    <div
      v-if="showProfileCard && isCardOpen && resolvedUser"
      class="absolute left-1/2 top-full z-50 hidden w-72 -translate-x-1/2 pt-3 md:block"
    >
      <div
        class="overflow-hidden rounded-2xl border border-default/60 bg-default/95 shadow-2xl backdrop-blur-xl"
        @mouseenter="handleEnter"
        @mouseleave="handleLeave"
      >
        <div class="bg-gradient-to-br from-primary/12 via-transparent to-secondary/10 px-4 py-4">
          <div class="flex items-start gap-3">
            <UserAvatar
              :user="resolvedUser"
              size="lg"
              :clickable="false"
              :show-profile-card="false"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-semibold text-default">
                  {{ resolvedUser.nickname }}
                </p>
                <UBadge
                  v-if="resolvedUser.type !== 'human'"
                  size="xs"
                  color="primary"
                  variant="subtle"
                >
                  BOT
                </UBadge>
              </div>
              <p class="truncate text-xs text-muted">
                @{{ resolvedUser.username }}
              </p>
              <p v-if="resolvedUser.role" class="mt-2 text-xs font-medium text-default/80">
                {{ resolvedUser.role }}
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-3 px-4 py-4">
          <p v-if="resolvedUser.intro" class="line-clamp-3 text-sm leading-6 text-toned">
            {{ resolvedUser.intro }}
          </p>
          <p v-else class="text-sm text-muted">
            这个用户还没有留下简介。
          </p>

          <div class="grid grid-cols-2 gap-2 text-xs text-muted">
            <div class="rounded-xl bg-elevated px-3 py-2">
              <p class="text-[11px] uppercase tracking-wide">加入时间</p>
              <p class="mt-1 font-medium text-default">
                {{ joinedDateLabel }}
              </p>
            </div>
            <div class="rounded-xl bg-elevated px-3 py-2">
              <p class="text-[11px] uppercase tracking-wide">最近更新</p>
              <p class="mt-1 font-medium text-default">
                {{ updatedDateLabel }}
              </p>
            </div>
          </div>

          <NuxtLink
            v-if="resolvedTo"
            :to="resolvedTo"
            class="inline-flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            查看主页
          </NuxtLink>
        </div>
      </div>
    </div>
  </span>
</template>

<script setup lang="ts">
import type { CSSProperties } from "vue";
import type { UserProfile } from "~~/shared/types/clawme";

const props = withDefaults(defineProps<{
  userId?: string | null;
  user?: UserProfile | null;
  size?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  alt?: string;
  text?: string;
  to?: string | null;
  clickable?: boolean;
  refreshOnMount?: boolean;
  showProfileCard?: boolean;
  ui?: Record<string, unknown>;
  avatarClass?: string;
  avatarStyle?: CSSProperties;
}>(), {
  userId: null,
  user: null,
  size: "md",
  alt: undefined,
  text: undefined,
  to: null,
  clickable: true,
  refreshOnMount: false,
  showProfileCard: true,
  ui: undefined,
  avatarClass: undefined,
  avatarStyle: undefined,
});

const { getUser, ensureUser, refreshUser } = useUsers();
const closeTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isCardOpen = ref(false);

const resolvedUserId = computed(() => props.user?.id ?? props.userId ?? null);
const cachedUser = computed(() => {
  if (!resolvedUserId.value) {
    return null;
  }

  return getUser(resolvedUserId.value) ?? null;
});
const resolvedUser = computed(() => props.user ?? cachedUser.value);

const resolvedTo = computed(() => {
  if (props.to !== null) {
    return props.to;
  }

  if (!resolvedUserId.value) {
    return null;
  }

  return `/user/${resolvedUserId.value}`;
});

const interactive = computed(() => props.clickable && Boolean(resolvedTo.value));
const linkComponent = computed(() => interactive.value ? resolveComponent("NuxtLink") : "span");
const linkProps = computed(() => interactive.value ? { to: resolvedTo.value } : {});
const supportsHoverCard = computed(() => {
  if (!import.meta.client || !props.showProfileCard) {
    return false;
  }

  return globalThis.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
});

const avatarAlt = computed(() =>
  props.alt ?? resolvedUser.value?.nickname ?? resolvedUser.value?.username ?? "用户头像",
);
const avatarText = computed(() =>
  props.text
  ?? resolvedUser.value?.nickname?.slice(0, 1)
  ?? resolvedUser.value?.username?.slice(0, 1)
  ?? "?",
);
const joinedDateLabel = computed(() => formatDateLabel(resolvedUser.value?.createdAt));
const updatedDateLabel = computed(() => formatDateLabel(resolvedUser.value?.updatedAt));

watch(
  resolvedUserId,
  (userId) => {
    if (!userId) {
      return;
    }

    void ensureUser(userId);
  },
  { immediate: true },
);

onMounted(() => {
  if (props.refreshOnMount && resolvedUserId.value) {
    void refreshUser(resolvedUserId.value);
  }
});

onBeforeUnmount(() => {
  clearCloseTimer();
});

function handleEnter() {
  if (!supportsHoverCard.value || !resolvedUserId.value) {
    return;
  }

  clearCloseTimer();
  isCardOpen.value = true;
  void refreshUser(resolvedUserId.value);
}

function handleLeave() {
  if (!supportsHoverCard.value) {
    return;
  }

  clearCloseTimer();
  closeTimer.value = setTimeout(() => {
    isCardOpen.value = false;
    closeTimer.value = null;
  }, 120);
}

function clearCloseTimer() {
  if (closeTimer.value) {
    clearTimeout(closeTimer.value);
    closeTimer.value = null;
  }
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}
</script>
