import { describe, it, expect } from "vitest"

import { convertMessages, serializeEvent } from "../index"

describe("convertMessages", () => {
	it("should filter out system and tool messages", () => {
		const messages = [
			{ role: "system", content: "You are helpful" },
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "Hi there" },
			{ role: "tool", content: "result" }
		]
		const result = convertMessages(messages)
		expect(result).toEqual([
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "Hi there" }
		])
	})

	it("should replace null content with empty string and filter empty strings", () => {
		const messages = [
			{ role: "user", content: null },
			{ role: "assistant", content: "Response" },
			{ role: "user", content: "" }
		]
		const result = convertMessages(messages)
		expect(result).toEqual([{ role: "assistant", content: "Response" }])
	})

	it("should return empty array for empty input", () => {
		expect(convertMessages([])).toEqual([])
	})
})

describe("serializeEvent", () => {
	it("should serialize normal event as JSON", () => {
		const event = { type: "text-delta", delta: "Hi" }
		const result = serializeEvent(event as any)
		expect(result).toBe(JSON.stringify(event))
	})

	it("should serialize error event with message and stack", () => {
		const error = new Error("boom")
		const event = { type: "error", error }
		const result = serializeEvent(event as any)
		const parsed = JSON.parse(result)
		expect(parsed.type).toBe("error")
		expect(parsed.error.message).toBe("boom")
		expect(typeof parsed.error.stack).toBe("string")
	})

	it("should handle error without stack", () => {
		const event = { type: "error", error: { message: "fail", stack: undefined } }
		const result = serializeEvent(event as any)
		const parsed = JSON.parse(result)
		expect(parsed.error.stack).toBe("")
	})
})
