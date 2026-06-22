import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

import { TOOLS, PERMISSION } from "../../constants.js"

vi.mock("../../index.js", () => ({
	toolService: {
		listTools: vi.fn(),
		getPermission: vi.fn(),
		updatePermission: vi.fn()
	}
}))

import * as toolController from "../tool.js"
import { toolService } from "../../index.js"

describe("toolController", () => {
	let app: express.Express

	beforeEach(() => {
		vi.clearAllMocks()
		app = express()
		app.use(express.json())
		app.get(TOOLS, toolController.listTools)
		app.get(PERMISSION, toolController.getPermission)
		app.put(PERMISSION, toolController.updatePermission)
	})

	describe("GET /api/tools", () => {
		it("should return tool list", async () => {
			const tools = [
				{ name: "weather.getWeather", description: "获取天气" },
				{ name: "time.getCurrent", description: "获取时间" }
			]
			;(toolService.listTools as any).mockReturnValue(tools)

			const res = await request(app).get(TOOLS)

			expect(res.status).toBe(200)
			expect(res.body).toEqual({ tools })
		})

		it("should return 500 when service throws", async () => {
			;(toolService.listTools as any).mockImplementation(() => {
				throw new Error("Service error")
			})

			const res = await request(app).get(TOOLS)

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("Service error")
		})
	})

	describe("GET /api/permission", () => {
		it("should return permission config", async () => {
			const permission = { allow: ["*"], check: [], deny: [] }
			;(toolService.getPermission as any).mockResolvedValue(permission)

			const res = await request(app).get(PERMISSION)

			expect(res.status).toBe(200)
			expect(res.body).toEqual(permission)
		})

		it("should return 500 when service throws", async () => {
			;(toolService.getPermission as any).mockRejectedValue(new Error("FS error"))

			const res = await request(app).get(PERMISSION)

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("FS error")
		})
	})

	describe("PUT /api/permission", () => {
		it("should update permission and return result", async () => {
			const updated = { allow: ["weather.*"], check: [], deny: ["fs.*"] }
			;(toolService.updatePermission as any).mockResolvedValue(updated)

			const res = await request(app)
				.put(PERMISSION)
				.send({ allow: ["weather.*"], check: [], deny: ["fs.*"] })

			expect(res.status).toBe(200)
			expect(res.body).toEqual(updated)
		})

		it("should return 500 when service throws", async () => {
			;(toolService.updatePermission as any).mockRejectedValue(new Error("Write error"))

			const res = await request(app)
				.put(PERMISSION)
				.send({ allow: ["*"], check: [], deny: [] })

			expect(res.status).toBe(500)
			expect(res.body.error).toBe("Write error")
		})
	})
})
