/**
 * 统一 LLM 请求类型定义
 * 与具体 LLM 提供商无关的抽象请求类型
 */

import type { LLMMessage } from "./message"
import type { LLMTool, LLMToolChoice } from "./tool"

// ============== Request Types ==============

/**
 * LLM 请求
 */
export interface LLMRequest {
	/** 消息列表 */
	messages: LLMMessage[]
	/** 模型标识 */
	model: string
	/** 是否流式输出 */
	stream?: boolean
	/** 工具列表 */
	tools?: LLMTool[]
	/** 工具选择 */
	toolChoice?: LLMToolChoice
}
