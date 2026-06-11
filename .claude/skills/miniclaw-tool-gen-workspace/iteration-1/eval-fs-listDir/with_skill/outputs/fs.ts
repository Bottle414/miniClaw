import type { LLMTool } from "../types/llm"
import { readdirSync, statSync } from "fs"
import { join } from "path"

/** 工具定义 */
export const fsListDir = {
	definition: {
		name: "fs.listDir",
		description: "列出指定目录下的文件和文件夹",
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "要列出的目录路径"
				}
			},
			required: ["path"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { path } = params as { path: string }
		try {
			const entries = readdirSync(path)
			const results = entries.map((name) => {
				const fullPath = join(path, name)
				try {
					const stat = statSync(fullPath)
					return { name, type: stat.isDirectory() ? "directory" : "file" }
				} catch {
					return { name, type: "unknown" }
				}
			})
			return JSON.stringify(results, null, 2)
		} catch (e) {
			return `列出目录失败: ${(e as Error).message}`
		}
	}
}
