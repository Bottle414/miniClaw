/**
 * 聊天输入组件
 *
 * 输入框 + 发送按钮，Enter 提交，空消息拦截
 */

import { useState } from "react"

interface ChatInputProps {
	onSend: (message: string) => void
	disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
	const [input, setInput] = useState("")

	function handleSubmit() {
		const trimmed = input.trim()
		if (!trimmed || disabled) return
		onSend(trimmed)
		setInput("")
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<div className="chat-input">
			<input
				type="text"
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Type a message..."
				disabled={disabled}
			/>
			<button onClick={handleSubmit} disabled={disabled || !input.trim()}>
				Send
			</button>
		</div>
	)
}
