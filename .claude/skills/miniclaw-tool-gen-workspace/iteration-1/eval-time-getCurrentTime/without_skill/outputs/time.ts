import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const timeGetCurrentTime = {
	definition: {
		name: "time.getCurrentTime",
		description: "获取当前时间",
		parameters: {
			type: "object",
			properties: {
				timezone: {
					type: "string",
					description: "IANA 时区标识符，如 Asia/Shanghai、UTC"
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
				timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
				year: "numeric", month: "2-digit", day: "2-digit",
				hour: "2-digit", minute: "2-digit", second: "2-digit",
				hour12: false
			}
			return JSON.stringify({
				timezone: timezone || "local",
				formatted: new Intl.DateTimeFormat("zh-CN", options).format(now),
				iso: now.toISOString(),
				timestamp: now.getTime()
			})
		} catch (e) {
			return `获取时间失败: 无效时区 "${timezone}": ${(e as Error).message}`
		}
	}
}
