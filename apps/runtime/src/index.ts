import dotenv from "dotenv"
import path from "node:path"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { createConfig } from "./utils/config"
import { DeepSeekProvider } from "./provider"
import { toolHandler } from "./tools"
import { createStreamMerger } from "./utils/message"
import { createToolMessagesFromProviderCalls } from "./utils/tool-message"
import { buildContext, createLLMSummarizer, createFileSystemMemoryStore, createRuntimeMemoryState, createSessionManager, setSessionMemory } from "./memory"
import type { LLMMessage } from "./types/llm"
import type { RuntimeEvent } from "./types/event"
import type { ReActEvent } from "./types/react"
import type { Session } from "./memory/types"
import { getDotenvConfig } from "./utils/dotenv"
import { executeReActLoop } from "./react/loop"

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

// 功能开关：是否使用 ReAct 循环
const USE_REACT_LOOP = process.env.USE_REACT_LOOP !== "false" // 默认启用

// 初始化消息历史（包含系统提示）
const messages: LLMMessage[] = [
	// 先不传系统提示，减少 token 消耗
	// {
	// 	role: "system",
	// 	content: config.systemPrompt
	// }
]

if (config.soulPrompt) {
	messages.push({
		role: "system",
		content: config.soulPrompt
	})
}

let memory = createRuntimeMemoryState()
const summarizer = createLLMSummarizer(provider, config)

// 创建 SessionManager
const sessionsRoot = process.env.SESSIONS_ROOT || path.join(process.cwd(), ".sessions")
const sessionStore = createFileSystemMemoryStore(sessionsRoot)
const sessionManager = createSessionManager(sessionStore)

// 当前 session（在 main 中初始化）
let session: Session

async function getContextMessages() {
	const { contextMessages } = await buildContext({
		messages,
		memory,
		options: { preserveRecentMessages: 2 },
		summarizer
	})
	logContextMessages(contextMessages)
	return contextMessages
}

function logContextMessages(contextMessages: LLMMessage[]) {
	console.log("\n--- contextMessages 发送给模型 ---")
	console.log(JSON.stringify(contextMessages, null, 2))
	console.log("--- contextMessages end ---\n")
}

/**
 * 发送消息到 LLM（旧循环 - 作为回退）
 */
async function sendMessageLegacy() {
	// 获取工具定义
	const tools = toolHandler.getToolDefinitions()

	// 构造请求
	const contextMessages = await getContextMessages()
	const response = await provider.chat({
		messages: contextMessages,
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

		// 使用工具消息工具处理工具调用
		const toolMessages = await createToolMessagesFromProviderCalls({
			tool_calls: message.toolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.name,
					arguments: tc.arguments
				}
			}))
		}, session.id)

		if (toolMessages && toolMessages.length > 0) {
			// 添加工具消息到历史
			messages.push(...toolMessages)

			// 递归调用以获取最终回复
			return sendMessageLegacy()
		}
	}

	// 输出文本回复
	if (message.content) {
		console.log("\nAssistant:")
		console.log(message.content)
	}
}

/**
 * 流式发送消息到 LLM（旧循环 - 流式版本）
 */
async function sendMessageLegacyStream() {
	// 获取工具定义
	const tools = toolHandler.getToolDefinitions()

	// 创建流式合并器
	const merger = createStreamMerger()

	// 流式请求
	console.log("\nAssistant: ")

	const contextMessages = await getContextMessages()
	for await (const event of provider.chatStream({
		messages: contextMessages,
		model: config.model,
		tools
	})) {
		switch (event.type) {
			case "text-delta":
				// 直接输出文本增量
				process.stdout.write(event.delta)
				break
			case "tool-call-start":
				console.log(`\n[调用工具: ${event.toolName}]`)
				break
			case "error":
				console.error("\nError:", event.error.message)
				return
		}

		// 推送到合并器
		merger.push(event)
	}

	// 获取完整消息
	const message = merger.getMessage()
	if (!message) {
		console.log("\n(流式响应未完成)")
		return
	}

	// 将助手消息添加到历史
	messages.push(message)

	// 处理工具调用
	if (message.toolCalls && message.toolCalls.length > 0) {
		// 使用工具消息工具处理工具调用
		const toolMessages = await createToolMessagesFromProviderCalls({
			tool_calls: message.toolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.name,
					arguments: tc.arguments
				}
			}))
		}, session.id)

		if (toolMessages && toolMessages.length > 0) {
			// 添加工具消息到历史
			messages.push(...toolMessages)

			// 递归调用以获取最终回复
			return sendMessageLegacyStream()
		}
	}
}

/**
 * 发送消息到 LLM（新 ReAct 循环 - 流式输出）
 */
async function sendMessageReAct(userInput: string) {
	// 执行 ReAct 循环，传入 onEvent 回调实现流式输出
	const result = await executeReActLoop({
		provider,
		config,
		userInput,
		initialMessages: messages,
		memory,
		contextOptions: { preserveRecentMessages: 2 },
		summarizer,
		sessionId: session.id,
		onEvent: (event: ReActEvent) => {
			switch (event.type) {
				case "text-delta":
					// 逐 token 输出
					process.stdout.write(event.delta)
					break
				case "tool-call-start":
					console.log(`\n[调用工具: ${event.toolName}]`)
					break
				case "react-iteration-start":
					if (event.iteration > 0) {
						console.log(`\n--- 第 ${event.iteration + 1} 轮思考 ---`)
					}
					break
				case "react-tool-execute":
					console.log(`  执行: ${event.toolName}...`)
					break
				case "react-tool-result":
					if (!event.success) {
						console.log(`  失败: ${event.toolName} - ${event.result}`)
					}
					break
				case "react-loop-end":
					// 循环结束，输出换行
					if (event.reason !== "final_answer") {
						console.log(`\n(循环结束: ${event.reason}, 共 ${event.iterations} 轮)`)
					}
					break
			}
		}
	})

	// 处理结果
	if (result.error) {
		console.error("\nError:", result.error.message)
		return
	}

	// 输出换行
	console.log()

	// 更新全局消息历史（用于下次对话）
	messages.length = 0
	messages.push(...result.state.messages)

	// 持久化 session
	session.messages = [...messages]
	// 将摘要结果追加到 session
	if (result.summaryResults.length > 0) {
		session.summary.push(...result.summaryResults)
		for (const sr of result.summaryResults) {
			memory = setSessionMemory(memory, {
				id: `summary-${sr.createdAt}`,
				content: `摘要: ${sr.summary}`
			})
			for (const fact of sr.extractedFacts) {
				memory = setSessionMemory(memory, {
					id: `fact-${fact.category}-${fact.content.slice(0, 20)}`,
					content: `事实: [${fact.category}] ${fact.content}`
				})
			}
		}
		session.facts.push(...result.summaryResults.flatMap(sr => sr.extractedFacts))
	}
	await sessionManager.save(session)

	// 调试信息
	if (process.env.DEBUG_REACT === "true") {
		console.log("\n--- ReAct 调试信息 ---")
		console.log(`迭代次数: ${result.state.iteration}`)
		console.log(`终止原因: ${result.state.terminationReason}`)
		console.log(`行动次数: ${result.state.actionHistory.length}`)
		console.log(`观察次数: ${result.state.observationHistory.length}`)
		console.log("-------------------\n")
	}
}

/**
 * 主循环
 */
async function main() {
	const streamMode = config.stream
	console.log(`\n使用 ${USE_REACT_LOOP ? "ReAct 循环" : "旧循环（回退）"} 模式${streamMode ? " [流式]" : ""}\n`)

	// 加载或创建 session
	const sessionId = process.env.SESSION_ID
	if (sessionId) {
		const loaded = await sessionManager.load(sessionId)
		if (loaded) {
			session = loaded
			console.log(`已加载 session: ${session.name} (${session.id})`)
		} else {
			session = await sessionManager.create({ id: sessionId, name: process.env.SESSION_NAME })
			console.log(`session ${sessionId} 不存在，已创建新 session: ${session.name}`)
		}
	} else {
		session = await sessionManager.create({ name: process.env.SESSION_NAME })
		console.log(`已创建新 session: ${session.name} (${session.id})`)
	}

	// 恢复 session 的 messages 到运行时
	if (session.messages.length > 0) {
		messages.length = 0
		messages.push(...session.messages)
		console.log(`已恢复 ${session.messages.length} 条历史消息`)
	}

	// 将 session 的 summary 和 facts 注入到 RuntimeMemoryState 的 session memory
	for (const result of session.summary) {
		memory = setSessionMemory(memory, {
			id: `summary-${result.createdAt}`,
			content: `摘要: ${result.summary}`
		})
	}
	for (const fact of session.facts) {
		memory = setSessionMemory(memory, {
			id: `fact-${fact.category}-${fact.content.slice(0, 20)}`,
			content: `事实: [${fact.category}] ${fact.content}`
		})
	}

	while (true) {
		const userInput = await rl.question("\nYou: ")

		if (userInput === "exit") {
			rl.close()
			process.exit(0)
		}

		if (USE_REACT_LOOP) {
			// 使用 ReAct 循环
			await sendMessageReAct(userInput)
		} else {
			// 使用旧循环（回退）
			messages.push({
				role: "user",
				content: userInput
			})
			if (streamMode) {
				await sendMessageLegacyStream()
			} else {
				await sendMessageLegacy()
			}
		}
	}
}

main()
