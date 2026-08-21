/**
 * GLM Provider 实现
 * 智谱 GLM 系列模型，Chat Completions API 兼容 OpenAI 格式
 * @see https://docs.bigmodel.cn/cn/guide/capabilities/streaming
 */

import OpenAI from "openai"
import type { LLMRequest, LLMResponse } from "../types/llm"
import type { Provider } from "../types/providers"
import type { ProviderEvent } from "../types/event"
import type { Config } from "../types/config"
import { deepseekAdapter } from "../adaptor/deepseek"

/**
 * 创建 GLM Provider 实例
 * GLM API 与 OpenAI 格式完全兼容，复用 DeepSeek adaptor
 */
export function GLMProvider(): Provider {
	let client: OpenAI | null = null
	let config: Config | null = null

	return {
		init(cfg: Config): void {
			config = cfg
			client = new OpenAI({
				baseURL: cfg.baseURL,
				apiKey: cfg.apiKey
			})
		},

		async chat(req: LLMRequest): Promise<LLMResponse> {
			if (!client) {
				throw new Error("Provider not initialized")
			}
			if (!config) {
				throw new Error("Provider not initialized")
			}

			try {
				const glmRequest = deepseekAdapter.transformRequest(req)

				const response = await client.chat.completions.create({
					messages: glmRequest.messages as any,
					model: glmRequest.model,
					tools: glmRequest.tools as any,
					tool_choice: glmRequest.tool_choice as any,
					stream: false
				})

				return deepseekAdapter.transformResponse(response as any)
			} catch (error) {
				if (error instanceof Error) {
					if (error.message.includes("401")) {
						throw new Error("GLM API 认证失败: 请检查 API Key 是否正确")
					}
					if (error.message.includes("429")) {
						throw new Error("GLM API 速率限制: 请稍后重试")
					}
					throw new Error(`GLM API 调用失败: ${error.message}`)
				}
				throw error
			}
		},

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
				const glmRequest = deepseekAdapter.transformRequest(req)

				// 透传 signal 让 OpenAI SDK 中断底层请求
				const stream = await client.chat.completions.create({
					messages: glmRequest.messages as any,
					model: glmRequest.model,
					tools: glmRequest.tools as any,
					tool_choice: glmRequest.tool_choice as any,
					stream: true
				}, { signal })

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
