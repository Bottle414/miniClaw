import assert from "node:assert/strict"
import test from "node:test"

import { stableStringify } from "../stable-stringify"

test("stableStringify: key order does not affect output", () => {
	const a = stableStringify({ a: 1, b: 2 })
	const b = stableStringify({ b: 2, a: 1 })
	assert.equal(a, b)
})

test("stableStringify: array order is preserved", () => {
	const result = stableStringify({ items: [3, 1, 2] })
	assert.equal(result, '{"items":[3,1,2]}')
})

test("stableStringify: nested objects are sorted", () => {
	const a = stableStringify({ outer: { z: 1, a: 2 } })
	const b = stableStringify({ outer: { a: 2, z: 1 } })
	assert.equal(a, b)
	assert.equal(a, '{"outer":{"a":2,"z":1}}')
})

test("stableStringify: primitive values pass through", () => {
	assert.equal(stableStringify("hello"), '"hello"')
	assert.equal(stableStringify(42), "42")
	assert.equal(stableStringify(null), "null")
	assert.equal(stableStringify(true), "true")
})

test("stableStringify: empty object", () => {
	assert.equal(stableStringify({}), "{}")
})
