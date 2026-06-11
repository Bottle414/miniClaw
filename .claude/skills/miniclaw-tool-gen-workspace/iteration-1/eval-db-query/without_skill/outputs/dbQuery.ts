import type { LLMTool } from "../types/llm"

/** 工具定义 */
export const dbQuery = {
	definition: {
		name: "db.query",
		description: "查询数据库",
		parameters: {
			type: "object",
			properties: {
				sql: {
					type: "string",
					description: "SQL 查询语句"
				},
				database: {
					type: "string",
					description: "数据库名称（可选）"
				}
			},
			required: ["sql"]
		}
	} satisfies LLMTool,
	executor: (params: Record<string, unknown>): string => {
		const { sql, database } = params as { sql: string; database?: string }
		// 数据库查询实现
		return JSON.stringify({ sql, database, result: [] })
	}
}
