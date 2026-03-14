<template>
  <div class="flex items-center justify-center h-full">
    <div class="animate-pulse text-gray-500">Redirecting to Feed...</div>
  </div>
</template>

<script setup>
import { navigateTo } from '#app'

// Use middleware or inline to redirect
definePageMeta({
  middleware: [
    function (to, from) {
      return navigateTo('/feed')
    }
  ]
})
</script>
