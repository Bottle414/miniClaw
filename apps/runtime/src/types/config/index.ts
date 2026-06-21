import type { LLMTool } from "../llm"
import type { MetricsSnapshot } from "../llm/tool"

import type { Provider } from "../providers"

/**
 * 运行时配置
 */
export interface RuntimeConfig {
	/** 系统提示词 */
	systemPrompt: string
	/** 是否开启流式输出 */
	stream?: boolean

	/** 单 Loop 最大循环次数 */
	maxIterations?: number
	/** 最大工具重试次数 */
	maxToolRetryTimes?: number
	/** 最大消息发送重试次数 */
	maxSendRetryTimes?: number
	/** 指标更新回调，每次工具调用后推送最新快照 */
	onMetricsUpdate?: (snapshot: MetricsSnapshot) => void
}

/**
 * 单次任务配置
 */
export interface TaskConfig {
	/** 基础 URL */
	baseURL: string
	/** API Key */
	apiKey: string
	/** 模型名称 */
	model: string
	/** 工具列表 */
	tools?: LLMTool[]
	/** 用户提示词，偏用户自定义规范 */
	userPrompt: string
	/** 灵魂提示词，定义角色人格 */
	soulPrompt?: string
}

/**
 * 完整配置
 */
export type Config = RuntimeConfig & TaskConfig
