/**
 * ReAct 循环编排模块
 *
 * 实现 Think → Act → Observe → Decide 循环
 * 支持流式输出：通过 AsyncIterable yield 事件，消费者 for await...of 拉取
 */

import type { Provider } from "../types/providers"
import type { LLMMessage, LLMUserMessage, LLMAssistantMessage, LLMToolMessage } from "../types/llm"
import type { ReActState } from "../types/react"
import type { RuntimeEvent } from "../types/event"
import type { Config } from "../types/config"
import type { ToolHandler } from "../tools"
import { createInitialState, addMessage, incrementIteration, setPhase, markTermination } from "./state"
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
	/** 外部中断信号（可选），abort 后循环尽早退出，不发起后续 LLM 请求和工具调用 */
	signal?: AbortSignal
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
		toolHandler,
		signal
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

	/** 检查中断信号，已 abort 则返回 true */
	const isAborted = () => signal?.aborted === true

	try {
		// 主循环
		while (!state.shouldTerminate) {
			// 循环顶部检查中断：进入新迭代前若已 abort 则直接结束
			if (isAborted()) {
				state = markTermination(state, "aborted")
				break
			}

			// yield 迭代开始事件
			yield { type: "iteration-start", iteration: state.iteration }

			// Think 阶段
			const thinkResult = executeThinkPhase(state)
			state = thinkResult.state
			for (const event of thinkResult.events) {
				yield event
			}

			// Act 阶段前检查中断：避免已 abort 还发起 LLM 流式请求
			if (isAborted()) {
				state = markTermination(state, "aborted")
				break
			}

			// Act 阶段（实时 yield ProviderEvent）
			const actResult = yield* executeActPhase(state, provider, config, memory, contextOptions, summarizer, toolHandler, signal)
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

			// Act 阶段结束后检查中断：LLM 流可能被 signal 中断，此时 actResult 可能不完整
			if (isAborted()) {
				state = markTermination(state, "aborted")
				break
			}

			// 检查是否应该终止（最终答案或空响应）
			const terminationCheck = shouldTerminate(state, { maxIterations: config.maxIterations ?? 10 }, actResult.assistantMessage)

			if (terminationCheck.shouldTerminate) {
				state = markTermination(state, terminationCheck.reason)
				break
			}

			// Observe 阶段（如果有工具调用）
			if (actResult.hasToolCalls) {
				const observeResult = await executeObservePhase(state, actResult.toolCalls!, sessionId, toolHandler, signal)
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
	toolHandler?: ToolHandler,
	signal?: AbortSignal
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

	for await (const event of provider.chatStream(
		{
			messages: injectedMessages,
			model: config.model,
			tools
		},
		signal
	)) {
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
 * 单个工具调用的处理结果
 */
interface ToolCallProcessed {
	/** 工具消息（写入 state.messages，下一轮 LLM 请求会读取） */
	toolMessage: LLMToolMessage
	/** 执行结果内容（用于事件流） */
	result: string
	/** 是否成功（用于事件流） */
	success: boolean
}

/**
 * 构造单个工具调用的处理结果
 */
function makeProcessed(result: string, success: boolean, toolCallId: string): ToolCallProcessed {
	return {
		toolMessage: { role: "tool", toolCallId, content: result },
		result,
		success
	}
}

/**
 * 执行单个工具调用（含异常捕获）
 * 并行和串行路径共用此函数，保证错误处理语义一致
 */
async function runToolCall(
	toolCall: NonNullable<LLMAssistantMessage["toolCalls"]>[number],
	sessionId: string | undefined,
	toolHandler: ToolHandler,
	signal?: AbortSignal
): Promise<ToolCallProcessed> {
	const { id, name, arguments: argsStr } = toolCall

	let success = true
	let result = ""

	try {
		const params = JSON.parse(argsStr || "{}")
		const toolResult = await toolHandler.call(name, params, sessionId, signal)
		if (toolResult.error) {
			success = false
			result = `Error: ${toolResult.error.code}: ${toolResult.error.message}`
		} else {
			result = toolResult.content
		}
	} catch (err) {
		success = false
		result = `Error: ${err instanceof Error ? err.message : String(err)}`
	}

	return makeProcessed(result, success, id)
}

/**
 * Observe 阶段处理器
 *
 * 执行工具并把结果写入 state.messages 供下一轮 LLM 使用
 *
 * 并行策略：
 * - 同轮所有 toolCalls 对应的工具 metadata.readonly 均为 true 时，使用 Promise.allSettled 并行执行
 * - 任一工具未声明 readonly（默认 false）则退化为串行，避免写类工具意外并行引发竞态
 * - 并行模式下事件发出顺序保持稳定：先按原顺序 yield 所有 tool-execute，再按原顺序 yield tool-result
 */
async function executeObservePhase(
	state: ReActState,
	toolCalls: NonNullable<LLMAssistantMessage["toolCalls"]>,
	sessionId?: string,
	toolHandler?: ToolHandler,
	signal?: AbortSignal
): Promise<ObservePhaseResult> {
	const events: RuntimeEvent[] = []

	// 设置阶段为 observing
	let newState = setPhase(state, "observing")
	events.push({ type: "phase-change", phase: "observing", iteration: state.iteration })

	const toolMessages: LLMToolMessage[] = []
	const processedList: ToolCallProcessed[] = []

	// 判断是否可全部并行：所有 toolCalls 对应工具都声明 readonly
	const allReadonly = toolHandler !== undefined && toolCalls.every((tc) => toolHandler.get(tc.name)?.metadata?.readonly === true)

	if (allReadonly && toolCalls.length > 1) {
		// 并行模式：先按原顺序 yield 所有 execute 事件
		for (const { id, name } of toolCalls) {
			events.push({ type: "tool-execute", toolCallId: id, toolName: name })
		}

		// Promise.allSettled 并行执行：单个工具异常不会影响其他工具
		const settled = await Promise.allSettled(toolCalls.map((tc) => runToolCall(tc, sessionId, toolHandler!, signal)))

		// 按原顺序处理结果，保证事件顺序与 toolCallId 一一对应
		for (let i = 0; i < toolCalls.length; i++) {
			const tc = toolCalls[i]
			const r = settled[i]
			// rejected（中间件链路未捕获异常）转成与 try/catch 一致的错误结果
			const processed: ToolCallProcessed = r.status === "fulfilled" ? r.value : makeProcessed(`Error: ${String(r.reason)}`, false, tc.id)

			processedList.push(processed)
			events.push({
				type: "tool-result",
				toolCallId: tc.id,
				toolName: tc.name,
				result: processed.result,
				success: processed.success
			})
		}
	} else {
		// 串行模式（保留原有 for...of 行为）
		for (const toolCall of toolCalls) {
			events.push({ type: "tool-execute", toolCallId: toolCall.id, toolName: toolCall.name })

			const processed = await runToolCall(toolCall, sessionId, toolHandler!, signal)
			processedList.push(processed)

			events.push({
				type: "tool-result",
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				result: processed.result,
				success: processed.success
			})
		}
	}

	// 按原顺序追加 toolMessage 到 state.messages
	for (const { toolMessage } of processedList) {
		toolMessages.push(toolMessage)
	}
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
