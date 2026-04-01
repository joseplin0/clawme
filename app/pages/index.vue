<template>
  <div class="flex min-h-screen items-center justify-center bg-transparent">
    <div class="text-sm font-medium text-muted">Clawme 正在准备工作台...</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

await navigateTo("/chat");
</script>
