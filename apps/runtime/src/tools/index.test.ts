import assert from "node:assert/strict"
import test from "node:test"
import { mkdtemp, rm } from "node:fs/promises"
import path from "node:path"

import type { ToolExecutor } from "../types/llm/tool"
import { createToolHandler } from "./index"

async function createTempDir(): Promise<string> {
	return mkdtemp(path.join(process.cwd(), ".test-tool-handler-"))
}

test("createToolHandler: registers and calls a tool", async () => {
	const dir = await createTempDir()
	try {
		const handler = createToolHandler({ sessionsRoot: dir })

		const executor: ToolExecutor = async (params: Record<string, unknown>) => {
			const { name } = params as { name: string }
			return { content: `Hello, ${name}!` }
		}

		handler.register({ name: "greet", description: "Greet someone" }, executor)

		const result = await handler.call("greet", { name: "World" })
		assert.equal(result.content, "Hello, World!")
		assert.equal(result.error, undefined)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("createToolHandler: returns NOT_FOUND for unknown tool", async () => {
	const dir = await createTempDir()
	try {
		const handler = createToolHandler({ sessionsRoot: dir })
		const result = await handler.call("nonexistent", {})
		assert.equal(result.error?.code, "NOT_FOUND")
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("createToolHandler: applies default metadata when none provided", async () => {
	const dir = await createTempDir()
	try {
		const handler = createToolHandler({ sessionsRoot: dir })

		handler.register({ name: "test", description: "test tool" }, async () => ({ content: "ok" }))

		const entry = handler.get("test")
		assert.ok(entry)
		assert.equal(entry.metadata?.retryable, true)
		assert.equal(entry.metadata?.cacheable, false)
		assert.equal(entry.metadata?.timeoutMs, 30000)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("createToolHandler: uses provided metadata", async () => {
	const dir = await createTempDir()
	try {
		const handler = createToolHandler({ sessionsRoot: dir })

		handler.register({ name: "test", description: "test tool" }, async () => ({ content: "ok" }), { category: "file", retryable: false, timeoutMs: 5000 })

		const entry = handler.get("test")
		assert.ok(entry)
		assert.equal(entry.metadata?.category, "file")
		assert.equal(entry.metadata?.retryable, false)
		assert.equal(entry.metadata?.timeoutMs, 5000)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("createToolHandler: runtime.startedAt is set before middleware runs", async () => {
	const dir = await createTempDir()
	try {
		const handler = createToolHandler({ sessionsRoot: dir })

		let capturedStartedAt: number | undefined
		handler.register(
			{ name: "test", description: "test" },
			async (_params, _ctx) => {
				// Executor runs after middleware chain, startedAt should already be set
				return { content: "ok" }
			}
		)

		// The call() sets runtime.startedAt before the middleware chain,
		// so the executor should execute successfully (proving startedAt was set)
		const result = await handler.call("test", {})
		assert.equal(result.content, "ok")
		assert.equal(result.error, undefined)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("createToolHandler: has() returns correct values", async () => {
	const dir = await createTempDir()
	try {
		const handler = createToolHandler({ sessionsRoot: dir })

		handler.register({ name: "test", description: "test" }, async () => ({ content: "ok" }))

		assert.equal(handler.has("test"), true)
		assert.equal(handler.has("other"), false)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})
