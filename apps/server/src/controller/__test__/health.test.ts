import { describe, it, expect } from "vitest"
import express from "express"
import request from "supertest"

import { healthCheck } from "../health.js"
import { HEALTH } from "../../constants.js"

describe("healthCheck controller", () => {
	const app = express()
	app.get(HEALTH, healthCheck)

	it("should return 200 with { status: 'ok' }", async () => {
		const res = await request(app).get(HEALTH)
		expect(res.status).toBe(200)
		expect(res.body).toEqual({ status: "ok" })
	})
})
