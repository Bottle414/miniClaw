import { promises as fs } from "node:fs"
import path from "node:path"

import type { SessionData } from "./types"

/** 创建基于本地文件系统的持久化存储。 */
export function createFileSystemMemoryStore(sessionsRoot: string) {
	const sessionDir = (sessionId: string) => path.join(sessionsRoot, sessionId)
	const metadataPath = (sessionId: string) => path.join(sessionDir(sessionId), "metadata.json")
	const messagesPath = (sessionId: string) => path.join(sessionDir(sessionId), "messages.json")
	const summaryPath = (sessionId: string) => path.join(sessionDir(sessionId), "summary.json")
	const factsPath = (sessionId: string) => path.join(sessionDir(sessionId), "facts.json")

	async function writeJson(filePath: string, data: unknown): Promise<void> {
		await fs.mkdir(path.dirname(filePath), { recursive: true })
		await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
	}

	async function readJson<T>(filePath: string): Promise<T | null> {
		try {
			const content = await fs.readFile(filePath, "utf-8")
			return JSON.parse(content) as T
		} catch {
			return null
		}
	}

	return {
		/** 保存 session 数据到文件系统。 */
		async save(sessionId: string, data: SessionData): Promise<void> {
			await fs.mkdir(sessionDir(sessionId), { recursive: true })
			await Promise.all([
				writeJson(metadataPath(sessionId), data.metadata),
				writeJson(messagesPath(sessionId), data.messages),
				writeJson(summaryPath(sessionId), data.summary),
				writeJson(factsPath(sessionId), data.facts)
			])
		},

		/** 从文件系统加载 session 数据，不存在时返回 null。 */
		async load(sessionId: string): Promise<SessionData | null> {
			const metadata = await readJson<SessionData["metadata"]>(metadataPath(sessionId))
			if (!metadata) return null

			const [messages, summary, facts] = await Promise.all([
				readJson<SessionData["messages"]>(messagesPath(sessionId)),
				readJson<SessionData["summary"]>(summaryPath(sessionId)),
				readJson<SessionData["facts"]>(factsPath(sessionId))
			])

			return {
				metadata,
				messages: messages ?? [],
				summary: summary ?? [],
				facts: facts ?? []
			}
		},

		/** 删除 session 文件夹及其所有文件。 */
		async delete(sessionId: string): Promise<void> {
			try {
				await fs.rm(sessionDir(sessionId), { recursive: true, force: true })
			} catch {
				// 文件夹不存在时忽略
			}
		},

		/** 检查 session 是否存在。 */
		async exists(sessionId: string): Promise<boolean> {
			try {
				await fs.access(metadataPath(sessionId))
				return true
			} catch {
				return false
			}
		},

		/** 列出所有 session 的元数据。 */
		async list(): Promise<SessionData["metadata"][]> {
			try {
				const entries = await fs.readdir(sessionsRoot)
				const results: SessionData["metadata"][] = []
				for (const entry of entries) {
					const stat = await fs.stat(path.join(sessionsRoot, entry))
					if (!stat.isDirectory()) continue
					const metadata = await readJson<SessionData["metadata"]>(metadataPath(entry))
					if (metadata) results.push(metadata)
				}
				return results
			} catch {
				return []
			}
		}
	}
}
