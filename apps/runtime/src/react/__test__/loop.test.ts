import assert from "node:assert/strict"
import test from "node:test"

import { executeReActLoop } from "../loop"
import type { ProviderEvent } from "../../types/event"
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
