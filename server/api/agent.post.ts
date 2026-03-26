// server/api/agent.post.ts
export default defineEventHandler(async (event) => {
    // 1. 获取前端传来的用户自然语言指令
    const body = await readBody(event)
    const userInput = body.text

    // 2. 设定系统提示词，强制规范 JSON 输出
    const systemPrompt = `
    你是一个任务路由中枢。请分析用户的输入，并只输出合法的 JSON，不要有任何多余的废话。
    JSON 格式: {"type": "分类", "params": {"关键": "参数"}}
    分类只能是以下三种之一：
    1. "daily_habit" (日常习惯记录、健康打卡等)
    2. "user_script" (触发网页自动化、油猴脚本等)
    3. "complex_project" (涉及代码重构、框架迁移等复杂工程)
  `

    try {
        // 3. 直接请求本地 oMLX 引擎 (替换为你实际运行的模型名称)
        const omlxResponse: any = await $fetch('http://localhost:8000/v1/chat/completions', {
            method: 'POST',
            body: {
                model: 'qwen3.5-9b-instruct-mlx-4bit', // 你刚才决定的绝佳配置
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userInput }
                ],
                // 核心：利用 OpenAI 标准格式强制输出 JSON
                response_format: { type: "json_object" },
                temperature: 0.1 // 降低随机性，保证路由绝对稳定
            }
        })

        // 4. 解析 AI 返回的 JSON 字符串
        const aiMessage = omlxResponse.choices[0].message.content
        const routePlan = JSON.parse(aiMessage)

        // 5. 在 Node 环境下进行原生分发 (这里就是你的流程引擎)
        let finalResult = ''

        if (routePlan.type === 'daily_habit') {
            // 执行写入数据库的操作
            finalResult = `✅ 日常记录已更新: ${JSON.stringify(routePlan.params)}`
        }
        else if (routePlan.type === 'complex_project') {
            // 比如在这里执行读取 Wolog 目录，或者记录 Tailwind CSS 重构待办的逻辑
            finalResult = `🏗️ 复杂工程已规划: ${JSON.stringify(routePlan.params)}`
        }
        else if (routePlan.type === 'user_script') {
            // 触发你的 js 自动化脚本
            finalResult = `⚡️ 自动化脚本已就绪: ${JSON.stringify(routePlan.params)}`
        }
        else {
            finalResult = `❓ 无法识别的分类: ${routePlan.type}`
        }

        // 6. 把最终结果或者进度返回给 Nuxt 前端
        return {
            success: true,
            original_plan: routePlan,
            message: finalResult
        }

    } catch (error) {
        return { success: false, message: 'AI 大脑开小差了，请检查 oMLX 是否运行。' }
    }
})