import type { LLMTool } from "../types/llm"
import type { ToolExecutor, ToolMetadata } from "../types/llm/tool"

/** 工具定义 */
export const weatherGetWeather = {
	definition: {
		name: "weather.getWeather",
		description: "获取指定城市的天气信息",
		parameters: {
			type: "object",
			properties: {
				city: {
					type: "string",
					description: "城市名称"
				}
			},
			required: ["city"]
		}
	} satisfies LLMTool,
	metadata: {
		category: "network",
		cacheable: true
	} satisfies ToolMetadata,
	executor: (async (params: Record<string, unknown>) => {
		const { city } = params as { city: string }
		if (city === "上海") {
			return { content: "sunny" }
		}
		return { content: "rainy" }
	}) satisfies ToolExecutor
}
