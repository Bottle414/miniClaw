import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

import { USER_CONFIG } from "../../constants.js"

vi.mock("../../index.js", () => ({
	userService: {
		get: vi.fn(),
		update: vi.fn()
	}
}))

import * as userConfigController from "../user-config.js"
import { userService } from "../../index.js"

describe("userConfigController", () => {
	let app: express.Express

	beforeEach(() => {
		vi.clearAllMocks()
		app = express()
		app.use(express.json())
		app.get(USER_CONFIG, userConfigController.getUserConfig)
		app.put(USER_CONFIG, userConfigController.updateUserConfig)
	})

	describe("GET /api/user-config", () => {
		it("should return user config", async () => {
			const config = { name: "小明", identity: "工程师", detail: "喜欢编程", soul: "友好" }
			;(userService.get as any).mockResolvedValue(config)

			const res = await request(app).get(USER_CONFIG)

			expect(res.status).toBe(200)
			expect(res.body).toEqual(config)
		})

		it("should return 500 when service throws", async () => {
			;(userService.get as any).mockRejectedValue(new Error("FS error"))

			const res = await request(app).get(USER_CONFIG)

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("FS error")
		})
	})

	describe("PUT /api/user-config", () => {
		it("should update config and return result", async () => {
			const updated = { name: "小红", identity: "设计师", detail: "喜欢画画", soul: "" }
			;(userService.update as any).mockResolvedValue(updated)

			const res = await request(app)
				.put(USER_CONFIG)
				.send({ name: "小红", identity: "设计师" })

			expect(res.status).toBe(200)
			expect(res.body).toEqual(updated)
		})

		it("should return 500 when service throws", async () => {
			;(userService.update as any).mockRejectedValue(new Error("Write error"))

			const res = await request(app)
				.put(USER_CONFIG)
				.send({ name: "小红" })

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("Write error")
		})
	})
})
