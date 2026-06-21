/**
 * Runtime 事件处理器
 *
 * 将 SSE 接收到的 Runtime 事件分发到 useRuntimeStore
 * 与 message-merger 并行工作，互不干扰
 */

import type { RuntimePhase } from "../types/runtime"
import { useRuntimeStore } from "../stores/runtime-store"
import type { SSERuntimeEvent } from "./sse-client"

/** 当前活跃的迭代次数（用于将 ProviderEvent 关联到正确的迭代） */
let currentIteration = 0

/** 重置迭代计数器（新会话时调用） */
export function resetRuntimeEventProcessor(): void {
	currentIteration = 0
}

/**
 * 处理一个 SSE RuntimeEvent，分发到 Runtime Store
 *
 * - iteration-start: 创建新迭代记录
 * - phase-change: 记录阶段变更
 * - reasoning-delta: 追加思考内容到当前阶段
 * - text-delta: 追加文本内容到当前阶段
 * - tool-call-start: 记录工具调用开始到当前阶段
 * - tool-execute: 创建工具执行记录
 * - tool-result: 更新工具执行结果
 * - tool-call-end: 记录工具调用参数
 * - loop-end: 记录循环结束 + deciding 终止原因
 * - 其他事件: 不影响 Runtime Store
 */
export function processRuntimeEvent(event: SSERuntimeEvent): void {
	const store = useRuntimeStore.getState()

	switch (event.type) {
		case "iteration-start": {
			const { iteration } = event as { type: "iteration-start"; iteration: number }
			currentIteration = iteration
			store.onIterationStart(iteration)
			break
		}

		case "phase-change": {
			const { phase, iteration } = event as { type: "phase-change"; phase: RuntimePhase; iteration: number }
			currentIteration = iteration
			store.onPhaseChange(phase, iteration)
			break
		}

		case "reasoning-delta": {
			const { delta } = event as { type: "reasoning-delta"; delta: string }
			store.onReasoningDelta(currentIteration, delta)
			break
		}

		case "text-delta": {
			const { delta } = event as { type: "text-delta"; delta: string }
			store.onTextDelta(currentIteration, delta)
			break
		}

		case "tool-call-start": {
			const { toolCallId, toolName } = event as { type: "tool-call-start"; toolCallId: string; toolName: string }
			store.onToolCallStart(currentIteration, toolCallId, toolName)
			break
		}

		case "tool-execute": {
			const { toolCallId, toolName } = event as { type: "tool-execute"; toolCallId: string; toolName: string }
			store.onToolExecute(toolCallId, toolName)
			break
		}

		case "tool-call-end": {
			const { toolCallId, arguments: args } = event as { type: "tool-call-end"; toolCallId: string; arguments: string }
			store.onToolCallEnd(toolCallId, args)
			break
		}

		case "tool-result": {
			const { toolCallId, toolName, result, success } = event as {
				type: "tool-result"
				toolCallId: string
				toolName: string
				result: string
				success: boolean
			}
			store.onToolResult(toolCallId, toolName, result, success)
			break
		}

		case "loop-end": {
			const { reason, iterations } = event as { type: "loop-end"; reason: string; iterations: number }
			store.onLoopEnd(reason, iterations)
			store.onDecidingTermination(currentIteration, reason)
			break
		}

		default:
			break
	}
}
