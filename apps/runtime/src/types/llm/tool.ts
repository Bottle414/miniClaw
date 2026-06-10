/**
 * 统一 LLM 工具类型定义
 * 与具体 LLM 提供商无关的抽象工具类型
 */

// ============== Tool Types ==============

/** 工具选择模式 */
export type LLMToolChoiceMode = "none" | "auto" | "required"

/**
 * 工具函数参数定义
 * 支持 JSON Schema 格式
 */
export interface LLMFunctionParameters {
	/** 参数类型 */
	type?: string
	/** 参数属性定义 */
	properties?: Record<string, unknown>
	/** 必需参数列表 */
	required?: string[]
	/** 其他 JSON Schema 字段 */
	[key: string]: unknown
}

/**
 * 指定工具调用
 */
export interface LLMNamedToolChoice {
	/** 类型 */
	type: "function"
	/** 函数信息 */
	function: {
		/** 函数名称 */
		name: string
	}
}

/**
 * 工具定义
 */
export interface LLMTool {
	/** 工具名称 */
	name: string
	/** 工具描述 */
	description: string
	/** 工具函数参数定义 */
	parameters?: LLMFunctionParameters
}

/** 工具选择类型 */
export type LLMToolChoice = LLMToolChoiceMode | LLMNamedToolChoice
