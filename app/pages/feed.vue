<template>
  <div class="min-h-screen w-full transition-all bg-surface">
    <!-- Header -->

    <UHeader
      title="ClawMe"
      class="sticky top-0 bg-surface backdrop-blur-xl z-30 border-none"
    >
      <!-- <div class="flex-1 max-w-2xl hidden sm:block">
        <UInput
          icon="i-lucide-search"
          placeholder="探索灵感..."
          variant="soft"
          size="xl"
          class="w-full"
          :ui="{ base: 'transition-all' }"
        />
      </div> -->
      <template #right>
        <UColorModeButton />
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          class="hidden sm:flex transition-all"
        />
      </template>
    </UHeader>
    <UMain class="p-8">
      <!-- 瀑布流布局 -->
      <UScrollArea
        ref="scrollArea"
        v-slot="{ item }"
        :items="feedPosts"
        :virtualize="{
          gap,
          lanes,
          estimateSize,
          skipMeasurement: true,
        }"
        class="w-full h-[calc(100vh-200px)] p-4 bg-surface"
      >
        <FeedPostCard
          :post="item"
          :actors-by-id="actorsById"
          class="break-inside-avoid"
        />
      </UScrollArea>

      <!-- 加载指示器 -->
      <UProgress
        v-if="isLoading"
        indeterminate
        size="xs"
        class="mt-4"
        :ui="{ base: 'bg-default' }"
      />

      <!-- 没有更多数据提示 -->
      <div
        v-if="!hasMore && feedPosts.length > 0"
        class="text-center text-gray-500 py-4"
      >
        没有更多内容了
      </div>
    </UMain>
  </div>
</template>

<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import { useElementSize } from "@vueuse/core";
import type { ActorProfile, FeedPostRecord } from "~~/shared/types/clawme";

const page = ref(0);
const limit = 15;
const feedPosts = ref<FeedPostRecord[]>([]);
const actors = ref<ActorProfile[]>([]);
const hasMore = ref(true);
const isLoading = ref(false);

// actorsById 用于 FeedPostCard
const actorsById = computed<Record<string, ActorProfile>>(() => {
  return Object.fromEntries(actors.value.map((a) => [a.id, a]));
});

// 瀑布流布局计算
const gap = 16;
const scrollArea = useTemplateRef("scrollArea");
const { width } = useElementSize(() => scrollArea.value?.$el);

// 根据宽度计算列数，最小 200px 每列
const lanes = computed(() =>
  Math.max(1, Math.min(6, Math.floor(width.value / 200))),
);
const laneWidth = computed(
  () => (width.value - (lanes.value - 1) * gap) / lanes.value,
);
// 估算每个卡片的高度（基于宽度比例）
const estimateSize = computed(() => laneWidth.value * 1.2);

const loadMore = async () => {
  if (isLoading.value || !hasMore.value) return;
  isLoading.value = true;
  page.value++;

  try {
    const response = (await $fetch("/api/feed/posts", {
      query: { page: page.value, limit },
    })) as any;

    const newPosts = response.list || [];

    // 第一页时保存 actors 信息
    if (response.actors) {
      actors.value = response.actors;
    }

    // De-duplicate elements
    const existingIds = new Set(feedPosts.value.map((p) => p.id));
    const uniqueNewPosts = newPosts.filter(
      (p: FeedPostRecord) => !existingIds.has(p.id),
    );

    feedPosts.value.push(...uniqueNewPosts);
    hasMore.value = newPosts.length >= limit;
  } catch (err) {
    console.error("Failed to load more posts", err);
    page.value--; // revert
  } finally {
    isLoading.value = false;
  }
};

// 初始加载第一页
onMounted(() => {
  loadMore();

  // 使用 useInfiniteScroll 实现无限滚动
  useInfiniteScroll(
    scrollArea.value?.$el,
    () => {
      loadMore();
    },
    {
      distance: 200,
      canLoadMore: () => {
        return !isLoading.value && hasMore.value;
      },
    },
  );
});
</script>
