<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">用户列表</h2>
        <p class="mt-1 text-sm text-muted">管理系统中的所有用户</p>
      </div>
    </div>

    <div class="space-y-4">
      <UCard
        v-for="user in users"
        :key="user.id"
        class="hover:border-primary/50 transition-colors"
      >
        <div class="flex items-start gap-4">
          <UAvatar size="lg" />
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-3">
              <p class="text-base font-semibold text-highlighted">
                {{ user.nickname || "未设置昵称" }}
              </p>
              <UBadge
                :color="user.type === 'human' ? 'success' : 'primary'"
                variant="subtle"
                size="sm"
              >
                {{ user.type === "human" ? "HUMAN" : "BOT" }}
              </UBadge>
              <UBadge
                v-if="user.role === 'OWNER'"
                color="warning"
                variant="subtle"
                size="sm"
              >
                Owner
              </UBadge>
            </div>
            <p class="text-sm text-muted mb-4">@{{ user.username }}</p>

            <div v-if="editingId === user.id" class="space-y-4">
              <UFormField label="昵称" :name="`user-${user.id}-nickname`">
                <UInput v-model="editForm.nickname" placeholder="输入昵称" />
              </UFormField>
              <UFormField
                v-if="user.type === 'bot'"
                label="角色"
                :name="`user-${user.id}-role`"
              >
                <UInput v-model="editForm.role" placeholder="输入角色" />
              </UFormField>
              <UFormField
                v-if="user.type === 'bot'"
                label="系统提示词"
                :name="`user-${user.id}-intro`"
              >
                <UTextarea
                  v-model="editForm.intro"
                  :rows="4"
                  placeholder="输入系统提示词"
                />
              </UFormField>
              <div class="flex gap-2 pt-2">
                <UButton :loading="saving" @click="saveUser(user.id)">
                  保存
                </UButton>
                <UButton
                  variant="outline"
                  color="neutral"
                  @click="cancelEdit"
                >
                  取消
                </UButton>
              </div>
            </div>

            <div v-else class="text-sm text-toned">
              <p v-if="user.role && user.type === 'bot'">{{ user.role }}</p>
              <p v-if="user.intro" class="mt-1 line-clamp-2">{{ user.intro }}</p>
            </div>
          </div>
          <UButton
            v-if="editingId !== user.id"
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            @click="startEdit(user)"
          >
            编辑
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="users.length === 0" class="border border-dashed p-8 text-center">
      <p class="text-base font-medium text-highlighted">暂无用户</p>
      <p class="mt-2 text-sm text-muted">请先完成系统引导来创建用户。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserProfile } from "~~/shared/types/clawme";

const toast = useToast();

const { data: users, refresh } = await useFetch<UserProfile[]>("/api/users", {
  lazy: true,
  default: () => [],
});

const editingId = ref<string | null>(null);
const saving = ref(false);

const editForm = reactive({
  nickname: "",
  role: "",
  intro: "",
});

function startEdit(user: UserProfile) {
  editingId.value = user.id;
  editForm.nickname = user.nickname;
  editForm.role = user.role ?? "";
  editForm.intro = user.intro ?? "";
}

function cancelEdit() {
  editingId.value = null;
  editForm.nickname = "";
  editForm.role = "";
  editForm.intro = "";
}

async function saveUser(userId: string) {
  saving.value = true;
  try {
    const body: Record<string, string> = {
      nickname: editForm.nickname,
    };

    const user = users.value?.find((u) => u.id === userId);
    if (user?.type === "bot") {
      body.role = editForm.role;
      body.intro = editForm.intro;
    }

    await $fetch(`/api/users/${userId}`, {
      method: "PUT",
      body,
    });
    toast.add({
      title: "保存成功",
      description: "用户信息已更新。",
      color: "success",
      icon: "i-lucide-check",
    });
    editingId.value = null;
    await refresh();
  } catch (error) {
    toast.add({
      title: "保存失败",
      description: error instanceof Error ? error.message : "请稍后重试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    saving.value = false;
  }
}
</script>
