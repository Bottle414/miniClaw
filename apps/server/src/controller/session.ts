import type { Request, Response } from "express"

import { sessionService } from "../index.js"

/** GET /api/sessions - 列出所有 session */
export async function list(_req: Request, res: Response): Promise<void> {
	try {
		const sessions = await sessionService.list()
		res.json({ sessions })
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** GET /api/session/:id - 获取 session 完整信息 */
export async function detail(req: Request, res: Response): Promise<void> {
	try {
		const id = req.params.id as string
		const session = await sessionService.detail(id)
		if (!session) {
			res.status(404).json({ error: "Session not found" })
			return
		}
		res.json(session)
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** GET /api/session/:id/metrics - 获取 session 工具指标 */
export async function metrics(req: Request, res: Response): Promise<void> {
	try {
		const id = req.params.id as string
		const data = await sessionService.metrics(id)
		if (!data) {
			res.json({ tools: {} })
			return
		}
		res.json(data)
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** DELETE /api/session/:id - 删除 session */
export async function remove(req: Request, res: Response): Promise<void> {
	try {
		const id = req.params.id as string
		await sessionService.deleteSession(id)
		res.json({ success: true })
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}
