/**
 * Chat 状态 Store
 *
 * 管理会话列表、消息、流式状态，从 useChat hook 迁移
 */

import { create } from "zustand"

import type { ChatMessage } from "../types/message"
import type { ChatSession } from "../types/session"
import { createUserMessage, processEvent } from "../lib/message-merger"
import { processRuntimeEvent } from "../lib/runtime-event-processor"
import { streamChat } from "../lib/sse-client"

let nextSessionId = 0

function createSessionId(): string {
  return `session-${++nextSessionId}-${Date.now()}`
}

interface ChatState {
  /** 会话列表 */
  sessions: ChatSession[]
  /** 当前活跃会话 ID */
  activeSessionId: string | null
  /** 各会话的消息映射 */
  messagesMap: Record<string, ChatMessage[]>
  /** 是否正在流式输出 */
  isStreaming: boolean

  /** 当前活跃会话的消息（派生） */
  messages: ChatMessage[]

  /** 选择会话 */
  selectSession: (id: string) => void
  /** 新建会话 */
  newChat: () => void
  /** 删除会话 */
  deleteSession: (id: string) => void
  /** 发送消息 */
  sendMessage: (content: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messagesMap: {},
  isStreaming: false,
  messages: [],

  selectSession: (id) => {
    const { isStreaming } = get()
    if (isStreaming) return
    const { activeSessionId, messagesMap } = get()
    set({
      activeSessionId: id,
      messages: messagesMap[id] ?? []
    })
  },

  newChat: () => {
    const { isStreaming } = get()
    if (isStreaming) return
    set({ activeSessionId: null, messages: [] })
  },

  deleteSession: (id) => {
    const { sessions, activeSessionId, messagesMap } = get()
    const newSessions = sessions.filter((s) => s.id !== id)
    const { [id]: _, ...restMessages } = messagesMap
    const newActiveId = activeSessionId === id ? null : activeSessionId
    set({
      sessions: newSessions,
      activeSessionId: newActiveId,
      messagesMap: restMessages,
      messages: newActiveId ? (restMessages[newActiveId] ?? []) : []
    })
  },

  sendMessage: async (content) => {
    const { activeSessionId, messagesMap, isStreaming } = get()
    if (isStreaming) return

    // 确保有活跃会话
    let sid = activeSessionId
    if (!sid) {
      sid = createSessionId()
      const newSession: ChatSession = { id: sid, title: content, updatedAt: Date.now() }
      set((s) => ({
        activeSessionId: sid,
        sessions: [newSession, ...s.sessions],
        messagesMap: { ...s.messagesMap, [sid]: [] },
        messages: []
      }))
    }

    // 添加用户消息
    const userMsg = createUserMessage(content)
    set((s) => {
      const updated = [...(s.messagesMap[sid!] ?? []), userMsg]
      return {
        messagesMap: { ...s.messagesMap, [sid!]: updated },
        messages: updated,
        isStreaming: true
      }
    })

    try {
      let currentMessages = [...(messagesMap[sid] ?? []), userMsg]

      for await (const event of streamChat(content)) {
        // 消息拼接
        currentMessages = processEvent(currentMessages, event)
        // Runtime 事件分发
        processRuntimeEvent(event)

        const capturedMessages = currentMessages
        set((s) => ({
          messagesMap: { ...s.messagesMap, [sid!]: capturedMessages },
          messages: s.activeSessionId === sid ? capturedMessages : s.messages
        }))
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        segments: [{ type: "text", content: `Connection error: ${err instanceof Error ? err.message : String(err)}` }],
        isComplete: true
      }
      set((s) => {
        const updated = [...(s.messagesMap[sid!] ?? []), errorMsg]
        return {
          messagesMap: { ...s.messagesMap, [sid!]: updated },
          messages: s.activeSessionId === sid ? updated : s.messages
        }
      })
    } finally {
      set((s) => ({
        isStreaming: false,
        sessions: s.sessions.map((session) =>
          session.id === sid ? { ...session, updatedAt: Date.now() } : session
        )
      }))
    }
  }
}))
