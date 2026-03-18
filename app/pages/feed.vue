<template>
  <div class="min-h-full w-full overflow-y-auto bg-transparent px-4 py-5 md:px-6 lg:px-8">
    <div class="columns-2 gap-5 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
      <FeedPostCard
        v-for="post in feedPosts"
        :key="post.id"
        :post="post"
        :actors-by-id="actorsById"
      />
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
