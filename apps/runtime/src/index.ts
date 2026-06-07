import dotenv from "dotenv"
import OpenAI from "openai"
import { getDotenvConfig } from "./utils/dotenv"
import { useTool } from "./utils/tool"

dotenv.config(getDotenvConfig())

const openai = new OpenAI({
	baseURL: "https://api.deepseek.com",
	apiKey: process.env.DEEPSEEK_API_KEY
})

const tools = [
	{
		type: "function",
		function: {
			name: "get_weather",
			description: "获取天气",
			parameters: {
				type: "object",
				properties: {
					city: {
						type: "string",
						description: "城市名称"
					}
				},
				required: ["city"]
			}
		}
	}
]

let messages = [{ role: "user", content: "帮我查一下上海的天气" }]

async function main() {
	const completion = await openai.chat.completions.create({
		messages,
		model: "deepseek-v4-pro",
		thinking: { type: "enabled" },
		tools,
		reasoning_effort: "high",
		stream: false
	} as any)

	const results = useTool(completion.choices[0].message.tool_calls as any)

	console.log(JSON.stringify(completion.choices[0].message.tool_calls), completion.choices[0].message.content, results)
}

main()
