import assert from "node:assert/strict"
import test from "node:test"
import { mkdtemp, rm } from "node:fs/promises"
import path from "node:path"

import { createFileSystemMemoryStore } from "../file-store"
import { createSessionManager } from "../session-manager"
import { createRuntimeMemoryState, setSessionMemory } from "../store"

/** 模拟 Runtime 启动时的 session 恢复流程。 */
test("session round-trip: create → save messages → load → inject to runtime", async () => {
	const dir = await mkdtemp(path.join(process.cwd(), ".test-rt-"))
	try {
		const store = createFileSystemMemoryStore(dir)
		const manager = createSessionManager(store)

		// 1. 创建 session
		const session = await manager.create({ id: "rt-test", name: "Runtime Test" })

		// 2. 模拟对话后更新 messages
		session.messages.push({ role: "user", content: "hello" }, { role: "assistant", content: "hi there" })
		session.summary.push({
			summary: "用户打招呼",
			extractedFacts: [{ category: "user-preference", content: "用户偏好中文" }],
			sourceRange: [0, 1],
			createdAt: 1
		})
		session.facts.push({ category: "user-preference", content: "用户偏好中文" })
		await manager.save(session)

		// 3. 模拟新进程启动，加载 session
		const loaded = await manager.load("rt-test")
		assert.notEqual(loaded, null)

		// 4. 恢复 messages
		const messages = [...loaded!.messages]
		assert.equal(messages.length, 2)
		assert.equal(messages[0]!.content, "hello")

		// 5. 注入 summary/facts 到 RuntimeMemoryState
		let memory = createRuntimeMemoryState()
		for (const sr of loaded!.summary) {
			memory = setSessionMemory(memory, {
				id: `summary-${sr.createdAt}`,
				content: `摘要: ${sr.summary}`
			})
		}
		for (const fact of loaded!.facts) {
			memory = setSessionMemory(memory, {
				id: `fact-${fact.category}-${fact.content.slice(0, 20)}`,
				content: `事实: [${fact.category}] ${fact.content}`
			})
		}

		// 验证 session memory 包含注入的 summary 和 facts
		const sessionEntries = memory.session.entries.filter((e) => e.active)
		assert.equal(sessionEntries.length, 2)
		assert.ok(sessionEntries.some((e) => e.content.includes("摘要")))
		assert.ok(sessionEntries.some((e) => e.content.includes("事实")))
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})
