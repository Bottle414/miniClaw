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

/** 初始化 sessionService，返回 list 和 detail 方法 */
export function initSessionService(sessionsRoot: string) {
	console.log("session controller loaded")
	const store = createFileSystemMemoryStore(sessionsRoot)
	const sessionManager = createSessionManager(store)

	console.log("session111 controller loaded")

	return {
		sessionManager,
		async list(): Promise<SessionListItem[]> {
			const metadataList: SessionMetadata[] = await sessionManager.list()
			return metadataList.map((meta) => ({
				id: meta.id,
				name: meta.name,
				createdAt: Number(meta.createdAt),
				updatedAt: Number(meta.updatedAt)
			}))
		},

		async detail(sessionId: string): Promise<SessionDetail | null> {
			console.log("id sessionId------------------------>", sessionId)
			const session: Session | null = await sessionManager.load(sessionId)
			console.log("id session------------------------>", session)
			if (!session) return null
			console.log("id session111------------------------>", session)

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
