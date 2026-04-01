<template>
  <article
    class="xhs-card group cursor-pointer rounded-2xl overflow-hidden bg-elevated transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
    @click="handleClick"
  >
    <!-- 图片区域 -->
    <div v-if="heroImage" class="relative overflow-hidden">
      <img
        :src="heroImage.src"
        :alt="heroImage.alt || ''"
        class="w-full object-cover transition-transform duration-500 group-hover:scale-105"
        :style="imageStyle"
        loading="lazy"
      />
      <!-- 渐变遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>

    <!-- 无图片时的纯文字卡片 -->
    <div v-else class="relative overflow-hidden min-h-[80px]">
      <div
        class="absolute inset-0 opacity-20"
        :style="{ background: `linear-gradient(135deg, ${cardColor}22, ${cardColor}08)` }"
      />
    </div>

    <!-- 内容区域 -->
    <div class="p-3 pb-2.5 space-y-1.5">
      <!-- 标题/正文 -->
      <p class="text-sm font-medium text-default leading-snug line-clamp-2">
        {{ moment.title || moment.text || primaryAuthor?.nickname || 'Clawme 更新' }}
      </p>

      <!-- 作者 + 互动 -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <!-- 头像 -->
          <UAvatar
            :text="avatarText"
            size="xs"
            :ui="{ root: 'shrink-0', fallback: 'text-[10px] font-semibold' }"
            :style="{ background: cardColor + '33', color: cardColor }"
          />
          <span class="text-xs text-muted truncate">{{ primaryAuthor?.nickname || '匿名' }}</span>
        </div>

        <!-- 点赞数（模拟） -->
        <div class="flex items-center gap-1 shrink-0 text-muted transition-colors group-hover:text-primary">
          <UIcon name="i-lucide-heart" class="size-3.5" />
          <span class="text-[11px]">{{ likeCount }}</span>
        </div>
      </div>
    </div>

    <!-- 标签 Badge -->
    <div v-if="badge?.label" class="absolute top-2 left-2">
      <UBadge
        :label="badge.label"
        :color="badge.color"
        variant="solid"
        size="xs"
        class="backdrop-blur-sm bg-opacity-80"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { UserProfile, MomentRecord } from "~~/shared/types/clawme";

const props = defineProps<{
  moment: MomentRecord;
  usersById: Record<string, UserProfile>;
}>();

const moment = computed(() => props.moment);

const isUserProfile = (
  user: UserProfile | undefined,
): user is UserProfile => Boolean(user);

const primaryAuthor = computed(
  () => props.usersById[moment.value.primaryAuthorId],
);

const avatarText = computed(
  () => primaryAuthor.value?.nickname?.slice(0, 1) ?? "?",
);

// 根据 id 生成固定的卡片强调色
const cardColor = computed(() => {
  const colors = [
    "#ff5a5f", "#ff8c42", "#ffbf11", "#67c23a",
    "#10cf80", "#0ea5e9", "#8b5cf6", "#ec4899",
    "#f43f5e", "#14b8a6",
  ];
  const hash = moment.value.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
});

// 互动数（基于 id hash 模拟）
const likeCount = computed(() => {
  const hash = moment.value.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 500 + 1;
});

const badgeColor = computed<"info" | "neutral">(() =>
  primaryAuthor.value?.type === "bot" ? "info" : "neutral",
);

const badge = computed(() => ({
  label: moment.value.context,
  color: badgeColor.value,
}));

const heroImage = computed(() => {
  const attachment = moment.value.attachments[0];
  if (!attachment?.url) return undefined;
  return {
    src: attachment.url,
    alt: moment.value.title || attachment.title || moment.value.context,
    width: attachment.width,
    height: attachment.height,
  };
});

// 图片样式：保持宽高比，但限制最大最小高度
const imageStyle = computed(() => {
  if (!heroImage.value?.width || !heroImage.value?.height) {
    return { aspectRatio: "4/3" };
  }
  const ratio = heroImage.value.height / heroImage.value.width;
  // 控制比例在 0.6 ~ 1.8 之间
  const clampedRatio = Math.min(1.8, Math.max(0.6, ratio));
  return { aspectRatio: `${1 / clampedRatio}` };
});

function handleClick() {
  // TODO: 跳转详情页
}
</script>

<style scoped>
.xhs-card {
  position: relative;
  break-inside: avoid;
}
</style>
