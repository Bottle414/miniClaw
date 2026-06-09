import type { LLMTool } from "../types/llm"

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
	executor: (params: Record<string, unknown>): string => {
		const { city } = params as { city: string }
		if (city === "上海") {
			return "sunny"
		}
		return "rainy"
	}
}
