<template>
  <div class="relative min-h-screen overflow-hidden bg-muted/30">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/10 to-transparent" />
    <div class="relative mx-auto min-h-screen w-full px-4 py-8 md:px-6 md:py-12">
      <slot />
    </div>
  </div>
</template>
