/**
 * miniClaw TUI 入口
 *
 * 终端交互界面，通过 createRuntime 接入 runtime，
 * 使用 readline 获取用户输入，消费 RuntimeEvent 渲染输出
 */

import dotenv from "dotenv"
import path from "node:path"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { createRuntime } from "@mini-claw/runtime"
import type { RuntimeEvent } from "@mini-claw/runtime"
import { loadPermissionConfig } from "@mini-claw/runtime"

// 项目根目录（tui 位于 apps/tui/src/，向上三级）
const projectRoot = path.resolve(import.meta.dirname, "../../..")

// 加载环境变量（根据 NODE_ENV 选择 .env 或 .env.dev）
const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.dev"
dotenv.config({ path: path.resolve(projectRoot, envFile) })

// 创建 runtime 实例
const runtime = createRuntime({
	apiKey: process.env.API_KEY!,
	baseUrl: process.env.DEEPSEEK_BASE_URL,
	model: process.env.DEEPSEEK_MODEL,
	sessionId: process.env.SESSION_ID,
	sessionName: process.env.SESSION_NAME,
	sessionsRoot: path.resolve(projectRoot, ".sessions"),
	permissionConfig: loadPermissionConfig(projectRoot)
})

// 创建 readline 接口
const rl = readline.createInterface({ input, output })

/**
 * 渲染 RuntimeEvent 到终端
 */
function renderEvent(event: RuntimeEvent): void {
	switch (event.type) {
		case "text-delta":
			process.stdout.write(event.delta)
			break
		case "tool-call-start":
			console.log(`\n[调用工具: ${event.toolName}]`)
			break
		case "iteration-start":
			if (event.iteration > 0) {
				console.log(`\n--- 第 ${event.iteration + 1} 轮思考 ---`)
			}
			break
		case "tool-execute":
			console.log(`  执行: ${event.toolName}...`)
			break
		case "tool-result":
			if (!event.success) {
				console.log(`  失败: ${event.toolName} - ${event.result}`)
			}
			break
		case "loop-end":
			if (event.reason !== "final_answer") {
				console.log(`\n(循环结束: ${event.reason}, 共 ${event.iterations} 轮)`)
			}
			break
		case "loop-complete":
			if (event.error) {
				console.error("\nError:", event.error.message)
			}
			break
	}
}

/**
 * 主循环
 */
async function main() {
	console.log(`\n使用 ReAct 循环模式 [流式]\n`)

	while (true) {
		const userInput = await rl.question("\nYou: ")

		if (userInput === "exit") {
			rl.close()
			process.exit(0)
		}

		for await (const event of runtime.chat(userInput, {
			contextOptions: { preserveRecentMessages: 2 }
		})) {
			renderEvent(event)
		}

		console.log("\n")
	}
}

main()
