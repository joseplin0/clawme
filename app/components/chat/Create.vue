<template>
  <span class="inline-flex" @click="handleTriggerClick">
    <slot />
  </span>

  <Teleport to="body">
    <div
v-if="isOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      @click.self="close">
      <UCard class="w-full max-w-2xl shadow-2xl">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
              <h3 class="text-lg font-semibold text-highlighted">创建会话</h3>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="close" />
          </div>
        </template>

        <div class="space-y-4">
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="搜索成员..." variant="soft" class="w-full" />

          <div v-if="loadingUsers" class="py-10 text-center text-sm text-muted">
            正在加载可选成员...
          </div>

          <div v-else class="space-y-2">
            <button
v-for="member in filteredUsers" :key="member.id" type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-default px-3 py-2 text-left transition hover:bg-elevated/60"
              :class="{
                'border-primary bg-primary/5': selectedMemberIds.includes(member.id),
              }" @click="toggleUser(member.id)">
              <UserAvatar :user="member" size="sm" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium text-default">
                    {{ member.nickname }}
                  </span>
                  <UBadge v-if="member.id === currentUserId" color="neutral" variant="subtle" size="xs">
                    我
                  </UBadge>
                  <UBadge v-else-if="isBotUserType(member.type)" color="primary" variant="subtle" size="xs">
                    BOT
                  </UBadge>
                </div>
                <p class="truncate text-sm text-muted">@{{ member.username }}</p>
              </div>
              <UIcon
:name="selectedMemberIds.includes(member.id) ? 'i-lucide-check' : 'i-lucide-plus'"
                class="text-base text-muted" />
            </button>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm text-muted">
              已选择 {{ selectedMemberIds.length }} 位成员
            </p>
            <div class="flex items-center gap-2">
              <UButton variant="ghost" color="neutral" @click="close">
                取消
              </UButton>
              <UButton
color="primary" :loading="creating" :disabled="selectedMemberIds.length === 0"
                @click="handleConfirmClick">
                创建会话
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  isBotUserType,
  type UserProfile,
  type ChatRoomRecord,
} from "~~/shared/types/clawme";

const props = withDefaults(
  defineProps<{
    memberIds?: string[];
  }>(),
  {
    memberIds: () => [],
  },
);

const emit = defineEmits<{
  created: [room: ChatRoomRecord];
  error: [message: string];
}>();

const toast = useToast();
const { user } = useUserSession();

const isOpen = ref(false);
const creating = ref(false);
const loadingUsers = ref(false);
const users = ref<UserProfile[]>([]);
const searchQuery = ref("");
const selectedMemberIds = ref<string[]>([]);

const currentUserId = computed(() => user.value?.id ?? null);
const directMemberIds = computed(() =>
  uniqueMemberIds(
    props.memberIds.filter((memberId) => memberId !== currentUserId.value),
  ),
);
const filteredUsers = computed(() => {
  const currentId = currentUserId.value;
  const query = searchQuery.value.trim().toLowerCase();

  return users.value.filter((user) => {
    if (user.id === currentId) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      user.username,
      user.nickname,
      user.role ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
});

watch(
  () => props.memberIds,
  (value) => {
    selectedMemberIds.value = uniqueMemberIds(value.filter((id) => id !== currentUserId.value));
  },
  { immediate: true },
);

function handleTriggerClick() {
  if (creating.value) {
    return;
  }

  if (directMemberIds.value.length > 0) {
    void confirmCreate(directMemberIds.value);
    return;
  }

  void openSelector();
}

async function openSelector() {
  isOpen.value = true;
  selectedMemberIds.value = uniqueMemberIds(
    props.memberIds.filter((id) => id !== currentUserId.value),
  );

  if (users.value.length > 0) {
    return;
  }

  loadingUsers.value = true;
  try {
    users.value = await $fetch<UserProfile[]>("/api/users");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "加载可选成员失败";
    emit("error", message);
    toast.add({
      title: "加载可选成员失败",
      description: message,
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    loadingUsers.value = false;
  }
}

function toggleUser(userId: string) {
  if (userId === currentUserId.value) {
    return;
  }

  const index = selectedMemberIds.value.indexOf(userId);
  if (index >= 0) {
    selectedMemberIds.value.splice(index, 1);
    return;
  }

  selectedMemberIds.value.push(userId);
}

async function confirmCreate(overrideMemberIds?: string[]) {
  const memberIds = uniqueMemberIds(
    overrideMemberIds ?? selectedMemberIds.value,
  ).filter((memberId) => memberId !== currentUserId.value);

  if (memberIds.length === 0) {
    toast.add({
      title: "请选择成员",
      description: "至少需要选择 1 位成员。",
      color: "warning",
      icon: "i-lucide-circle-alert",
    });
    return;
  }

  creating.value = true;
  try {
    const room = await $fetch<ChatRoomRecord>("/api/chat/room", {
      method: "POST",
      body: {
        memberIds,
      },
    });

    close();
    emit("created", room);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "创建会话失败";

    emit("error", message);
    toast.add({
      title: "创建会话失败",
      description: message,
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    creating.value = false;
  }
}

function handleConfirmClick() {
  void confirmCreate();
}

function close() {
  isOpen.value = false;
  searchQuery.value = "";
  selectedMemberIds.value = uniqueMemberIds(
    props.memberIds.filter((id) => id !== currentUserId.value),
  );
}

function uniqueMemberIds(memberIds: string[]) {
  return Array.from(new Set(memberIds.filter(Boolean)));
}
</script>
