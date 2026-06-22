import assert from "node:assert/strict"
import test from "node:test"

import { createSessionManager } from "../session-manager"
import type { MemoryStore, SessionData } from "../types"

/** 创建内存中的 mock MemoryStore，用于测试。 */
function createMockStore(): MemoryStore & { data: Map<string, SessionData> } {
	const data = new Map<string, SessionData>()
	return {
		data,
		async save(sessionId: string, sessionData: SessionData) {
			data.set(sessionId, structuredClone(sessionData))
		},
		async load(sessionId: string) {
			const d = data.get(sessionId)
			return d ? structuredClone(d) : null
		},
		async delete(sessionId: string) {
			data.delete(sessionId)
		},
		async exists(sessionId: string) {
			return data.has(sessionId)
		}
	}
}

/** 固定时间戳：2025-01-01T00:00:00.000Z */
const FIXED_TIMESTAMP = 1735689600000

test("create generates UUID v4 when id not provided", async () => {
	const store = createMockStore()
	const now = () => FIXED_TIMESTAMP
	const manager = createSessionManager(store, now)

	const session = await manager.create()
	assert.match(session.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
	assert.equal(session.createdAt, String(FIXED_TIMESTAMP))
	assert.equal(session.updatedAt, String(FIXED_TIMESTAMP))
	assert.equal(session.messages.length, 0)
	assert.equal(session.summary.length, 0)
	assert.equal(session.facts.length, 0)
	assert.equal(session.reasoning.length, 0)
})

test("create uses provided id and name", async () => {
	const store = createMockStore()
	const now = () => FIXED_TIMESTAMP
	const manager = createSessionManager(store, now)

	const session = await manager.create({ id: "my-id", name: "My Session" })
	assert.equal(session.id, "my-id")
	assert.equal(session.name, "My Session")
})

test("create persists session via store", async () => {
	const store = createMockStore()
	const now = () => FIXED_TIMESTAMP
	const manager = createSessionManager(store, now)

	const session = await manager.create({ id: "persist-test" })
	assert.equal(store.data.has("persist-test"), true)
	assert.equal(store.data.get("persist-test")!.metadata.name, session.name)
})

test("load returns session for existing id", async () => {
	const store = createMockStore()
	const now = () => FIXED_TIMESTAMP
	const manager = createSessionManager(store, now)

	await manager.create({ id: "load-test", name: "Loaded" })
	const session = await manager.load("load-test")

	assert.notEqual(session, null)
	assert.equal(session!.id, "load-test")
	assert.equal(session!.name, "Loaded")
})

test("load returns null for non-existent id", async () => {
	const store = createMockStore()
	const now = () => FIXED_TIMESTAMP
	const manager = createSessionManager(store, now)

	const session = await manager.load("missing")
	assert.equal(session, null)
})

test("save updates updatedAt and persists", async () => {
	const store = createMockStore()
	let timestamp = FIXED_TIMESTAMP
	const now = () => timestamp
	const manager = createSessionManager(store, now)

	const session = await manager.create({ id: "save-test" })
	assert.equal(session.updatedAt, String(FIXED_TIMESTAMP))

	timestamp = FIXED_TIMESTAMP + 5000
	session.messages.push({ role: "user", content: "hi" })
	await manager.save(session)

	const loaded = await manager.load("save-test")
	assert.equal(loaded!.updatedAt, String(FIXED_TIMESTAMP + 5000))
	assert.equal(loaded!.messages.length, 1)
})

test("delete removes session", async () => {
	const store = createMockStore()
	const now = () => FIXED_TIMESTAMP
	const manager = createSessionManager(store, now)

	await manager.create({ id: "delete-test" })
	assert.equal(store.data.has("delete-test"), true)

	await manager.delete("delete-test")
	assert.equal(store.data.has("delete-test"), false)
	assert.equal(await manager.load("delete-test"), null)
})
