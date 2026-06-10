import { LLMTool } from "../llm"

import { Provider } from "../providers"

/**
 * 运行时配置
 */
export interface RuntimeConfig {
	systemPrompt: string

	/** 单 Loop 最大循环次数 */
	maxIterations?: number
	/** 最大工具重试次数 */
	maxToolRetryTimes?: number
	/** 最大消息发送重试次数 */
	maxSendRetryTimes?: number
}

/**
 * 单次任务配置
 */
export interface TaskConfig {
	baseURL: string
	apiKey: string
	model: string
	tools?: LLMTool[]
	userPrompt: string
}

/**
 * 完整配置
 */
export type Config = RuntimeConfig & TaskConfig
