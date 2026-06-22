import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { PermissionConfig } from "@mini-claw/runtime"

/** 工具信息 */
export interface ToolInfo {
	/** 工具名 */
	name: string
	/** 工具描述 */
	description: string
}

const defaultPermission: Required<PermissionConfig> = {
	allow: ["*"],
	check: [],
	deny: []
}

/** 初始化 toolService */
export function initToolService(projectRoot: string) {
	const permissionPath = path.join(projectRoot, "permission.json")

	/** 获取所有已注册工具列表 */
	function listTools(): ToolInfo[] {
		// 从 runtime 的 createToolHandler 获取工具列表
		// 由于工具定义在 runtime 内部，这里直接硬编码返回
		// TODO: 后续可通过 runtime API 动态获取
		return [
			{ name: "weather.getWeather", description: "获取指定城市的天气信息" },
			{ name: "time.getCurrent", description: "获取当前时间" },
			{ name: "fs.readFile", description: "读取文件内容" },
			{ name: "math.calculate", description: "执行数学计算" }
		]
	}

	/** 获取权限配置 */
	async function getPermission(): Promise<Required<PermissionConfig>> {
		try {
			const content = await readFile(permissionPath, "utf-8")
			const parsed = JSON.parse(content) as PermissionConfig
			return {
				allow: parsed.allow ?? defaultPermission.allow,
				check: parsed.check ?? defaultPermission.check,
				deny: parsed.deny ?? defaultPermission.deny
			}
		} catch {
			return { ...defaultPermission }
		}
	}

	/** 更新权限配置 */
	async function updatePermission(config: PermissionConfig): Promise<Required<PermissionConfig>> {
		const resolved: Required<PermissionConfig> = {
			allow: config.allow ?? defaultPermission.allow,
			check: config.check ?? defaultPermission.check,
			deny: config.deny ?? defaultPermission.deny
		}
		await writeFile(permissionPath, JSON.stringify(resolved, null, 2), "utf-8")
		return resolved
	}

	return {
		listTools,
		getPermission,
		updatePermission
	}
}
