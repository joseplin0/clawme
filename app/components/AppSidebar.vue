<template>
  <nav
    class="hidden w-[88px] shrink-0 flex-col justify-between border-r border-gray-100 bg-white px-4 py-6 shadow-sm dark:border-muted/70 dark:bg-[#140e0c]/80 dark:shadow-none md:flex"
  >
    <!-- Logo -->
    <div class="flex flex-col items-center gap-8">
      <NuxtLink
        to="/feed"
        class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105"
      >
        <span>F</span>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <div class="flex flex-col gap-4 w-full">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="group flex flex-col items-center gap-1 rounded-xl py-3 transition-all duration-200"
        :class="[
          route.path === link.to
            ? 'bg-primary/10 text-primary'
            : 'text-gray-400 hover:bg-gray-50 hover:text-primary dark:text-muted dark:hover:bg-muted/20 dark:hover:text-primary'
        ]"
      >
        <div class="relative">
          <UIcon :name="link.icon" class="size-6" />
          <span v-if="link.badge" class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#140e0c]"></span>
        </div>
        <!-- <span class="text-[10px] font-bold">{{ link.label }}</span> -->
      </NuxtLink>
    </div>

    <!-- Profile & Theme -->
    <div class="mt-auto flex flex-col items-center gap-4 pb-2">
      <!-- Theme Switcher -->
      <UPopover :popper="{ placement: 'right' }">
        <UButton
          icon="i-lucide-palette"
          color="neutral"
          variant="ghost"
          class="rounded-full text-gray-400 hover:text-primary dark:text-muted"
        />
        <template #content>
          <div class="p-3 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl">
            <div class="text-[10px] font-bold text-gray-500 mb-2 px-1">主题配色</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colors"
                :key="color.value"
                class="w-6 h-6 rounded-full ring-offset-2 transition-all hover:scale-110"
                :class="[
                  color.bgClass,
                  appConfig.ui.colors.primary === color.value ? 'ring-2 ring-primary ring-offset-white dark:ring-offset-gray-900' : ''
                ]"
                @click="setThemeColor(color.value)"
                title="color.label"
              ></button>
            </div>
            <UDivider class="my-3"/>
            <div class="flex justify-between items-center px-1">
              <span class="text-[10px] font-bold text-gray-500">外观模式</span>
              <UColorModeButton size="xs" />
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Avatar -->
      <div class="rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm transition-all hover:ring-2 hover:ring-primary/20 cursor-pointer dark:border-[#140e0c] dark:bg-muted/80">
        <UAvatar
          size="md"
          :ui="{ root: 'bg-gradient-to-br from-primary-500 via-primary-400 to-amber-300' }"
        />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAppConfig } from '#imports'

const route = useRoute()
const appConfig = useAppConfig()

defineProps<{
  links: Array<{ label: string; to: string; icon: string; badge?: boolean }>
}>()

const colors = [
  { value: 'orange', label: '橙色', bgClass: 'bg-orange-500' },
  { value: 'rose', label: '玫瑰红', bgClass: 'bg-rose-500' },
  { value: 'blue', label: '蓝色', bgClass: 'bg-blue-500' },
  { value: 'emerald', label: '翠绿', bgClass: 'bg-emerald-500' },
  { value: 'violet', label: '紫罗兰', bgClass: 'bg-violet-500' },
  { value: 'clawme', label: 'Clawme', bgClass: 'bg-[#e05d44]' },
]

function setThemeColor(color: string) {
  // Dynamic color change using Nuxt UI
  appConfig.ui.colors.primary = color
}
</script>
