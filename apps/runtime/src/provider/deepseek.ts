/**
 * DeepSeek Provider 实现
 */

import OpenAI from "openai"
import type { LLMRequest, LLMResponse } from "../types/llm"
import type { Provider } from "../types/providers"
import type { ProviderEvent } from "../types/event"
import type { Config } from "../types/config"
import { deepseekAdapter } from "../adaptor/deepseek"

/**
 * 创建 DeepSeek Provider 实例
 * 使用闭包模式维护内部状态
 */
export function DeepSeekProvider(): Provider {
	let client: OpenAI | null = null
	let config: Config | null = null

	return {
		/**
		 * 初始化 Provider
		 * @param cfg 完整配置对象
		 */
		init(cfg: Config): void {
			config = cfg
			client = new OpenAI({
				baseURL: cfg.baseURL,
				apiKey: cfg.apiKey
			})
		},

		/**
		 * 发送聊天请求
		 * @param req 统一 LLM 请求
		 * @returns 统一 LLM 响应
		 */
		async chat(req: LLMRequest): Promise<LLMResponse> {
			if (!client) {
				throw new Error("Provider not initialized")
			}

			if (!config) {
				throw new Error("Provider not initialized")
			}

			try {
				// 转换请求
				const deepseekRequest = deepseekAdapter.transformRequest(req)

				// 调用 API
				const response = await client.chat.completions.create({
					messages: deepseekRequest.messages as any,
					model: deepseekRequest.model,
					tools: deepseekRequest.tools as any,
					tool_choice: deepseekRequest.tool_choice as any,
					stream: false
				})

				// 转换响应
				return deepseekAdapter.transformResponse(response as any)
			} catch (error) {
				// 错误处理
				if (error instanceof Error) {
					if (error.message.includes("401")) {
						throw new Error("DeepSeek API 认证失败: 请检查 API Key 是否正确")
					}
					if (error.message.includes("429")) {
						throw new Error("DeepSeek API 速率限制: 请稍后重试")
					}
					throw new Error(`DeepSeek API 调用失败: ${error.message}`)
				}
				throw error
			}
		},

		/**
		 * 流式发送聊天请求
		 * @param req 统一 LLM 请求
		 * @param signal 可选中断信号，abort 后立即终止底层流式请求
		 * @returns ProviderEvent 异步迭代器
		 */
		async *chatStream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<ProviderEvent> {
			if (!client) {
				yield { type: "error", error: new Error("Provider not initialized") }
				return
			}

			if (!config) {
				yield { type: "error", error: new Error("Provider not initialized") }
				return
			}

			// 已中断则直接返回，避免无谓发起请求
			if (signal?.aborted) {
				return
			}

			try {
				// 转换请求
				const deepseekRequest = deepseekAdapter.transformRequest(req)

				// 调用流式 API，透传 signal 让 OpenAI SDK 中断底层请求
				const stream = await client.chat.completions.create({
					messages: deepseekRequest.messages as any,
					model: deepseekRequest.model,
					tools: deepseekRequest.tools as any,
					tool_choice: deepseekRequest.tool_choice as any,
					stream: true
				}, { signal })

				// 逐 chunk 转换并 yield
				// 维护 index → toolCallId 映射，用于关联后续参数增量 chunk
				const toolCallIndexMap = new Map<number, string>()
				for await (const chunk of stream) {
					const result = deepseekAdapter.transformStreamChunk?.(chunk, toolCallIndexMap)
					if (result) {
						const events = Array.isArray(result) ? result : [result]
						for (const e of events) yield e
					}
				}
			} catch (error) {
				yield {
					type: "error",
					error: error instanceof Error ? error : new Error(String(error))
				}
			}
		}
	}
}
