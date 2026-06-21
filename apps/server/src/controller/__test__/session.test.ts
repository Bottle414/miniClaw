import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

import { SESSIONS, SESSION_DETAIL } from "../../constants.js"

// mock index.js 中的 sessionService，阻止顶层副作用执行
vi.mock("../../index.js", () => ({
	sessionService: {
		list: vi.fn(),
		detail: vi.fn()
	}
}))

import * as sessionController from "../session.js"
import { sessionService } from "../../index.js"

describe("sessionController", () => {
	let app: express.Express

	beforeEach(() => {
		vi.clearAllMocks()
		app = express()
		app.get(SESSIONS, sessionController.list)
		app.get(SESSION_DETAIL, sessionController.detail)
	})

	describe("GET /api/sessions", () => {
		it("should return session list", async () => {
			;(sessionService.list as any).mockResolvedValue([{ id: "s1", name: "Session 1", createdAt: 1000, updatedAt: 2000 }])

			const res = await request(app).get(SESSIONS)

			expect(res.status).toBe(200)
			expect(res.body).toEqual({
				sessions: [{ id: "s1", name: "Session 1", createdAt: 1000, updatedAt: 2000 }]
			})
		})

		it("should return 500 when service throws", async () => {
			;(sessionService.list as any).mockRejectedValue(new Error("DB error"))
			const res = await request(app).get(SESSIONS)

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("DB error")
		})
	})

	describe("GET /api/session/:id", () => {
		it("should return session detail", async () => {
			const detail = {
				id: "s1",
				name: "Session 1",
				createdAt: 1000,
				updatedAt: 2000,
				messages: [],
				summary: [],
				facts: [],
				canonicalMessagesCount: 0,
				contextMessagesCount: 0
			}
			;(sessionService.detail as any).mockResolvedValue(detail)

			const res = await request(app).get(SESSION_DETAIL.replace(":id", "s1"))

			expect(res.status).toBe(200)
			expect(res.body.id).toBe("s1")
		})

		it("should return 404 when session not found", async () => {
			;(sessionService.detail as any).mockResolvedValue(null)

			const res = await request(app).get(SESSION_DETAIL.replace(":id", "nonexistent"))

			expect(res.status).toBe(404)
			expect(res.body.error).toBe("Session not found")
		})

		it("should return 500 when service throws", async () => {
			;(sessionService.detail as any).mockRejectedValue(new Error("DB error"))

			const res = await request(app).get(SESSION_DETAIL.replace(":id", "s1"))

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("DB error")
		})
	})
})
