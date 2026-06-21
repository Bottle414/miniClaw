import { createFileSystemMemoryStore, createSessionManager } from "@mini-claw/runtime/memory"
import type { Session, SessionMetadata } from "@mini-claw/runtime"

import { convertMessages } from "../utils/index.js"

/** Session 列表项格式 */
export interface SessionListItem {
	id: string
	name: string
	createdAt: number
	updatedAt: number
}

/** Session 详情格式 */
export interface SessionDetail {
	id: string
	name: string
	createdAt: number
	updatedAt: number
	messages: Array<{ role: string; content: string }>
	summary: Array<{ summary: string; createdAt: number }>
	facts: Array<{ category: string; content: string }>
	canonicalMessagesCount: number
	contextMessagesCount: number
}

/** 从第一条用户消息中提取标题，默认 session-xxx 格式时使用 */
function deriveTitleFromMessages(name: string, messages: Array<{ role: string; content: string }>): string {
	if (name && !name.startsWith("session-")) return name
	const firstUser = messages.find((m) => m.role === "user")
	if (!firstUser) return name
	const content = firstUser.content
	return content.length > 30 ? content.slice(0, 30) + "…" : content
}

/** 初始化 sessionService，返回 list 和 detail 方法 */
export function initSessionService(sessionsRoot: string) {
	const store = createFileSystemMemoryStore(sessionsRoot)
	const sessionManager = createSessionManager(store)

	return {
		sessionManager,
		async list(): Promise<SessionListItem[]> {
			const metadataList: SessionMetadata[] = await sessionManager.list()
			const results: SessionListItem[] = []
			for (const meta of metadataList) {
				// 默认 session-xxx 格式的 name 需要从消息中提取标题
				if (meta.name.startsWith("session-")) {
					const session = await sessionManager.load(meta.id)
					const messages = session ? convertMessages(session.messages) : []
					results.push({
						id: meta.id,
						name: deriveTitleFromMessages(meta.name, messages),
						createdAt: Number(meta.createdAt),
						updatedAt: Number(meta.updatedAt)
					})
				} else {
					results.push({
						id: meta.id,
						name: meta.name,
						createdAt: Number(meta.createdAt),
						updatedAt: Number(meta.updatedAt)
					})
				}
			}
			return results
		},

		async detail(sessionId: string): Promise<SessionDetail | null> {
			const session: Session | null = await sessionManager.load(sessionId)
			if (!session) return null

			return {
				id: session.id,
				name: session.name,
				createdAt: Number(session.createdAt),
				updatedAt: Number(session.updatedAt),
				messages: convertMessages(session.messages),
				summary: session.summary.map((s) => ({ summary: s.summary, createdAt: Number(s.createdAt) })),
				facts: session.facts.map((f) => ({ category: f.category, content: f.content })),
				canonicalMessagesCount: session.messages.length,
				contextMessagesCount: 0
			}
		}
	}
}
