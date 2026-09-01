import { streamText, tool, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
})

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('deepseek-reasoner'),
        messages,
        tools: {
            // 工具1：获取当前时间
            get_current_time: tool({
                description: "获取服务器当前的日期时间，用户问现在几点、当前时间时调用",
                inputSchema: z.object({}),
                // 工具实际执行函数：后端运行
                async execute() {
                    const now = new Date();
                    return `当前时间是：${now.toLocaleString()}`;
                }
            }),
            get_weather: tool({
                description: "获取天气信息，用户问天气时调用",
                inputSchema: z.object({
                    city: z.string().describe("城市名称"),
                }),
                async execute({ city }) {
                    return `城市${city}的天气是：晴天`;
                }
            }),
            get_news: tool({
                description: "获取新闻信息，用户问新闻时调用",
                inputSchema: z.object({
                    keyword: z.string().describe("关键词"),
                }),
                async execute({ keyword }) {
                    return `关键词${keyword}的新闻是：新闻内容`;
                }
            }),
        },
        stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
}