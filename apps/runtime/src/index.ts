import dotenv from "dotenv"
import OpenAI from "openai"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { getDotenvConfig } from "./utils/dotenv"
import { messageHandler } from "./utils/message"
import { toolHandler } from "./tools"
import { transformTools } from "./adaptor/deepseek"

dotenv.config(getDotenvConfig())

const openai = new OpenAI({
	baseURL: "https://api.deepseek.com",
	apiKey: process.env.DEEPSEEK_API_KEY
})

const rl = readline.createInterface({
	input,
	output
})

const tools = toolHandler.getToolDefinitions()
const deepseekTools = transformTools(tools)

const messages: any[] = []

async function sendMessage() {
	const completion = await openai.chat.completions.create({
		messages,
		model: "deepseek-chat",
		tools: deepseekTools
	} as any)

	const message = completion.choices[0].message as any

	messages.push(message)

	if (message.tool_calls?.length) {
		const results = messageHandler(message)

		if (results?.length) {
			messages.push(...results)

			return sendMessage()
		}
	}

	console.log("\nAssistant:")
	console.log(message.content)
}

async function main() {
	while (true) {
		const userInput = await rl.question("\nYou: ")

		if (userInput === "exit") {
			rl.close()
			process.exit(0)
		}

		messages.push({
			role: "user",
			content: userInput
		})

		await sendMessage()
	}
}

main()
