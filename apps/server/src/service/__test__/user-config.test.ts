import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { initUserConfigService, buildUserPrompt, buildSoulPrompt } from "../user-config.js"
import type { UserConfig } from "../user-config.js"

vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn()
}))

describe("userConfigService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("get", () => {
		it("should return parsed config from file", async () => {
			const fileContent = JSON.stringify({ name: "小明", identity: "学生", detail: "大三", soul: "友好" })
			;(readFile as any).mockResolvedValue(fileContent)

			const service = initUserConfigService("/fake")
			const result = await service.get()

			expect(result).toEqual({ name: "小明", identity: "学生", detail: "大三", soul: "友好", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" })
			expect(readFile).toHaveBeenCalledWith(path.join("/fake", "userConfig.json"), "utf-8")
		})

		it("should return default config when file not found", async () => {
			;(readFile as any).mockRejectedValue(new Error("ENOENT"))

			const service = initUserConfigService("/fake")
			const result = await service.get()

			expect(result).toEqual({ name: "", identity: "", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" })
		})

		it("should merge partial config with defaults", async () => {
			const fileContent = JSON.stringify({ name: "小明" })
			;(readFile as any).mockResolvedValue(fileContent)

			const service = initUserConfigService("/fake")
			const result = await service.get()

			expect(result).toEqual({ name: "小明", identity: "", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" })
		})
	})

	describe("update", () => {
		it("should merge partial config and write to file", async () => {
			const existing = JSON.stringify({ name: "小明", identity: "", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" })
			;(readFile as any).mockResolvedValue(existing)
			;(writeFile as any).mockResolvedValue(undefined)

			const service = initUserConfigService("/fake")
			const result = await service.update({ identity: "工程师" })

			expect(result).toEqual({ name: "小明", identity: "工程师", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" })
			expect(writeFile).toHaveBeenCalledWith(
				path.join("/fake", "userConfig.json"),
				JSON.stringify({ name: "小明", identity: "工程师", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" }, null, 2),
				"utf-8"
			)
		})

		it("should overwrite existing fields", async () => {
			const existing = JSON.stringify({ name: "小明", identity: "学生", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" })
			;(readFile as any).mockResolvedValue(existing)
			;(writeFile as any).mockResolvedValue(undefined)

			const service = initUserConfigService("/fake")
			const result = await service.update({ name: "小红" })

			expect(result.name).toBe("小红")
			expect(result.identity).toBe("学生")
		})
	})
})

describe("buildUserPrompt", () => {
	const baseConfig: UserConfig = { name: "", identity: "", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" }

	it("should return empty string when all fields are empty", () => {
		expect(buildUserPrompt(baseConfig)).toBe("")
	})

	it("should include name when provided", () => {
		const result = buildUserPrompt({ ...baseConfig, name: "小明" })
		expect(result).toContain("称呼：小明")
		expect(result).toContain("用户信息")
	})

	it("should include all non-empty fields", () => {
		const result = buildUserPrompt({ ...baseConfig, name: "小明", identity: "工程师", detail: "喜欢编程" })
		expect(result).toContain("称呼：小明")
		expect(result).toContain("身份：工程师")
		expect(result).toContain("详情：喜欢编程")
	})
})

describe("buildSoulPrompt", () => {
	const baseConfig: UserConfig = { name: "", identity: "", detail: "", soul: "", model: "deepseek-v4-flash", deepseekApiKey: "", glmApiKey: "" }

	it("should return undefined when soul is empty", () => {
		expect(buildSoulPrompt(baseConfig)).toBeUndefined()
	})

	it("should return soul string when provided", () => {
		expect(buildSoulPrompt({ ...baseConfig, soul: "友好" })).toBe("友好")
	})
})
