/**
 * miniClaw SSE Server
 *
 * Express 中转服务器，将 runtime 的 AsyncIterable<RuntimeEvent>
 * 转为 SSE 事件流推送给浏览器客户端
 * 同时提供 Session 和 Memory 查询 REST API
 */

import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import path from "node:path"

import { HEALTH, SESSIONS, SESSION_DETAIL, SESSION_METRICS, CHAT, USER_CONFIG, TOOLS, PERMISSION } from "./constants.js"
import { initSessionService } from "./service/session.js"
import { initChatService } from "./service/chat.js"
import { initUserConfigService } from "./service/user-config.js"
import { initToolService } from "./service/tool.js"
import { healthCheck } from "./controller/health.js"
import * as sessionController from "./controller/session.js"
import * as chatController from "./controller/chat.js"
import * as userConfigController from "./controller/user-config.js"
import * as toolController from "./controller/tool.js"

// 项目根目录（server 位于 apps/server/src/，向上三级）
const projectRoot = path.resolve(import.meta.dirname, "../../..")

// 加载环境变量
const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.dev"
dotenv.config({ path: path.resolve(projectRoot, envFile) })

// 基础配置
const apiKey = process.env.API_KEY
if (!apiKey) {
	console.error("Error: API_KEY environment variable is required")
	process.exit(1)
}

const runtimeConfig = {
	apiKey,
	provider: process.env.LLM_PROVIDER as "deepseek" | "glm" | undefined,
	baseUrl: process.env.DEEPSEEK_BASE_URL,
	model: process.env.DEEPSEEK_MODEL,
	sessionsRoot: path.resolve(projectRoot, ".sessions"),
	projectRoot
}

// 初始化 service（注意顺序：userService 需在 chatService 之前）
export const sessionService = initSessionService(runtimeConfig.sessionsRoot)
export const userService = initUserConfigService(projectRoot)
export const toolService = initToolService(projectRoot)
export const chatService = initChatService(runtimeConfig, () => userService.get())

// 创建 Express 应用
const app = express()
const PORT = process.env.PORT ?? 3000

// 中间件
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"] }))
app.use(express.json())
// 禁用 API 响应缓存
app.use("/api", (_req, res, next) => {
	res.setHeader("Cache-Control", "no-store")
	next()
})

// 路由注册
app.get(HEALTH, healthCheck)
app.get(SESSIONS, sessionController.list)
app.get(SESSION_DETAIL, sessionController.detail)
app.get(SESSION_METRICS, sessionController.metrics)
app.delete(SESSION_DETAIL, sessionController.remove)
app.post(CHAT, chatController.chat)
app.get(USER_CONFIG, userConfigController.getUserConfig)
app.put(USER_CONFIG, userConfigController.updateUserConfig)
app.get(TOOLS, toolController.listTools)
app.get(PERMISSION, toolController.getPermission)
app.put(PERMISSION, toolController.updatePermission)

// 启动服务器
app.listen(PORT, () => {
	console.log(`miniClaw SSE Server running at http://localhost:${PORT}`)
})
