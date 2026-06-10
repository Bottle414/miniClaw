/**
 * ReAct 循环编排模块
 *
 * 实现 Think → Act → Observe → Decide 循环
 */

import type { Provider } from "../types/providers"
import type {
	LLMMessage,
	LLMUserMessage,
	LLMAssistantMessage,
	LLMToolMessage
} from "../types/llm"
import type { ReActState, ActionRecord, ObservationRecord } from "../types/react"
import type { Config } from "../types/config"
import {
	createInitialState,
	updateState,
	addMessage,
	addAction,
	addObservation,
	incrementIteration,
	setPhase,
	markTermination
} from "./state"
import {
	shouldTerminate,
	checkFinalAnswer,
	createErrorTermination
} from "./terminator"
import { toolHandler } from "../tools"

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
}

/**
 * 执行 ReAct 循环
 *
 * 主编排函数，驱动 Think → Act → Observe → Decide 循环
 */
export async function executeReActLoop(
	loopConfig: ReActLoopConfig
): Promise<ReActLoopResult> {
	const { provider, config, userInput, initialMessages = [] } = loopConfig

	// 初始化状态
	let state = createInitialState()

	// 添加初始消息
	for (const msg of initialMessages) {
		state = addMessage(state, msg)
	}

	// 添加用户消息
	const userMessage: LLMUserMessage = {
		role: "user",
		content: [{ type: "text", text: userInput }]
	}
	state = addMessage(state, userMessage)

	try {
		// 主循环
		while (!state.shouldTerminate) {
			// Think 阶段
			state = await executeThinkPhase(state, provider, config)

			// Act 阶段
			const actResult = await executeActPhase(state, provider, config)
			state = actResult.state

			// 检查是否应该终止（最终答案或空响应）
			const terminationCheck = shouldTerminate(
				state,
				{ maxIterations: config.maxIterations ?? 10 },
				actResult.assistantMessage
			)

			if (terminationCheck.shouldTerminate) {
				state = markTermination(state, terminationCheck.reason)
				break
			}

			// Observe 阶段（如果有工具调用）
			if (actResult.hasToolCalls) {
				state = await executeObservePhase(state, actResult.toolCalls!)
			}

			// Decide 阶段
			state = executeDecidePhase(state, config)

			// 检查迭代限制
			if (state.shouldTerminate) {
				break
			}
		}

		// 返回结果
		const lastMessage = state.messages[state.messages.length - 1] as
			| LLMAssistantMessage
			| undefined

		return {
			state,
			response: lastMessage?.content
				?.map((s) => s.text)
				.join("")
		}
	} catch (error) {
		return {
			state,
			error: error instanceof Error ? error : new Error(String(error))
		}
	}
}

/**
 * Think 阶段处理器
 *
 * 准备发送消息到 LLM
 */
async function executeThinkPhase(
	state: ReActState,
	provider: Provider,
	config: Config
): Promise<ReActState> {
	// 设置阶段为 thinking
	let newState = setPhase(state, "thinking")

	// 在实际实现中，可以在这里添加推理提示
	// 当前实现：直接进入 acting 阶段

	// 设置阶段为 acting（准备调用 LLM）
	newState = setPhase(newState, "acting")

	return newState
}

/**
 * Act 阶段处理器
 *
 * 调用 LLM 并解析响应
 */
async function executeActPhase(
	state: ReActState,
	provider: Provider,
	config: Config
): Promise<{
	state: ReActState
	assistantMessage?: LLMAssistantMessage
	hasToolCalls: boolean
	toolCalls?: LLMAssistantMessage["toolCalls"]
}> {
	// 获取工具定义
	const tools = toolHandler.getToolDefinitions()

	// 构造请求
	const response = await provider.chat({
		messages: state.messages,
		model: config.model,
		tools
	})

	// 获取响应消息
	const { message } = response

	if (!message) {
		return {
			state,
			hasToolCalls: false
		}
	}

	// 将助手消息添加到历史
	let newState = addMessage(state, message)

	// 检查是否有工具调用
	const hasToolCalls =
		message.toolCalls !== undefined && message.toolCalls.length > 0

	return {
		state: newState,
		assistantMessage: message,
		hasToolCalls,
		toolCalls: hasToolCalls ? message.toolCalls : undefined
	}
}

/**
 * Observe 阶段处理器
 *
 * 执行工具并记录观察结果
 */
async function executeObservePhase(
	state: ReActState,
	toolCalls: NonNullable<LLMAssistantMessage["toolCalls"]>
): Promise<ReActState> {
	// 设置阶段为 observing
	let newState = setPhase(state, "observing")

	// 执行工具并收集观察结果
	const toolMessages: LLMToolMessage[] = []

	for (const toolCall of toolCalls) {
		const { id, name, arguments: argsStr } = toolCall

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
			result = toolHandler.call(name, params)
		} catch (err) {
			success = false
			error = err instanceof Error ? err.message : String(err)
			result = `Error: ${error}`
		}

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
			content: [{ type: "text", text: result }]
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
function executeDecidePhase(
	state: ReActState,
	config: Config
): ReActState {
	// 设置阶段为 deciding
	let newState = setPhase(state, "deciding")

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
