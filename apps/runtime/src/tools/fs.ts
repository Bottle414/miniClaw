import fs from "node:fs"
import type { LLMTool } from "../types/llm"
import type { ToolExecutor, ToolMetadata } from "../types/llm/tool"

/** 工具定义 */
export const fsReadFile = {
	definition: {
		name: "fs.readFile",
		description: "读取指定路径的文件内容",
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "文件路径"
				},
				encoding: {
					type: "string",
					description: "文件编码，默认 utf-8"
				}
			},
			required: ["path"]
		}
	} satisfies LLMTool,
	metadata: {
		category: "file",
		dangerous: true,
		cacheable: false
	} satisfies ToolMetadata,
	executor: (async (params: Record<string, unknown>) => {
		const { path, encoding = "utf-8" } = params as { path: string; encoding?: string }
		try {
			const content = fs.readFileSync(path, encoding as BufferEncoding)
			return { content }
		} catch (e) {
			return { content: `读取文件失败: ${(e as Error).message}` }
		}
	}) satisfies ToolExecutor
}
