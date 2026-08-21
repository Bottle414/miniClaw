import assert from "node:assert/strict"
import test from "node:test"

import { executeReActLoop } from "../loop"
import { createToolHandler } from "../../tools"
import type { RuntimeEvent, ProviderEvent } from "../../types/event"
import type { Provider } from "../../types/providers"
import type { Config } from "../../types/config"
import type { LLMRequest, LLMResponse } from "../../types/llm"

function createProvider(events: ProviderEvent[], requests: LLMRequest[]): Provider {
	return {
		init() {},
		async chat(): Promise<LLMResponse> {
			throw new Error("chat should not be called")
		},
		async *chatStream(req: LLMRequest): AsyncIterable<ProviderEvent> {
			requests.push(req)
			for (const event of events) {
				yield event
			}
		}
	}
}

/** 多轮 chatStream：每次调用返回 turns[idx] 中的事件序列 */
function createMultiTurnProvider(turns: ProviderEvent[][]): Provider {
	let callIdx = 0
	return {
		init() {},
		async chat(): Promise<LLMResponse> {
			throw new Error("chat should not be called")
		},
		async *chatStream(): AsyncIterable<ProviderEvent> {
			const events = turns[callIdx++] ?? [{ type: "finish", reason: "stop" }]
			for (const event of events) {
				yield event
			}
		}
	}
}

/** 构造一组 toolCalls 对应的流式事件序列（无 text，finish 收尾） */
function makeToolCallEvents(toolCalls: Array<{ id: string; name: string; args: string }>): ProviderEvent[] {
	const events: ProviderEvent[] = []
	for (const tc of toolCalls) {
		events.push({ type: "tool-call-start", toolCallId: tc.id, toolName: tc.name })
		events.push({ type: "tool-call-end", toolCallId: tc.id, arguments: tc.args })
	}
	events.push({ type: "finish", reason: "tool_calls" })
	return events
}

/** 收集所有 RuntimeEvent */
async function collectEvents(iter: AsyncIterable<RuntimeEvent>): Promise<RuntimeEvent[]> {
	const events: RuntimeEvent[] = []
	for await (const event of iter) {
		events.push(event)
	}
	return events
}

const config: Config = {
	systemPrompt: "system",
	baseURL: "http://localhost",
	apiKey: "test",
	model: "test-model",
	userPrompt: "user",
	maxIterations: 1
}

test("executeReActLoop sends contextMessages while preserving full ReAct state messages", async () => {
	const summaryRequests: LLMRequest[] = []
	const summarizer = {
		async summarize(messages: LLMRequest["messages"], sourceRange: [number, number]) {
			summaryRequests.push({ messages, model: "summary" })
			return {
				summary: "old context summary",
				extractedFacts: [],
				sourceRange,
				createdAt: 1
			}
		}
	}
	const requests: LLMRequest[] = []
	const provider = createProvider(
		[
			{ type: "text-delta", delta: "done" },
			{ type: "finish", reason: "stop" }
		],
		requests
	)

	const initialMessages = [
		{ role: "user" as const, content: "old" },
		{ role: "assistant" as const, content: "older assistant" },
		{ role: "user" as const, content: "current" }
	]

	// 从事件流中收集 LoopCompleteEvent
	let loopCompleteEvent: import("../../types/event").LoopCompleteEvent | undefined
	for await (const event of executeReActLoop({
		provider,
		config,
		userInput: "new task",
		initialMessages,
		contextOptions: { preserveRecentMessages: 1 },
		summarizer
	})) {
		if (event.type === "loop-complete") {
			loopCompleteEvent = event
		}
	}

	assert.equal(loopCompleteEvent?.error, undefined)
	assert.equal(requests.length, 1)
	assert.equal(requests[0]?.messages.length, 3)
	// userPrompt 注入的系统消息
	assert.equal(requests[0]?.messages[0]?.role, "system")
	assert.equal(requests[0]?.messages[0]?.content, "user")
	// 摘要消息
	assert.match(requests[0]?.messages[1]?.content ?? "", /old context summary/)
	assert.equal((requests[0]?.messages[1]?.content ?? "").includes("摘要生成器"), false)
	// 用户消息
	assert.deepEqual(requests[0]?.messages[2], {
		role: "user",
		content: "new task"
	})
	assert.equal(summaryRequests.length, 1)
	assert.deepEqual(loopCompleteEvent?.state.messages.slice(0, 4), [...initialMessages, { role: "user", content: "new task" }])
	assert.deepEqual(loopCompleteEvent?.state.messages.at(-1), {
		role: "assistant",
		content: "done",
		toolCalls: undefined,
		reasoning: undefined
	})
})

// ============== 并行执行测试 ==============

/** 多轮工具场景测试配置：maxIterations=3 容纳 toolCalls 轮 + 最终答案轮 */
const toolConfig: Config = {
	systemPrompt: "system",
	baseURL: "http://localhost",
	apiKey: "test",
	model: "test-model",
	userPrompt: "user",
	maxIterations: 3
}

test("executeReActLoop runs readonly tools in parallel when all toolCalls are readonly", async () => {
	const handler = createToolHandler()
	// 两个 readonly 工具，各延迟 50ms
	handler.register(
		{ name: "readonly.a", description: "A" },
		async () => {
			await new Promise((r) => setTimeout(r, 50))
			return { content: "a-result" }
		},
		{ readonly: true }
	)
	handler.register(
		{ name: "readonly.b", description: "B" },
		async () => {
			await new Promise((r) => setTimeout(r, 50))
			return { content: "b-result" }
		},
		{ readonly: true }
	)

	const provider = createMultiTurnProvider([
		makeToolCallEvents([
			{ id: "call_a", name: "readonly.a", args: "{}" },
			{ id: "call_b", name: "readonly.b", args: "{}" }
		]),
		[
			{ type: "text-delta", delta: "done" },
			{ type: "finish", reason: "stop" }
		]
	])

	const start = Date.now()
	const events = await collectEvents(
		executeReActLoop({
			provider,
			config: toolConfig,
			userInput: "test",
			toolHandler: handler
		})
	)
	const duration = Date.now() - start

	// 并行总耗时接近 max(50, 50)=50ms，远小于串行的 100ms。给充分缓冲
	assert.ok(duration < 90, `Expected parallel duration < 90ms, got ${duration}ms`)

	// 事件顺序：phase-change(observing) → tool-execute(A) → tool-execute(B) → tool-result(A) → tool-result(B)
	const observingEvents = events.filter((e) => e.type === "tool-execute" || e.type === "tool-result").map((e) => `${e.type}:${e.toolCallId}`)
	assert.deepEqual(observingEvents, ["tool-execute:call_a", "tool-execute:call_b", "tool-result:call_a", "tool-result:call_b"])

	// state.messages 末尾应有两个 tool 消息，按 toolCallId 顺序
	const loopComplete = events.find((e) => e.type === "loop-complete")
	const toolMessages = loopComplete?.state?.messages.filter((m) => m.role === "tool") ?? []
	assert.equal(toolMessages.length, 2)
	assert.equal(toolMessages[0]?.toolCallId, "call_a")
	assert.equal(toolMessages[1]?.toolCallId, "call_b")
})

test("executeReActLoop falls back to serial when mixing readonly and non-readonly tools", async () => {
	const handler = createToolHandler()
	handler.register(
		{ name: "readonly.a", description: "A" },
		async () => {
			await new Promise((r) => setTimeout(r, 50))
			return { content: "a-result" }
		},
		{ readonly: true }
	)
	// write.b 未声明 readonly，默认 false，应触发串行退化
	handler.register({ name: "write.b", description: "B" }, async () => {
		await new Promise((r) => setTimeout(r, 50))
		return { content: "b-result" }
	})

	const provider = createMultiTurnProvider([
		makeToolCallEvents([
			{ id: "call_a", name: "readonly.a", args: "{}" },
			{ id: "call_b", name: "write.b", args: "{}" }
		]),
		[
			{ type: "text-delta", delta: "done" },
			{ type: "finish", reason: "stop" }
		]
	])

	const start = Date.now()
	const events = await collectEvents(
		executeReActLoop({
			provider,
			config: toolConfig,
			userInput: "test",
			toolHandler: handler
		})
	)
	const duration = Date.now() - start

	// 串行总耗时接近 100ms，给少量缓冲
	assert.ok(duration >= 90, `Expected serial duration >= 90ms, got ${duration}ms`)

	// 事件顺序交错：execute(A) → result(A) → execute(B) → result(B)
	const observingEvents = events.filter((e) => e.type === "tool-execute" || e.type === "tool-result").map((e) => `${e.type}:${e.toolCallId}`)
	assert.deepEqual(observingEvents, ["tool-execute:call_a", "tool-result:call_a", "tool-execute:call_b", "tool-result:call_b"])
})

test("executeReActLoop parallel mode isolates failing tools from successful ones", async () => {
	const handler = createToolHandler()
	// readonly.a 抛错，readonly.b 正常
	handler.register(
		{ name: "readonly.a", description: "A" },
		async () => {
			throw new Error("A failed")
		},
		{ readonly: true }
	)
	handler.register({ name: "readonly.b", description: "B" }, async () => ({ content: "b-result" }), { readonly: true })

	const provider = createMultiTurnProvider([
		makeToolCallEvents([
			{ id: "call_a", name: "readonly.a", args: "{}" },
			{ id: "call_b", name: "readonly.b", args: "{}" }
		]),
		[
			{ type: "text-delta", delta: "done" },
			{ type: "finish", reason: "stop" }
		]
	])

	const events = await collectEvents(
		executeReActLoop({
			provider,
			config: toolConfig,
			userInput: "test",
			toolHandler: handler
		})
	)

	const resultEvents = events.filter((e) => e.type === "tool-result")
	const aResult = resultEvents.find((e) => e.toolCallId === "call_a")
	const bResult = resultEvents.find((e) => e.toolCallId === "call_b")

	// A 失败但不影响 B 成功
	assert.equal(aResult?.success, false)
	assert.match(aResult?.result ?? "", /A failed/)
	assert.equal(bResult?.success, true)
	assert.equal(bResult?.result, "b-result")
})

test("executeReActLoop runs single readonly tool via serial path (no parallel overhead)", async () => {
	const handler = createToolHandler()
	handler.register({ name: "readonly.a", description: "A" }, async () => ({ content: "a-result" }), { readonly: true })

	const provider = createMultiTurnProvider([
		makeToolCallEvents([{ id: "call_a", name: "readonly.a", args: "{}" }]),
		[
			{ type: "text-delta", delta: "done" },
			{ type: "finish", reason: "stop" }
		]
	])

	const events = await collectEvents(
		executeReActLoop({
			provider,
			config: toolConfig,
			userInput: "test",
			toolHandler: handler
		})
	)

	// 单工具走串行路径，事件顺序正常
	const observingEvents = events.filter((e) => e.type === "tool-execute" || e.type === "tool-result").map((e) => `${e.type}:${e.toolCallId}`)
	assert.deepEqual(observingEvents, ["tool-execute:call_a", "tool-result:call_a"])
})
