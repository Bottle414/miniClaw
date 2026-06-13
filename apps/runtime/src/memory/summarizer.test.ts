import assert from "node:assert/strict"
import test from "node:test"

import { createLLMSummarizer, parseSummaryJson, SUMMARY_GENERATOR_SYSTEM_PROMPT, SummaryParseError } from "./summarizer"
import type { LLMRequest, LLMResponse } from "../types/llm"
import type { Provider } from "../types/providers"

function createProvider(responseContent: string, requests: LLMRequest[]): Provider {
	return {
		init() {},
		async chat(req: LLMRequest): Promise<LLMResponse> {
			requests.push(req)
			return {
				id: "summary-response",
				created: 1,
				model: req.model,
				message: {
					role: "assistant",
					content: responseContent
				}
			}
		},
		async *chatStream(): AsyncIterable<never> {}
	}
}

test("parseSummaryJson parses facts and rejects invalid JSON", () => {
	const result = parseSummaryJson(JSON.stringify({
		summary: "用户要求实现结构化摘要",
		extractedFacts: [
			{
				category: "task",
				content: "实现结构化摘要压缩",
				source: "message 1"
			}
		]
	}))

	assert.equal(result.summary, "用户要求实现结构化摘要")
	assert.deepEqual(result.extractedFacts, [
		{
			category: "task",
			content: "实现结构化摘要压缩",
			source: "message 1"
		}
	])
	assert.throws(() => parseSummaryJson("not-json"), SummaryParseError)
	assert.throws(() => parseSummaryJson(JSON.stringify({ summary: "x", extractedFacts: [{ category: "unknown", content: "x" }] })), SummaryParseError)
})

test("createLLMSummarizer sends isolated internal request and returns SummaryResult", async () => {
	const requests: LLMRequest[] = []
	const provider = createProvider(JSON.stringify({
		summary: "保留用户偏好",
		extractedFacts: [
			{
				category: "user-preference",
				content: "用户偏好中文回答"
			}
		]
	}), requests)
	const summarizer = createLLMSummarizer(provider, { model: "summary-model" }, () => 123)

	const result = await summarizer.summarize([
		{ role: "user", content: "请用中文回答" }
	], [0, 0])

	assert.equal(requests.length, 1)
	assert.equal(requests[0]?.model, "summary-model")
	assert.equal(requests[0]?.messages[0]?.role, "system")
	assert.equal(requests[0]?.messages[0]?.content, SUMMARY_GENERATOR_SYSTEM_PROMPT)
	assert.equal(requests[0]?.messages[1]?.role, "user")
	assert.match(requests[0]?.messages[1]?.content ?? "", /sourceRange: \[0, 0\]/)
	assert.equal(result?.summary, "保留用户偏好")
	assert.equal(result?.createdAt, 123)
	assert.deepEqual(result?.sourceRange, [0, 0])
	assert.equal(result?.extractedFacts[0]?.category, "user-preference")
})
