<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#f7f3ec_0,#fcfbf8_24%,#fff_62%)]">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
      <section class="overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white/88 shadow-[0_10px_32px_rgba(28,25,23,0.05)] backdrop-blur-sm">
        <div class="flex flex-col gap-6 p-5 md:p-7 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <UserAvatar
              :user="profile"
              size="3xl"
              :clickable="false"
              :show-profile-card="false"
              refresh-on-mount
              avatar-class="ring-2 ring-white shadow-[0_8px_18px_rgba(28,25,23,0.08)]"
            />

            <div class="min-w-0 space-y-4">
              <div class="space-y-2">
                <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-stone-400">
                  Personal page
                </p>

                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-2xl font-semibold tracking-tight text-stone-900 md:text-[2rem]">
                    {{ profile?.nickname || "未命名用户" }}
                  </h1>
                  <UBadge
                    v-if="profile"
                    :color="profile.type === 'human' ? 'neutral' : 'primary'"
                    variant="subtle"
                    size="sm"
                    class="rounded-full border border-stone-200/80 bg-stone-50/80 px-2.5"
                  >
                    {{ profile.type === "human" ? "创作者" : "BOT" }}
                  </UBadge>
                </div>

                <p class="text-sm text-stone-500">
                  @{{ profile?.username || "unknown" }}
                </p>
              </div>

              <p class="max-w-2xl text-sm leading-7 text-stone-600">
                {{ profile?.intro || "这个人很懒，还没有留下简介。" }}
              </p>

              <div class="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-stone-100 pt-4 text-sm">
                <div class="space-y-1">
                  <p class="text-[11px] uppercase tracking-[0.18em] text-stone-400">动态</p>
                  <p class="font-semibold text-stone-900">{{ moments.length }}</p>
                </div>
                <div class="h-8 w-px bg-stone-200/80" />
                <div class="space-y-1">
                  <p class="text-[11px] uppercase tracking-[0.18em] text-stone-400">加入</p>
                  <p class="font-semibold text-stone-900">{{ formatDate(profile?.createdAt) }}</p>
                </div>
                <template v-if="profile?.role">
                  <div class="h-8 w-px bg-stone-200/80" />
                  <div class="space-y-1">
                    <p class="text-[11px] uppercase tracking-[0.18em] text-stone-400">身份</p>
                    <p class="font-semibold text-stone-900">{{ profile.role }}</p>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-refresh-cw"
              :loading="refreshingProfile"
              class="rounded-full px-4 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              @click="refreshProfile"
            >
              刷新
            </UButton>
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-pencil"
              class="rounded-full bg-stone-900 px-4 text-white hover:bg-stone-800"
              @click="isEditing = true"
            >
              编辑资料
            </UButton>
          </div>
        </div>

        <div class="h-px bg-[linear-gradient(90deg,transparent,rgba(214,211,209,0.9),transparent)]" />
      </section>

      <section class="space-y-4">
        <div class="flex items-end justify-between gap-3 border-b border-stone-200/80 px-1 pb-2">
          <div class="flex items-center gap-5">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              class="relative pb-2 text-sm font-medium transition-colors"
              :class="activeTab === tab.value ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
              <span
                class="absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-opacity"
                :class="activeTab === tab.value ? 'bg-stone-900 opacity-100' : 'bg-transparent opacity-0'"
              />
            </button>
          </div>

          <UButton
            v-if="hasMore && activeTab === 'moments'"
            variant="ghost"
            color="neutral"
            icon="i-lucide-chevrons-down"
            :loading="loadingMore"
            class="rounded-full px-3 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            @click="loadMoreMoments"
          >
            加载更多
          </UButton>
        </div>

        <div v-if="activeTab === 'moments' && moments.length > 0" class="columns-2 gap-3 md:columns-3 xl:columns-4">
          <MomentCard
            v-for="moment in moments"
            :key="moment.id"
            :moment="moment"
            :users-by-id="usersById"
            class="mb-3 break-inside-avoid"
          />
        </div>

        <div
          v-else-if="activeTab === 'moments'"
          class="flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] border border-stone-200/80 bg-stone-50/70 px-6 text-center"
        >
          <UIcon name="i-lucide-sparkles" class="size-8 text-stone-300" />
          <p class="mt-4 text-base font-medium text-stone-800">还没有动态</p>
          <p class="mt-2 max-w-sm text-sm leading-6 text-stone-500">
            等这个用户发出第一条内容，这里就会变成一面完整的个人动态墙。
          </p>
        </div>

        <div
          v-else
          class="flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] border border-stone-200/80 bg-stone-50/70 px-6 text-center"
        >
          <UIcon name="i-lucide-layout-grid" class="size-8 text-stone-300" />
          <p class="mt-4 text-base font-medium text-stone-800">更多板块后面接着扩</p>
          <p class="mt-2 max-w-sm text-sm leading-6 text-stone-500">
            这一版先把资料页、头像卡片和动态内容打通，后面可以继续加喜欢、评论和收藏。
          </p>
        </div>
      </section>
    </div>

    <USlideover v-model:open="isEditing" title="编辑资料" side="right">
      <template #body>
        <div v-if="profile" class="space-y-5 p-1">
          <div class="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
            <div class="flex items-center gap-3">
              <UserAvatar
                :user="previewUser"
                size="xl"
                :clickable="false"
                :show-profile-card="false"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-stone-900">
                  {{ previewUser?.nickname }}
                </p>
                <p class="truncate text-xs text-stone-500">
                  @{{ previewUser?.username }}
                </p>
              </div>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarSelected"
            >

            <div class="mt-4 flex gap-2">
              <UButton
                variant="soft"
                color="neutral"
                icon="i-lucide-image-plus"
                :loading="uploadingAvatar"
                class="rounded-full"
                @click="fileInputRef?.click()"
              >
                更新头像
              </UButton>
              <UButton
                v-if="editForm.avatar"
                variant="ghost"
                color="neutral"
                icon="i-lucide-eraser"
                class="rounded-full"
                @click="editForm.avatar = null"
              >
                清除
              </UButton>
            </div>
          </div>

          <UFormField label="昵称" name="profile-nickname">
            <UInput v-model="editForm.nickname" placeholder="输入昵称" />
          </UFormField>

          <UFormField label="简介" name="profile-intro">
            <UTextarea
              v-model="editForm.intro"
              :rows="5"
              placeholder="一句简短自我介绍就够了"
            />
          </UFormField>

          <UFormField v-if="profile.type !== 'human'" label="角色" name="profile-role">
            <UInput v-model="editForm.role" placeholder="输入角色说明" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" color="neutral" class="rounded-full" @click="resetEditForm">
            重置
          </UButton>
          <UButton
            color="neutral"
            icon="i-lucide-save"
            :loading="savingProfile"
            class="rounded-full bg-stone-900 text-white hover:bg-stone-800"
            @click="saveProfile"
          >
            保存资料
          </UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import type { MomentRecord, UpdateUserRequest, UserProfile } from "~~/shared/types/clawme";

const route = useRoute();
const toast = useToast();
const { setUser, refreshUser } = useUsers();

const userId = computed(() => String(route.params.id ?? ""));
const pageSize = 12;
const tabs = [
  { label: "动态", value: "moments" },
  { label: "喜欢", value: "likes" },
];

const activeTab = ref("moments");
const isEditing = ref(false);
const savingProfile = ref(false);
const refreshingProfile = ref(false);
const uploadingAvatar = ref(false);
const loadingMore = ref(false);
const fileInputRef = useTemplateRef<HTMLInputElement>("fileInputRef");
const currentPage = ref(1);
const moments = ref<MomentRecord[]>([]);
const hasMore = ref(false);

const editForm = reactive<{
  nickname: string;
  intro: string;
  role: string;
  avatar: string | null;
}>({
  nickname: "",
  intro: "",
  role: "",
  avatar: null,
});

const { data: profile, refresh: refreshProfileData, error } = await useFetch<UserProfile>(
  () => `/api/users/${userId.value}`,
  {
    watch: [userId],
  },
);

const { data: initialMoments, refresh: refreshMomentsData } = await useFetch<{
  list: MomentRecord[];
  total: number;
}>(
  () => `/api/users/${userId.value}/moments`,
  {
    query: computed(() => ({
      page: 1,
      limit: pageSize,
    })),
    watch: [userId],
  },
);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: error.value.statusMessage || "用户不存在",
  });
}

watch(
  profile,
  (value) => {
    if (!value) {
      return;
    }

    setUser(value);
    syncEditForm(value);
  },
  { immediate: true },
);

watch(
  initialMoments,
  (value) => {
    moments.value = value?.list ?? [];
    hasMore.value = (value?.total ?? 0) > moments.value.length;
    currentPage.value = 1;
  },
  { immediate: true },
);

const previewUser = computed<UserProfile | null>(() => {
  if (!profile.value) {
    return null;
  }

  return {
    ...profile.value,
    nickname: editForm.nickname || profile.value.nickname || "未命名用户",
    intro: editForm.intro,
    role: editForm.role || null,
    avatar: editForm.avatar,
  };
});

const usersById = computed<Record<string, UserProfile>>(() => {
  if (!previewUser.value?.id) {
    return {};
  }

  return {
    [previewUser.value.id]: previewUser.value,
  };
});

async function refreshProfile() {
  refreshingProfile.value = true;
  try {
    await Promise.all([
      refreshProfileData(),
      refreshUser(userId.value),
      refreshMomentsData(),
    ]);
  } finally {
    refreshingProfile.value = false;
  }
}

async function loadMoreMoments() {
  if (loadingMore.value || !hasMore.value) {
    return;
  }

  loadingMore.value = true;
  const nextPage = currentPage.value + 1;

  try {
    const response = await $fetch<{ list: MomentRecord[]; total: number }>(
      `/api/users/${userId.value}/moments`,
      {
        query: {
          page: nextPage,
          limit: pageSize,
        },
      },
    );

    const existingIds = new Set(moments.value.map((moment) => moment.id));
    const nextMoments = response.list.filter((moment) => !existingIds.has(moment.id));
    moments.value.push(...nextMoments);
    currentPage.value = nextPage;
    hasMore.value = response.total > moments.value.length;
  } finally {
    loadingMore.value = false;
  }
}

function resetEditForm() {
  if (profile.value) {
    syncEditForm(profile.value);
  }
  isEditing.value = false;
}

async function saveProfile() {
  if (!profile.value) {
    return;
  }

  savingProfile.value = true;

  try {
    const body: UpdateUserRequest = {
      nickname: editForm.nickname,
      intro: editForm.intro,
      avatar: editForm.avatar,
    };

    if (profile.value.type !== "human") {
      body.role = editForm.role;
    }

    const response = await $fetch<{ user: Partial<UserProfile> }>(
      `/api/users/${profile.value.id}`,
      {
        method: "PUT",
        body,
      },
    );

    const nextProfile = {
      ...profile.value,
      ...response.user,
      intro: response.user.intro ?? editForm.intro,
      avatar: response.user.avatar ?? editForm.avatar,
      role: response.user.role ?? (editForm.role || null),
      nickname: response.user.nickname ?? editForm.nickname,
      updatedAt: new Date().toISOString(),
    } satisfies UserProfile;

    profile.value = nextProfile;
    setUser(nextProfile);
    isEditing.value = false;

    toast.add({
      title: "资料已更新",
      description: "主页和头像小窗都已经同步刷新。",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (saveError) {
    toast.add({
      title: "保存失败",
      description: saveError instanceof Error ? saveError.message : "请稍后再试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    savingProfile.value = false;
  }
}

async function handleAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploadingAvatar.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await $fetch<{ url: string }>("/api/upload", {
      method: "POST",
      body: formData,
    });

    editForm.avatar = response.url;
    toast.add({
      title: "头像已上传",
      description: "保存资料后就会正式更新展示。",
      color: "success",
      icon: "i-lucide-image-up",
    });
  } catch (uploadError) {
    toast.add({
      title: "上传失败",
      description: uploadError instanceof Error ? uploadError.message : "请稍后再试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    uploadingAvatar.value = false;
    if (input) {
      input.value = "";
    }
  }
}

function syncEditForm(user: UserProfile) {
  editForm.nickname = user.nickname;
  editForm.intro = user.intro ?? "";
  editForm.role = user.role ?? "";
  editForm.avatar = user.avatar;
}

function formatDate(value?: string | null) {
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
