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

	try {
		for await (const sseEvent of chatService.chat({ message, sessionId })) {
			res.write(`event: ${sseEvent.event}\ndata: ${sseEvent.data}\n\n`)
		}
	} finally {
		res.end()
	}
}
