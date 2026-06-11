import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const dbQuery = {
	definition: {
		name: "db.query",
		description: "查询数据库，执行 SQL 语句",
		parameters: {
			type: "object",
			properties: {
				sql: {
					type: "string",
					description: "SQL 查询语句"
				},
				database: {
					type: "string",
					description: "数据库名称，默认使用默认数据库"
				}
			},
			required: ["sql"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { sql, database } = params as { sql: string; database?: string }
		try {
			// 实现数据库查询逻辑
			return JSON.stringify({ sql, database: database || "default", results: [] })
		} catch (e) {
			return `查询失败: ${(e as Error).message}`
		}
	}
}
