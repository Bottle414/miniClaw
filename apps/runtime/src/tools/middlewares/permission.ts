import { readFileSync } from "node:fs"
import path from "node:path"

import type { ToolMiddleware, PermissionConfig } from "../../types/llm/tool"
import { logger } from "../../utils/logger"

/** 默认权限配置：所有工具放行 */
const defaultPermissionConfig: Required<PermissionConfig> = {
	allow: ["*"],
	check: [],
	deny: []
}

/**
 * 通配符工具名匹配
 * - 单独的 `*` 匹配任意工具名（含多层级）
 * - `prefix.*` 中的 `*` 匹配单层级段（即 `[^.]+`）
 */
export function matchToolName(pattern: string, toolName: string): boolean {
	if (pattern === "*") return true
	const regexStr = "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$"
	return new RegExp(regexStr).test(toolName)
}

/**
 * 从项目根目录同步加载 permission.json
 * 文件不存在时返回默认配置，解析失败时抛错
 */
export function loadPermissionConfig(rootDir: string): Required<PermissionConfig> {
	const filePath = path.join(rootDir, "permission.json")
	try {
		const content = readFileSync(filePath, "utf-8")
		const parsed = JSON.parse(content) as PermissionConfig
		return {
			allow: parsed.allow ?? defaultPermissionConfig.allow,
			check: parsed.check ?? defaultPermissionConfig.check,
			deny: parsed.deny ?? defaultPermissionConfig.deny
		}
	} catch (err) {
		if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
			logger("tool", "yellow", "[Permission] permission.json not found, using default (allow all)")
			return defaultPermissionConfig
		}
		throw new Error(`[Permission] Failed to load permission.json: ${err instanceof Error ? err.message : String(err)}`)
	}
}

/**
 * 创建权限校验中间件
 * 基于 permission.json 配置，支持 allow/check/deny 三级权限、通配符匹配、确认回调
 * 优先级：deny > check > allow
 */
export function createPermissionMiddleware(
	config: PermissionConfig,
	onPermissionCheck: (toolName: string) => Promise<boolean>
): ToolMiddleware {
	const resolved: Required<PermissionConfig> = {
		allow: config.allow ?? defaultPermissionConfig.allow,
		check: config.check ?? defaultPermissionConfig.check,
		deny: config.deny ?? defaultPermissionConfig.deny
	}

	return async (context, next) => {
		const { toolName } = context

		// deny 最高优先级
		for (const pattern of resolved.deny) {
			if (matchToolName(pattern, toolName)) {
				return {
					content: "",
					error: { code: "PERMISSION_DENIED", message: `Permission denied: ${toolName} (matched deny rule: ${pattern})` }
				}
			}
		}

		// check 需确认
		for (const pattern of resolved.check) {
			if (matchToolName(pattern, toolName)) {
				const approved = await onPermissionCheck(toolName)
				if (!approved) {
					return {
						content: "",
						error: { code: "PERMISSION_DENIED", message: `Permission denied: ${toolName} (check rejected)` }
					}
				}
				return next()
			}
		}

		// allow 放行
		for (const pattern of resolved.allow) {
			if (matchToolName(pattern, toolName)) {
				return next()
			}
		}

		// 未匹配任何规则，默认拒绝
		return {
			content: "",
			error: { code: "PERMISSION_DENIED", message: `Permission denied: ${toolName} (no matching rule)` }
		}
	}
}
