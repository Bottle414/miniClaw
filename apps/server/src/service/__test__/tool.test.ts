import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { initToolService } from "../tool.js"

vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn()
}))

describe("toolService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("listTools", () => {
		it("should return tool list", () => {
			const service = initToolService("/fake")
			const tools = service.listTools()

			expect(tools.length).toBeGreaterThan(0)
			expect(tools[0]).toHaveProperty("name")
			expect(tools[0]).toHaveProperty("description")
		})
	})

	describe("getPermission", () => {
		it("should return parsed permission from file", async () => {
			const fileContent = JSON.stringify({ allow: ["weather.*"], check: ["fs.*"], deny: [] })
			;(readFile as any).mockResolvedValue(fileContent)

			const service = initToolService("/fake")
			const result = await service.getPermission()

			expect(result).toEqual({ allow: ["weather.*"], check: ["fs.*"], deny: [] })
			expect(readFile).toHaveBeenCalledWith(
				path.join("/fake", "permission.json"),
				"utf-8"
			)
		})

		it("should return default permission when file not found", async () => {
			;(readFile as any).mockRejectedValue(new Error("ENOENT"))

			const service = initToolService("/fake")
			const result = await service.getPermission()

			expect(result).toEqual({ allow: ["*"], check: [], deny: [] })
		})

		it("should fill missing fields with defaults", async () => {
			const fileContent = JSON.stringify({ allow: ["weather.*"] })
			;(readFile as any).mockResolvedValue(fileContent)

			const service = initToolService("/fake")
			const result = await service.getPermission()

			expect(result).toEqual({ allow: ["weather.*"], check: [], deny: [] })
		})
	})

	describe("updatePermission", () => {
		it("should write permission to file and return resolved config", async () => {
			const config = { allow: ["weather.*"], check: [], deny: ["fs.*"] }
			;(writeFile as any).mockResolvedValue(undefined)

			const service = initToolService("/fake")
			const result = await service.updatePermission(config)

			expect(result).toEqual(config)
			expect(writeFile).toHaveBeenCalledWith(
				path.join("/fake", "permission.json"),
				JSON.stringify(config, null, 2),
				"utf-8"
			)
		})

		it("should fill missing fields with defaults", async () => {
			const config = { allow: ["weather.*"] }
			;(writeFile as any).mockResolvedValue(undefined)

			const service = initToolService("/fake")
			const result = await service.updatePermission(config)

			expect(result).toEqual({ allow: ["weather.*"], check: [], deny: [] })
		})
	})
})
