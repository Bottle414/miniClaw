import { randomUUID } from "node:crypto"

import type { MemoryStore, Session, SessionCreateOptions, SessionData, SessionMetadata } from "./types"

/** 创建 Session 管理器，封装 session 的创建、加载、保存和删除操作。 */
export function createSessionManager(store: MemoryStore, now: () => number = () => Date.now()) {
	/** 将运行时 Session 对象转换为持久化 SessionData。 */
	function sessionToData(session: Session): SessionData {
		return {
			metadata: {
				id: session.id,
				name: session.name,
				createdAt: session.createdAt,
				updatedAt: session.updatedAt
			},
			messages: session.messages,
			summary: session.summary,
			facts: session.facts,
			reasoning: session.reasoning
		}
	}

	/** 将持久化 SessionData 转换为运行时 Session 对象。 */
	function dataToSession(data: SessionData): Session {
		return {
			id: data.metadata.id,
			name: data.metadata.name,
			createdAt: data.metadata.createdAt,
			updatedAt: data.metadata.updatedAt,
			messages: data.messages,
			summary: data.summary,
			facts: data.facts,
			reasoning: data.reasoning
		}
	}

	return {
		/** 创建新 session 并持久化。 */
		async create(options?: SessionCreateOptions): Promise<Session> {
			const id = options?.id ?? randomUUID()
			const timestamp = now()
			const session: Session = {
				id,
				name: options?.name ?? `session-${id}`,
				createdAt: timestamp.toString(),
				updatedAt: timestamp.toString(),
				messages: [],
				summary: [],
				facts: [],
				reasoning: []
			}

			await store.save(id, sessionToData(session))
			return session
		},

		/** 加载已有 session，不存在时返回 null。 */
		async load(sessionId: string): Promise<Session | null> {
			const data = await store.load(sessionId)
			if (!data) return null
			return dataToSession(data)
		},

		/** 保存 session 更新，自动更新 updatedAt。 */
		async save(session: Session): Promise<void> {
			const updatedSession = {
				...session,
				updatedAt: now().toString()
			}
			await store.save(session.id, sessionToData(updatedSession))
		},

		/** 删除 session 及其所有持久化数据。 */
		async delete(sessionId: string): Promise<void> {
			await store.delete(sessionId)
		},

		/** 列出所有 session 的元数据。 */
		async list(): Promise<SessionMetadata[]> {
			if (!store.list) return []
			return store.list()
		}
	}
}
