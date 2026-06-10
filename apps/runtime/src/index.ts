import dotenv from "dotenv"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { createConfig } from "./utils/config"
import { DeepSeekProvider } from "./provider"
import { toolHandler } from "./tools"
import { messageHandler } from "./utils/message"
import type { LLMMessage } from "./types/llm"
import { getDotenvConfig } from "./utils/dotenv"

// 加载环境变量
dotenv.config(getDotenvConfig())

// 创建配置
const config = createConfig(process.env)

// 创建并初始化 Provider
const provider = DeepSeekProvider()
provider.init(config)

// 创建 readline 接口
const rl = readline.createInterface({
	input,
	output
})

// 初始化消息历史（包含系统提示）
const messages: LLMMessage[] = [
	// 先不传系统提示，减少 token 消耗
	// {
	// 	role: "system",
	// 	content: [{ type: "text", text: config.systemPrompt }]
	// }
]

/**
 * 发送消息到 LLM
 */
async function sendMessage() {
	// 获取工具定义
	const tools = toolHandler.getToolDefinitions()

	// 构造请求
	const response = await provider.chat({
		messages,
		model: config.model,
		tools
	})

	// 获取响应消息
	const { message } = response

	if (!message) {
		console.log("\nAssistant: (无响应)")
		return
	}

	// 将助手消息添加到历史
	messages.push(message)

	// 处理工具调用
	if (message.toolCalls && message.toolCalls.length > 0) {
		console.log("\nAssistant: 调用工具...")

		// 使用 messageHandler 处理工具调用
		const toolMessages = messageHandler({
			tool_calls: message.toolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.name,
					arguments: tc.arguments
				}
			}))
		})

		if (toolMessages && toolMessages.length > 0) {
			// 添加工具消息到历史
			messages.push(...toolMessages)

			// 递归调用以获取最终回复
			return sendMessage()
		}
	}

	// 输出文本回复
	if (message.content) {
		console.log("\nAssistant:")
		console.log(message.content.map((s) => s.text).join(""))
	}
}

/**
 * 主循环
 */
async function main() {
	while (true) {
		const userInput = await rl.question("\nYou: ")

		if (userInput === "exit") {
			rl.close()
			process.exit(0)
		}

		// 添加用户消息
		messages.push({
			role: "user",
			content: [{ type: "text", text: userInput }]
		})

		await sendMessage()
	}
}

main()
