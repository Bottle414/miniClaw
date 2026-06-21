import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

import { CHAT } from "../../constants.js"

// mock index.js 中的 chatService，阻止顶层副作用执行
vi.mock("../../index.js", () => ({
	chatService: {
		chat: vi.fn()
	}
}))

import * as chatController from "../chat.js"
import { chatService } from "../../index.js"

describe("chatController", () => {
	let app: express.Express

	beforeEach(() => {
		vi.clearAllMocks()
		app = express()
		app.use(express.json())
		app.post(CHAT, chatController.chat)
	})

	describe("POST /api/chat", () => {
		it("should return 400 when message is missing", async () => {
			const res = await request(app).post(CHAT).send({})

			expect(res.status).toBe(400)
			expect(res.body.error).toContain("message field is required")
		})

		it("should return 400 when message is not a string", async () => {
			const res = await request(app).post(CHAT).send({ message: 123 })

			expect(res.status).toBe(400)
		})

		it("should set SSE headers and stream events", async () => {
			;(chatService.chat as any).mockImplementation(async function* () {
				yield { event: "runtime-event", data: '{"type":"text-delta","delta":"Hi"}' }
				yield { event: "runtime-event", data: '{"type":"loop-complete"}' }
			})

			const res = await request(app).post(CHAT).send({ message: "Hello", sessionId: "s1" })

			expect(res.status).toBe(200)
			expect(res.headers["content-type"]).toContain("text/event-stream")
			expect(res.headers["cache-control"]).toBe("no-cache")
		})

		it("should pass message and sessionId to chatService", async () => {
			;(chatService.chat as any).mockImplementation(async function* () {
				yield { event: "runtime-event", data: '{"type":"loop-complete"}' }
			})

			await request(app).post(CHAT).send({ message: "Hello", sessionId: "s1" })

			expect(chatService.chat).toHaveBeenCalledWith({ message: "Hello", sessionId: "s1" })
		})

		it("should work without sessionId", async () => {
			;(chatService.chat as any).mockImplementation(async function* () {
				yield { event: "runtime-event", data: '{"type":"loop-complete"}' }
			})

			const res = await request(app).post(CHAT).send({ message: "Hello" })

			expect(res.status).toBe(200)
			expect(chatService.chat).toHaveBeenCalledWith({ message: "Hello", sessionId: undefined })
		})
	})
})
