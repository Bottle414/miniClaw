/**
 * Chat 状态 Store
 *
 * 管理会话列表、消息、流式状态
 */

import { create } from "zustand"
import { message } from "antd"
import { v4 as uuidv4 } from "uuid"

import type { ChatMessage } from "../types/message"
import type { ChatSession } from "../types/session"
import { createUserMessage, processEvent } from "../lib/message-merger"
import { processRuntimeEvent, resetRuntimeEventProcessor } from "../lib/runtime-event-processor"
import { streamChat } from "../lib/sse-client"
import { useRuntimeStore } from "./runtime-store"

function createSessionId(): string {
	return uuidv4()
}

/** 从服务端 name 生成前端展示标题：默认 session-xxx 格式则返回空，由调用方兜底 */
function deriveTitle(name: string, messages: ChatMessage[]): string {
	if (name && !name.startsWith("session-")) return name
	const firstUser = messages.find((m) => m.role === "user")
	if (!firstUser) return ""
	const content = firstUser.content
	return content.length > 30 ? content.slice(0, 30) + "…" : content
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
	/** 是否已初始化 */
	initialized: boolean

	/** 当前活跃会话的消息 */
	messages: ChatMessage[]

	/** 从服务端加载 session 列表 */
	loadSessions: () => Promise<void>
	/** 选择会话（异步加载消息） */
	selectSession: (id: string) => void
	/** 新建会话 */
	newChat: () => void
	/** 删除会话 */
	deleteSession: (id: string) => Promise<boolean>
	/** 发送消息 */
	sendMessage: (content: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
	sessions: [],
	activeSessionId: null,
	messagesMap: {},
	isStreaming: false,
	initialized: false,
	messages: [],

	loadSessions: async () => {
		try {
			const res = await fetch("/api/sessions")
			const data = await res.json()
			if (data.sessions && Array.isArray(data.sessions)) {
				const sessions: ChatSession[] = data.sessions.map((s: { id: string; name: string; updatedAt: number }) => ({
					id: s.id,
					title: s.name || "New Chat",
					updatedAt: s.updatedAt
				}))
				set({ sessions, initialized: true })
			} else {
				set({ initialized: true })
			}
		} catch {
			set({ initialized: true })
		}
	},

	selectSession: (id) => {
		const { isStreaming, messagesMap } = get()
		if (isStreaming) return

		if (messagesMap[id]) {
			set({ activeSessionId: id, messages: messagesMap[id] })
			return
		}

		set({ activeSessionId: id, messages: [] })

		fetch(`/api/session/${id}`)
			.then((res) => res.json())
			.then((data) => {
				if (data.error) return

				const loadedMessages: ChatMessage[] = (data.messages ?? []).map((msg: { role: string; content: string }, i: number) => ({
					id: `loaded-${i}`,
					role: msg.role as "user" | "assistant",
					content: msg.content,
					segments: [{ type: "text" as const, content: msg.content }],
					isComplete: true
				}))
				// 用消息内容兜底标题
				const title = deriveTitle(data.name ?? "", loadedMessages) || "New Chat"
				set((s) => {
					if (s.activeSessionId !== id) return s
					return {
						messagesMap: { ...s.messagesMap, [id]: loadedMessages },
						messages: loadedMessages,
						sessions: s.sessions.map((session) => (session.id === id ? { ...session, title } : session))
					}
				})
			})
			.catch(() => {})
	},

	newChat: () => {
		const { isStreaming } = get()
		if (isStreaming) return
		set({ activeSessionId: null, messages: [] })
	},

	deleteSession: async (id) => {
		const { sessions, activeSessionId, messagesMap } = get()

		// 先乐观更新 UI
		const newSessions = sessions.filter((s) => s.id !== id)
		const { [id]: _removed, ...restMessages } = messagesMap
		const newActiveId = activeSessionId === id ? null : activeSessionId
		set({
			sessions: newSessions,
			activeSessionId: newActiveId,
			messagesMap: restMessages,
			messages: newActiveId ? (restMessages[newActiveId] ?? []) : []
		})

		// 调用服务端删除
		try {
			const res = await fetch(`/api/session/${id}`, { method: "DELETE" })
			if (!res.ok) throw new Error()
			return true
		} catch {
			return false
		}
	},

	sendMessage: async (content) => {
		const { activeSessionId, messagesMap, isStreaming } = get()
		if (isStreaming) return

		// 每次发送新消息时清空 runtime inspector 数据，避免多次消息的迭代数据混在一起
		useRuntimeStore.getState().clearRuntime()
		resetRuntimeEventProcessor()

		let sid = activeSessionId
		if (!sid) {
			sid = createSessionId()
			const newSid = sid
			const title = content.length > 30 ? content.slice(0, 30) + "…" : content
			const newSession: ChatSession = { id: newSid, title, updatedAt: Date.now() }
			set((s) => ({
				activeSessionId: newSid,
				sessions: [newSession, ...s.sessions],
				messagesMap: { ...s.messagesMap, [newSid]: [] },
				messages: []
			}))
		}

		const sessionId = sid
		const userMsg = createUserMessage(content)
		set((s) => {
			const updated = [...(s.messagesMap[sessionId] ?? []), userMsg]
			return {
				messagesMap: { ...s.messagesMap, [sessionId]: updated },
				messages: updated,
				isStreaming: true
			}
		})

		try {
			let currentMessages = [...(messagesMap[sessionId] ?? []), userMsg]

			for await (const event of streamChat(content, sessionId)) {
				currentMessages = processEvent(currentMessages, event)
				processRuntimeEvent(event)

				// 检测 API Key 认证失败错误
				if (event.type === "error") {
					const errMsg = (event as { error?: { message?: string } }).error?.message ?? ""
					if (errMsg.includes("401") || errMsg.includes("认证失败") || errMsg.includes("Incorrect API key") || errMsg.includes("API Key")) {
						message.error("API Key 无效或未配置，请在设置中配置 API Key")
					}
				}

				const capturedMessages = currentMessages
				set((s) => ({
					messagesMap: { ...s.messagesMap, [sessionId]: capturedMessages },
					messages: s.activeSessionId === sessionId ? capturedMessages : s.messages
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
				const updated = [...(s.messagesMap[sessionId] ?? []), errorMsg]
				return {
					messagesMap: { ...s.messagesMap, [sessionId]: updated },
					messages: s.activeSessionId === sessionId ? updated : s.messages
				}
			})
		} finally {
			set((s) => ({
				isStreaming: false,
				sessions: s.sessions.map((session) => (session.id === sessionId ? { ...session, updatedAt: Date.now() } : session))
			}))
		}
	}
}))
