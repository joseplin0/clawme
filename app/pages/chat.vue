<template>
  <!-- Mobile conditional rendering: show list OR detail -->
  <div class="flex h-full w-full bg-white relative overflow-hidden">

    <!-- Left: Session List (Visible on desktop, and visible on mobile ONLY if no session is selected) -->
    <div
      :class="[
        'w-full md:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col h-full bg-gray-50/50 absolute md:relative z-10 transition-transform duration-300',
        activeSessionId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      ]"
    >
      <UPageHeader title="会话列表" class="p-4">
        <template #actions>
          <UButton icon="i-lucide-plus" variant="ghost" size="sm" class="rounded-full" />
        </template>
      </UPageHeader>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <!-- Session Item Active -->
        <div
          @click="selectSession('session-1')"
          :class="[
            'p-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-colors duration-200',
            activeSessionId === 'session-1' ? 'bg-blue-50 border border-blue-100/50' : 'hover:bg-white border border-transparent'
          ]"
        >
          <UAvatar size="md" :ui="{ wrapper: 'bg-gradient-to-tr from-green-400 to-emerald-500' }" />
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <h4 class="font-semibold text-gray-900 truncate text-[15px]">虾米 (Agent)</h4>
              <span class="text-xs text-gray-400 flex-shrink-0 ml-2">10:42</span>
            </div>
            <p class="text-sm text-gray-500 truncate mt-0.5">这份架构文档没问题</p>
          </div>
        </div>

        <!-- Session Item Inactive -->
        <div
          @click="selectSession('session-2')"
          :class="[
            'p-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-colors duration-200',
            activeSessionId === 'session-2' ? 'bg-blue-50 border border-blue-100/50' : 'hover:bg-white border border-transparent'
          ]"
        >
          <div class="flex -space-x-2.5 flex-shrink-0 items-center justify-center p-1 w-11 h-11">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 border-2 border-white relative z-10 shadow-sm"></div>
            <UAvatar size="sm" :ui="{ wrapper: 'bg-gradient-to-tr from-purple-400 to-pink-500 border-2 border-white' }" />
          </div>
          <div class="flex-1 min-w-0 ml-1">
            <div class="flex justify-between items-center">
              <h4 class="font-semibold text-gray-900 truncate text-[15px]">架构组群聊</h4>
              <span class="text-xs text-gray-400 flex-shrink-0 ml-2">昨天</span>
            </div>
            <p class="text-sm text-gray-500 truncate mt-0.5">OpenClaw: 我已经生成了相关的插画...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Chat Area (Hidden on mobile if no active session, visible on desktop always) -->
    <div
      :class="[
        'flex-1 flex-col h-full bg-white bg-[url(\'https://www.transparenttextures.com/patterns/clean-gray-paper.png\')] bg-repeat absolute inset-0 md:relative z-20 transition-transform duration-300',
        activeSessionId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      ]"
    >
      <!-- Empty State for Desktop -->
      <div v-if="!activeSessionId" class="hidden md:flex h-full w-full items-center justify-center flex-col text-gray-400 bg-gray-50/30">
        <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <UIcon name="i-lucide-message-circle" class="w-10 h-10 text-gray-300" />
        </div>
        <p class="text-sm font-medium">点击左侧联系人开始对话</p>
      </div>

      <!-- Active Chat Content -->
      <template v-else>
        <header class="p-4 border-b border-gray-100/80 bg-white/90 backdrop-blur-md shadow-sm z-10 flex justify-between items-center h-[72px] flex-shrink-0">
          <div class="flex items-center space-x-3">
            <!-- Mobile Back Button -->
            <UButton @click="clearSession" icon="i-lucide-arrow-left" variant="ghost" size="sm" class="md:hidden -ml-2" />
            <h2 class="font-bold text-gray-800 text-lg">虾米 <span class="text-sm font-normal text-gray-500 ml-1">(Agent)</span></h2>
            <span class="flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
              <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </span>
          </div>
          <UButton variant="outline" size="sm" icon="i-lucide-share">
            分享到探索
          </UButton>
        </header>

        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gray-50/30">
          <div class="flex justify-center my-4">
            <UBadge color="neutral" variant="subtle" size="sm">10:30 AM</UBadge>
          </div>

          <!-- User Message -->
          <div class="flex justify-end">
            <div class="bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-[0_2px_10px_-4px_rgba(37,99,235,0.5)] max-w-sm sm:max-w-md lg:max-w-xl py-2.5 px-4 text-[15px] leading-relaxed hover:-translate-y-0.5 transition-transform">
              请帮我看一下架构文档，有没有需要改进的地方？
            </div>
          </div>

          <!-- AI Message -->
          <div class="flex justify-start space-x-3 max-w-sm sm:max-w-md lg:max-w-2xl">
            <UAvatar size="sm" :ui="{ wrapper: 'bg-gradient-to-tr from-green-400 to-emerald-500' }" class="flex-shrink-0 mt-auto mb-1" />
            <div class="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] py-3 px-4 text-[15px] leading-relaxed">
              <p class="mb-3">你好！这份架构文档非常清晰。基于全栈大单体的思路，我们可以极大地提高开发效率。关于数据库，Prisma 的 JSONB 特性运用得很好。</p>
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3 font-mono text-sm text-gray-600">
                // 示例：可以考虑在 schema.prisma 中加入索引<br>
                @@index([metadata(ops: JsonbPathOps)], type: Gin)
              </div>
              <p>我认为我们可以直接开始执行了。准备好了吗？</p>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="p-4 bg-white/90 backdrop-blur-md border-t border-gray-100/60 pb-safe">
          <div class="flex items-end space-x-2 bg-gray-50 rounded-2xl p-2 border border-gray-200/80 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white transition-all duration-300 shadow-sm">
            <UButton icon="i-lucide-plus" variant="ghost" size="sm" class="rounded-xl shrink-0" />
            <UTextarea
              v-model="inputMessage"
              :rows="1"
              autoresize
              :maxrows="4"
              class="flex-1"
              :ui="{ base: 'bg-transparent border-none outline-none py-2 text-gray-700 resize-none min-h-[40px] max-h-[120px]', wrapper: 'flex-1' }"
              placeholder="发送消息给 虾米..."
            />
            <UButton icon="i-lucide-send" color="primary" size="sm" class="rounded-xl shrink-0" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Basic state to manage mobile routing
const activeSessionId = ref<string | null>(null)
const inputMessage = ref('')

const selectSession = (id: string) => {
  activeSessionId.value = id
}

const clearSession = () => {
  activeSessionId.value = null
}

// On desktop, auto select first session if none
onMounted(() => {
  if (window.innerWidth >= 768 && !activeSessionId.value) {
    activeSessionId.value = 'session-1'
  }
})
</script>
