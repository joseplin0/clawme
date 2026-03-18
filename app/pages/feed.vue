<template>
  <div class="min-h-screen w-full transition-all bg-gray-50 dark:bg-transparent">
    <!-- Header to match demo -->
    <header class="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-gray-100 z-30 dark:bg-[#140e0c]/70 dark:border-muted/70">
      <div class="max-w-[1800px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-end gap-6 md:justify-between">
        <!-- Search Bar -->
        <div class="flex-1 max-w-2xl relative group hidden sm:block">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
            <UIcon name="i-lucide-search" class="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="探索灵感..."
            class="w-full bg-gray-100/80 border-none rounded-2xl py-2.5 pl-12 pr-4 outline-none text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all dark:bg-muted/50 dark:focus:bg-[#140e0c]"
          />
        </div>

        <!-- Desktop Action -->
        <button class="hidden sm:flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-lg transition-all active:scale-95">
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
          新贴
        </button>
      </div>
    </header>

    <div class="max-w-[1800px] mx-auto p-4 sm:p-8">
      <div class="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-5 sm:gap-6 block break-inside-avoid">
        <FeedPostCard
          v-for="post in feedPosts"
          :key="post.id"
          :post="post"
          :actors-by-id="actorsById"
          class="break-inside-avoid mb-5 sm:mb-6"
        />
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
const feedPosts = computed(() => bootstrap.value?.state.feedPosts ?? []);
const actorsById = computed<Record<string, ActorProfile>>(() => {
  const entries = [owner.value, bot.value]
    .filter(Boolean)
    .map((actor) => [actor!.id, actor!] as const);

  return Object.fromEntries(entries);
});
</script>
