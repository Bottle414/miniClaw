import type { LLMTool } from "../types/llm"
import { weatherGetWeather } from "./weather"

/** 工具执行函数类型 */
type ToolExecutor = (params: Record<string, unknown>) => string

/** 工具注册项 */
interface ToolEntry {
	definition: LLMTool
	executor: ToolExecutor
}

/**
 * 工具处理器
 * 统一注册和调用工具
 */
class ToolHandler {
	private tools: Map<string, ToolEntry> = new Map()

	/** 注册工具 */
	register(definition: LLMTool, executor: ToolExecutor): void {
		this.tools.set(definition.name, { definition, executor })
	}

	/** 获取所有工具定义 (LLMTool 格式) */
	getToolDefinitions(): LLMTool[] {
		return Array.from(this.tools.values()).map((entry) => entry.definition)
	}

	/** 通过工具名获取工具 */
	get(name: string): ToolEntry | undefined {
		return this.tools.get(name)
	}

	/** 设置/更新工具 */
	set(definition: LLMTool, executor: ToolExecutor): void {
		this.tools.set(definition.name, { definition, executor })
	}

	/** 调用工具 */
	call(name: string, params: Record<string, unknown>): string {
		const entry = this.tools.get(name)
		if (!entry) {
			throw new Error(`Tool not found: ${name}`)
		}
		return entry.executor(params)
	}

	/** 是否已注册 */
	has(name: string): boolean {
		return this.tools.has(name)
	}
}

/** 全局工具处理器实例 */
export const toolHandler = new ToolHandler()

// ============== 注册工具 ==============

toolHandler.register(weatherGetWeather.definition, weatherGetWeather.executor)
