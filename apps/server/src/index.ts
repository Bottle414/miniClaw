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
import type { RuntimeEvent } from "@mini-claw/runtime"

// 项目根目录（server 位于 apps/server/src/，向上三级）
const projectRoot = path.resolve(import.meta.dirname, "../../..")

// 加载环境变量
const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.dev"
dotenv.config({ path: path.resolve(projectRoot, envFile) })

// 创建 runtime 实例
const apiKey = process.env.API_KEY
if (!apiKey) {
	console.error("Error: API_KEY environment variable is required")
	process.exit(1)
}

const runtime = createRuntime({
	apiKey,
	baseUrl: process.env.DEEPSEEK_BASE_URL,
	model: process.env.DEEPSEEK_MODEL,
	sessionsRoot: path.resolve(projectRoot, ".sessions")
})

// 创建 Express 应用
const app = express()
const PORT = process.env.PORT ?? 3000

// 中间件
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }))
app.use(express.json())

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
 * 列出所有 session 的元数据
 */
app.get("/api/sessions", async (_req, res) => {
	try {
		const metadataList = await runtime.sessionManager.list()
		res.json({ sessions: metadataList })
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
})

/**
 * GET /api/session/:id
 * 获取 session 详情
 */
app.get("/api/session/:id", async (req, res) => {
	try {
		const session = await runtime.sessionManager.load(req.params.id)
		if (!session) {
			res.status(404).json({ error: "Session not found" })
			return
		}
		res.json({
			id: session.id,
			name: session.name,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
			messageCount: session.messages.length
		})
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
})

/**
 * GET /api/session/:id/memory
 * 获取 session 的 Memory 状态
 */
app.get("/api/session/:id/memory", async (req, res) => {
	try {
		const session = await runtime.sessionManager.load(req.params.id)
		if (!session) {
			res.status(404).json({ error: "Session not found" })
			return
		}
		res.json({
			summaries: session.summary.map((s) => ({ summary: s.summary, createdAt: s.createdAt })),
			facts: session.facts.map((f) => ({ category: f.category, content: f.content })),
			canonicalMessagesCount: session.messages.length,
			contextMessagesCount: 0 // TODO: 需要暴露 Runtime 内部 contextBuilder 状态
		})
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
})

/**
 * POST /api/chat
 * SSE 流式聊天端点
 */
app.post("/api/chat", async (req, res) => {
	const { message } = req.body
	if (!message || typeof message !== "string") {
		res.status(400).json({ error: "message field is required and must be a string" })
		return
	}

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
