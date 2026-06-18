/**
 * Runtime 事件处理器
 *
 * 将 SSE 接收到的 Runtime 事件分发到 useRuntimeStore
 * 与 message-merger 并行工作，互不干扰
 */

import type { RuntimePhase } from "../types/runtime"
import { useRuntimeStore } from "../stores/runtime-store"
import type { SSERuntimeEvent } from "./sse-client"

/**
 * 处理一个 SSE RuntimeEvent，分发到 Runtime Store
 *
 * - iteration-start: 创建新迭代记录
 * - phase-change: 记录阶段变更
 * - tool-execute: 创建工具执行记录
 * - tool-result: 更新工具执行结果
 * - tool-call-end: 记录工具调用参数
 * - loop-end: 记录循环结束
 * - 其他事件: 不影响 Runtime Store
 */
export function processRuntimeEvent(event: SSERuntimeEvent): void {
  const store = useRuntimeStore.getState()

  switch (event.type) {
    case "iteration-start": {
      const { iteration } = event as { type: "iteration-start"; iteration: number }
      store.onIterationStart(iteration)
      break
    }

    case "phase-change": {
      const { phase, iteration } = event as { type: "phase-change"; phase: RuntimePhase; iteration: number }
      store.onPhaseChange(phase, iteration)
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
        type: "tool-result"; toolCallId: string; toolName: string; result: string; success: boolean
      }
      store.onToolResult(toolCallId, toolName, result, success)
      break
    }

    case "loop-end": {
      const { reason, iterations } = event as { type: "loop-end"; reason: string; iterations: number }
      store.onLoopEnd(reason, iterations)
      break
    }

    default:
      break
  }
}
