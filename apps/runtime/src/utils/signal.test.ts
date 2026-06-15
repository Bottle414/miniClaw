import assert from "node:assert/strict"
import test from "node:test"

import { anySignal } from "./signal"

test("anySignal: returns a signal that aborts when any input signal aborts", () => {
	const c1 = new AbortController()
	const c2 = new AbortController()
	const merged = anySignal([c1.signal, c2.signal])

	assert.equal(merged.aborted, false)

	c1.abort()
	assert.equal(merged.aborted, true)
})

test("anySignal: returns already aborted signal if any input is already aborted", () => {
	const c1 = new AbortController()
	c1.abort()
	const c2 = new AbortController()

	const merged = anySignal([c1.signal, c2.signal])
	assert.equal(merged.aborted, true)
})

test("anySignal: skips undefined signals", () => {
	const c1 = new AbortController()
	const merged = anySignal([undefined, c1.signal, undefined])

	assert.equal(merged.aborted, false)

	c1.abort()
	assert.equal(merged.aborted, true)
})

test("anySignal: works with all undefined signals", () => {
	const merged = anySignal([undefined, undefined])
	assert.equal(merged.aborted, false)
})

test("anySignal: second signal triggers abort", () => {
	const c1 = new AbortController()
	const c2 = new AbortController()
	const merged = anySignal([c1.signal, c2.signal])

	c2.abort()
	assert.equal(merged.aborted, true)
})
