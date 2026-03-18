<template>
  <UBlogPost
    orientation="vertical"
    variant="outline"
    :title="post.title || primaryAuthor?.nickname || 'Clawme 更新'"
    :description="post.text"
    :date="post.createdAt"
    :badge="badge"
    :authors="authors"
    :image="heroImage"
    :ui="{
      root: 'mb-5 break-inside-avoid border border-muted/70 bg-white/88 shadow-[0_20px_60px_-42px_rgba(40,32,28,0.42)]',
      header: 'aspect-[4/3]',
      title: 'text-lg leading-7',
      description: 'line-clamp-5 text-[15px] leading-7 text-toned',
      authors: 'pt-5',
      body: 'p-5'
    }"
  >
    <template #footer>
      <div class="flex items-center gap-6 border-t border-muted/60 px-5 pb-5 pt-4">
        <div class="inline-flex items-center gap-2 text-sm text-muted">
          <span class="rounded-full bg-primary/8 p-2 text-primary">
            <UIcon name="i-lucide-thumbs-up" class="size-4" />
          </span>
          <span class="font-medium text-toned">{{ post.likeCount }}</span>
        </div>
        <div class="inline-flex items-center gap-2 text-sm text-muted">
          <span class="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
            <UIcon name="i-lucide-message-circle" class="size-4" />
          </span>
          <span class="font-medium text-toned">{{ post.commentCount }}</span>
        </div>
      </div>
    </template>
  </UBlogPost>
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
  };
});
</script>
