/**
 * miniClaw SSE Server
 *
 * Express 中转服务器，将 runtime 的 AsyncIterable<RuntimeEvent>
 * 转为 SSE 事件流推送给浏览器客户端
 * 同时提供 Session 和 Memory 查询 REST API
 */

import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import path from "node:path"

import { createRuntime } from "@mini-claw/runtime"
import { createFileSystemMemoryStore, createSessionManager } from "@mini-claw/runtime/memory"
import type { RuntimeEvent, Runtime } from "@mini-claw/runtime"

// 项目根目录（server 位于 apps/server/src/，向上三级）
const projectRoot = path.resolve(import.meta.dirname, "../../..")

// 加载环境变量
const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.dev"
dotenv.config({ path: path.resolve(projectRoot, envFile) })

// 基础配置
const apiKey = process.env.API_KEY
if (!apiKey) {
	console.error("Error: API_KEY environment variable is required")
	process.exit(1)
}

const runtimeConfig = {
	apiKey,
	baseUrl: process.env.DEEPSEEK_BASE_URL,
	model: process.env.DEEPSEEK_MODEL,
	sessionsRoot: path.resolve(projectRoot, ".sessions")
}

// 为每个 session 创建独立的 runtime 实例（缓存）
const runtimeCache = new Map<string, Runtime>()

// 独立的 sessionManager，用于查询 API，不依赖 runtimeCache
const querySessionStore = createFileSystemMemoryStore(runtimeConfig.sessionsRoot)
const querySessionManager = createSessionManager(querySessionStore)

/**
 * 获取或创建指定 session 的 Runtime 实例
 *
 * 每个 session 有独立的 Runtime（独立的消息历史、memory 状态），
 * 首次请求时创建，后续复用
 */
function getRuntimeForSession(sessionId: string): Runtime {
	const cached = runtimeCache.get(sessionId)
	if (cached) return cached

	const runtime = createRuntime({
		...runtimeConfig,
		sessionId
	})
	runtimeCache.set(sessionId, runtime)
	return runtime
}

// 创建 Express 应用
const app = express()
const PORT = process.env.PORT ?? 3000

// 中间件
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }))
app.use(express.json())

/**
 * 将 LLMMessage[] 转为前端 ChatMessage 格式
 * 过滤掉 system 和 tool 消息，只保留 user/assistant
 */
function convertMessages(messages: Array<{ role: string; content: string | null }>): Array<{ role: string; content: string }> {
	const result: Array<{ role: string; content: string }> = []
	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i]
		if (msg.role === "system" || msg.role === "tool") continue
		const content = msg.content ?? ""
		if (!content) continue
		result.push({ role: msg.role, content })
	}
	return result
}

/**
 * 序列化 RuntimeEvent 为 SSE 可传输的 JSON
 * Error 对象需转为 plain object
 */
function serializeEvent(event: RuntimeEvent): string {
	if (event.type === "error") {
		const { type, error } = event
		return JSON.stringify({
			type,
			error: { message: error.message, stack: error.stack ?? "" }
		})
	}
	return JSON.stringify(event)
}

/**
 * GET /api/health
 * 健康检查端点
 */
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok" })
})

/**
 * GET /api/sessions
 * 列出所有 session
 */
app.get("/api/sessions", async (_req, res) => {
	try {
		const metadataList = await querySessionManager.list()
		const sessions = metadataList.map((meta) => ({
			id: meta.id,
			name: meta.name,
			createdAt: Number(meta.createdAt),
			updatedAt: Number(meta.updatedAt)
		}))
		res.json({ sessions })
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
})

/**
 * GET /api/session/:id
 * 获取 session 完整信息：基本信息、消息列表、summary、facts
 */
app.get("/api/session/:id", async (req, res) => {
	try {
		const session = await querySessionManager.load(req.params.id)
		if (!session) {
			res.status(404).json({ error: "Session not found" })
			return
		}
		res.json({
			id: session.id,
			name: session.name,
			createdAt: Number(session.createdAt),
			updatedAt: Number(session.updatedAt),
			messages: convertMessages(session.messages),
			summary: session.summary.map((s) => ({ summary: s.summary, createdAt: Number(s.createdAt) })),
			facts: session.facts.map((f) => ({ category: f.category, content: f.content })),
			canonicalMessagesCount: session.messages.length,
			contextMessagesCount: 0
		})
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
})

/**
 * POST /api/chat
 * SSE 流式聊天端点
 *
 * 接受 sessionId 参数，使用对应的 Runtime 实例处理，
 * 确保消息持久化到正确的 session 文件
 */
app.post("/api/chat", async (req, res) => {
	const { message, sessionId } = req.body
	if (!message || typeof message !== "string") {
		res.status(400).json({ error: "message field is required and must be a string" })
		return
	}

	// 获取或创建对应 session 的 runtime
	const runtime = sessionId ? getRuntimeForSession(sessionId) : createRuntime(runtimeConfig)

	// 设置 SSE headers
	res.setHeader("Content-Type", "text/event-stream")
	res.setHeader("Cache-Control", "no-cache")
	res.setHeader("Connection", "keep-alive")
	res.flushHeaders()

	try {
		for await (const event of runtime.chat(message, {
			contextOptions: { preserveRecentMessages: 2 }
		})) {
			const data = serializeEvent(event)
			res.write(`event: runtime-event\ndata: ${data}\n\n`)

			// loop-complete 事件后关闭连接
			if (event.type === "loop-complete") {
				break
			}
		}
	} catch (err) {
		const errorData = JSON.stringify({
			type: "error",
			error: { message: err instanceof Error ? err.message : String(err), stack: "" }
		})
		res.write(`event: runtime-event\ndata: ${errorData}\n\n`)
	} finally {
		res.end()
	}
})

// 启动服务器
app.listen(PORT, () => {
	console.log(`miniClaw SSE Server running at http://localhost:${PORT}`)
})
