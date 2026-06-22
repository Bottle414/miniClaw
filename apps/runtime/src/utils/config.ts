/**
 * 配置管理工具
 * 负责创建和验证配置
 */

import type { Config } from "../types/config"
import type { LLMProviderType } from "../types/runtime"
import { getSystemPrompt } from "../prompts/system"

/** 各提供商的默认配置 */
const PROVIDER_DEFAULTS: Record<LLMProviderType, { baseURL: string; model: string }> = {
	deepseek: { baseURL: "https://api.deepseek.com", model: "deepseek-chat" },
	glm: { baseURL: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" }
}

/** createConfig 选项，所有字段由调用方显式传入。 */
export interface CreateConfigOptions {
	provider?: LLMProviderType
	apiKey: string
	baseUrl?: string
	model?: string
	soulPrompt?: string
	userPrompt?: string
}

/**
 * 创建完整配置
 * @param options 配置选项
 * @returns 合并后的完整配置
 * @throws 如果缺少必要字段或格式无效
 */
export function createConfig(options: CreateConfigOptions): Config {
	// 校验必要字段
	validateApiKey(options.apiKey)

	// 校验可选字段的格式
	if (options.baseUrl) {
		validateBaseUrl(options.baseUrl)
	}

	const providerType = options.provider ?? "deepseek"
	const defaults = PROVIDER_DEFAULTS[providerType]

	// 合并 RuntimeConfig 和 TaskConfig
	const config: Config = {
		// RuntimeConfig
		systemPrompt: getSystemPrompt(),
		maxIterations: 10,
		maxToolRetryTimes: 3,
		maxSendRetryTimes: 3,

		// TaskConfig
		baseURL: options.baseUrl || defaults.baseURL,
		apiKey: options.apiKey,
		model: options.model || defaults.model,
		soulPrompt: options.soulPrompt,
		userPrompt: options.userPrompt ?? "",
		stream: true
	}

	return config
}

/**
 * 校验 API Key
 * @param apiKey API Key 值
 * @throws 如果 API Key 为空或仅包含空白字符
 */
function validateApiKey(apiKey: string): void {
	if (apiKey.trim().length === 0) {
		throw new Error("apiKey 不能为空或仅包含空白字符")
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
		throw new Error(`baseUrl 不是有效的 URL: ${baseUrl}`)
	}
}
