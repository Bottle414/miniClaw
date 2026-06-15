import type { ToolMiddleware, ToolResult } from "../../types/llm/tool"

/**
 * 创建权限校验中间件
 * 检查工具所需权限是否在提供的权限集合中
 */
export function createPermissionMiddleware(getPermissions: () => Set<string>): ToolMiddleware {
	return async (context, next) => {
		const { requiredPermissions } = context.metadata
		if (!requiredPermissions || requiredPermissions.length === 0) {
			return next()
		}

		const permissions = getPermissions()
		for (const perm of requiredPermissions) {
			if (!permissions.has(perm)) {
				return {
					content: "",
					error: { code: "PERMISSION_DENIED", message: `Permission denied: ${perm}` }
				}
			}
		}

		return next()
	}
}
