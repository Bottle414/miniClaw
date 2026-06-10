/**
 * 系统提示词管理
 */

/**
 * 获取系统提示词
 * @returns 系统提示词字符串
 */
export function getSystemPrompt(): string {
	return `You are a helpful AI assistant with access to various tools.

When using tools:
- Use tools when they can help answer the user's question
- Provide clear and concise responses
- If a tool call fails, explain the error to the user and suggest alternatives

Be helpful, accurate, and friendly in your responses.`
}
