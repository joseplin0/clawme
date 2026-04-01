<template>
  <div class="min-h-screen bg-surface flex flex-col items-center justify-center p-4 selection:bg-primary/20">
    <!-- Main Card -->
    <div class="w-full max-w-md rounded-[2.5rem] bg-elevated shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-default/50 p-8 sm:p-10 relative overflow-hidden transition-all">
      <!-- Ambient Background Decorators -->
      <div class="absolute -top-32 -right-32 size-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-32 -left-32 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[120%] bg-gradient-to-b from-transparent via-transparent to-surface/20 pointer-events-none" />
      
      <!-- Content Area -->
      <div class="relative z-10 w-full flex flex-col h-full justify-center">
        <slot />
      </div>
    </div>

    <!-- Small footer text if needed -->
    <div class="mt-8 text-center text-xs text-muted/60 absolute bottom-6">
      Clawme Workspace
    </div>
  </div>
</template>
