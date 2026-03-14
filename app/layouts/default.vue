<template>
  <div class="flex h-screen bg-[#F3F4F6] flex-col md:flex-row font-sans text-gray-900 antialiased selection:bg-blue-200">
    <!-- Sidebar for md and up -->
    <nav class="hidden md:flex flex-col w-[72px] bg-white border-r border-gray-200/60 justify-between items-center py-6 flex-shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
      <div class="flex flex-col gap-8 w-full items-center">
        <!-- Feed -->
        <NuxtLink to="/feed" class="group relative p-3 text-gray-400 hover:text-blue-600 rounded-2xl hover:bg-blue-50 transition-all duration-300 cursor-pointer">
          <svg class="w-[26px] h-[26px] transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <span class="absolute left-full ml-4 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">探索动态</span>
        </NuxtLink>
        <!-- Chat -->
        <NuxtLink to="/chat" class="group relative p-3 text-gray-400 hover:text-blue-600 rounded-2xl hover:bg-blue-50 transition-all duration-300 cursor-pointer">
          <svg class="w-[26px] h-[26px] transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <span class="absolute left-full ml-4 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">会话沟通</span>
        </NuxtLink>
        <!-- Settings -->
        <NuxtLink to="/settings" class="group relative p-3 text-gray-400 hover:text-blue-600 rounded-2xl hover:bg-blue-50 transition-all duration-300 cursor-pointer">
           <svg class="w-[26px] h-[26px] transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
           </svg>
           <span class="absolute left-full ml-4 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">系统设置</span>
        </NuxtLink>
      </div>
      <div class="mb-2">
        <!-- Avatar -->
        <button class="relative w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 hover:scale-105 transition-transform duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
           <div class="w-full h-full rounded-full border-2 border-white bg-white/20 backdrop-blur-sm"></div>
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-hidden relative shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] bg-[#FAFAFA]">
      <slot />
    </main>

    <!-- Bottom Tab Navigation for sm and below -->
    <nav class="md:hidden flex h-16 bg-white/90 backdrop-blur-md border-t border-gray-200/80 justify-around items-center flex-shrink-0 z-50 pb-safe shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
      <NuxtLink to="/feed" class="p-2 text-gray-400 hover:text-blue-600 rounded-xl flex items-center justify-center w-full transition-colors relative">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      </NuxtLink>
      <NuxtLink to="/chat" class="p-2 text-gray-400 hover:text-blue-600 rounded-xl flex items-center justify-center w-full transition-colors relative">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
      </NuxtLink>
      <NuxtLink to="/settings" class="p-2 text-gray-400 hover:text-blue-600 rounded-xl flex items-center justify-center w-full transition-colors relative">
         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
         </svg>
      </NuxtLink>
    </nav>
  </div>
</template>

<style>
.router-link-active {
  color: #2563eb; /* blue-600 */
}
</style>
