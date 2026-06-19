import { describe, it, expect, vi, beforeEach } from "vitest"

import { initChatService } from "../chat.js"

function createMockRuntime(events: any[] = []) {
	return {
		chat: vi.fn(async function* () {
			for (const event of events) {
				yield event
			}
		}),
		sessionManager: { load: vi.fn(), save: vi.fn(), list: vi.fn(), delete: vi.fn(), create: vi.fn() },
		config: {}
	}
}

vi.mock("@mini-claw/runtime", () => ({
	createRuntime: vi.fn()
}))

describe("chatService", () => {
	const runtimeConfig = {
		apiKey: "test-key",
		baseUrl: "http://localhost",
		model: "test-model",
		sessionsRoot: "/fake/sessions"
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("chat", () => {
		it("should yield SSE events from runtime chat", async () => {
			const { createRuntime } = await import("@mini-claw/runtime")
			const mockRuntime = createMockRuntime([
				{ type: "text-delta", delta: "Hello" },
				{ type: "loop-complete", state: {}, response: "done" }
			])
			;(createRuntime as any).mockReturnValue(mockRuntime)

			const service = initChatService(runtimeConfig)
			const events = []
			for await (const event of service.chat({ message: "Hi" })) {
				events.push(event)
			}

			expect(events).toHaveLength(2)
			expect(events[0]).toEqual({ event: "runtime-event", data: '{"type":"text-delta","delta":"Hello"}' })
			expect(events[1].event).toBe("runtime-event")
			expect(JSON.parse(events[1].data).type).toBe("loop-complete")
		})

		it("should stop after loop-complete event", async () => {
			const { createRuntime } = await import("@mini-claw/runtime")
			const mockRuntime = createMockRuntime([
				{ type: "text-delta", delta: "Hi" },
				{ type: "loop-complete", state: {} },
				{ type: "text-delta", delta: "Should not appear" }
			])
			;(createRuntime as any).mockReturnValue(mockRuntime)

			const service = initChatService(runtimeConfig)
			const events = []
			for await (const event of service.chat({ message: "Hi" })) {
				events.push(event)
			}

			expect(events).toHaveLength(2)
		})

		it("should yield error SSE event when runtime throws", async () => {
			const { createRuntime } = await import("@mini-claw/runtime")
			const mockRuntime = {
				chat: vi.fn(async function* () {
					throw new Error("Runtime error")
				}),
				sessionManager: { load: vi.fn(), save: vi.fn(), list: vi.fn(), delete: vi.fn(), create: vi.fn() },
				config: {}
			}
			;(createRuntime as any).mockReturnValue(mockRuntime)

			const service = initChatService(runtimeConfig)
			const events = []
			for await (const event of service.chat({ message: "Hi" })) {
				events.push(event)
			}

			expect(events).toHaveLength(1)
			const parsed = JSON.parse(events[0].data)
			expect(parsed.type).toBe("error")
			expect(parsed.error.message).toBe("Runtime error")
		})

		it("should reuse cached runtime for same sessionId", async () => {
			const { createRuntime } = await import("@mini-claw/runtime")
			const mockRuntime = createMockRuntime([{ type: "loop-complete", state: {} }])
			;(createRuntime as any).mockReturnValue(mockRuntime)

			const service = initChatService(runtimeConfig)

			for await (const _ of service.chat({ message: "Hi", sessionId: "s1" })) {
				/* consume */
			}
			for await (const _ of service.chat({ message: "Hi again", sessionId: "s1" })) {
				/* consume */
			}

			expect(createRuntime).toHaveBeenCalledTimes(1)
		})
	})
})
