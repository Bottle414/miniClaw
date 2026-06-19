import { describe, it, expect, vi } from "vitest"

import { initSessionService } from "../session.js"

function createMockSessionManager() {
	return {
		list: vi.fn(),
		load: vi.fn(),
		save: vi.fn(),
		delete: vi.fn()
	}
}

vi.mock("@mini-claw/runtime/memory", () => ({
	createFileSystemMemoryStore: vi.fn(() => ({})),
	createSessionManager: vi.fn(() => {
		const manager = createMockSessionManager()
		manager.list.mockResolvedValue([])
		return manager
	})
}))

describe("sessionService", () => {
	describe("list", () => {
		it("should return formatted session list", async () => {
			const { createSessionManager } = await import("@mini-claw/runtime/memory")
			const mockManager = createMockSessionManager()
			mockManager.list.mockResolvedValue([
				{ id: "s1", name: "Session 1", createdAt: "1000", updatedAt: "2000" },
				{ id: "s2", name: "Session 2", createdAt: "3000", updatedAt: "4000" }
			])
			;(createSessionManager as any).mockReturnValue(mockManager)

			const service = initSessionService("/fake")
			const result = await service.list()

			expect(result).toEqual([
				{ id: "s1", name: "Session 1", createdAt: 1000, updatedAt: 2000 },
				{ id: "s2", name: "Session 2", createdAt: 3000, updatedAt: 4000 }
			])
		})

		it("should return empty array when no sessions", async () => {
			const { createSessionManager } = await import("@mini-claw/runtime/memory")
			const mockManager = createMockSessionManager()
			mockManager.list.mockResolvedValue([])
			;(createSessionManager as any).mockReturnValue(mockManager)

			const service = initSessionService("/fake")
			const result = await service.list()
			expect(result).toEqual([])
		})
	})

	describe("detail", () => {
		it("should return session detail when session exists", async () => {
			const mockSession = {
				id: "s1",
				name: "Session 1",
				createdAt: "1000",
				updatedAt: "2000",
				messages: [
					{ role: "user", content: "Hello" },
					{ role: "assistant", content: "Hi" },
					{ role: "system", content: "System prompt" }
				],
				summary: [{ summary: "Test summary", createdAt: 1500, sourceRange: [0, 1] as [number, number], extractedFacts: [] }],
				facts: [{ category: "user-preference" as const, content: "likes coffee" }]
			}

			const { createSessionManager } = await import("@mini-claw/runtime/memory")
			const mockManager = createMockSessionManager()
			mockManager.load.mockResolvedValue(mockSession)
			;(createSessionManager as any).mockReturnValue(mockManager)

			const service = initSessionService("/fake")
			const result = await service.detail("s1")

			expect(result).toEqual({
				id: "s1",
				name: "Session 1",
				createdAt: 1000,
				updatedAt: 2000,
				messages: [
					{ role: "user", content: "Hello" },
					{ role: "assistant", content: "Hi" }
				],
				summary: [{ summary: "Test summary", createdAt: 1500 }],
				facts: [{ category: "user-preference", content: "likes coffee" }],
				canonicalMessagesCount: 3,
				contextMessagesCount: 0
			})
		})

		it("should return null when session not found", async () => {
			const { createSessionManager } = await import("@mini-claw/runtime/memory")
			const mockManager = createMockSessionManager()
			mockManager.load.mockResolvedValue(null)
			;(createSessionManager as any).mockReturnValue(mockManager)

			const service = initSessionService("/fake")
			const result = await service.detail("nonexistent")
			expect(result).toBeNull()
		})
	})
})
