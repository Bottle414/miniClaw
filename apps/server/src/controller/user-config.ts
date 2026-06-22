import type { Request, Response } from "express"

import { userService } from "../index.js"
import type { UserConfig } from "../service/user-config.js"

/** API Key 脱敏掩码 */
const MASK = "**********"

/** 对 API Key 字段脱敏：非空则替换为掩码 */
function maskApiKeys(config: UserConfig): UserConfig {
	return {
		...config,
		deepseekApiKey: config.deepseekApiKey ? MASK : "",
		glmApiKey: config.glmApiKey ? MASK : ""
	}
}

/** GET /api/user-config - 获取用户配置 */
export async function getUserConfig(_req: Request, res: Response): Promise<void> {
	try {
		const config = await userService.get()
		res.json(maskApiKeys(config))
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}

/** PUT /api/user-config - 更新用户配置 */
export async function updateUserConfig(req: Request, res: Response): Promise<void> {
	try {
		// 只提取请求中实际提供的字段，避免 undefined 覆盖已有值
		const partial: Record<string, unknown> = {}
		for (const key of ["name", "identity", "detail", "soul", "model", "deepseekApiKey", "glmApiKey"] as const) {
			if (req.body[key] !== undefined) {
				// 掩码值不写入，保留原有 key
				if ((key === "deepseekApiKey" || key === "glmApiKey") && req.body[key] === MASK) {
					continue
				}
				partial[key] = req.body[key]
			}
		}
		const updated = await userService.update(partial)
		res.json(maskApiKeys(updated))
	} catch (err) {
		res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
	}
}
