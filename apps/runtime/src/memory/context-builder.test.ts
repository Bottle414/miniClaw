import assert from "node:assert/strict"
import test from "node:test"

import { buildContext, createRuntimeMemoryState, setSessionMemory, setWorkingMemory } from "./index"
import type { LLMMessage } from "../types/llm"
import type { SummaryResult, Summarizer } from "./types"

function createSummaryResult(summary: string, extractedFacts: SummaryResult["extractedFacts"] = []): SummaryResult {
	return {
		summary,
		extractedFacts,
		sourceRange: [0, 1],
		createdAt: 1
	}
}

test("buildContext injects memory, summarizes older messages, preserves recent messages, and does not mutate canonical messages", async () => {
	let memory = createRuntimeMemoryState()
	memory = setSessionMemory(memory, {
		id: "project",
		content: "miniClaw uses runtime-scoped memory",
		now: 1
	})
	memory = setWorkingMemory(memory, {
		id: "task",
		content: "implement context builder",
		now: 2
	})

	const messages: LLMMessage[] = [
		{ role: "user", content: "old user message" },
		{ role: "assistant", content: "old assistant message" },
		{ role: "user", content: "recent user message" }
	]
	const before = structuredClone(messages)

	const result = await buildContext({
		messages,
		memory,
		options: { preserveRecentMessages: 1 }
	})

	assert.deepEqual(messages, before)
	assert.equal(result.contextMessages.length, 4)
	assert.equal(result.contextMessages[0]?.role, "system")
	assert.match(result.contextMessages[0]?.content ?? "", /会话记忆/)
	assert.match(result.contextMessages[1]?.content ?? "", /工作记忆/)
	assert.match(result.contextMessages[2]?.content ?? "", /确定性摘要/)
	assert.deepEqual(result.contextMessages[3], messages[2])
	assert.deepEqual(
		result.operations.map((operation) => operation.type),
		["inject", "inject", "summarize", "preserve"]
	)
})

test("buildContext can discard older messages from model context without removing them from canonical messages", async () => {
	const memory = createRuntimeMemoryState()
	const messages: LLMMessage[] = [
		{ role: "user", content: "old" },
		{ role: "user", content: "recent" }
	]
	const before = structuredClone(messages)

	const result = await buildContext({
		messages,
		memory,
		options: {
			preserveRecentMessages: 1,
			summarizeOlderMessages: false
		}
	})

	assert.deepEqual(messages, before)
	assert.deepEqual(result.contextMessages, [messages[1]])
	assert.deepEqual(
		result.operations.map((operation) => operation.type),
		["discard", "preserve"]
	)
})

test("buildContext renders summary and fact messages in stable order", async () => {
	const memory = createRuntimeMemoryState()
	const messages: LLMMessage[] = [
		{ role: "system", content: "task system prompt" },
		{ role: "user", content: "old user prefers concise answers" },
		{ role: "user", content: "recent task" }
	]
	const summarizer: Summarizer = {
		async summarize() {
			return createSummaryResult("用户偏好简洁回答", [
				{ category: "user-preference", content: "用户偏好简洁回答", source: "message 2" }
			])
		}
	}

	const result = await buildContext({
		messages,
		memory,
		options: {
			preserveRecentMessages: 1,
			includeSessionMemory: false,
			includeWorkingMemory: false
		},
		summarizer
	})

	assert.equal(result.contextMessages.length, 3)
	assert.match(result.contextMessages[0]?.content ?? "", /较早对话上下文摘要/)
	assert.match(result.contextMessages[1]?.content ?? "", /从较早对话提取的事实/)
	assert.match(result.contextMessages[1]?.content ?? "", /user-preference/)
	assert.deepEqual(result.contextMessages[2], messages[2])
})
