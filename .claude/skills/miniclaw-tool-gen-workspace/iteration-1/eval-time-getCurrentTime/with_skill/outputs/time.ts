import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const timeGetCurrentTime = {
	definition: {
		name: "time.getCurrentTime",
		description: "获取当前时间，支持指定时区",
		parameters: {
			type: "object",
			properties: {
				timezone: {
					type: "string",
					description: "时区标识，如 Asia/Shanghai、America/New_York、UTC 等，默认为系统本地时区"
				}
			},
			required: []
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
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
				hour12: false,
				timeZone: timezone || undefined
			}
			const formatted = new Intl.DateTimeFormat("zh-CN", options).format(now)
			const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
			return `${formatted} (时区: ${tz})`
		} catch (e) {
			return `获取时间失败: 无效的时区 "${timezone}"，错误信息: ${(e as Error).message}`
		}
	}
}
