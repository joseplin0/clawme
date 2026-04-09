<template>
  <UContextMenu
    :items="desktopItems"
    :disabled="disabled || useMobileFloating || !visibleItems.length"
  >
    <div
      data-testid="action-menu-trigger"
      class="block w-full"
      @touchstart.passive="handleTouchStart"
      @touchmove.passive="clearTouchTimer"
      @touchend.passive="clearTouchTimer"
      @touchcancel.passive="clearTouchTimer"
      @contextmenu="handleContextMenu"
    >
      <slot />
    </div>
  </UContextMenu>

  <Teleport to="body">
    <div
      v-if="mobileOpen && useMobileFloating"
      class="fixed inset-0 z-50"
    >
      <button
        type="button"
        class="absolute inset-0"
        aria-label="关闭消息操作菜单"
        @click="closeMobileMenu"
      />

      <div
        class="absolute rounded-2xl border border-default/70 bg-default/95 p-2 shadow-2xl backdrop-blur"
        :style="mobileMenuStyle"
      >
        <div
          class="grid gap-2"
          :style="{ gridTemplateColumns: `repeat(${mobileColumnCount}, minmax(0, 1fr))` }"
        >
          <button
            v-for="item in visibleItems"
            :key="item.key"
            type="button"
            class="flex min-h-11 min-w-16 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-medium text-default transition-colors hover:bg-default/70 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="item.disabled"
            @click="handleMobileItemSelect(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useMediaQuery } from "@vueuse/core";
import type { ActionMenuItem } from "~~/shared/types/action-menu";

const props = withDefaults(defineProps<{
  items: ActionMenuItem[];
  title?: string;
  disabled?: boolean;
  longPressDelay?: number;
  mobileColumns?: number;
}>(), {
  title: "操作",
  disabled: false,
  longPressDelay: 450,
  mobileColumns: 5,
});

const mobileOpen = ref(false);
const touchTimer = ref<ReturnType<typeof globalThis.setTimeout> | null>(null);
const pendingTouchPoint = ref<{ x: number; y: number } | null>(null);
const mobileMenuPosition = ref({
  left: 0,
  top: 0,
});
const isCoarsePointer = useMediaQuery("(pointer: coarse)");

const visibleItems = computed(() => props.items.filter((item) => !item.hidden));
const useMobileFloating = computed(() => isCoarsePointer.value);
const mobileColumnCount = computed(() => {
  return Math.max(1, Math.min(props.mobileColumns, visibleItems.value.length || 1));
});
const mobileMenuStyle = computed(() => ({
  left: `${mobileMenuPosition.value.left}px`,
  top: `${mobileMenuPosition.value.top}px`,
}));

const desktopItems = computed(() => {
  return visibleItems.value.map((item) => ({
    label: item.label,
    color: item.color,
    disabled: item.disabled,
    onSelect: () => item.onSelect(),
  }));
});

function getMobileMenuMetrics() {
  const columns = mobileColumnCount.value;
  const rows = Math.ceil(visibleItems.value.length / columns);

  return {
    width: columns * 80 + Math.max(0, columns - 1) * 8 + 16,
    height: rows * 44 + Math.max(0, rows - 1) * 8 + 16,
  };
}

function updateMobileMenuPosition(x: number, y: number) {
  if (!import.meta.client) {
    return;
  }

  const margin = 8;
  const { width, height } = getMobileMenuMetrics();
  const left = Math.min(
    window.innerWidth - width - margin,
    Math.max(margin, x - (width / 2)),
  );
  const top = Math.min(
    window.innerHeight - height - margin,
    Math.max(margin, y - height - 12),
  );

  mobileMenuPosition.value = {
    left,
    top,
  };
}

function openMobileMenuAt(x: number, y: number) {
  if (props.disabled || !useMobileFloating.value || !visibleItems.value.length) {
    return;
  }

  updateMobileMenuPosition(x, y);
  mobileOpen.value = true;
}

function closeMobileMenu() {
  mobileOpen.value = false;
}

function clearTouchTimer() {
  if (touchTimer.value !== null) {
    globalThis.clearTimeout(touchTimer.value);
    touchTimer.value = null;
  }
}

function handleTouchStart(event: TouchEvent) {
  if (props.disabled || !useMobileFloating.value || !visibleItems.value.length) {
    return;
  }

  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  pendingTouchPoint.value = {
    x: touch.clientX,
    y: touch.clientY,
  };
  clearTouchTimer();
  touchTimer.value = globalThis.setTimeout(() => {
    const point = pendingTouchPoint.value;
    if (point) {
      openMobileMenuAt(point.x, point.y);
    }
    touchTimer.value = null;
  }, props.longPressDelay);
}

function handleContextMenu(event: MouseEvent) {
  if (!useMobileFloating.value) {
    return;
  }

  event.preventDefault();
  openMobileMenuAt(event.clientX, event.clientY);
}

async function handleMobileItemSelect(item: ActionMenuItem) {
  if (item.disabled) {
    return;
  }

  closeMobileMenu();
  await item.onSelect();
}

onBeforeUnmount(() => {
  clearTouchTimer();
});
</script>
