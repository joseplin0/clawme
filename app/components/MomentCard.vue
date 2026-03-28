<template>
  <UBlogPost
    orientation="vertical"
    variant="outline"
    :ui="{
      root: 'bg-surface-container-lowest rounded-lg overflow-hidden transition-all duration-300',
      image: 'aspect-auto h-auto object-cover',
    }"
    :title="moment.title || primaryAuthor?.nickname || 'Clawme 更新'"
    :description="moment.text"
    :date="moment.createdAt"
    :badge="badge"
    :authors="authors"
    :image="heroImage"
  />
</template>

<script setup lang="ts">
import type { ActorProfile, MomentRecord } from "~~/shared/types/clawme";

const props = defineProps<{
  moment: MomentRecord;
  actorsById: Record<string, ActorProfile>;
}>();

const moment = computed(() => props.moment);

const isActorProfile = (
  actor: ActorProfile | undefined,
): actor is ActorProfile => Boolean(actor);

const primaryAuthor = computed(
  () => props.actorsById[moment.value.primaryAuthorId],
);
const coAuthors = computed(() =>
  moment.value.coAuthorIds
    .map((id) => props.actorsById[id])
    .filter(isActorProfile),
);

const authors = computed(() => {
  const allAuthors = [primaryAuthor.value, ...coAuthors.value].filter(
    isActorProfile,
  );

  return allAuthors.map((author) => ({
    name: author.nickname,
    description:
      author.type === "bot"
        ? `${author.role || "本地助理"} · @${author.username}`
        : `用户 · @${author.username}`,
    avatar: {
      alt: author.nickname,
      text: author.nickname.slice(0, 1),
    },
  }));
});

const badgeColor = computed<"info" | "neutral">(() =>
  primaryAuthor.value?.type === "bot" ? "info" : "neutral",
);

const badge = computed(() => ({
  label: moment.value.context,
  color: badgeColor.value,
  variant: "subtle" as const,
}));

const heroImage = computed(() => {
  const attachment = moment.value.attachments[0];

  if (!attachment?.url) {
    return undefined;
  }

  return {
    src: attachment.url,
    alt: moment.value.title || attachment.title || moment.value.context,
    width: attachment.width,
    height: attachment.height,
  };
});
</script>
