<template>
  <NuxtPage />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "settings",
});

const route = useRoute();

if (route.path === "/settings") {
  await navigateTo("/settings/general", { replace: true });
}
</script>
