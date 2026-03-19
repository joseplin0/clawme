<template>
  <div class="min-h-screen w-full transition-all">
    <!-- Header -->
    <header class="sticky top-0 bg-background/70 backdrop-blur-xl  z-30">
      <div class="max-w-[1800px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-end gap-6 md:justify-between">
        <div class="flex-1 max-w-2xl hidden sm:block">
          <UInput icon="i-lucide-search" placeholder="探索灵感..." variant="soft" size="xl" class="w-full"
            :ui="{ base: 'transition-all' }" />
        </div>
        <UButton icon="i-lucide-plus" label="新贴" size="lg"
          class="hidden sm:flex font-bold transition-all active:scale-95" />
      </div>
    </header>

    <div class="max-w-[1800px] mx-auto p-4 sm:p-8">
      <!-- 零数据：绝美全屏空状态 -->
      <div v-if="feedPosts.length === 0"
        class="flex flex-col items-center justify-center py-32 px-4 text-center animate-in fade-in zoom-in duration-700">
        <div class="w-24 h-24 mb-6 bg-primary/10 flex items-center justify-center text-primary">
          <UIcon name="i-lucide-sparkles" class="w-10 h-10" />
        </div>
        <h2 class="text-2xl font-black text-foreground mb-3">这里还是一片荒野</h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
          当系统刚点亮时，瀑布流总是干涸的。你可以在这里留下你的第一个想法，建立你的超级大脑和数字领地。
        </p>
        <UButton icon="i-lucide-pen-line" label="发布第一条灵感" size="xl"
          class="flex font-bold hover:-translate-y-1 transition-all active:scale-95" />
      </div>

      <!-- 有数据：瀑布流与补充占位符 -->
      <div v-else :class="masonryClass">
        <FeedPostCard v-for="post in feedPosts" :key="post.id" :post="post" :actors-by-id="actorsById"
          class="break-inside-avoid mb-5 sm:mb-6" />

        <!-- 数据不足时：常驻的“补充灵感”输入卡片 -->
        <div v-if="feedPosts.length > 0 && feedPosts.length < 5" class="break-inside-avoid mb-5 sm:mb-6">
          <div
            class="group flex flex-col items-center justify-center p-8 h-64 border-2 border-dashed transition-all duration-300 cursor-pointer text-center hover:border-primary/50 hover:text-primary">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UIcon name="i-lucide-plus" class="w-6 h-6" />
            </div>
            <span
              class="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">继续填充灵感</span>
            <span class="text-xs mt-2 opacity-60">丰富你的瀑布流视野</span>
          </div>
        </div>
      </div>

      <!-- 数据充足时，提供一个加载触发点和 Loading 状态 -->
      <div v-if="feedPosts.length > 0" class="w-full flex justify-center mt-8 mb-12">
        <div ref="loadMoreTrigger" class="h-10 w-full flex items-center justify-center">
          <UIcon v-if="isLoading" name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
          <span v-else-if="!hasMore" class="text-sm text-gray-400 dark:text-muted/70">已经到底啦</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActorProfile, PublicStateResponse } from "~~/shared/types/clawme";

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");

if (!bootstrap.value) {
  bootstrap.value = await $fetch("/api/system/bootstrap");
}

const owner = computed(() => bootstrap.value?.state.owner ?? null);
const bot = computed(() => bootstrap.value?.state.bot ?? null);

const page = ref(1);
const limit = 15;
const feedPosts = ref<FeedPostRecord[]>([]);

if (bootstrap.value?.state.feedPosts) {
  feedPosts.value = [...bootstrap.value.state.feedPosts];
}

const hasMore = ref(feedPosts.value.length >= limit);
const isLoading = ref(false);
const loadMoreTrigger = ref<HTMLElement | null>(null);

const loadMore = async () => {
  if (isLoading.value || !hasMore.value) return;
  isLoading.value = true;
  page.value++;

  try {
    const response = await $fetch('/api/feed/posts', {
      query: { page: page.value, limit }
    }) as any;

    const newPosts = response.posts || [];

    // De-duplicate elements
    const existingIds = new Set(feedPosts.value.map(p => p.id));
    const uniqueNewPosts = newPosts.filter((p: FeedPostRecord) => !existingIds.has(p.id));

    feedPosts.value.push(...uniqueNewPosts);
    hasMore.value = response.hasMore;
  } catch (err) {
    console.error('Failed to load more posts', err);
    page.value--; // revert
  } finally {
    isLoading.value = false;
  }
};

let observer: IntersectionObserver | null = null;
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMore();
    }
  }, { rootMargin: '200px' });

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value);
  }
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
});

const displayCount = computed(() => {
  if (feedPosts.value.length === 0) return 0;
  return feedPosts.value.length < 5 ? feedPosts.value.length + 1 : feedPosts.value.length;
});

const masonryClass = computed(() => {
  const count = displayCount.value;
  const baseClasses = 'masonry-grid gap-5 sm:gap-6 block break-inside-avoid mx-auto transition-all duration-500 ';

  if (count <= 1) {
    return baseClasses + 'columns-1 max-w-md';
  } else if (count === 2) {
    return baseClasses + 'columns-1 sm:columns-2 max-w-2xl';
  } else if (count === 3) {
    return baseClasses + 'columns-1 sm:columns-2 md:columns-3 max-w-4xl';
  } else if (count === 4) {
    return baseClasses + 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 max-w-6xl';
  } else {
    // 数据充足时（>=5条，包含真实数据），开启全量响应式瀑布流
    return baseClasses + 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6';
  }
});

const actorsById = computed<Record<string, ActorProfile>>(() => {
  const entries = [owner.value, bot.value]
    .filter(Boolean)
    .map((actor) => [actor!.id, actor!] as const);

  return Object.fromEntries(entries);
});
</script>
