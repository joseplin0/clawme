<template>
  <USlideover
    v-model:open="panelOpen"
    side="right"
    title="聊天信息"
    :ui="{
      content: 'w-72 max-w-none bg-default p-0 shadow-[-4px_0_24px_rgba(0,0,0,0.05)]',
      body: 'flex-1 overflow-y-auto p-4',
      title: 'text-[15px] font-medium text-default',
    }"
  >
    <template #body>
      <section>
        <p class="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
          {{ memberSectionTitle }}
        </p>

        <div class="grid grid-cols-4 gap-3">
          <div
            v-for="member in displayMembers"
            :key="member.id"
            class="flex min-w-0 flex-col items-center"
          >
            <div class="relative">
              <UAvatar
                :src="member.avatar ?? undefined"
                :alt="member.nickname"
                :text="member.nickname.slice(0, 1)"
                size="3xl"
                :ui="{
                  root: 'rounded-xl border border-default bg-default',
                  image: 'rounded-[inherit] object-cover',
                  fallback: 'text-xs font-medium text-default'
                }"
              />
              <div
                v-if="isBotUserType(member.type)"
                class="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-white bg-primary text-[9px] font-medium text-white"
              >
                AI
              </div>
            </div>

            <span class="mt-1 w-full truncate text-center text-[10px] leading-4 text-default/80">
              {{ memberLabel(member) }}
            </span>
          </div>

          <button
            type="button"
            class="group flex min-w-0 flex-col items-center"
            @click="noop"
          >
            <div class="flex size-12 items-center justify-center rounded-xl border border-dashed border-default text-muted transition">
              <UIcon name="i-lucide-plus" class="size-4" />
            </div>
            <span class="mt-1 text-[10px] leading-4 text-muted">
              邀请
            </span>
          </button>
        </div>
      </section>

      <section class="mt-8 border-t border-default pt-6">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left text-sm"
          @click="noop"
        >
          <span class="text-default/80">
            查找聊天记录
          </span>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-muted" />
        </button>

        <div class="mt-4 space-y-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-default/80">消息免打扰</span>
            <USwitch
              v-model="isMuted"
              color="primary"
              size="xl"
            />
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="text-default/80">置顶聊天</span>
            <USwitch
              v-model="isPinned"
              color="primary"
              size="xl"
            />
          </div>
        </div>
      </section>
    </template>

    <template #footer>
      <UButton
        variant="soft"
        block
        size="xl"
        @click="noop"
      >
        清空聊天记录
      </UButton>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { SessionType, UserProfile } from "~~/shared/types/clawme";
import { isBotUserType } from "~~/shared/types/clawme";

const props = withDefaults(defineProps<{
  open?: boolean;
  roomId?: string | null;
  roomTitle?: string | null;
  roomType?: SessionType | null;
  members?: UserProfile[];
}>(), {
  open: false,
  roomId: null,
  roomTitle: null,
  roomType: null,
  members: () => [],
});

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { user: currentUser } = useUserSession();

const isMuted = ref(false);
const isPinned = ref(true);
const switchUi = {
  base: "border-0 shadow-none",
  thumb: "shadow-sm",
} as const;
const panelOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});
const displayMembers = computed(() =>
  [...props.members].sort((left, right) => {
    const leftScore = getMemberSortScore(left);
    const rightScore = getMemberSortScore(right);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return left.nickname.localeCompare(right.nickname, "zh-Hans-CN");
  }),
);
const memberSectionTitle = computed(() =>
  `${props.roomType === "group" ? "群成员" : "聊天成员"} (${displayMembers.value.length})`,
);

watch(
  () => props.roomId,
  () => {
    isMuted.value = false;
    isPinned.value = true;
  },
  { immediate: true },
);

function getMemberSortScore(member: UserProfile) {
  if (member.id === currentUser.value?.id) {
    return 3;
  }

  if (isBotUserType(member.type)) {
    return 2;
  }

  return 1;
}

function memberLabel(member: UserProfile) {
  if (member.id === currentUser.value?.id) {
    return "Me";
  }

  return member.nickname;
}

function noop() {
  return;
}
</script>
