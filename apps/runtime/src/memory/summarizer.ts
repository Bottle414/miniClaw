import type { LLMMessage, LLMSystemMessage } from "../types/llm"
import type { Provider } from "../types/providers"
import type { Config } from "../types/config"
import type { Fact, FactCategory, SummaryJsonResponse, SummaryResult, SummarySourceRange, Summarizer } from "./types"

/** 摘要生成器专用系统提示词，仅用于内部摘要请求。 */
export const SUMMARY_GENERATOR_SYSTEM_PROMPT = [
	"你是 miniClaw 的内部上下文摘要生成器。",
	"你的任务是只从输入消息中提取信息，生成结构化 JSON；不要自由总结、猜测或补充输入中不存在的信息。",
	"必须输出严格 JSON，不要使用 Markdown，不要添加解释。",
	"JSON 结构必须为：",
	'{"summary":"string","extractedFacts":[{"category":"user-preference|task|constraint|project-state","content":"string","source":"string，可选"}]}',
	"summary 应尽量短，只保留后续任务需要的上下文。",
	"extractedFacts 只记录可复用事实；没有事实时返回空数组。"
].join("\n")

const FACT_CATEGORIES: FactCategory[] = ["user-preference", "task", "constraint", "project-state"]

/** 摘要 JSON 解析错误。 */
export class SummaryParseError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "SummaryParseError"
	}
}

function messageToLine(message: LLMMessage, index: number): string {
	const label = `${index + 1}. ${message.role}`

	switch (message.role) {
		case "assistant":
			return `${label}: ${message.content ?? "(tool calls)"}`
		case "tool":
			return `${label}(${message.toolCallId}): ${message.content}`
		default:
			return `${label}: ${message.content}`
	}
}

function renderMessagesForSummary(messages: LLMMessage[], sourceRange: SummarySourceRange): string {
	return [
		`sourceRange: [${sourceRange[0]}, ${sourceRange[1]}]`,
		"messages:",
		...messages.map(messageToLine)
	].join("\n")
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonObject(content: string): unknown {
	try {
		return JSON.parse(content)
	} catch (error) {
		throw new SummaryParseError(`摘要 JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function parseFact(value: unknown, index: number): Fact {
	if (!isRecord(value)) {
		throw new SummaryParseError(`摘要 fact[${index}] 必须是对象`)
	}

	const { category, content, source } = value
	if (typeof category !== "string" || !FACT_CATEGORIES.includes(category as FactCategory)) {
		throw new SummaryParseError(`摘要 fact[${index}].category 非法`)
	}
	if (typeof content !== "string" || content.length === 0) {
		throw new SummaryParseError(`摘要 fact[${index}].content 必须是非空字符串`)
	}
	if (source !== undefined && typeof source !== "string") {
		throw new SummaryParseError(`摘要 fact[${index}].source 必须是字符串`)
	}

	return {
		category: category as FactCategory,
		content,
		...(source ? { source } : {})
	}
}

/** 解析并校验 LLM 摘要 JSON。 */
export function parseSummaryJson(content: string): SummaryJsonResponse {
	const parsed = parseJsonObject(content)
	if (!isRecord(parsed)) {
		throw new SummaryParseError("摘要 JSON 顶层必须是对象")
	}

	const { summary, extractedFacts } = parsed
	if (typeof summary !== "string") {
		throw new SummaryParseError("摘要 summary 必须是字符串")
	}
	if (!Array.isArray(extractedFacts)) {
		throw new SummaryParseError("摘要 extractedFacts 必须是数组")
	}

	return {
		summary,
		extractedFacts: extractedFacts.map(parseFact)
	}
}

/** 创建确定性结构化摘要器，用作测试和无 Provider 场景的默认实现。 */
export function createSimpleSummarizer(now: () => number = Date.now): Summarizer {
	return {
		async summarize(messages: LLMMessage[], sourceRange: SummarySourceRange): Promise<SummaryResult | null> {
			if (messages.length === 0) return null

			return {
				summary: [
					"以下是较早对话上下文的确定性摘要，原始消息仍保留在权威历史中：",
					...messages.map(messageToLine)
				].join("\n"),
				extractedFacts: [],
				sourceRange,
				createdAt: now(),
				metadata: { strategy: "deterministic" }
			}
		}
	}
}

/** 创建基于当前 Provider 的 LLM 结构化摘要器。 */
export function createLLMSummarizer(provider: Provider, config: Pick<Config, "model">, now: () => number = Date.now): Summarizer {
	return {
		async summarize(messages: LLMMessage[], sourceRange: SummarySourceRange): Promise<SummaryResult | null> {
			if (messages.length === 0) return null

			const response = await provider.chat({
				messages: [
					{
						role: "system",
						content: SUMMARY_GENERATOR_SYSTEM_PROMPT
					},
					{
						role: "user",
						content: renderMessagesForSummary(messages, sourceRange)
					}
				],
				model: config.model
			})

			const content = response.message?.content
			if (!content) {
				throw new SummaryParseError("摘要响应缺少 message.content")
			}

			const parsed = parseSummaryJson(content)
			return {
				...parsed,
				sourceRange,
				createdAt: now(),
				metadata: { strategy: "llm", responseId: response.id, model: response.model }
			}
		}
	}
}

/** 默认确定性摘要器。 */
export const simpleSummarizer = createSimpleSummarizer()

/** 将结构化摘要渲染为摘要系统消息。 */
export function renderSummaryMessage(result: SummaryResult): LLMSystemMessage | null {
	if (result.summary.length === 0) return null

	return {
		role: "system",
		content: [
			"较早对话上下文摘要：",
			result.summary,
			`来源消息范围：[${result.sourceRange[0]}, ${result.sourceRange[1]}]`
		].join("\n")
	}
}

/** 将结构化事实渲染为事实系统消息。 */
export function renderFactMessage(result: SummaryResult): LLMSystemMessage | null {
	if (result.extractedFacts.length === 0) return null

	return {
		role: "system",
		content: [
			"从较早对话提取的事实：",
			...result.extractedFacts.map((fact) => {
				const source = fact.source ? ` 来源：${fact.source}` : ""
				return `- [${fact.category}] ${fact.content}${source}`
			})
		].join("\n")
	}
}
