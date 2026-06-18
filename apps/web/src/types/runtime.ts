/**
 * Runtime Inspector 类型定义
 *
 * 用于 Runtime Inspector 面板展示的事件、工具、迭代等数据类型
 */

/** ReAct 迭代阶段 */
export type RuntimePhase = "thinking" | "acting" | "observing" | "deciding"

/** 迭代记录 */
export interface IterationRecord {
  /** 迭代序号 */
  iteration: number
  /** 阶段变更列表 */
  phases: RuntimePhase[]
}

/** 工具执行记录 */
export interface ToolRecord {
  /** 工具调用 ID */
  toolCallId: string
  /** 工具名称 */
  toolName: string
  /** 调用参数（JSON 字符串） */
  arguments?: string
  /** 执行结果 */
  result?: string
  /** 是否执行成功 */
  success?: boolean
  /** 是否已完成（收到 tool-result） */
  isComplete: boolean
}

/** Runtime 事件（从 SSE 接收的原始事件） */
export interface RuntimeEventData {
  type: string
  [key: string]: unknown
}

/** Session 详情（从 API 获取） */
export interface SessionDetail {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

/** Memory 状态（从 API 获取） */
export interface MemoryState {
  summaries: Array<{ summary: string; createdAt: string }>
  facts: Array<{ category: string; content: string }>
  contextMessagesCount: number
  canonicalMessagesCount: number
}
