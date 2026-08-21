/**
 * LLM 提供商适配器接口
 * 定义统一类型与提供商特定类型之间的转换规则
 */

import { Config } from "../config"
import type { LLMRequest, LLMResponse } from "../llm"
import type { ProviderEvent } from "../event"

// ============== Adapter Interface ==============

/**
 * 提供商特定类型映射
 * 各提供商需要实现此接口来定义其特定类型
 */
export interface ProviderTypes<TRequest = unknown, TResponse = unknown> {
	/** 提供商请求类型 */
	request: TRequest
	/** 提供商响应类型 */
	response: TResponse
}

/**
 * LLM 适配器接口
 * @template TProviderRequest 提供商请求类型
 * @template TProviderResponse 提供商响应类型
 */
export interface LLMAdapter<TProviderRequest = unknown, TProviderResponse = unknown> {
	/** 提供商名称 */
	readonly name: string

	/**
	 * 将统一请求转换为提供商请求
	 * @param request 统一请求
	 * @returns 提供商请求
	 */
	transformRequest(request: LLMRequest): TProviderRequest

	/**
	 * 将提供商响应转换为统一响应
	 * @param response 提供商响应
	 * @returns 统一响应
	 */
	transformResponse(response: TProviderResponse): LLMResponse

	/**
	 * 将提供商流式 chunk 转换为 Provider Event
	 * @param chunk 提供商流式 chunk
	 * @param toolCallIndexMap index → toolCallId 映射（由 provider 维护），用于关联后续参数增量 chunk
	 * @returns ProviderEvent，或 null 表示跳过无意义 chunk
	 */
	transformStreamChunk?(chunk: unknown, toolCallIndexMap?: Map<number, string>): ProviderEvent | ProviderEvent[] | null
}

/**
 * 请求转换函数类型
 */
export type TransformRequest<T> = (request: LLMRequest) => T

/**
 * 响应转换函数类型
 */
export type TransformResponse<T> = (response: T) => LLMResponse

/**
 * 提供商适配器类型
 */
export interface Provider {
	/** 初始化配置 */
	init(config: Config): void
	/** 发送消息 */
	chat(req: LLMRequest): Promise<LLMResponse>
	/** 流式发送消息，可选传入 AbortSignal 以支持外部中断 */
	chatStream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<ProviderEvent>
}
