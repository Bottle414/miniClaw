import type { LLMTool } from "../types/llm"
import type { ToolExecutor, ToolMetadata } from "../types/llm/tool"

/** 工具定义 */
export const timeGetCurrent = {
	definition: {
		name: "time.getCurrent",
		description: "获取当前日期和时间",
		parameters: {
			type: "object",
			properties: {
				timezone: {
					type: "string",
					description: "时区标识，如 Asia/Shanghai、America/New_York，默认为系统本地时区"
				}
			},
			required: []
		}
	} satisfies LLMTool,
	metadata: {
		category: "system",
		cacheable: false,
		readonly: true
	} satisfies ToolMetadata,
	executor: (async (params: Record<string, unknown>) => {
		const { timezone } = params as { timezone?: string }
		try {
			const now = new Date()
			const options: Intl.DateTimeFormatOptions = {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				timeZoneName: "short"
			}
			if (timezone) {
				options.timeZone = timezone
			}
			const formatted = new Intl.DateTimeFormat("zh-CN", options).format(now)
			const iso = now.toISOString()
			return { content: `当前时间: ${formatted}\nISO 8601: ${iso}` }
		} catch (e) {
			return { content: `获取时间失败: ${(e as Error).message}` }
		}
	}) satisfies ToolExecutor
}
