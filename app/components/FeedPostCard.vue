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

const primaryAuthor = computed(() => props.actorsById[props.post.primaryAuthorId]);
const coAuthors = computed(() =>
  props.post.coAuthorIds.map((id) => props.actorsById[id]).filter(Boolean),
);

const authors = computed(() => {
  const allAuthors = [primaryAuthor.value, ...coAuthors.value].filter(Boolean);

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
        wrapper:
          author.type === "BOT"
            ? "bg-gradient-to-br from-clawme-500 to-amber-300"
            : "bg-gradient-to-br from-sky-500 to-cyan-400",
      },
    },
  }));
});

const badge = computed(() => ({
  label: post.context,
  color: primaryAuthor.value?.type === "BOT" ? "info" : "neutral",
  variant: "subtle" as const,
}));

const heroImage = computed(() => {
  const attachment = props.post.attachments[0];
  const title = encodeURIComponent(attachment?.title || props.post.title || "Clawme");
  const subtitle = encodeURIComponent(attachment?.subtitle || props.post.context);
  const toneA = attachment?.kind === "IMAGE" ? "#eec27b" : "#e05d44";
  const toneB = attachment?.kind === "IMAGE" ? "#f7ede1" : "#ffd8cb";
  const icon = attachment?.kind === "IMAGE" ? "Preview" : "Document";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${toneA}" />
          <stop offset="100%" stop-color="${toneB}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="48" fill="url(#g)" />
      <circle cx="980" cy="180" r="150" fill="rgba(255,255,255,0.35)" />
      <circle cx="150" cy="740" r="210" fill="rgba(255,255,255,0.2)" />
      <rect x="96" y="120" width="1008" height="660" rx="36" fill="rgba(255,255,255,0.72)" />
      <text x="150" y="270" font-size="48" font-family="ui-sans-serif, system-ui" fill="#6d2b20">${icon}</text>
      <text x="150" y="380" font-size="72" font-weight="700" font-family="ui-sans-serif, system-ui" fill="#231815">${title}</text>
      <text x="150" y="470" font-size="34" font-family="ui-sans-serif, system-ui" fill="#6b5f5b">${subtitle}</text>
    </svg>
  `.trim();

  return {
    src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    alt: props.post.title || props.post.context,
  };
});
</script>
