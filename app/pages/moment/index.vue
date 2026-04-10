<template>
  <div class="min-h-screen w-full bg-default">
    <header
      class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-default/50 bg-default/80 px-4 backdrop-blur-xl"
    >
      <div class="flex flex-1 items-center gap-2">
        <div class="w-full max-w-72 flex-1">
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

    <div class="sticky top-14 z-20 border-b border-default/30 bg-default/80 backdrop-blur-xl">
      <div class="flex gap-0.5 overflow-x-auto px-4 py-2 scrollbar-hide">
        <UButton
          v-for="tab in tabs"
          :key="tab.value"
          :label="tab.label"
          size="sm"
          :variant="activeTab === tab.value ? 'solid' : 'ghost'"
          :color="activeTab === tab.value ? 'primary' : 'neutral'"
          class="shrink-0 rounded-full px-3 text-xs"
          @click="selectTab(tab.value)"
        />
      </div>
    </div>

    <main ref="mainRef" class="px-2 py-3 pb-24 md:pb-6">
      <div class="masonry-grid" :style="masonryStyle">
        <template v-if="activeTab === 'moments'">
          <MomentCard
            v-for="item in moments.items"
            :key="item.id"
            :moment="item"
            :users-by-id="usersById"
            class="masonry-item mb-2"
          />
        </template>

        <template v-else>
          <PinCard
            v-for="item in pins.items"
            :key="item.id"
            :pin="item"
            class="masonry-item mb-2"
          />
        </template>
      </div>

      <div v-if="activeFeed.isLoading" class="flex justify-center py-8">
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>

      <div
        v-if="!activeFeed.hasMore && activeFeed.items.length > 0 && !activeFeed.isLoading"
        class="flex items-center gap-3 px-6 py-8"
      >
        <div class="h-px flex-1 bg-default/60" />
        <span class="shrink-0 text-xs text-muted">没有更多了</span>
        <div class="h-px flex-1 bg-default/60" />
      </div>

      <div
        v-if="!activeFeed.isLoading && activeFeed.items.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-24"
      >
        <UIcon
          :name="activeTab === 'moments' ? 'i-lucide-wind' : 'i-lucide-bookmark-plus'"
          class="size-12 text-muted opacity-40"
        />
        <p class="text-sm text-muted">
          {{ activeTab === "moments" ? "暂无内容" : "还没有采集内容" }}
        </p>
      </div>
    </main>

    <div ref="infiniteRef" class="h-4" />
  </div>
</template>

<script setup lang="ts">
import { useElementSize, useInfiniteScroll } from "@vueuse/core";
import type {
  MomentRecord,
  PaginatedListResponse,
  PinRecord,
  UserProfile,
} from "~~/shared/types/clawme";

type FeedTab = "moments" | "pins";

interface PaginatedResponse<T> {
  list?: T[];
  total?: number;
  pageNum?: number;
  pageSize?: number;
  users?: UserProfile[];
}

interface FeedState<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  initialized: boolean;
}

const route = useRoute();
const router = useRouter();

const pageSize = 20;
const searchQuery = ref("");
const mainRef = useTemplateRef("mainRef");
const infiniteRef = useTemplateRef("infiniteRef");

const tabs: Array<{ label: string; value: FeedTab }> = [
  { label: "动态", value: "moments" },
  { label: "采集", value: "pins" },
];

const moments = reactive<FeedState<MomentRecord>>({
  items: [],
  page: 0,
  hasMore: true,
  isLoading: false,
  initialized: false,
});

const pins = reactive<FeedState<PinRecord>>({
  items: [],
  page: 0,
  hasMore: true,
  isLoading: false,
  initialized: false,
});

const users = ref<UserProfile[]>([]);

const activeTab = computed<FeedTab>(() => {
  return route.query.tab === "pins" ? "pins" : "moments";
});

const activeFeed = computed(() => {
  return activeTab.value === "moments" ? moments : pins;
});

const usersById = computed<Record<string, UserProfile>>(() => {
  return Object.fromEntries(users.value.map((user) => [user.id, user]));
});

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

function selectTab(tab: FeedTab) {
  if (tab === activeTab.value) {
    return;
  }

  router.push({
    query: {
      ...route.query,
      tab,
    },
  });
}

function getFeedState(tab: FeedTab) {
  return tab === "moments" ? moments : pins;
}

async function loadMoreMoments() {
  if (moments.isLoading || !moments.hasMore) {
    return;
  }

  moments.isLoading = true;
  const nextPage = moments.page + 1;

  try {
    const response = await $fetch<PaginatedResponse<MomentRecord>>("/api/moment", {
      query: {
        page: nextPage,
        limit: pageSize,
      },
    });

    const nextItems = response.list ?? [];
    const existingIds = new Set(moments.items.map((item) => item.id));
    const uniqueNextItems = nextItems.filter((item) => !existingIds.has(item.id));

    moments.items.push(...uniqueNextItems);
    moments.page = nextPage;
    moments.initialized = true;
    moments.hasMore =
      typeof response.total === "number"
        ? response.total > moments.items.length
        : nextItems.length >= pageSize;

    if (response.users) {
      users.value = [...users.value, ...response.users].filter(
        (user, index, array) => array.findIndex((item) => item.id === user.id) === index,
      );
    }
  } catch (error) {
    console.error("Failed to load more moments", error);
    moments.page = Math.max(0, moments.page - 1);
  } finally {
    moments.isLoading = false;
  }
}

async function loadMorePins() {
  if (pins.isLoading || !pins.hasMore) {
    return;
  }

  pins.isLoading = true;
  const nextPage = pins.page + 1;

  try {
    const response = await $fetch<PaginatedListResponse<PinRecord>>("/api/pins", {
      query: {
        page: nextPage,
        limit: pageSize,
      },
    });

    const nextItems = response.list ?? [];
    const existingIds = new Set(pins.items.map((item) => item.id));
    const uniqueNextItems = nextItems.filter((item) => !existingIds.has(item.id));

    pins.items.push(...uniqueNextItems);
    pins.page = nextPage;
    pins.initialized = true;
    pins.hasMore =
      typeof response.total === "number"
        ? response.total > pins.items.length
        : nextItems.length >= pageSize;
  } catch (error) {
    console.error("Failed to load more pins", error);
    pins.page = Math.max(0, pins.page - 1);
    pins.initialized = true;
    pins.hasMore = false;
  } finally {
    pins.isLoading = false;
  }
}

async function ensureActiveFeedLoaded(tab: FeedTab) {
  const feed = getFeedState(tab);
  if (feed.initialized || feed.isLoading) {
    return;
  }

  if (tab === "moments") {
    await loadMoreMoments();
  } else {
    await loadMorePins();
  }
}

async function loadMoreActiveFeed() {
  if (activeTab.value === "moments") {
    await loadMoreMoments();
    return;
  }

  await loadMorePins();
}

watch(
  activeTab,
  async (tab) => {
    await ensureActiveFeedLoaded(tab);
  },
  { immediate: true },
);

onMounted(() => {
  useInfiniteScroll(
    window,
    () => loadMoreActiveFeed(),
    {
      distance: 300,
      canLoadMore: () => !activeFeed.value.isLoading && activeFeed.value.hasMore,
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
