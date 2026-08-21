import type { Request, Response } from "express"

import { chatService } from "../index.js"

/** POST /api/chat - SSE 流式聊天端点 */
export async function chat(req: Request, res: Response): Promise<void> {
	const { message, sessionId } = req.body
	if (!message || typeof message !== "string") {
		res.status(400).json({ error: "message field is required and must be a string" })
		return
	}

	// 设置 SSE headers
	res.setHeader("Content-Type", "text/event-stream")
	res.setHeader("Cache-Control", "no-cache")
	res.setHeader("Connection", "keep-alive")
	res.flushHeaders()

	// 客户端断开 SSE 连接时 abort 整个 runtime 调用链
	// 注意：必须用 res 的 close，而不是 req 的 close——Express 5 + Node 22 中
	// req 的 close 在请求体消费完后就会触发（不代表客户端断开），会误中断整个调用
	// res 的 close 只在客户端断开或 res.end() 后触发，后者 abort 是 no-op
	const controller = new AbortController()
	const onClose = () => controller.abort()
	res.on("close", onClose)

	try {
		for await (const sseEvent of chatService.chat({ message, sessionId, signal: controller.signal })) {
			// 客户端已断开时不再写入（write 到已关闭的 socket 会抛 EPIPE）
			/**
			 * 为什么会产生 EPIPE？
			 * 底层的逻辑：当客户端（如浏览器、前端 HTTP 请求）发起一个连接，服务器开始处理并尝试往 Socket（响应流 res）写入数据。如果客户端中途取消了请求（比如关闭网页、断网、设置了超时），客户端与服务器之间的 TCP 连接就断开了。
			 * EPIPE 的触发：此时如果服务器的 Controller/ Handler 还在继续尝试向这个已经关闭的 TCP 套接字（Socket）写入数据（写入操作 write），操作系统底层就会抛出一个 EPIPE 错误（Broken Pipe，管道破裂）。
			 */
			if (controller.signal.aborted) break
			res.write(`event: ${sseEvent.event}\ndata: ${sseEvent.data}\n\n`)
		}
	} catch (err) {
		// 仅在未中断时尝试写入错误事件，避免向已关闭的连接写入抛 EPIPE
		if (!controller.signal.aborted) {
			try {
				res.write(`event: error\ndata: ${JSON.stringify({ message: err instanceof Error ? err.message : String(err) })}\n\n`)
			} catch {
				// 写入失败静默忽略
			}
		}
	} finally {
		res.off("close", onClose)
		res.end()
	}
}
