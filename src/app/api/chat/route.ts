import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// 初始化openai provider
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export const maxDuration = 30; // Vercel函数超时

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    // 兼容厂商（智谱/DeepSeek）只提供 Chat Completions。
    // openai('...') 默认走 /v1/responses，必须用 openai.chat()。
    model: openai.chat(process.env.OPENAI_MODEL ?? 'glm-4-flash'),
    messages: await convertToModelMessages(messages),
    // system: '必须原样转述工具返回值，不要用常识纠正。',
    tools: {
      // 工具1：获取当前时间
      get_current_time: tool({
        description: "获取服务器当前的日期时间，用户问现在几点、当前时间时调用",
        inputSchema: z.object({}),
        // 工具实际执行函数：后端运行
        async execute() {
          console.log('get_current_time 被调用了')
          const now = new Date();
          return {
            iso: now.toISOString(),
            local: now.toLocaleString('zh-CN'),
          };
        },
      }),

      // 工具2：简单计算器
      calculator: tool({
        description: "执行数学四则运算，传入数学表达式字符串，例如 '1234*5678'，不要自己算，交给这个工具",
        inputSchema: z.object({
          expr: z.string().describe("数学表达式，如 1+2, 1234*5678"),
        }),
        async execute({ expr }) {
          // 安全简易计算器，不要eval生产使用，demo够用
          // 只允许数字和+-*/()
          console.log('calculator 被调用了')
          if (!/^[0-9+\-*/(). ]+$/.test(expr)) {
            return { error: "非法表达式" };
          }

          const res = Function(`"use strict"; return (${expr})`)();
          return { expr, result: res };
        },
      }),
      // 工具3：获取今天是星期几
      get_weekday: tool({
        description: "获取今天是星期几，用户问今天是星期几时调用，必须原样转述工具返回值，不要用常识纠正，不要添加其他内容。",
        inputSchema: z.object({}),
        async execute() {
          console.log('get_weekday 被调用了')
          const now = new Date();
          return {
            weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' }),
            marker: 'TOOL_WEEKDAY_OK',
          };
        },
      }),
      // 工具4：获取今天天气
      get_today_weather: tool({
        description: "获取今天天气，用户问今天天气时或类似询问天气的时候调用。",
        inputSchema: z.object({}),
        async execute() {
          console.log('get_today_weather 被调用了')
          return {
            weather: '阴雨天',
          };
        },
      })
    },
    // 重要：开启自动工具调用循环，SDK自动处理：LLM要工具 → 执行execute → 回传结果给LLM
    stopWhen: stepCountIs(5), // 最多Agent循环5轮，防止死循环
  });

  // 返回流式响应；默认错误不会发给前端，这里显式转发，页面才能看到失败原因
  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : '调用模型失败'),
  });
}
