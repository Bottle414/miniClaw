import assert from "node:assert/strict"
import test from "node:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import type { MiddlewareContext } from "../../types/llm/tool"
import { createPermissionMiddleware, matchToolName, loadPermissionConfig } from "./permission"
import { createCancellationMiddleware } from "./cancellation"
import { createCacheMiddleware } from "./cache"
import { createMetricsMiddleware } from "./metrics"
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

// ============== matchToolName ==============

test("matchToolName: exact match", () => {
	assert.equal(matchToolName("weather.getWeather", "weather.getWeather"), true)
	assert.equal(matchToolName("weather.getWeather", "weather.getForecast"), false)
})

test("matchToolName: single-level wildcard", () => {
	assert.equal(matchToolName("weather.*", "weather.getWeather"), true)
	assert.equal(matchToolName("weather.*", "weather.getForecast"), true)
	assert.equal(matchToolName("weather.*", "system.shutdown"), false)
	assert.equal(matchToolName("weather.*", "weather.forecast.daily"), false)
})

test("matchToolName: global wildcard", () => {
	assert.equal(matchToolName("*", "weather.getWeather"), true)
	assert.equal(matchToolName("*", "system.shutdown"), true)
	assert.equal(matchToolName("*", "anything"), true)
})

test("matchToolName: no match", () => {
	assert.equal(matchToolName("system.*", "weather.getWeather"), false)
	assert.equal(matchToolName("weather.getWeather", "weather.getForecast"), false)
})

// ============== loadPermissionConfig ==============

test("loadPermissionConfig: loads valid permission.json", async () => {
	const dir = await mkdtemp(path.join(process.cwd(), ".test-perm-"))
	try {
		await writeFile(path.join(dir, "permission.json"), JSON.stringify({ allow: ["weather.*"], check: ["system.*"], deny: ["system.shutdown"] }))
		const config = loadPermissionConfig(dir)
		assert.deepEqual(config.allow, ["weather.*"])
		assert.deepEqual(config.check, ["system.*"])
		assert.deepEqual(config.deny, ["system.shutdown"])
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("loadPermissionConfig: returns default when file not found", async () => {
	const dir = await mkdtemp(path.join(process.cwd(), ".test-perm-"))
	try {
		const config = loadPermissionConfig(dir)
		assert.deepEqual(config.allow, ["*"])
		assert.deepEqual(config.check, [])
		assert.deepEqual(config.deny, [])
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test("loadPermissionConfig: throws on invalid JSON", async () => {
	const dir = await mkdtemp(path.join(process.cwd(), ".test-perm-"))
	try {
		await writeFile(path.join(dir, "permission.json"), "not json")
		assert.throws(() => loadPermissionConfig(dir), /Failed to load permission\.json/)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

// ============== Permission Middleware ==============

test("createPermissionMiddleware: deny rule takes priority", async () => {
	const mw = createPermissionMiddleware({ allow: ["*"], deny: ["test.tool"] }, async () => true)
	const ctx = createContext({ toolName: "test.tool" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.error?.code, "PERMISSION_DENIED")
})

test("createPermissionMiddleware: check callback approved", async () => {
	const mw = createPermissionMiddleware({ check: ["test.*"] }, async () => true)
	const ctx = createContext({ toolName: "test.tool" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.content, "ok")
})

test("createPermissionMiddleware: check callback denied", async () => {
	const mw = createPermissionMiddleware({ check: ["test.*"] }, async () => false)
	const ctx = createContext({ toolName: "test.tool" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.error?.code, "PERMISSION_DENIED")
})

test("createPermissionMiddleware: allow rule passes", async () => {
	const mw = createPermissionMiddleware({ allow: ["test.*"] }, async () => false)
	const ctx = createContext({ toolName: "test.tool" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.content, "ok")
})

test("createPermissionMiddleware: no matching rule denies", async () => {
	const mw = createPermissionMiddleware({ allow: ["weather.*"] }, async () => true)
	const ctx = createContext({ toolName: "system.shutdown" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.error?.code, "PERMISSION_DENIED")
	assert.ok(result.error?.message.includes("no matching rule"))
})

test("createPermissionMiddleware: deny > check priority", async () => {
	let checkCalled = false
	const mw = createPermissionMiddleware({ check: ["test.*"], deny: ["test.tool"] }, async () => {
		checkCalled = true
		return true
	})
	const ctx = createContext({ toolName: "test.tool" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.error?.code, "PERMISSION_DENIED")
	assert.equal(checkCalled, false)
})

test("createPermissionMiddleware: default config allows all", async () => {
	const mw = createPermissionMiddleware({}, async () => false)
	const ctx = createContext({ toolName: "any.tool" })
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

// ============== Cache-Metrics Integration ==============

test("metrics middleware records cache hit when cache is inner", async () => {
	const snapshots: Array<Record<string, unknown>> = []
	const metricsMw = createMetricsMiddleware((snapshot) => {
		snapshots.push(snapshot as Record<string, unknown>)
	})
	const cacheMw = createCacheMiddleware()

	// Chain: metrics → cache (same as production order)
	const chain = async (ctx: MiddlewareContext): Promise<{ content: string }> => {
		return metricsMw(ctx, async () => cacheMw(ctx, async () => ({ content: "ok" })))
	}

	// First call: cache miss
	const ctx1 = createContext({
		toolName: "cached.tool",
		metadata: { cacheable: true }
	})
	await chain(ctx1)

	// Second call: cache hit
	const ctx2 = createContext({
		toolName: "cached.tool",
		metadata: { cacheable: true }
	})
	await chain(ctx2)

	assert.equal(snapshots.length, 2)
	const lastSnapshot = snapshots[1] as { tools: Record<string, { callCount: number; cacheHits: number; cacheMisses: number }> }
	assert.equal(lastSnapshot.tools["cached.tool"].callCount, 2)
	assert.equal(lastSnapshot.tools["cached.tool"].cacheHits, 1)
	assert.equal(lastSnapshot.tools["cached.tool"].cacheMisses, 1)
})

// ============== Metrics Middleware ==============

test("createMetricsMiddleware: invokes onMetricsUpdate callback", async () => {
	const snapshots: Array<Record<string, unknown>> = []
	const mw = createMetricsMiddleware((snapshot) => {
		snapshots.push(snapshot as Record<string, unknown>)
	})

	const ctx = createContext({ toolName: "test.tool" })
	await mw(ctx, async () => ({ content: "ok" }))

	assert.equal(snapshots.length, 1)
	assert.ok(snapshots[0].tools)
})

test("createMetricsMiddleware: works without callback", async () => {
	const mw = createMetricsMiddleware()
	const ctx = createContext({ toolName: "test.tool" })
	const result = await mw(ctx, async () => ({ content: "ok" }))
	assert.equal(result.content, "ok")
})

test("createMetricsMiddleware: snapshot contains correct metrics", async () => {
	const snapshots: Array<Record<string, unknown>> = []
	const mw = createMetricsMiddleware((snapshot) => {
		snapshots.push(snapshot as Record<string, unknown>)
	})

	const ctx = createContext({ toolName: "test.tool" })
	await mw(ctx, async () => ({ content: "ok" }))

	const snapshot = snapshots[0] as { tools: Record<string, { callCount: number; errorCount: number; totalDurationMs: number }> }
	assert.equal(snapshot.tools["test.tool"].callCount, 1)
	assert.equal(snapshot.tools["test.tool"].errorCount, 0)
	assert.ok(snapshot.tools["test.tool"].totalDurationMs >= 0)
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
