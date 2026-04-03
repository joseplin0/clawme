<template>
  <div class="min-h-screen w-full bg-default">
    <!-- 顶栏 -->
    <header
      class="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 backdrop-blur-xl bg-default/80 border-b border-default/50"
    >
      <!-- 移动端侧栏按钮占位（桌面侧栏已有） -->
      <div class="flex-1 flex items-center gap-2">
        <!-- 搜索框 -->
        <div class="flex-1 max-w-72">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="探索灵感..."
            variant="soft"
            size="sm"
            class="w-full rounded-full"
            :ui="{ base: 'rounded-full' }"
          />
        </div>
      </div>

      <!-- 右侧操作 -->
      <div class="flex items-center gap-1.5">
        <UColorModeButton size="sm" variant="ghost" color="neutral" />
        <UButton
          icon="i-lucide-sliders-horizontal"
          size="sm"
          variant="ghost"
          color="neutral"
          class="rounded-full"
        />
      </div>
    </header>

    <!-- 分类 Tab -->
    <div class="sticky top-14 z-20 bg-default/80 backdrop-blur-xl border-b border-default/30">
      <div class="flex gap-0.5 px-4 py-2 overflow-x-auto scrollbar-hide">
        <UButton
          v-for="tab in tabs"
          :key="tab.value"
          :label="tab.label"
          size="sm"
          :variant="activeTab === tab.value ? 'solid' : 'ghost'"
          :color="activeTab === tab.value ? 'primary' : 'neutral'"
          class="rounded-full shrink-0 text-xs px-3"
          @click="activeTab = tab.value"
        />
      </div>
    </div>

    <!-- 瀑布流主体 -->
    <main ref="mainRef" class="px-2 py-3 pb-24 md:pb-6">
      <!-- 瀑布流容器 - CSS columns 方案 -->
      <div
        class="masonry-grid"
        :style="masonryStyle"
      >
        <MomentCard
          v-for="item in moments"
          :key="item.id"
          :moment="item"
          :users-by-id="usersById"
          class="masonry-item mb-2"
        />
      </div>

      <!-- 加载中 -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <div class="flex items-center gap-2 text-muted text-sm">
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>

      <!-- 没有更多 -->
      <div
        v-if="!hasMore && moments.length > 0 && !isLoading"
        class="flex items-center gap-3 py-8 px-6"
      >
        <div class="h-px flex-1 bg-default/60" />
        <span class="text-xs text-muted shrink-0">没有更多了</span>
        <div class="h-px flex-1 bg-default/60" />
      </div>

      <!-- 空状态 -->
      <div
        v-if="!isLoading && moments.length === 0"
        class="flex flex-col items-center justify-center py-24 gap-4"
      >
        <UIcon name="i-lucide-wind" class="size-12 text-muted opacity-40" />
        <p class="text-sm text-muted">暂无内容</p>
      </div>
    </main>

    <!-- 无限滚动触发器 -->
    <div ref="infiniteRef" class="h-4" />
  </div>
</template>

<script setup lang="ts">
import { useInfiniteScroll, useElementSize } from "@vueuse/core";
import type { UserProfile, MomentRecord } from "~~/shared/types/clawme";

const page = ref(0);
const limit = 20;
const moments = ref<MomentRecord[]>([]);
const users = ref<UserProfile[]>([]);
const hasMore = ref(true);
const isLoading = ref(false);
const searchQuery = ref("");
const activeTab = ref("recommend");
const mainRef = useTemplateRef("mainRef");
const infiniteRef = useTemplateRef("infiniteRef");

const tabs = [
  { label: "推荐", value: "recommend" },
  { label: "关注", value: "follow" },
  { label: "附近", value: "nearby" },
  { label: "AI", value: "ai" },
  { label: "生活", value: "life" },
  { label: "美食", value: "food" },
];

// usersById 用于 MomentCard
const usersById = computed<Record<string, UserProfile>>(() => {
  return Object.fromEntries(users.value.map((u) => [u.id, u]));
});

// 响应式列数计算
const { width } = useElementSize(mainRef);
const columns = computed(() => {
  if (width.value < 400) return 2;
  if (width.value < 640) return 2;
  if (width.value < 900) return 3;
  if (width.value < 1200) return 4;
  return 5;
});

const masonryStyle = computed(() => ({
  columnCount: columns.value,
  columnGap: "8px",
}));

const loadMore = async () => {
  if (isLoading.value || !hasMore.value) return;
  isLoading.value = true;
  page.value++;

  try {
    const response = (await $fetch("/api/moment", {
      query: { page: page.value, limit },
    })) as any;

    const newMoments = response.list || [];

    if (response.users) {
      users.value = [...users.value, ...response.users].filter(
        (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i,
      );
    }

    const existingIds = new Set(moments.value.map((p) => p.id));
    const uniqueNewMoments = newMoments.filter(
      (p: MomentRecord) => !existingIds.has(p.id),
    );

    moments.value.push(...uniqueNewMoments);
    hasMore.value = newMoments.length >= limit;
  } catch (err) {
    console.error("Failed to load more moments", err);
    page.value--;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadMore();

  useInfiniteScroll(
    window,
    () => loadMore(),
    {
      distance: 300,
      canLoadMore: () => !isLoading.value && hasMore.value,
    },
  );
});
</script>

<style scoped>
.masonry-grid {
  column-fill: balance;
}

.masonry-item {
  break-inside: avoid;
  display: block;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
