import assert from "node:assert/strict"
import test from "node:test"

import { buildContext, createRuntimeMemoryState, setSessionMemory, setWorkingMemory } from "./index"
import type { LLMMessage } from "../types/llm"

test("buildContext injects memory, summarizes older messages, preserves recent messages, and does not mutate canonical messages", () => {
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

	const result = buildContext({
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

test("buildContext can discard older messages from model context without removing them from canonical messages", () => {
	const memory = createRuntimeMemoryState()
	const messages: LLMMessage[] = [
		{ role: "user", content: "old" },
		{ role: "user", content: "recent" }
	]
	const before = structuredClone(messages)

	const result = buildContext({
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
