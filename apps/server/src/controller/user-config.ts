import type { Request, Response } from "express"

import { userService } from "../index.js"

/** GET /api/user-config - 获取用户配置 */
export async function getUserConfig(_req: Request, res: Response): Promise<void> {
	try {
		const config = await userService.get()
		res.json(config)
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** PUT /api/user-config - 更新用户配置 */
export async function updateUserConfig(req: Request, res: Response): Promise<void> {
	try {
		const { name, identity, detail, soul } = req.body
		const updated = await userService.update({ name, identity, detail, soul })
		res.json(updated)
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}
