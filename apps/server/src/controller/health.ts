import type { Request, Response } from "express"

/** GET /api/health - 健康检查端点 */
export function healthCheck(_req: Request, res: Response): void {
	res.json({ status: "ok" })
}
