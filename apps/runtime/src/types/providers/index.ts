/**
 * LLM 提供商适配器接口
 * 定义统一类型与提供商特定类型之间的转换规则
 */

import type { LLMRequest, LLMResponse } from "../llm"

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
}

/**
 * 请求转换函数类型
 */
export type TransformRequest<T> = (request: LLMRequest) => T

/**
 * 响应转换函数类型
 */
export type TransformResponse<T> = (response: T) => LLMResponse
