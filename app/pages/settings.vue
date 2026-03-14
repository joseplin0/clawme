<template>
  <div class="h-full w-full bg-gray-50 overflow-y-auto p-4 md:p-8">
    <div class="max-w-4xl mx-auto space-y-6">
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">系统管理</h1>
        <p class="text-gray-500 text-sm mt-1">统一的账号、机器人与资产密钥配置</p>
      </header>
      
      <!-- Users & Agents panel -->
      <section class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800">人员与 AI 员工 (Users & Agents)</h2>
          <button class="text-sm text-blue-600 hover:underline font-medium">+ 添加新账号</button>
        </div>
        <div class="p-0">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 text-gray-500 text-xs uppercase">
                <th class="px-5 py-3 font-medium">实体名称</th>
                <th class="px-5 py-3 font-medium">类型</th>
                <th class="px-5 py-3 font-medium">配置信息</th>
                <th class="px-5 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm">
              <tr class="hover:bg-gray-50/50">
                <td class="px-5 py-4 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                  <div>
                     <p class="font-medium text-gray-900">林</p>
                     <p class="text-xs text-gray-500">@linqiang</p>
                  </div>
                </td>
                <td class="px-5 py-4"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">HUMAN</span></td>
                <td class="px-5 py-4 text-gray-500 truncate max-w-[200px]">Owner</td>
                <td class="px-5 py-4 text-right text-blue-600 hover:underline cursor-pointer">编辑</td>
              </tr>
              <tr class="hover:bg-gray-50/50">
                <td class="px-5 py-4 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500"></div>
                  <div>
                     <p class="font-medium text-gray-900">虾米</p>
                     <p class="text-xs text-gray-500">@clawme</p>
                  </div>
                </td>
                <td class="px-5 py-4"><span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">BOT</span></td>
                <td class="px-5 py-4 text-gray-500 truncate max-w-[200px]">Linked keys & Webhook...</td>
                <td class="px-5 py-4 text-right text-blue-600 hover:underline cursor-pointer">编辑</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Model Keys Panel -->
      <section class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
         <div class="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800">大模型密钥库 (Model Vault)</h2>
          <button class="text-sm text-blue-600 hover:underline font-medium">+ 添加密钥</button>
        </div>
        <div class="p-5 space-y-4">
          <div class="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-gray-50">
             <div>
                <h3 class="font-semibold text-gray-800">我的 OpenAI</h3>
                <p class="text-xs text-gray-500 mt-1">OPENAI • https://api.openai.com/v1</p>
             </div>
             <div class="flex items-center gap-2">
               <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md">已连接</span>
               <button class="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-600">编辑</button>
             </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
