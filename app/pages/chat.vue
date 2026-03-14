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
      <header class="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10">
        <h2 class="font-bold text-gray-800 text-lg">会话列表</h2>
        <button class="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        </button>
      </header>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <!-- Session Item Active -->
        <div 
          @click="selectSession('session-1')"
          :class="[
            'p-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-colors duration-200',
            activeSessionId === 'session-1' ? 'bg-blue-50 border border-blue-100/50' : 'hover:bg-white border border-transparent'
          ]"
        >
          <div class="w-11 h-11 flex-shrink-0 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 shadow-sm p-[2px]">
            <div class="w-full h-full bg-white rounded-full border border-white/20"></div>
          </div>
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
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-500 border-2 border-white relative shadow-sm"></div>
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
          <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        </div>
        <p class="text-sm font-medium">点击左侧联系人开始对话</p>
      </div>

      <!-- Active Chat Content -->
      <template v-else>
        <header class="p-4 border-b border-gray-100/80 bg-white/90 backdrop-blur-md shadow-sm z-10 flex justify-between items-center h-[72px] flex-shrink-0">
          <div class="flex items-center space-x-3">
            <!-- Mobile Back Button -->
            <button @click="clearSession" class="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors mr-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h2 class="font-bold text-gray-800 text-lg">虾米 <span class="text-sm font-normal text-gray-500 ml-1">(Agent)</span></h2>
            <span class="flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
              <span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </span>
          </div>
          <button class="px-3.5 py-2 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg font-medium transition-colors shadow-sm active:scale-95 flex items-center gap-2">
             <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
             分享到探索
          </button>
        </header>
        
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-gray-50/30">
           <div class="flex justify-center my-4"><span class="text-xs font-medium text-gray-400 bg-gray-100 py-1 px-3 rounded-full">10:30 AM</span></div>
           
           <!-- User Message -->
           <div class="flex justify-end group">
             <div class="relative group">
               <div class="bg-blue-600 text-white rounded-2xl rounded-tr-sm py-2.5 px-4 shadow-[0_2px_10px_-4px_rgba(37,99,235,0.5)] max-w-sm sm:max-w-md lg:max-w-xl text-[15px] leading-relaxed relative z-10 transition-transform hover:-translate-y-0.5">
                 请帮我看一下架构文档，有没有需要改进的地方？
               </div>
               <!-- Delivery subtle tick -->
               <div class="absolute -right-5 bottom-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
               </div>
             </div>
           </div>
           
           <!-- AI Message -->
           <div class="flex justify-start space-x-3 max-w-sm sm:max-w-md lg:max-w-2xl group">
             <div class="w-9 h-9 flex-shrink-0 mt-auto mb-1">
                <div class="w-full h-full rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 shadow-sm p-[1.5px]">
                  <div class="w-full h-full bg-white rounded-full"></div>
                </div>
             </div>
             
             <div class="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm py-3 px-4 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] text-[15px] leading-relaxed">
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
            <button class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0">
               <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
            <textarea 
              rows="1" 
              class="flex-1 bg-transparent border-none outline-none py-2 text-gray-700 resize-none min-h-[40px] max-h-[120px] pt-2"
              placeholder="发送消息给 虾米..."
            ></textarea>
            <button class="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all shrink-0">
              <svg class="w-5 h-5 -rotate-90 translate-x-[1px] -translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Basic state to manage mobile routing
const activeSessionId = ref(null)

const selectSession = (id) => {
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
