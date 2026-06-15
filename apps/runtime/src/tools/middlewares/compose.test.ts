import assert from "node:assert/strict"
import test from "node:test"

import type { ToolMiddleware, ToolResult, MiddlewareContext, MiddlewareRuntimeState, ToolMetadata } from "../../types/llm/tool"
import { composeMiddlewareChain } from "./compose"

function createContext(overrides?: Partial<MiddlewareContext>): MiddlewareContext {
	return {
		toolName: "test.tool",
		params: {},
		metadata: {},
		sessionId: "",
		runtime: {},
		...overrides
	}
}

test("composeMiddlewareChain: executes middlewares in order (outer → inner)", async () => {
	const order: string[] = []

	const mw1: ToolMiddleware = async (_ctx, next) => {
		order.push("mw1-before")
		const result = await next()
		order.push("mw1-after")
		return result
	}
	const mw2: ToolMiddleware = async (_ctx, next) => {
		order.push("mw2-before")
		const result = await next()
		order.push("mw2-after")
		return result
	}

	await composeMiddlewareChain([mw1, mw2], createContext(), async () => {
		order.push("executor")
		return { content: "ok" }
	})

	assert.deepEqual(order, ["mw1-before", "mw2-before", "executor", "mw2-after", "mw1-after"])
})

test("composeMiddlewareChain: short-circuits when middleware does not call next()", async () => {
	const order: string[] = []

	const mw1: ToolMiddleware = async () => {
		order.push("mw1")
		return { content: "blocked", error: { code: "BLOCKED", message: "nope" } }
	}
	const mw2: ToolMiddleware = async (_ctx, next) => {
		order.push("mw2")
		return next()
	}

	const result = await composeMiddlewareChain([mw1, mw2], createContext(), async () => {
		order.push("executor")
		return { content: "ok" }
	})

	assert.deepEqual(order, ["mw1"])
	assert.equal(result.content, "blocked")
	assert.equal(result.error?.code, "BLOCKED")
})

test("composeMiddlewareChain: no middlewares — calls executor directly", async () => {
	const result = await composeMiddlewareChain([], createContext(), async () => ({
		content: "direct"
	}))

	assert.equal(result.content, "direct")
})

test("composeMiddlewareChain: context is shared across middlewares", async () => {
	const context = createContext()

	const mw1: ToolMiddleware = async (ctx, next) => {
		ctx.runtime.startedAt = 100
		return next()
	}
	const mw2: ToolMiddleware = async (ctx, next) => {
		assert.equal(ctx.runtime.startedAt, 100)
		ctx.runtime.retryCount = 2
		return next()
	}

	await composeMiddlewareChain([mw1, mw2], context, async () => {
		assert.equal(context.runtime.retryCount, 2)
		return { content: "ok" }
	})
})
