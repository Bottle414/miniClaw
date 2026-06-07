import dotenv from "dotenv"
import OpenAI from "openai"
import { getDotenvConfig } from "./utils/dotenv"

dotenv.config(getDotenvConfig())

const openai = new OpenAI({
	baseURL: "https://api.deepseek.com",
	apiKey: process.env.DEEPSEEK_API_KEY
})

async function main() {
	const completion = await openai.chat.completions.create({
		messages: [{ role: "system", content: "You are a helpful assistant." }],
		model: "deepseek-v4-pro",
		thinking: { type: "enabled" },
		reasoning_effort: "high",
		stream: false
	} as any)

	console.log(completion.choices[0].message.content)
}

main()
