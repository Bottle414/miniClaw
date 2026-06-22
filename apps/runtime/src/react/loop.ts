/**
 * ReAct 循环编排模块
 *
 * 实现 Think → Act → Observe → Decide 循环
 * 支持流式输出：通过 AsyncIterable yield 事件，消费者 for await...of 拉取
 */

import type { Provider } from "../types/providers"
import type { LLMMessage, LLMUserMessage, LLMAssistantMessage, LLMToolMessage } from "../types/llm"
import type { ReActState, ActionRecord, ObservationRecord } from "../types/react"
import type { RuntimeEvent } from "../types/event"
import type { Config } from "../types/config"
import type { ToolHandler } from "../tools"
import { createInitialState, addMessage, addAction, addObservation, incrementIteration, setPhase, markTermination } from "./state"
import { shouldTerminate } from "./terminator"
import { createStreamMerger } from "../utils/message"
import { buildContext, createRuntimeMemoryState } from "../memory"
import type { RuntimeMemoryState, ContextBuilderOptions, Summarizer, SummaryResult } from "../memory"

/**
 * ReAct 循环配置
 */
export interface ReActLoopConfig {
	/** Provider 实例 */
	provider: Provider
	/** 配置对象 */
	config: Config
	/** 用户输入 */
	userInput: string
	/** 初始消息历史（可选） */
	initialMessages?: LLMMessage[]
	/** 运行时记忆状态（可选） */
	memory?: RuntimeMemoryState
	/** 上下文构建选项（可选） */
	contextOptions?: ContextBuilderOptions
	/** 摘要器（可选） */
	summarizer?: Summarizer
	/** 会话 ID（用于工具调用日志和指标持久化） */
	sessionId?: string
	/** 工具处理器实例 */
	toolHandler: ToolHandler
}

/**
 * Think 阶段结果
 */
interface ThinkPhaseResult {
	/** 更新后的状态 */
	state: ReActState
	/** 需要 yield 的事件 */
	events: RuntimeEvent[]
}

/**
 * Act 阶段结果（非流式部分）
 */
interface ActPhaseResult {
	/** 更新后的状态 */
	state: ReActState
	/** 助手消息 */
	assistantMessage?: LLMAssistantMessage
	/** 是否有工具调用 */
	hasToolCalls: boolean
	/** 工具调用列表 */
	toolCalls?: LLMAssistantMessage["toolCalls"]
	/** 摘要结果 */
	summaryResult?: SummaryResult
}

/**
 * Observe 阶段结果
 */
interface ObservePhaseResult {
	/** 更新后的状态 */
	state: ReActState
	/** 需要 yield 的事件 */
	events: RuntimeEvent[]
}

/**
 * Decide 阶段结果
 */
interface DecidePhaseResult {
	/** 更新后的状态 */
	state: ReActState
	/** 需要 yield 的事件 */
	events: RuntimeEvent[]
}

/**
 * 执行 ReAct 循环
 *
 * 主编排函数，驱动 Think → Act → Observe → Decide 循环
 * 通过 AsyncIterable yield RuntimeEvent，消费者 for await...of 拉取
 */
export async function* executeReActLoop(loopConfig: ReActLoopConfig): AsyncIterable<RuntimeEvent> {
	const {
		provider,
		config,
		userInput,
		initialMessages = [],
		memory = createRuntimeMemoryState(),
		contextOptions,
		summarizer,
		sessionId,
		toolHandler
	} = loopConfig

	// 初始化状态
	let state = createInitialState()
	let latestSummaryResult: SummaryResult | undefined

	// 添加初始消息
	for (const msg of initialMessages) {
		state = addMessage(state, msg)
	}

	// 添加用户消息
	const userMessage: LLMUserMessage = {
		role: "user",
		content: userInput
	}
	state = addMessage(state, userMessage)

	try {
		// 主循环
		while (!state.shouldTerminate) {
			// yield 迭代开始事件
			yield { type: "iteration-start", iteration: state.iteration }

			// Think 阶段
			const thinkResult = executeThinkPhase(state)
			state = thinkResult.state
			for (const event of thinkResult.events) {
				yield event
			}

			// Act 阶段（实时 yield ProviderEvent）
			const actResult = yield* executeActPhase(state, provider, config, memory, contextOptions, summarizer, toolHandler)
			state = actResult.state
			if (actResult.summaryResult) {
				latestSummaryResult = actResult.summaryResult
				// yield 摘要事件，供前端 Inspector 展示
				yield {
					type: "summary",
					summary: actResult.summaryResult.summary,
					extractedFacts: actResult.summaryResult.extractedFacts,
					sourceRange: actResult.summaryResult.sourceRange
				}
			}

			// 检查是否应该终止（最终答案或空响应）
			const terminationCheck = shouldTerminate(state, { maxIterations: config.maxIterations ?? 10 }, actResult.assistantMessage)

			if (terminationCheck.shouldTerminate) {
				state = markTermination(state, terminationCheck.reason)
				break
			}

			// Observe 阶段（如果有工具调用）
			if (actResult.hasToolCalls) {
				const observeResult = await executeObservePhase(state, actResult.toolCalls!, sessionId, toolHandler)
				state = observeResult.state
				for (const event of observeResult.events) {
					yield event
				}
			}

			// Decide 阶段
			const decideResult = executeDecidePhase(state, config)
			state = decideResult.state
			for (const event of decideResult.events) {
				yield event
			}

			// 检查迭代限制
			if (state.shouldTerminate) {
				break
			}
		}

		// yield 循环结束事件
		yield {
			type: "loop-end",
			reason: state.terminationReason ?? "final_answer",
			iterations: state.iteration
		}

		// yield 循环完成事件（携带最终结果）
		const lastMessage = state.messages[state.messages.length - 1] as LLMAssistantMessage | undefined

		yield {
			type: "loop-complete",
			state,
			response: lastMessage?.content ?? undefined,
			summaryResults: latestSummaryResult ? [latestSummaryResult] : []
		}
	} catch (error) {
		// yield 循环结束事件（错误）
		yield {
			type: "loop-end",
			reason: "error",
			iterations: state.iteration
		}

		// yield 循环完成事件（错误）
		yield {
			type: "loop-complete",
			state,
			error: error instanceof Error ? error : new Error(String(error)),
			summaryResults: latestSummaryResult ? [latestSummaryResult] : []
		}
	}
}

/**
 * Think 阶段处理器
 *
 * 准备发送消息到 LLM
 */
function executeThinkPhase(state: ReActState): ThinkPhaseResult {
	const events: RuntimeEvent[] = []

	// 设置阶段为 thinking
	let newState = setPhase(state, "thinking")
	events.push({ type: "phase-change", phase: "thinking", iteration: state.iteration })

	// 在实际实现中，可以在这里添加推理提示
	// 当前实现：直接进入 acting 阶段

	// 设置阶段为 acting（准备调用 LLM）
	newState = setPhase(newState, "acting")
	events.push({ type: "phase-change", phase: "acting", iteration: state.iteration })

	return { state: newState, events }
}

/**
 * Act 阶段处理器
 *
 * 流式调用 LLM 并实时 yield ProviderEvent
 * 使用 async function* 保证流式事件实时传出
 */
async function* executeActPhase(
	state: ReActState,
	provider: Provider,
	config: Config,
	memory: RuntimeMemoryState,
	contextOptions?: ContextBuilderOptions,
	summarizer?: Summarizer,
	toolHandler?: ToolHandler
): AsyncGenerator<RuntimeEvent, ActPhaseResult> {
	// 获取工具定义
	const tools = toolHandler?.getToolDefinitions()

	// 创建流式合并器
	const merger = createStreamMerger()

	// 流式请求
	const { contextMessages, summaryResult } = await buildContext({
		messages: state.messages,
		memory,
		options: contextOptions,
		summarizer
	})

	// 动态注入 soulPrompt 和 userPrompt（不写入 session 历史，改配置立即生效）
	const injectedMessages: LLMMessage[] = []
	if (config.soulPrompt) {
		injectedMessages.push({ role: "system", content: config.soulPrompt })
	}
	if (config.userPrompt) {
		injectedMessages.push({ role: "system", content: config.userPrompt })
	}
	injectedMessages.push(...contextMessages)

	for await (const event of provider.chatStream({
		messages: injectedMessages,
		model: config.model,
		tools
	})) {
		// 实时 yield ProviderEvent
		yield event
		// 累积到合并器
		merger.push(event)
	}

	// 获取完整消息
	const message = merger.getMessage()

	if (!message) {
		// 流式响应未完成（中断）
		return {
			state,
			hasToolCalls: false,
			summaryResult
		}
	}

	// 将助手消息添加到历史
	const newState = addMessage(state, message)

	// 检查是否有工具调用
	const hasToolCalls = message.toolCalls !== undefined && message.toolCalls.length > 0

	return {
		state: newState,
		assistantMessage: message,
		hasToolCalls,
		toolCalls: hasToolCalls ? message.toolCalls : undefined,
		summaryResult
	}
}

/**
 * Observe 阶段处理器
 *
 * 执行工具并记录观察结果
 */
async function executeObservePhase(
	state: ReActState,
	toolCalls: NonNullable<LLMAssistantMessage["toolCalls"]>,
	sessionId?: string,
	toolHandler?: ToolHandler
): Promise<ObservePhaseResult> {
	const events: RuntimeEvent[] = []

	// 设置阶段为 observing
	let newState = setPhase(state, "observing")
	events.push({ type: "phase-change", phase: "observing", iteration: state.iteration })

	// 执行工具并收集观察结果
	const toolMessages: LLMToolMessage[] = []

	for (const toolCall of toolCalls) {
		const { id, name, arguments: argsStr } = toolCall

		// 添加工具执行开始事件
		events.push({ type: "tool-execute", toolCallId: id, toolName: name })

		// 创建行动记录
		const actionRecord: ActionRecord = {
			toolCallId: id,
			toolName: name,
			parameters: argsStr,
			timestamp: Date.now()
		}

		// 执行工具
		let success = true
		let result = ""
		let error: string | undefined

		try {
			const params = JSON.parse(argsStr || "{}")
			const toolResult = await toolHandler!.call(name, params, sessionId)
			if (toolResult.error) {
				success = false
				error = `${toolResult.error.code}: ${toolResult.error.message}`
				result = `Error: ${error}`
			} else {
				result = toolResult.content
			}
		} catch (err) {
			success = false
			error = err instanceof Error ? err.message : String(err)
			result = `Error: ${error}`
		}

		// 添加工具执行结果事件
		events.push({ type: "tool-result", toolCallId: id, toolName: name, result, success })

		// 更新行动记录
		actionRecord.result = result
		actionRecord.success = success
		actionRecord.error = error

		// 添加行动到历史
		newState = addAction(newState, actionRecord)

		// 创建观察记录
		const observationRecord: ObservationRecord = {
			toolCallId: id,
			toolName: name,
			result,
			success,
			error,
			timestamp: Date.now()
		}

		// 添加观察到历史
		newState = addObservation(newState, observationRecord)

		// 创建工具消息
		const toolMessage: LLMToolMessage = {
			role: "tool",
			toolCallId: id,
			content: result
		}
		toolMessages.push(toolMessage)
	}

	// 添加工具消息到历史
	for (const msg of toolMessages) {
		newState = addMessage(newState, msg)
	}

	return { state: newState, events }
}

/**
 * Decide 阶段处理器
 *
 * 检查终止条件并决定是否继续
 */
function executeDecidePhase(state: ReActState, config: Config): DecidePhaseResult {
	const events: RuntimeEvent[] = []

	// 设置阶段为 deciding
	let newState = setPhase(state, "deciding")
	events.push({ type: "phase-change", phase: "deciding", iteration: state.iteration })

	// 增加迭代次数
	newState = incrementIteration(newState)

	// 检查迭代限制
	if (newState.iteration >= (config.maxIterations ?? 10)) {
		newState = markTermination(newState, "iteration_limit")
	}

	// 如果不终止，重置阶段为 thinking（准备下一轮）
	if (!newState.shouldTerminate) {
		newState = setPhase(newState, "thinking")
	}

	return { state: newState, events }
}
