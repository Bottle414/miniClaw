/**
 * ReAct 循环编排模块
 *
 * 实现 Think → Act → Observe → Decide 循环
 * 支持流式输出：Act 阶段使用 chatStream，通过 onEvent 回调传递事件
 */

import type { Provider } from "../types/providers"
import type { LLMMessage, LLMUserMessage, LLMAssistantMessage, LLMToolMessage } from "../types/llm"
import type { ReActState, ActionRecord, ObservationRecord, ReActEvent } from "../types/react"
import type { Config } from "../types/config"
import { createInitialState, updateState, addMessage, addAction, addObservation, incrementIteration, setPhase, markTermination } from "./state"
import { shouldTerminate, checkFinalAnswer, createErrorTermination } from "./terminator"
import { toolHandler } from "../tools"
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
	/** 流式事件回调（可选） */
	onEvent?: (event: ReActEvent) => void
	/** 会话 ID（用于工具调用日志和指标持久化） */
	sessionId?: string
}

/**
 * ReAct 循环执行结果
 */
export interface ReActLoopResult {
	/** 最终状态 */
	state: ReActState
	/** 最终响应（如果成功） */
	response?: string
	/** 错误（如果失败） */
	error?: Error
	/** 循环期间产生的摘要结果列表 */
	summaryResults: SummaryResult[]
}

/**
 * 安全地发出事件
 * 回调异常时记录但不中断循环
 */
function emitEvent(onEvent: ((event: ReActEvent) => void) | undefined, event: ReActEvent): void {
	if (!onEvent) return
	try {
		onEvent(event)
	} catch (err) {
		console.error("[ReAct] onEvent callback error:", err instanceof Error ? err.message : String(err))
	}
}

/**
 * 执行 ReAct 循环
 *
 * 主编排函数，驱动 Think → Act → Observe → Decide 循环
 */
export async function executeReActLoop(loopConfig: ReActLoopConfig): Promise<ReActLoopResult> {
	const {
		provider,
		config,
		userInput,
		initialMessages = [],
		memory = createRuntimeMemoryState(),
		contextOptions,
		summarizer,
		onEvent,
		sessionId
	} = loopConfig

	// 初始化状态
	let state = createInitialState()
	const summaryResults: SummaryResult[] = []

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
			// 发出迭代开始事件
			emitEvent(onEvent, { type: "react-iteration-start", iteration: state.iteration })

			// Think 阶段
			state = await executeThinkPhase(state, onEvent)

			// Act 阶段
			const actResult = await executeActPhase(state, provider, config, memory, contextOptions, summarizer, onEvent)
			state = actResult.state
			if (actResult.summaryResult) {
				summaryResults.push(actResult.summaryResult)
			}

			// 检查是否应该终止（最终答案或空响应）
			const terminationCheck = shouldTerminate(state, { maxIterations: config.maxIterations ?? 10 }, actResult.assistantMessage)

			if (terminationCheck.shouldTerminate) {
				state = markTermination(state, terminationCheck.reason)
				break
			}

			// Observe 阶段（如果有工具调用）
			if (actResult.hasToolCalls) {
				state = await executeObservePhase(state, actResult.toolCalls!, onEvent, sessionId)
			}

			// Decide 阶段
			state = executeDecidePhase(state, config, onEvent)

			// 检查迭代限制
			if (state.shouldTerminate) {
				break
			}
		}

		// 发出循环结束事件
		emitEvent(onEvent, {
			type: "react-loop-end",
			reason: state.terminationReason ?? "final_answer",
			iterations: state.iteration
		})

		// 返回结果
		const lastMessage = state.messages[state.messages.length - 1] as LLMAssistantMessage | undefined

		return {
			state,
			response: lastMessage?.content ?? undefined,
			summaryResults
		}
	} catch (error) {
		// 发出循环结束事件（错误）
		emitEvent(onEvent, {
			type: "react-loop-end",
			reason: "error",
			iterations: state.iteration
		})

		return {
			state,
			error: error instanceof Error ? error : new Error(String(error)),
			summaryResults
		}
	}
}

/**
 * Think 阶段处理器
 *
 * 准备发送消息到 LLM
 */
async function executeThinkPhase(state: ReActState, onEvent?: (event: ReActEvent) => void): Promise<ReActState> {
	// 设置阶段为 thinking
	let newState = setPhase(state, "thinking")
	emitEvent(onEvent, { type: "react-phase-change", phase: "thinking", iteration: state.iteration })

	// 在实际实现中，可以在这里添加推理提示
	// 当前实现：直接进入 acting 阶段

	// 设置阶段为 acting（准备调用 LLM）
	newState = setPhase(newState, "acting")
	emitEvent(onEvent, { type: "react-phase-change", phase: "acting", iteration: state.iteration })

	return newState
}

/**
 * Act 阶段处理器
 *
 * 流式调用 LLM 并解析响应
 */
async function executeActPhase(
	state: ReActState,
	provider: Provider,
	config: Config,
	memory: RuntimeMemoryState,
	contextOptions?: ContextBuilderOptions,
	summarizer?: Summarizer,
	onEvent?: (event: ReActEvent) => void
): Promise<{
	state: ReActState
	assistantMessage?: LLMAssistantMessage
	hasToolCalls: boolean
	toolCalls?: LLMAssistantMessage["toolCalls"]
	summaryResult?: SummaryResult
}> {
	// 获取工具定义
	const tools = toolHandler.getToolDefinitions()

	// 创建流式合并器
	const merger = createStreamMerger()

	// 流式请求
	const { contextMessages, summaryResult } = await buildContext({
		messages: state.messages,
		memory,
		options: contextOptions,
		summarizer
	})
	console.log("\n--- contextMessages 发送给模型 ---")
	console.log(JSON.stringify(contextMessages, null, 2))
	console.log("--- contextMessages end ---\n")

	for await (const event of provider.chatStream({
		messages: contextMessages,
		model: config.model,
		tools
	})) {
		// 透传 LLM 流式事件（跳过 tool-result，ReAct 用 react-tool-result 代替）
		if (event.type !== "tool-result") {
			emitEvent(onEvent, event as ReActEvent)
		}
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
	let newState = addMessage(state, message)

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
	onEvent?: (event: ReActEvent) => void,
	sessionId?: string
): Promise<ReActState> {
	// 设置阶段为 observing
	let newState = setPhase(state, "observing")
	emitEvent(onEvent, { type: "react-phase-change", phase: "observing", iteration: state.iteration })

	// 执行工具并收集观察结果
	const toolMessages: LLMToolMessage[] = []

	for (const toolCall of toolCalls) {
		const { id, name, arguments: argsStr } = toolCall

		// 发出工具执行开始事件
		emitEvent(onEvent, { type: "react-tool-execute", toolCallId: id, toolName: name })

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
			const toolResult = await toolHandler.call(name, params, sessionId)
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

		// 发出工具执行结果事件
		emitEvent(onEvent, { type: "react-tool-result", toolCallId: id, toolName: name, result, success })

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

	return newState
}

/**
 * Decide 阶段处理器
 *
 * 检查终止条件并决定是否继续
 */
function executeDecidePhase(state: ReActState, config: Config, onEvent?: (event: ReActEvent) => void): ReActState {
	// 设置阶段为 deciding
	let newState = setPhase(state, "deciding")
	emitEvent(onEvent, { type: "react-phase-change", phase: "deciding", iteration: state.iteration })

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

	return newState
}
