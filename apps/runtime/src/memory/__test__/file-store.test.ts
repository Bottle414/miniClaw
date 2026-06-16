import assert from "node:assert/strict"
import test from "node:test"
import { promises as fs } from "node:fs"
import path from "node:path"
import { mkdtemp, rm } from "node:fs/promises"

import { createFileSystemMemoryStore } from "../file-store"
import type { SessionData } from "../types"

async function createTempDir(): Promise<string> {
	return mkdtemp(path.join(process.cwd(), ".test-sessions-"))
}

test("save writes four JSON files and load reads them back", async () => {
	const dir = await createTempDir()
	try {
		const store = createFileSystemMemoryStore(dir)
		const data: SessionData = {
			metadata: {
				id: "test-session-1",
				name: "Test Session",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			},
			messages: [
				{ role: "user", content: "hello" },
				{ role: "assistant", content: "hi" }
			],
			summary: [
				{
					summary: "test summary",
					extractedFacts: [{ category: "task", content: "a fact" }],
					sourceRange: [0, 1],
					createdAt: 1
				}
			],
			facts: [{ category: "task", content: "a fact" }]
		}

		await store.save("test-session-1", data)
		const loaded = await store.load("test-session-1")

		assert.deepEqual(loaded, data)

		// Verify individual files exist
		const sessionDir = path.join(dir, "test-session-1")
		const files = await fs.readdir(sessionDir)
		assert.deepEqual(files.sort(), ["facts.json", "messages.json", "metadata.json", "summary.json"])
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("load returns null for non-existent session", async () => {
	const dir = await createTempDir()
	try {
		const store = createFileSystemMemoryStore(dir)
		const result = await store.load("nonexistent")
		assert.equal(result, null)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("exists returns true for saved session and false otherwise", async () => {
	const dir = await createTempDir()
	try {
		const store = createFileSystemMemoryStore(dir)
		assert.equal(await store.exists("missing"), false)

		const data: SessionData = {
			metadata: {
				id: "exists-test",
				name: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			},
			messages: [],
			summary: [],
			facts: []
		}
		await store.save("exists-test", data)
		assert.equal(await store.exists("exists-test"), true)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("delete removes session files and folder", async () => {
	const dir = await createTempDir()
	try {
		const store = createFileSystemMemoryStore(dir)
		const data: SessionData = {
			metadata: {
				id: "delete-test",
				name: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			},
			messages: [],
			summary: [],
			facts: []
		}
		await store.save("delete-test", data)
		assert.equal(await store.exists("delete-test"), true)

		await store.delete("delete-test")
		assert.equal(await store.exists("delete-test"), false)
		assert.equal(await store.load("delete-test"), null)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("delete is idempotent for non-existent session", async () => {
	const dir = await createTempDir()
	try {
		const store = createFileSystemMemoryStore(dir)
		await store.delete("no-such-session")
		// Should not throw
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("load recovers gracefully from missing messages/summary/facts files", async () => {
	const dir = await createTempDir()
	try {
		const store = createFileSystemMemoryStore(dir)
		// Only write metadata
		const sessionDir = path.join(dir, "partial-session")
		await fs.mkdir(sessionDir, { recursive: true })
		await fs.writeFile(
			path.join(sessionDir, "metadata.json"),
			JSON.stringify({
				id: "partial-session",
				name: "Partial",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
		)

		const loaded = await store.load("partial-session")
		assert.notEqual(loaded, null)
		assert.equal(loaded!.messages.length, 0)
		assert.equal(loaded!.summary.length, 0)
		assert.equal(loaded!.facts.length, 0)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})
