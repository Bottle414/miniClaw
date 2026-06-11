import type { LLMTool } from "../types/llm"
import * as fs from "fs"
import * as path from "path"

/** 工具定义 */
export const fsListDir = {
	definition: {
		name: "fs.listDir",
		description: "列出指定目录下的文件和文件夹",
		parameters: {
			type: "object",
			properties: {
				dirPath: {
					type: "string",
					description: "要列出的目录路径，默认为当前工作目录"
				}
			},
			required: []
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { dirPath } = params as { dirPath?: string }
		const targetPath = dirPath || process.cwd()

		try {
			if (!fs.existsSync(targetPath)) {
				return `Error: Directory does not exist: ${targetPath}`
			}

			const stats = fs.statSync(targetPath)
			if (!stats.isDirectory()) {
				return `Error: Path is not a directory: ${targetPath}`
			}

			const entries = fs.readdirSync(targetPath, { withFileTypes: true })
			if (entries.length === 0) {
				return `Directory is empty: ${targetPath}`
			}

			const result = entries.map((entry) => {
				const type = entry.isDirectory() ? "[DIR]" : "[FILE]"
				return `${type} ${entry.name}`
			})

			return `Contents of ${targetPath}:\n${result.join("\n")}`
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			return `Error: ${errorMessage}`
		}
	}
}
