<template>
  <a
    :href="pin.sourceUrl"
    target="_blank"
    rel="noreferrer"
    class="pin-card group block cursor-pointer overflow-hidden rounded-2xl bg-elevated transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
  >
    <article class="relative">
      <div v-if="previewImageUrl" class="relative overflow-hidden">
        <img
          :src="previewImageUrl"
          :alt="pin.title || pin.siteName || pin.domain || ''"
          class="w-full object-cover transition-transform duration-500 group-hover:scale-105"
          :style="imageStyle"
          loading="lazy"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div v-else class="relative overflow-hidden min-h-[160px]">
        <div
          class="absolute inset-0 opacity-25"
          :style="{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)` }"
        />
        <div class="absolute inset-0 flex items-end p-3">
          <div class="rounded-2xl bg-white/80 px-3 py-2 text-[11px] font-medium text-stone-600 backdrop-blur-sm">
            {{ fallbackLabel }}
          </div>
        </div>
      </div>

      <div class="p-3 pb-2.5 space-y-2">
        <div class="space-y-1">
          <p class="line-clamp-2 text-sm font-medium leading-snug text-default">
            {{ pin.title || pin.siteName || pin.domain || "未命名收藏" }}
          </p>

          <p v-if="pin.description || pin.note" class="line-clamp-2 text-xs leading-5 text-muted">
            {{ pin.note || pin.description }}
          </p>
        </div>

        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 space-y-0.5">
            <p class="truncate text-xs font-medium text-default">
              {{ pin.siteName || "未知来源" }}
            </p>
            <p class="truncate text-[11px] text-muted">
              {{ pin.domain || hostnameFromUrl(pin.sourceUrl) || pin.sourceUrl }}
            </p>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-1">
            <UBadge
              :label="statusLabel"
              :color="statusColor"
              variant="subtle"
              size="xs"
              class="rounded-full"
            />
            <span class="text-[10px] text-muted">
              {{ previewModeLabel }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 border-t border-default/60 pt-2">
          <span class="truncate text-[11px] text-muted">
            {{ formatDate(pin.createdAt) }}
          </span>
          <span class="truncate text-[11px] text-muted">
            {{ pin.sourceType || "chat_intent" }}
          </span>
        </div>
      </div>

      <div class="absolute left-2 top-2">
        <UBadge
          v-if="pin.status && pin.status !== 'ready'"
          :label="statusLabel"
          color="warning"
          variant="solid"
          size="xs"
          class="rounded-full backdrop-blur-sm"
        />
      </div>
    </article>
  </a>
</template>

<script setup lang="ts">
import type { PinRecord } from "~~/shared/types/clawme";

const props = defineProps<{
  pin: PinRecord;
}>();

const pin = computed(() => props.pin);

const accentColor = computed(() => {
  const palette = [
    "#ff5a5f",
    "#ff8c42",
    "#ffbf11",
    "#67c23a",
    "#10cf80",
    "#0ea5e9",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#14b8a6",
  ];

  const hash = pin.value.id
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return palette[hash % palette.length];
});

const previewImageUrl = computed(() => {
  return pin.value.previewUrl || "";
});

const imageStyle = computed(() => {
  const width = pin.value.previewWidth || 1000;
  const height = pin.value.previewHeight || 1400;
  return {
    aspectRatio: `${width} / ${height}`,
  };
});

const statusLabel = computed(() => {
  switch (pin.value.status) {
    case "failed":
      return "采集失败";
    case "ready":
      return "已入库";
    default:
      return "处理中";
  }
});

const statusColor = computed<"success" | "warning" | "neutral" | "error">(() => {
  switch (pin.value.status) {
    case "ready":
      return "success";
    case "failed":
      return "error";
    default:
      return "warning";
  }
});

const previewModeLabel = computed(() => {
  switch (pin.value.previewMode) {
    case "fetched":
      return "远程图缓存";
    case "generated":
      return "生成封面";
    default:
      return "默认封面";
  }
});

const fallbackLabel = computed(() => {
  return pin.value.siteName || pin.value.domain || "收藏内容";
});

function hostnameFromUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
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

<style scoped>
.pin-card {
  position: relative;
  break-inside: avoid;
}
</style>
