import assert from "node:assert/strict"
import test from "node:test"

import { executeReActLoop } from "./loop"
import type { RuntimeEvent } from "../types/event"
import type { Provider } from "../types/providers"
import type { Config } from "../types/config"
import type { LLMRequest, LLMResponse } from "../types/llm"

function createProvider(events: RuntimeEvent[], requests: LLMRequest[]): Provider {
	return {
		init() {},
		async chat(): Promise<LLMResponse> {
			throw new Error("chat should not be called")
		},
		async *chatStream(req: LLMRequest): AsyncIterable<RuntimeEvent> {
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
	const requests: LLMRequest[] = []
	const provider = createProvider([
		{ type: "text-delta", delta: "done" },
		{ type: "finish", reason: "stop" }
	], requests)

	const initialMessages = [
		{ role: "user" as const, content: "old" },
		{ role: "assistant" as const, content: "older assistant" },
		{ role: "user" as const, content: "current" }
	]

	const result = await executeReActLoop({
		provider,
		config,
		userInput: "new task",
		initialMessages,
		contextOptions: { preserveRecentMessages: 1 }
	})

	assert.equal(result.error, undefined)
	assert.equal(requests.length, 1)
	assert.equal(requests[0]?.messages.length, 2)
	assert.match(requests[0]?.messages[0]?.content ?? "", /确定性摘要/)
	assert.deepEqual(requests[0]?.messages[1], {
		role: "user",
		content: "new task"
	})
	assert.deepEqual(result.state.messages.slice(0, 4), [
		...initialMessages,
		{ role: "user", content: "new task" }
	])
	assert.deepEqual(result.state.messages.at(-1), {
		role: "assistant",
		content: "done",
		toolCalls: undefined
	})
})
