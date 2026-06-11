/**
 * 配置管理工具
 * 负责从环境变量创建和验证配置
 */

import type { Config } from "../types/config"
import { getSystemPrompt } from "../prompts/system"
import { getSoulPrompt } from "../prompts/soul"

/**
 * 从环境变量创建完整配置
 * @param env 环境变量对象（通常为 process.env）
 * @returns 合并后的完整配置
 * @throws 如果缺少必要的环境变量或格式无效
 */
export function createConfig(env: NodeJS.ProcessEnv): Config {
	// 校验必要字段
	validateApiKey(env.API_KEY)

	// 校验可选字段的格式
	if (env.DEEPSEEK_BASE_URL) {
		validateBaseUrl(env.DEEPSEEK_BASE_URL)
	}

	// 合并 RuntimeConfig 和 TaskConfig
	const config: Config = {
		// RuntimeConfig
		systemPrompt: getSystemPrompt(),
		maxIterations: 10,
		maxToolRetryTimes: 3,
		maxSendRetryTimes: 3,

		// TaskConfig
		baseURL: env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
		apiKey: env.API_KEY!,
		model: env.DEEPSEEK_MODEL || "deepseek-chat",
		soulPrompt: getSoulPrompt(),
		userPrompt: ""
		// stream: true
	}

	return config
}

/**
 * 校验 API Key
 * @param apiKey API Key 值
 * @throws 如果 API Key 为空或仅包含空白字符
 */
function validateApiKey(apiKey: string | undefined): void {
	if (!apiKey) {
		throw new Error("缺少必要的环境变量: API_KEY")
	}

	if (apiKey.trim().length === 0) {
		throw new Error("API_KEY 不能为空或仅包含空白字符")
	}
}

/**
 * 校验 Base URL 格式
 * @param baseUrl Base URL 值
 * @throws 如果不是有效的 URL
 */
function validateBaseUrl(baseUrl: string): void {
	try {
		new URL(baseUrl)
	} catch {
		throw new Error(`DEEPSEEK_BASE_URL 不是有效的 URL: ${baseUrl}`)
	}
}
