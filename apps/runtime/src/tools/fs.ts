import fs from "node:fs/promises"
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
	executor: (async (params: Record<string, unknown>, { abortSignal }) => {
		const { path, encoding = "utf-8" } = params as { path: string; encoding?: string }
		try {
			// fs.promises.readFile 原生支持 signal，abort 时自动抛 AbortError
			const content = await fs.readFile(path, {
				encoding: encoding as BufferEncoding,
				signal: abortSignal
			})
			return { content }
		} catch (e) {
			// 中断走 cancelled 语义，与其他工具错误区分
			if (e instanceof Error && e.name === "AbortError") {
				return { content: "", error: { code: "CANCELLED", message: "Tool call cancelled" } }
			}
			return { content: `读取文件失败: ${(e as Error).message}` }
		}
	}) satisfies ToolExecutor
}
