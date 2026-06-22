import type { Request, Response } from "express"

import { toolService } from "../index.js"

/** GET /api/tools - 获取所有工具列表 */
export async function listTools(_req: Request, res: Response): Promise<void> {
	try {
		const tools = toolService.listTools()
		res.json({ tools })
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** GET /api/permission - 获取权限配置 */
export async function getPermission(_req: Request, res: Response): Promise<void> {
	try {
		const permission = await toolService.getPermission()
		res.json(permission)
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** PUT /api/permission - 更新权限配置 */
export async function updatePermission(req: Request, res: Response): Promise<void> {
	try {
		const { allow, check, deny } = req.body
		const updated = await toolService.updatePermission({ allow, check, deny })
		res.json(updated)
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}
