/**
 * @mini-claw/runtime 入口
 *
 * 导出 createRuntime 工厂方法及相关类型，
 */
export type { RuntimeOptions, Runtime, ChatOptions, LLMProviderType } from "./types/runtime"

// 重导出常用类型，方便外部使用
export type { RuntimeEvent } from "./types/event"
export type { Config } from "./types/config"
export type { ContextBuilderOptions, Session, SummaryResult, SessionMetadata, Fact } from "./memory/types"
export type { MetricsSnapshot, ToolMetrics, PermissionConfig } from "./types/llm/tool"
export { loadPermissionConfig } from "./tools/middlewares/permission"

/**
 * Runtime 工厂模块
 *
 * 提供 createRuntime 工厂方法，封装 runtime 初始化逻辑，
 * 返回 chat、sessionManager、config 三个公共 API，
 * 支持多界面接入（TUI、Web 等）
 *
 * 所有配置由调用方显式传入，不依赖 process.env 或 process.cwd
 */

import { createConfig } from "./utils/config"
import { DeepSeekProvider, GLMProvider } from "./provider"
import { createToolHandler } from "./tools"
import { weatherGetWeather } from "./tools/weather"
import { timeGetCurrent } from "./tools/time"
import { fsReadFile } from "./tools/fs"
import { mathCalculate } from "./tools/math"
import { createLLMSummarizer, createFileSystemMemoryStore, createRuntimeMemoryState, createSessionManager, setSessionMemory } from "./memory"
import { executeReActLoop } from "./react/loop"

import type { LLMMessage } from "./types/llm"
import type { RuntimeEvent } from "./types/event"
import type { Session, SummaryResult } from "./memory/types"
import type { RuntimeOptions, Runtime, ChatOptions } from "./types/runtime"

/**
 * 创建 Runtime 实例
 *
 * 封装 provider 初始化、session 管理、memory 状态、summarizer 创建，
 * 对外暴露 chat、sessionManager、config 三个 API
 *
 * @param options Runtime 选项，所有配置由调用方显式传入
 * @returns Runtime 实例
 */
export function createRuntime(options: RuntimeOptions): Runtime {
	const { sessionId: optionSessionId, sessionName, sessionsRoot } = options

	// 创建配置
	const config = createConfig({
		provider: options.provider,
		apiKey: options.apiKey,
		baseUrl: options.baseUrl,
		model: options.model,
		soulPrompt: options.soulPrompt,
		userPrompt: options.userPrompt
	})

	// 根据提供商类型创建 Provider
	const providerType = options.provider ?? "deepseek"
	const provider = providerType === "glm" ? GLMProvider() : DeepSeekProvider()
	provider.init(config)

	// 创建 memory 和 summarizer
	let memory = createRuntimeMemoryState()
	const summarizer = createLLMSummarizer(provider, config)

	// 创建 SessionManager
	const sessionStore = createFileSystemMemoryStore(sessionsRoot)
	const sessionManager = createSessionManager(sessionStore)

	// 创建工具处理器（使用统一的 sessionsRoot）
	// permissionConfig 由调用方显式传入或通过 loadPermissionConfig 加载
	const handlerTool = createToolHandler({
		sessionsRoot,
		onMetricsUpdate: options.onMetricsUpdate,
		onPermissionCheck: options.onPermissionCheck,
		permissionConfig: options.permissionConfig
	})
	handlerTool.register(weatherGetWeather.definition, weatherGetWeather.executor, weatherGetWeather.metadata)
	handlerTool.register(timeGetCurrent.definition, timeGetCurrent.executor, timeGetCurrent.metadata)
	handlerTool.register(fsReadFile.definition, fsReadFile.executor, fsReadFile.metadata)
	handlerTool.register(mathCalculate.definition, mathCalculate.executor, mathCalculate.metadata)

	// 初始化消息历史
	const messages: LLMMessage[] = []

	// session 初始化（异步，由 initSession 完成）
	let session: Session

	/** 初始化 session，加载或创建，恢复状态到 memory。 */
	async function initSession(): Promise<void> {
		if (optionSessionId) {
			const loaded = await sessionManager.load(optionSessionId)
			if (loaded) {
				session = loaded
			} else {
				session = await sessionManager.create({ id: optionSessionId, name: sessionName })
			}
		} else {
			session = await sessionManager.create({ name: sessionName })
		}

		// 恢复 session 的 messages 到运行时
		if (session.messages.length > 0) {
			messages.length = 0
			messages.push(...session.messages)
		}

		// 将 session 的 summary 和 facts 注入到 RuntimeMemoryState
		for (const result of session.summary) {
			memory = setSessionMemory(memory, {
				id: `summary-${result.createdAt}`,
				content: `摘要: ${result.summary}`
			})
		}
		for (const fact of session.facts) {
			memory = setSessionMemory(memory, {
				id: `fact-${fact.category}-${fact.content.slice(0, 20)}`,
				content: `事实: [${fact.category}] ${fact.content}`
			})
		}
	}

	/** 更新 memory 中的摘要结果。 */
	function updateMemoryWithSummaryResults(summaryResults: SummaryResult[]): void {
		for (const sr of summaryResults) {
			memory = setSessionMemory(memory, {
				id: `summary-${sr.createdAt}`,
				content: `摘要: ${sr.summary}`
			})
			for (const fact of sr.extractedFacts) {
				memory = setSessionMemory(memory, {
					id: `fact-${fact.category}-${fact.content.slice(0, 20)}`,
					content: `事实: [${fact.category}] ${fact.content}`
				})
			}
		}
	}

	/**
	 * 执行一轮对话
	 *
	 * 内部调用 executeReActLoop，透传 RuntimeEvent，
	 * 循环完成后自动更新 messages/memory/session 状态
	 *
	 * @param userInput 用户输入
	 * @param options 可选的 chat 选项（contextOptions 等）
	 * @returns RuntimeEvent 的 AsyncIterable
	 */
	async function* chat(userInput: string, options?: ChatOptions): AsyncIterable<RuntimeEvent> {
		let summaryResults: SummaryResult[] = []
		let chatCompleted = false

		try {
			for await (const event of executeReActLoop({
				provider,
				config,
				userInput,
				initialMessages: messages,
				memory,
				contextOptions: options?.contextOptions,
				summarizer,
				sessionId: session.id,
				toolHandler: handlerTool
			})) {
				// 在 yield 之前收集 loop-complete 数据，因为 yield 后消费者可能 break 导致后续代码不执行
				if (event.type === "loop-complete") {
					summaryResults = event.summaryResults
					if (event.state) {
						messages.length = 0
						messages.push(...event.state.messages)
					}
					chatCompleted = true
				}

				yield event
			}
		} finally {
			if (chatCompleted) {
				// 更新 memory 中的摘要结果
				if (summaryResults.length > 0) {
					updateMemoryWithSummaryResults(summaryResults)
				}

				// 持久化 session
				session.messages = [...messages]
				if (summaryResults.length > 0) {
					session.summary.push(...summaryResults)
					session.facts.push(...summaryResults.flatMap((sr) => sr.extractedFacts))
				}
				await sessionManager.save(session)
			}
		}
	}

	// session 初始化为异步操作，首次 chat 时自动触发
	let sessionInitialized = false

	/** 返回 Runtime 对象，session 初始化为异步操作。 */
	return {
		chat: async function* (userInput: string, options?: ChatOptions): AsyncIterable<RuntimeEvent> {
			if (!sessionInitialized) {
				await initSession()
				sessionInitialized = true
			}
			yield* chat(userInput, options)
		},
		sessionManager,
		config
	}
}
