/**
 * Runtime 事件 Store
 *
 * 管理 Runtime Inspector 展示所需的迭代、阶段、工具执行记录等数据
 */

import { create } from "zustand"

import type { IterationRecord, RuntimePhase, ToolRecord } from "../types/runtime"

interface RuntimeState {
  /** 迭代记录列表 */
  iterations: IterationRecord[]
  /** 工具执行记录列表 */
  toolRecords: ToolRecord[]
  /** 循环结束原因 */
  loopEndReason: string | null
  /** 总迭代次数 */
  totalIterations: number

  /** 处理 iteration-start 事件 */
  onIterationStart: (iteration: number) => void
  /** 处理 phase-change 事件 */
  onPhaseChange: (phase: RuntimePhase, iteration: number) => void
  /** 处理 tool-execute 事件 */
  onToolExecute: (toolCallId: string, toolName: string) => void
  /** 处理 tool-result 事件 */
  onToolResult: (toolCallId: string, toolName: string, result: string, success: boolean) => void
  /** 处理 tool-call-end 事件（记录参数） */
  onToolCallEnd: (toolCallId: string, args: string) => void
  /** 处理 loop-end 事件 */
  onLoopEnd: (reason: string, iterations: number) => void
  /** 清空 Runtime 数据（新建会话时） */
  clearRuntime: () => void
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  iterations: [],
  toolRecords: [],
  loopEndReason: null,
  totalIterations: 0,

  onIterationStart: (iteration) => {
    set((s) => ({
      iterations: [...s.iterations, { iteration, phases: [] }]
    }))
  },

  onPhaseChange: (phase, iteration) => {
    set((s) => {
      const iterations = [...s.iterations]
      const idx = iterations.findIndex((it) => it.iteration === iteration)
      if (idx >= 0) {
        iterations[idx] = { ...iterations[idx], phases: [...iterations[idx].phases, phase] }
      } else {
        iterations.push({ iteration, phases: [phase] })
      }
      return { iterations }
    })
  },

  onToolExecute: (toolCallId, toolName) => {
    set((s) => {
      const existing = s.toolRecords.find((t) => t.toolCallId === toolCallId)
      if (existing) return s
      return {
        toolRecords: [...s.toolRecords, { toolCallId, toolName, isComplete: false }]
      }
    })
  },

  onToolResult: (toolCallId, toolName, result, success) => {
    set((s) => ({
      toolRecords: s.toolRecords.map((t) =>
        t.toolCallId === toolCallId ? { ...t, result, success, isComplete: true } : t
      )
    }))
  },

  onToolCallEnd: (toolCallId, args) => {
    set((s) => ({
      toolRecords: s.toolRecords.map((t) =>
        t.toolCallId === toolCallId ? { ...t, arguments: args } : t
      )
    }))
  },

  onLoopEnd: (reason, iterations) => {
    set({ loopEndReason: reason, totalIterations: iterations })
  },

  clearRuntime: () => {
    set({
      iterations: [],
      toolRecords: [],
      loopEndReason: null,
      totalIterations: 0
    })
  }
}))
