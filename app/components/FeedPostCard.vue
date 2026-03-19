<template>
  <UBlogPost
    orientation="vertical"
    variant="outline"
    class="hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border-muted"
    :ui="{ 
      image: 'aspect-auto h-auto object-cover'
    }"
    :title="post.title || primaryAuthor?.nickname || 'Clawme 更新'"
    :description="post.text"
    :date="post.createdAt"
    :badge="badge"
    :authors="authors"
    :image="heroImage"
  />
</template>

<script setup lang="ts">
import type { ActorProfile, FeedPostRecord } from "~~/shared/types/clawme";

const props = defineProps<{
  post: FeedPostRecord;
  actorsById: Record<string, ActorProfile>;
}>();

const isActorProfile = (
  actor: ActorProfile | undefined,
): actor is ActorProfile => Boolean(actor);

const primaryAuthor = computed(() => props.actorsById[props.post.primaryAuthorId]);
const coAuthors = computed(() =>
  props.post.coAuthorIds.map((id) => props.actorsById[id]).filter(isActorProfile),
);

const authors = computed(() => {
  const allAuthors = [primaryAuthor.value, ...coAuthors.value].filter(isActorProfile);

  return allAuthors.map((author) => ({
    name: author.nickname,
    description:
      author.type === "BOT"
        ? `${author.role || "本地助理"} · @${author.username}`
        : `主理人 · @${author.username}`,
    avatar: {
      alt: author.nickname,
      text: author.nickname.slice(0, 1),
      ui: {
        root:
          author.type === "BOT"
            ? "bg-gradient-to-br from-clawme-500 to-amber-300"
            : "bg-gradient-to-br from-sky-500 to-cyan-400",
      },
    },
  }));
});

const badgeColor = computed<"info" | "neutral">(() =>
  primaryAuthor.value?.type === "BOT" ? "info" : "neutral",
);

const badge = computed(() => ({
  label: props.post.context,
  color: badgeColor.value,
  variant: "subtle" as const,
}));

const heroImage = computed(() => {
  const attachment = props.post.attachments[0];

  if (!attachment?.url) {
    return undefined;
  }

  return {
    src: attachment.url,
    alt: props.post.title || attachment.title || props.post.context,
    width: attachment.width,
    height: attachment.height,
  };
});
</script>

<style scoped>
:deep([class*="aspect-"]) {
  aspect-ratio: auto !important;
}
:deep(img) {
  height: auto !important;
  object-fit: contain !important; /* or cover */
  width: 100% !important;
}
</style>
