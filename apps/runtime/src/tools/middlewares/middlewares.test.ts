import assert from "node:assert/strict"
import test from "node:test"
import { mkdtemp, rm } from "node:fs/promises"
import path from "node:path"

import type { ToolMiddleware, MiddlewareContext, MiddlewareRuntimeState, ToolMetadata } from "../../types/llm/tool"
import { createPermissionMiddleware } from "./permission"
import { createCancellationMiddleware } from "./cancellation"
import { createCacheMiddleware } from "./cache"
import { createRetryMiddleware } from "./retry"
import { createTimeoutMiddleware } from "./timeout"

function createContext(overrides?: Partial<MiddlewareContext>): MiddlewareContext {
	return {
		toolName: "test.tool",
		params: {},
		metadata: {},
		sessionId: "test-session",
		runtime: { startedAt: Date.now() },
		...overrides
	}
}

// ============== Permission Middleware ==============

test("createPermissionMiddleware: grants when all permissions present", async () => {
	const mw = createPermissionMiddleware(() => new Set(["fs.read", "fs.write"]))
	const ctx = createContext({ metadata: { requiredPermissions: ["fs.read"] } })

	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.content, "ok")
	assert.equal(result.error, undefined)
})

test("createPermissionMiddleware: denies when permission missing", async () => {
	const mw = createPermissionMiddleware(() => new Set(["fs.read"]))
	const ctx = createContext({ metadata: { requiredPermissions: ["fs.write"] } })

	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.error?.code, "PERMISSION_DENIED")
})

test("createPermissionMiddleware: skips check when no permissions required", async () => {
	const mw = createPermissionMiddleware(() => new Set())
	const ctx = createContext({ metadata: {} })

	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.content, "ok")
})

// ============== Cancellation Middleware ==============

test("createCancellationMiddleware: rejects when signal already aborted", async () => {
	const mw = createCancellationMiddleware()
	const controller = new AbortController()
	controller.abort()
	const ctx = createContext({ abortSignal: controller.signal })

	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.error?.code, "CANCELLED")
})

test("createCancellationMiddleware: proceeds when signal not aborted", async () => {
	const mw = createCancellationMiddleware()
	const ctx = createContext()

	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.content, "ok")
})

// ============== Cache Middleware ==============

test("createCacheMiddleware: returns cached result on hit", async () => {
	const mw = createCacheMiddleware()
	let callCount = 0

	const ctx1 = createContext({
		toolName: "cached.tool",
		params: { city: "Shanghai" },
		metadata: { cacheable: true }
	})

	await mw(ctx1, async () => {
		callCount++
		return { content: "sunny" }
	})

	const ctx2 = createContext({
		toolName: "cached.tool",
		params: { city: "Shanghai" },
		metadata: { cacheable: true }
	})

	const result = await mw(ctx2, async () => {
		callCount++
		return { content: "different" }
	})

	assert.equal(result.content, "sunny")
	assert.equal(callCount, 1)
	assert.equal(ctx2.runtime.cacheHit, true)
})

test("createCacheMiddleware: skips caching when cacheable is false", async () => {
	const mw = createCacheMiddleware()
	let callCount = 0

	const ctx = createContext({ metadata: { cacheable: false } })

	await mw(ctx, async () => {
		callCount++
		return { content: "ok" }
	})

	const result = await mw(ctx, async () => {
		callCount++
		return { content: "ok" }
	})

	assert.equal(callCount, 2)
})

test("createCacheMiddleware: does not cache failed results", async () => {
	const mw = createCacheMiddleware()
	let callCount = 0

	const ctx1 = createContext({
		toolName: "fail.tool",
		metadata: { cacheable: true }
	})

	await mw(ctx1, async () => {
		callCount++
		return { content: "", error: { code: "FAIL", message: "error" } }
	})

	const ctx2 = createContext({
		toolName: "fail.tool",
		metadata: { cacheable: true }
	})

	await mw(ctx2, async () => {
		callCount++
		return { content: "recovered" }
	})

	assert.equal(callCount, 2)
})

// ============== Retry Middleware ==============

test("createRetryMiddleware: retries on failure and succeeds", async () => {
	const mw = createRetryMiddleware(2)
	let attempt = 0

	const ctx = createContext({ metadata: { retryable: true, maxRetries: 2, retryBaseDelay: 10 } })

	const result = await mw(ctx, async () => {
		attempt++
		if (attempt < 2) {
			return { content: "", error: { code: "FAIL", message: "transient" } }
		}
		return { content: "success" }
	})

	assert.equal(result.content, "success")
	assert.equal(ctx.runtime.retryCount, 1)
})

test("createRetryMiddleware: does not retry when retryable is false", async () => {
	const mw = createRetryMiddleware(2)
	let callCount = 0

	const ctx = createContext({ metadata: { retryable: false } })

	const result = await mw(ctx, async () => {
		callCount++
		return { content: "", error: { code: "FAIL", message: "error" } }
	})

	assert.equal(callCount, 1)
	assert.equal(result.error?.code, "FAIL")
})

test("createRetryMiddleware: exhausts max retries", async () => {
	const mw = createRetryMiddleware(2)
	let callCount = 0

	const ctx = createContext({ metadata: { retryable: true, maxRetries: 2, retryBaseDelay: 10 } })

	const result = await mw(ctx, async () => {
		callCount++
		return { content: "", error: { code: "FAIL", message: "persistent" } }
	})

	assert.equal(callCount, 3)
	assert.equal(result.error?.code, "FAIL")
	assert.equal(ctx.runtime.retryCount, 2)
})

// ============== Timeout Middleware ==============

test("createTimeoutMiddleware: returns result when within timeout", async () => {
	const mw = createTimeoutMiddleware(5000)
	const ctx = createContext({ metadata: { timeoutMs: 5000 } })

	const result = await mw(ctx, async () => ({ content: "fast" }))
	assert.equal(result.content, "fast")
	assert.equal(ctx.runtime.timeoutTriggered, undefined)
})

test("createTimeoutMiddleware: returns timeout error when execution is slow", async () => {
	const mw = createTimeoutMiddleware(50)
	const ctx = createContext({ metadata: { timeoutMs: 50 } })

	const result = await mw(ctx, async () => {
		await new Promise((resolve) => setTimeout(resolve, 200))
		return { content: "slow" }
	})

	assert.equal(result.error?.code, "TIMEOUT")
	assert.equal(ctx.runtime.timeoutTriggered, true)
})

test("createTimeoutMiddleware: merges parent signal with timeout signal", async () => {
	const mw = createTimeoutMiddleware(5000)
	const parentController = new AbortController()
	const ctx = createContext({ metadata: { timeoutMs: 5000 }, abortSignal: parentController.signal })

	const result = await mw(ctx, async () => {
		// The context should now have a merged signal
		assert.ok(ctx.abortSignal)
		assert.equal(ctx.abortSignal?.aborted, false)
		return { content: "ok" }
	})

	assert.equal(result.content, "ok")
})
