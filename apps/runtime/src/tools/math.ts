import type { LLMTool } from "../types/llm"
import type { ToolExecutor, ToolMetadata } from "../types/llm/tool"

/** 工具定义 */
export const mathCalculate = {
	definition: {
		name: "math.calculate",
		description: "执行数学计算表达式并返回结果",
		parameters: {
			type: "object",
			properties: {
				expression: {
					type: "string",
					description: "数学表达式，如 1+2*3、sqrt(16)、2**10"
				}
			},
			required: ["expression"]
		}
	} satisfies LLMTool,
	metadata: {
		category: "compute",
		cacheable: true,
		readonly: true
	} satisfies ToolMetadata,
	executor: (async (params: Record<string, unknown>) => {
		const { expression } = params as { expression: string }
		try {
			// 只允许数学运算字符，防止代码注入
			if (!/^[\d\s+\-*/().%^sqrt,pie]+$/.test(expression)) {
				return { content: "不支持的表达式：仅允许数字、运算符(+ - * / % **)、括号、sqrt()、pi、e" }
			}
			// 预处理：** → Math.pow 写法由 Function 处理，sqrt → Math.sqrt，pi → Math.PI，e → Math.E
			let expr = expression
				.replace(/\bsqrt\b/g, "Math.sqrt")
				.replace(/\bpi\b/g, "Math.PI")
				.replace(/\be\b/g, "Math.E")
				.replace(/\^/g, "**")
			const fn = new Function(`"use strict"; return (${expr})`)
			const result = fn()
			if (typeof result !== "number" || !isFinite(result)) {
				return { content: `计算结果无效: ${result}` }
			}
			return { content: `${expression} = ${result}` }
		} catch (e) {
			return { content: `计算失败: ${(e as Error).message}` }
		}
	}) satisfies ToolExecutor
}
